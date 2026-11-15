/**
 * Skelp! auction engine — a pure reducer with no React / network dependencies.
 * The host device owns the single source of truth and broadcasts it to everyone.
 */
import { increment } from "./money";
import { getPlayer, PLAYERS, Player } from "./players";

export const MAX_TEAMS = 10;
export const TEAM_COLORS = ["#2563EB", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#0EA5E9", "#14B8A6", "#F97316", "#64748B"];

export interface SquadEntry { pid: number; price: number }
export interface Team {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isBot: boolean;
  connected: boolean;
  purse: number;
  squad: SquadEntry[];
}
export interface Config {
  /** preset name shown in the UI */
  mode: "QUICK" | "CLASSIC" | "MEGA";
  purse: number;
  squadMax: number;
  overseasMax: number;
  /** seconds on the clock after every bid */
  timer: number;
  /** number of players that go under the hammer */
  pool: number;
}
export interface Lot {
  pid: number;
  bid: number;
  bidder: string | null;
  passed: string[];
  status: "open" | "sold" | "unsold";
  remainMs: number;
  history: { team: string; amount: number }[];
}
export interface Result { pid: number; team: string | null; price: number }
export interface State {
  arena: string;
  hostId: string;
  phase: "lobby" | "auction" | "done";
  config: Config;
  teams: Team[];
  queue: number[];
  pos: number;
  round: 1 | 2;
  lot: Lot | null;
  unsold: number[];
  results: Result[];
  paused: boolean;
}

export const PRESETS: Record<Config["mode"], Config> = {
  QUICK: { mode: "QUICK", purse: 5000, squadMax: 8, overseasMax: 3, timer: 12, pool: 40 },
  CLASSIC: { mode: "CLASSIC", purse: 9000, squadMax: 15, overseasMax: 6, timer: 15, pool: 90 },
  MEGA: { mode: "MEGA", purse: 12000, squadMax: 25, overseasMax: 8, timer: 15, pool: PLAYERS.length },
};

export type Action =
  | { type: "join"; id: string; name: string; avatar: string; isBot?: boolean }
  | { type: "leave"; id: string }
  | { type: "kick"; id: string }
  | { type: "config"; config: Config }
  | { type: "start"; seed: number }
  | { type: "bid"; id: string; amount: number }
  | { type: "pass"; id: string }
  | { type: "tick"; dt: number }
  | { type: "pause"; on: boolean }
  | { type: "end" };

const SOLD_PAUSE_MS = 3000;
const UNSOLD_PAUSE_MS = 2000;

export function createState(arena: string, hostId: string): State {
  return { arena, hostId, phase: "lobby", config: PRESETS.CLASSIC, teams: [], queue: [], pos: 0, round: 1, lot: null, unsold: [], results: [], paused: false };
}

// ---------- helpers ----------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Builds the auction order: marquee set first, then role sets — like the real thing. */
export function buildQueue(pool: number, seed: number): number[] {
  const rnd = mulberry32(seed);
  let chosen: Player[];
  if (pool >= PLAYERS.length) chosen = PLAYERS.slice();
  else {
    // keep a healthy role mix whatever the pool size
    const share: Record<string, number> = { BAT: 0.3, BOWL: 0.3, AR: 0.25, WK: 0.15 };
    chosen = [];
    for (const role of ["BAT", "BOWL", "AR", "WK"]) {
      const ofRole = shuffle(PLAYERS.filter((p) => p.role === role), rnd).sort((a, b) => b.rating - a.rating + (rnd() - 0.5) * 16);
      chosen.push(...ofRole.slice(0, Math.round(pool * share[role])));
    }
  }
  const marquee = shuffle(chosen.filter((p) => p.rating >= 90), rnd);
  const rest = chosen.filter((p) => p.rating < 90);
  const sets = ["BAT", "AR", "WK", "BOWL"].flatMap((role) => shuffle(rest.filter((p) => p.role === role), rnd));
  return [...marquee, ...sets].map((p) => p.id);
}

export const overseasCount = (t: Team) => t.squad.filter((e) => getPlayer(e.pid).overseas).length;
export const spent = (t: Team) => t.squad.reduce((n, e) => n + e.price, 0);
/** Squad power = sum of the ratings of a team's best eleven. Used to rank the final table. */
export function squadPower(t: Team): number {
  return t.squad.map((e) => getPlayer(e.pid).rating).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b, 0);
}
export function standings(s: State): Team[] {
  return s.teams.slice().sort((a, b) => squadPower(b) - squadPower(a) || b.purse - a.purse);
}

export function nextBid(lot: Lot): number {
  return lot.bidder ? lot.bid + increment(lot.bid) : getPlayer(lot.pid).base;
}

/** Why `team` cannot place `amount` on the current lot — or null if it can. */
export function bidBlocker(s: State, teamId: string, amount?: number): string | null {
  const lot = s.lot;
  const team = s.teams.find((t) => t.id === teamId);
  if (!team) return "Not in this arena";
  if (s.phase !== "auction" || !lot || lot.status !== "open") return "No player on the block";
  if (s.paused) return "Auction paused";
  if (lot.bidder === teamId) return "You hold the highest bid";
  if (lot.passed.includes(teamId)) return "You passed on this player";
  const player = getPlayer(lot.pid);
  if (team.squad.length >= s.config.squadMax) return "Squad full";
  if (player.overseas && overseasCount(team) >= s.config.overseasMax) return "Overseas slots full";
  const min = nextBid(lot);
  const amt = amount ?? min;
  if (!Number.isInteger(amt) || amt < min) return "Bid too low";
  if (amt > team.purse) return "Not enough purse";
  return null;
}

/** Teams that could still raise on this lot. When there are none, the hammer falls early. */
function contenders(s: State): Team[] {
  return s.teams.filter((t) => (t.isBot || t.connected) && bidBlocker({ ...s, paused: false }, t.id) === null);
}

function openLot(s: State): State {
  while (s.pos < s.queue.length) {
    const pid = s.queue[s.pos];
    const lot: Lot = { pid, bid: getPlayer(pid).base, bidder: null, passed: [], status: "open", remainMs: s.config.timer * 1000, history: [] };
    const next = { ...s, lot };
    if (contenders(next).length > 0) return next;
    // nobody can afford / fit this player: straight to unsold without wasting the clock
    s = { ...s, pos: s.pos + 1, unsold: [...s.unsold, pid], results: [...s.results, { pid, team: null, price: 0 }] };
  }
  const canContinue = s.teams.some((t) => t.squad.length < s.config.squadMax);
  if (s.round === 1 && s.unsold.length > 0 && canContinue) {
    // accelerated round: everything that went unsold comes back once
    const again = s.unsold;
    return openLot({ ...s, round: 2, queue: again, pos: 0, unsold: [], results: s.results.filter((r) => r.team !== null) });
  }
  return { ...s, phase: "done", lot: null };
}

function hammer(s: State): State {
  const lot = s.lot!;
  if (lot.bidder) {
    const teams = s.teams.map((t) => (t.id === lot.bidder ? { ...t, purse: t.purse - lot.bid, squad: [...t.squad, { pid: lot.pid, price: lot.bid }] } : t));
    return { ...s, teams, results: [...s.results, { pid: lot.pid, team: lot.bidder, price: lot.bid }], lot: { ...lot, status: "sold", remainMs: SOLD_PAUSE_MS } };
  }
  return { ...s, unsold: [...s.unsold, lot.pid], results: [...s.results, { pid: lot.pid, team: null, price: 0 }], lot: { ...lot, status: "unsold", remainMs: UNSOLD_PAUSE_MS } };
}

/** Settle the lot right away if no one is left to bid. */
function settleIfDone(s: State): State {
  if (s.phase !== "auction" || !s.lot || s.lot.status !== "open") return s;
  return contenders(s).length === 0 ? hammer(s) : s;
}

// ---------- reducer ----------
export function reduce(s: State, a: Action): State {
  switch (a.type) {
    case "join": {
      const existing = s.teams.find((t) => t.id === a.id);
      if (existing) return { ...s, teams: s.teams.map((t) => (t.id === a.id ? { ...t, connected: true, name: s.phase === "lobby" ? a.name : t.name, avatar: s.phase === "lobby" ? a.avatar : t.avatar } : t)) };
      if (s.phase !== "lobby" || s.teams.length >= MAX_TEAMS) return s;
      const used = new Set(s.teams.map((t) => t.color));
      const color = TEAM_COLORS.find((c) => !used.has(c)) ?? TEAM_COLORS[0];
      let name = a.name.trim().slice(0, 16) || "PLAYER";
      const names = new Set(s.teams.map((t) => t.name.toUpperCase()));
      for (let n = 2; names.has(name.toUpperCase()); n++) name = `${a.name.trim().slice(0, 14)} ${n}`;
      const team: Team = { id: a.id, name, avatar: a.avatar, color, isBot: !!a.isBot, connected: true, purse: s.config.purse, squad: [] };
      return { ...s, teams: [...s.teams, team] };
    }
    case "leave": {
      if (!s.teams.some((t) => t.id === a.id)) return s;
      if (s.phase === "lobby") return { ...s, teams: s.teams.filter((t) => t.id !== a.id) };
      return settleIfDone({ ...s, teams: s.teams.map((t) => (t.id === a.id ? { ...t, connected: false } : t)) });
    }
    case "kick":
      if (s.phase !== "lobby" || a.id === s.hostId) return s;
      return { ...s, teams: s.teams.filter((t) => t.id !== a.id) };
    case "config":
      if (s.phase !== "lobby") return s;
      return { ...s, config: a.config, teams: s.teams.map((t) => ({ ...t, purse: a.config.purse })) };
    case "start": {
      if (s.phase !== "lobby" || s.teams.length < 2) return s;
      const queue = buildQueue(s.config.pool, a.seed);
      return openLot({ ...s, phase: "auction", queue, pos: 0, round: 1, unsold: [], results: [], paused: false, teams: s.teams.map((t) => ({ ...t, purse: s.config.purse, squad: [] })) });
    }
    case "bid": {
      const amount = a.amount;
      if (bidBlocker(s, a.id, amount) !== null) return s;
      const lot = s.lot!;
      const next: Lot = { ...lot, bid: amount, bidder: a.id, remainMs: s.config.timer * 1000, history: [...lot.history, { team: a.id, amount }].slice(-30) };
      return settleIfDone({ ...s, lot: next });
    }
    case "pass": {
      const lot = s.lot;
      if (s.phase !== "auction" || !lot || lot.status !== "open" || lot.bidder === a.id || lot.passed.includes(a.id)) return s;
      if (!s.teams.some((t) => t.id === a.id)) return s;
      return settleIfDone({ ...s, lot: { ...lot, passed: [...lot.passed, a.id] } });
    }
    case "tick": {
      if (s.phase !== "auction" || !s.lot || s.paused) return s;
      const remainMs = s.lot.remainMs - a.dt;
      if (remainMs > 0) return { ...s, lot: { ...s.lot, remainMs } };
      if (s.lot.status === "open") return hammer(s);
      return openLot({ ...s, pos: s.pos + 1, lot: null });
    }
    case "pause":
      return s.phase === "auction" ? { ...s, paused: a.on } : s;
    case "end":
      return s.phase === "auction" ? { ...s, phase: "done", lot: null, paused: false } : s;
  }
}
