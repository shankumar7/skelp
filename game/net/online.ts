/**
 * Online play: the same host/client sessions as on Wi-Fi, carried by Firebase Realtime Database
 * instead of TCP. The host's phone is still the referee; the database only relays messages.
 *
 *   arenas/{CODE}/info            what the arena is (read by anyone who has the code)
 *   arenas/{CODE}/s               the latest auction state, written once and read by every player
 *   arenas/{CODE}/c/{conn}/meta   one connection per player phone
 *   arenas/{CODE}/c/{conn}/u/*    player -> host messages (bids, passes, pings)
 *   arenas/{CODE}/c/{conn}/d/*    host -> that player (welcome, reactions, pongs)
 *
 * Messages are deleted as soon as they are read, so an arena stores almost nothing.
 */
import { MAX_TEAMS, State } from "../engine";
import { ArenaInfo, encode, PROTOCOL } from "./protocol";
import { Listener, Sock, Transport } from "./transport";

/** The small slice of a realtime database this file needs (Firebase on phones, a fake in tests). */
export interface Db {
  /** who we are signed in as */
  readonly uid: string;
  get(path: string): Promise<any>;
  set(path: string, value: any): Promise<void>;
  remove(path: string): Promise<void>;
  /** append to a list (fire and forget) */
  push(path: string, value: any): void;
  newKey(): string;
  onValue(path: string, cb: (value: any) => void): () => void;
  onChildAdded(path: string, cb: (key: string, value: any) => void): () => void;
  onChildRemoved(path: string, cb: (key: string) => void): () => void;
  /** delete `path` if this phone drops off the internet */
  removeOnDisconnect(path: string): void;
  cancelOnDisconnect(path: string): void;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I to misread
export const ONLINE_CODE = /^[A-Z0-9]{6}$/;
export function randomCode(rnd: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  return code;
}
/** Tidy what a player typed; null if it cannot be an online arena code. */
export function normaliseCode(text: string): string | null {
  const code = String(text).trim().replace(/^#/, "").replace(/[\s-]/g, "").toUpperCase();
  return ONLINE_CODE.test(code) ? code : null;
}

const base = (code: string) => `arenas/${code}`;
const MAX_UP = 4000;
const STATE_PREFIX = '{"t":"state"';

function timeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/** A Sock whose lines wait until someone is listening. */
function makeSock(remote: string, write: (line: string) => void, onClosed: () => void) {
  let closed = false;
  const lineCbs: ((l: string) => void)[] = [];
  const closeCbs: (() => void)[] = [];
  const waiting: string[] = [];
  const emit = (line: string) => {
    if (closed) return;
    if (lineCbs.length === 0) { if (waiting.length < 200) waiting.push(line); return; }
    lineCbs.forEach((cb) => cb(line));
  };
  const fireClose = () => {
    if (closed) return;
    closed = true;
    onClosed();
    closeCbs.forEach((cb) => cb());
  };
  const sock: Sock = {
    remote,
    write(line) { if (!closed) write(line); },
    onLine(cb) {
      lineCbs.push(cb);
      while (waiting.length && !closed) cb(waiting.shift()!);
    },
    onClose(cb) { if (closed) cb(); else closeCbs.push(cb); },
    close: fireClose,
  };
  return { sock, emit, fireClose, isClosed: () => closed };
}

/** A connection that only ever says "no" — used when there is no such arena. */
function refusal(reason: string): Sock {
  const s = makeSock("", () => {}, () => {});
  s.emit(encode({ t: "reject", reason }));
  setTimeout(s.fireClose, 3000);
  return s.sock;
}

/** Host side and player side of one online arena, as a Transport the sessions already understand. */
export function makeOnlineTransport(db: Db, code: string): Transport {
  const root = base(code);
  return {
    async listen(_port, onConn): Promise<Listener> {
      const socks = new Map<string, ReturnType<typeof makeSock>>();
      let lastState = "";
      const offAdd = db.onChildAdded(`${root}/c`, (id, value) => {
        if (socks.has(id) || !value || !value.meta) return;
        const me = `${root}/c/${id}`;
        let offUp = () => {};
        const s = makeSock(String(value.meta.uid ?? ""), (line) => {
          // every player gets the same state: write it once for all of them
          if (line.startsWith(STATE_PREFIX)) { if (line !== lastState) { lastState = line; db.set(`${root}/s`, line).catch(() => {}); } }
          else db.push(`${me}/d`, line);
        }, () => { offUp(); socks.delete(id); db.remove(me).catch(() => {}); });
        socks.set(id, s);
        offUp = db.onChildAdded(`${me}/u`, (key, line) => {
          db.remove(`${me}/u/${key}`).catch(() => {});
          if (typeof line === "string" && line.length <= MAX_UP) s.emit(line);
        });
        onConn(s.sock);
      });
      const offRemoved = db.onChildRemoved(`${root}/c`, (id) => socks.get(id)?.fireClose());
      return {
        port: 0,
        close() {
          offAdd(); offRemoved();
          for (const s of [...socks.values()]) s.fireClose();
          db.remove(root).catch(() => {});
        },
      };
    },

    async connect(_host, _port, timeoutMs = 8000): Promise<Sock> {
      const info = await timeout(db.get(`${root}/info`), timeoutMs);
      if (!info) return refusal("No arena has this code. Check the code with the host.");
      const me = `${root}/c/${db.newKey()}`;
      db.removeOnDisconnect(me);
      await timeout(db.set(`${me}/meta`, { uid: db.uid, ts: Date.now() }), timeoutMs);
      let offs: (() => void)[] = [];
      let seenMeta = false;
      const s = makeSock(code, (line) => { if (line.length <= MAX_UP) db.push(`${me}/u`, line); }, () => {
        offs.forEach((off) => off());
        offs = [];
        db.cancelOnDisconnect(me);
        db.remove(me).catch(() => {});
      });
      offs = [
        db.onChildAdded(`${me}/d`, (key, line) => {
          db.remove(`${me}/d/${key}`).catch(() => {});
          if (typeof line === "string") s.emit(line);
        }),
        db.onValue(`${root}/s`, (line) => { if (typeof line === "string") s.emit(line); }),
        // the host removes our connection to drop us; the whole arena goes when the host closes it
        db.onValue(`${me}/meta`, (v) => { if (v) seenMeta = true; else if (seenMeta) s.fireClose(); }),
        db.onValue(`${root}/info`, (v) => { if (!v) { s.emit(encode({ t: "reject", reason: "The host closed the arena" })); setTimeout(s.fireClose, 500); } }),
      ];
      if (s.isClosed()) offs.forEach((off) => off());
      return s.sock;
    },
  };
}

export interface OnlineInfo { v: number; arena: string; hostUid: string; teams: number; max: number; phase: State["phase"]; mode: string; ts: number }
export const infoOf = (s: State, hostUid: string): OnlineInfo => ({ v: PROTOCOL, arena: s.arena.slice(0, 40), hostUid, teams: s.teams.length, max: MAX_TEAMS, phase: s.phase, mode: s.config.mode, ts: Date.now() });

/** Look an arena up by its code before joining. */
export async function lookupOnline(db: Db, code: string, timeoutMs = 8000): Promise<{ ok: true; info: ArenaInfo } | { ok: false; error: string }> {
  let info: any;
  try {
    info = await timeout(db.get(`${base(code)}/info`), timeoutMs);
  } catch {
    return { ok: false, error: "Could not reach the internet. Check your connection and try again." };
  }
  if (!info || typeof info.arena !== "string") return { ok: false, error: "No arena has this code. Check the code with the host." };
  if (info.v !== PROTOCOL) return { ok: false, error: "The host uses a different version of Skelp!. Update the app on both phones." };
  return { ok: true, info: { host: code, arena: info.arena.slice(0, 40), teams: Number(info.teams) || 0, max: Number(info.max) || MAX_TEAMS, phase: info.phase, mode: String(info.mode).slice(0, 12) } };
}

/** Reserve an unused arena code. */
export async function claimCode(db: Db, first: OnlineInfo, rnd: () => number = Math.random): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = randomCode(rnd);
    if (await timeout(db.get(`${base(code)}/info`), 8000)) continue;
    await timeout(db.set(`${base(code)}/info`, first), 8000);
    return code;
  }
  throw new Error("no free code");
}
export const setInfo = (db: Db, code: string, info: OnlineInfo) => db.set(`${base(code)}/info`, info).catch(() => {});
