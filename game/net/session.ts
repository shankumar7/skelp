/**
 * Sessions are what the UI talks to.
 *  - HostSession: owns the auction state, runs the clock and the bots, and (optionally)
 *    serves it to other phones on the same Wi-Fi / hotspot over plain TCP.
 *  - ClientSession: mirrors the host's state and forwards this player's bids.
 * No internet is involved anywhere.
 */
import { BOT_AVATARS, BOT_NAMES, BotBrain } from "../bots";
import { Action, Config, createState, MAX_TEAMS, reduce, State } from "../engine";
import { ArenaInfo, ClientMsg, decode, encode, PORT, PROTOCOL, ServerMsg } from "./protocol";
import { Listener, Sock, Transport } from "./transport";

export type Status = "connecting" | "live" | "reconnecting" | "closed";
export interface Me { id: string; name: string; avatar: string }

export interface Session {
  readonly isHost: boolean;
  readonly myId: string;
  readonly lan: boolean;
  getState(): State | null;
  getStatus(): Status;
  /** ms timestamp (local clock) of the last state update — used to animate the countdown */
  getStamp(): number;
  subscribe(cb: () => void): () => void;
  bid(amount: number): void;
  pass(): void;
  leave(): void;
  // host-only controls (no-ops on clients)
  setConfig(c: Config): void;
  addBot(): void;
  kick(id: string): void;
  start(): void;
  pause(on: boolean): void;
  end(): void;
}

abstract class Base {
  protected listeners = new Set<() => void>();
  protected stamp = Date.now();
  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }
  protected emit() {
    this.stamp = Date.now();
    this.listeners.forEach((cb) => cb());
  }
  getStamp() { return this.stamp; }
}

const TICK_MS = 200;
const DEAD_AFTER_MS = 8000;

export class HostSession extends Base implements Session {
  readonly isHost = true;
  readonly myId: string;
  lan = false;
  port = PORT;
  private state: State;
  private status: Status = "live";
  private brain: BotBrain;
  private timer: any = null;
  private listener: Listener | null = null;
  private peers = new Map<Sock, { id: string | null; seen: number }>();
  private sinceSync = 0;
  private lastTick = Date.now();
  private botSeq = 0;

  constructor(me: Me, arena: string, private rnd: () => number = Math.random) {
    super();
    this.myId = me.id;
    this.brain = new BotBrain(rnd);
    this.state = reduce(createState(arena, me.id), { type: "join", id: me.id, name: me.name, avatar: me.avatar });
    this.timer = setInterval(() => this.onTick(), TICK_MS);
  }

  /** Start accepting other phones. Resolves once the server socket is listening. */
  async serve(transport: Transport, port = PORT): Promise<void> {
    this.listener = await transport.listen(port, (sock) => this.onConn(sock));
    this.port = this.listener.port;
    this.lan = true;
  }

  getState() { return this.state; }
  getStatus() { return this.status; }

  private apply(a: Action, sync = true) {
    const next = reduce(this.state, a);
    if (next === this.state) return false;
    this.state = next;
    if (sync) { this.broadcast(); this.emit(); }
    return true;
  }

  private onTick() {
    if (this.status === "closed") return;
    const now = Date.now();
    const dt = Math.min(1000, now - this.lastTick);
    this.lastTick = now;
    // drop phones that went silent (walked out of Wi-Fi range, app killed, ...)
    for (const [sock, peer] of this.peers) if (now - peer.seen > DEAD_AFTER_MS) sock.close();
    if (this.state.phase !== "auction") return;
    const before = this.state;
    this.apply({ type: "tick", dt }, false);
    for (const a of this.brain.step(this.state, dt)) this.apply(a, false);
    const s = this.state;
    const changed = s.lot?.pid !== before.lot?.pid || s.lot?.status !== before.lot?.status || s.lot?.bid !== before.lot?.bid ||
      s.lot?.bidder !== before.lot?.bidder || s.lot?.passed.length !== before.lot?.passed.length || s.phase !== before.phase;
    this.sinceSync += dt;
    if (changed || this.sinceSync >= 1000) {
      this.sinceSync = 0;
      this.broadcast();
      this.emit();
    }
  }

  private broadcast() {
    if (this.peers.size === 0) return;
    const line = encode({ t: "state", s: this.state });
    for (const [sock, peer] of this.peers) if (peer.id) sock.write(line);
  }

  private onConn(sock: Sock) {
    const peer = { id: null as string | null, seen: Date.now() };
    this.peers.set(sock, peer);
    sock.onLine((line) => {
      const m = decode<ClientMsg>(line);
      if (!m) return;
      peer.seen = Date.now();
      const s = this.state;
      if (m.t === "probe") {
        sock.write(encode({ t: "info", v: PROTOCOL, arena: s.arena, teams: s.teams.length, max: MAX_TEAMS, phase: s.phase, mode: s.config.mode }));
      } else if (m.t === "ping") {
        sock.write(encode({ t: "pong" }));
      } else if (m.t === "hello") {
        if (m.v !== PROTOCOL) return this.reject(sock, "Update Skelp! — app versions do not match");
        if (typeof m.id !== "string" || !m.id || typeof m.name !== "string") return this.reject(sock, "Bad request");
        const known = s.teams.find((t) => t.id === m.id);
        if (known?.isBot || m.id === this.myId) return this.reject(sock, "Bad request");
        if (!known && s.phase !== "lobby") return this.reject(sock, "Auction already started");
        if (!known && s.teams.length >= MAX_TEAMS) return this.reject(sock, "Arena is full");
        // a phone that reconnects replaces its old (dead) socket
        for (const [other, p] of this.peers) if (other !== sock && p.id === m.id) { p.id = null; other.close(); }
        peer.id = m.id;
        sock.write(encode({ t: "welcome", id: m.id }));
        if (!this.apply({ type: "join", id: m.id, name: m.name, avatar: String(m.avatar || "person") })) sock.write(encode({ t: "state", s: this.state }));
      } else if (m.t === "act" && peer.id) {
        // clients may only act for themselves, and only bid / pass
        const a = m.a;
        if (a && a.type === "bid" && typeof a.amount === "number") this.apply({ type: "bid", id: peer.id, amount: a.amount });
        else if (a && a.type === "pass") this.apply({ type: "pass", id: peer.id });
      }
    });
    sock.onClose(() => {
      this.peers.delete(sock);
      if (peer.id && this.status !== "closed") this.apply({ type: "leave", id: peer.id });
    });
  }

  private reject(sock: Sock, reason: string) {
    sock.write(encode({ t: "reject", reason }));
    setTimeout(() => sock.close(), 300);
  }

  bid(amount: number) { this.apply({ type: "bid", id: this.myId, amount }); }
  pass() { this.apply({ type: "pass", id: this.myId }); }
  setConfig(c: Config) { this.apply({ type: "config", config: c }); }
  addBot() {
    const used = new Set(this.state.teams.map((t) => t.name));
    const i = BOT_NAMES.findIndex((n) => !used.has(n));
    if (i < 0) return;
    this.apply({ type: "join", id: `bot-${++this.botSeq}-${Math.floor(this.rnd() * 1e9)}`, name: BOT_NAMES[i], avatar: BOT_AVATARS[i], isBot: true });
  }
  kick(id: string) {
    for (const [sock, p] of this.peers) if (p.id === id) { p.id = null; this.reject(sock, "Removed by the host"); }
    this.apply({ type: "kick", id });
  }
  start() { this.apply({ type: "start", seed: Math.floor(this.rnd() * 2 ** 31) }); }
  pause(on: boolean) { this.apply({ type: "pause", on }); }
  end() { this.apply({ type: "end" }); }
  leave() {
    if (this.status === "closed") return;
    this.status = "closed";
    clearInterval(this.timer);
    for (const sock of [...this.peers.keys()]) { sock.write(encode({ t: "reject", reason: "The host closed the arena" })); sock.close(); }
    this.peers.clear();
    this.listener?.close();
    this.listener = null;
    this.emit();
  }
}

const PING_MS = 2000;
const SILENT_MS = 7000;

export class ClientSession extends Base implements Session {
  readonly isHost = false;
  readonly lan = true;
  readonly myId: string;
  error: string | null = null;
  private state: State | null = null;
  private status: Status = "connecting";
  private sock: Sock | null = null;
  private timer: any = null;
  private lastSeen = Date.now();
  private retry: any = null;

  constructor(private transport: Transport, private host: string, private me: Me, private port = PORT) {
    super();
    this.myId = me.id;
    this.open();
    this.timer = setInterval(() => this.heartbeat(), PING_MS);
  }

  getState() { return this.state; }
  getStatus() { return this.status; }

  private open() {
    if (this.status === "closed") return;
    this.transport.connect(this.host, this.port, 4000).then(
      (sock) => {
        if (this.status === "closed") return sock.close();
        this.sock = sock;
        this.lastSeen = Date.now();
        sock.onLine((line) => this.onLine(sock, line));
        sock.onClose(() => { if (this.sock === sock) { this.sock = null; this.lost(); } });
        sock.write(encode({ t: "hello", v: PROTOCOL, id: this.me.id, name: this.me.name, avatar: this.me.avatar }));
      },
      () => this.lost(),
    );
  }

  private onLine(sock: Sock, line: string) {
    const m = decode<ServerMsg>(line);
    if (!m || this.status === "closed") return;
    this.lastSeen = Date.now();
    if (m.t === "state") {
      this.state = m.s;
      this.status = "live";
      this.emit();
    } else if (m.t === "reject") {
      this.fail(m.reason);
    }
  }

  /** Connection dropped: keep the last known state on screen and keep trying to get back in. */
  private lost() {
    if (this.status === "closed") return;
    if (!this.state) {
      // never got in — if the very first attempts fail, give up with a clear message
      this.attempts++;
      if (this.attempts >= 3) return this.fail("Could not reach the host. Are you on the same Wi-Fi / hotspot?");
    }
    if (this.state?.phase === "done") return; // auction finished, nothing to get back to
    this.status = this.state ? "reconnecting" : "connecting";
    this.emit();
    clearTimeout(this.retry);
    this.retry = setTimeout(() => this.open(), 1500);
  }
  private attempts = 0;

  private fail(reason: string) {
    this.error = reason;
    this.close();
  }

  private heartbeat() {
    if (this.status === "closed" || !this.sock) return;
    if (Date.now() - this.lastSeen > SILENT_MS) {
      const dead = this.sock;
      this.sock = null;
      dead.close();
      this.lost();
      return;
    }
    this.sock.write(encode({ t: "ping" }));
  }

  private send(a: Action) { this.sock?.write(encode({ t: "act", a })); }
  bid(amount: number) { this.send({ type: "bid", id: this.myId, amount }); }
  pass() { this.send({ type: "pass", id: this.myId }); }
  setConfig() {}
  addBot() {}
  kick() {}
  start() {}
  pause() {}
  end() {}

  private close() {
    if (this.status === "closed") return;
    this.status = "closed";
    clearInterval(this.timer);
    clearTimeout(this.retry);
    const s = this.sock;
    this.sock = null;
    s?.close();
    this.emit();
  }
  leave() { this.close(); }
}

/** Ask one address whether a Skelp! arena is being hosted there. */
export async function probe(transport: Transport, host: string, port = PORT, timeoutMs = 900): Promise<ArenaInfo | null> {
  let sock: Sock;
  try {
    sock = await transport.connect(host, port, timeoutMs);
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: ArenaInfo | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      resolve(v);
      sock.close();
    };
    const t = setTimeout(() => done(null), timeoutMs + 600);
    sock.onLine((line) => {
      const m = decode<ServerMsg>(line);
      if (m?.t === "info" && m.v === PROTOCOL) done({ host, arena: m.arena, teams: m.teams, max: m.max, phase: m.phase, mode: m.mode });
    });
    sock.onClose(() => done(null));
    sock.write(encode({ t: "probe" }));
  });
}

/** Addresses worth checking, most likely first: the hotspot owner (gateway), then the whole /24. */
export function candidates(myIp: string | null): string[] {
  const common = ["192.168.43.1", "192.168.49.1", "172.20.10.1", "192.168.1.1", "192.168.0.1", "10.0.0.1"];
  const m = myIp?.match(/^(\d+\.\d+\.\d+)\.(\d+)$/);
  if (!m) return common;
  const out = [`${m[1]}.1`];
  for (let i = 2; i < 255; i++) if (String(i) !== m[2]) out.push(`${m[1]}.${i}`);
  return out;
}

/** Scan the local network for arenas. Calls onFound as each one answers. */
export function scan(transport: Transport, myIp: string | null, onFound: (a: ArenaInfo) => void, port = PORT, list = candidates(myIp)): { done: Promise<void>; cancel(): void } {
  let cancelled = false;
  let next = 0;
  const worker = async () => {
    while (!cancelled && next < list.length) {
      const host = list[next++];
      const info = await probe(transport, host, port);
      if (info && !cancelled) onFound(info);
    }
  };
  const done = Promise.all(Array.from({ length: 40 }, worker)).then(() => undefined);
  return { done, cancel: () => { cancelled = true; } };
}

/** "ARENA CODE" typed by a player: either a full IP or just the last number of the host's address. */
export function resolveCode(code: string, myIp: string | null): string | null {
  const c = code.trim().replace(/^#/, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(c)) return c.split(".").every((n) => +n <= 255) ? c : null;
  const m = myIp?.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (/^\d{1,3}$/.test(c) && +c > 0 && +c < 255 && m) return `${m[1]}.${c}`;
  return null;
}
