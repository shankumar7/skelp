/**
 * Skelp! auction engine — a pure reducer with no React / network dependencies.
 * The host device owns the single source of truth and broadcasts it to everyone.
 */
import { increment } from "./money";
import { CUSTOM_ID, getPlayer, MAX_CUSTOM, PLAYERS, Player, registerCustom, Role } from "./players";

export const MAX_TEAMS = 10;
export const TEAM_COLORS = ["#5B5FEF", "#2EC4A0", "#FFB238", "#FF6B6B", "#A66CFF", "#FF7EB6", "#38BDF8", "#14B8A6", "#FB923C", "#7A748F", "#84CC16", "#E11D48"];
/** Emblems a team can pick (Ionicons names). */
export const TEAM_EMBLEMS = ["shield", "flash", "trophy", "rocket", "flame", "star", "diamond", "skull", "planet", "paw", "thunderstorm", "football", "heart", "eye", "construct", "person"];

export interface SquadEntry { pid: number; price: number; /** retained before the auction */ kept?: boolean; /** bought back with a Right to Match card */ rtm?: boolean }
export interface Team {
  id: string;
  /** team name (starts as the player's name; editable in the lobby) */
  name: string;
  /** the player who runs the team */
  owner: string;
  /** Right to Match cards left */
  rtm: number;
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
  /** which players are in the pool */
  filter: PoolFilter;
  /** players each team may retain before the auction (0 = off) */
  retain: number;
  /** Right to Match cards per team (0 = off) */
  rtm: number;
}
export type PoolFilter = "ALL" | "INDIAN" | "OVERSEAS";
export interface Lot {
  pid: number;
  bid: number;
  bidder: string | null;
  passed: string[];
  /** "rtm": the hammer fell and the player's former team is deciding whether to match the bid */
  status: "open" | "rtm" | "sold" | "unsold";
  remainMs: number;
  history: { team: string; amount: number }[];
  /** bids placed on this lot in total (history only keeps the latest) */
  n: number;
  /** the former team that may match (status "rtm"), or that did (status "sold") */
  rtmTeam?: string | null;
}
export interface Result { pid: number; team: string | null; price: number; kept?: boolean; rtm?: boolean }
export interface State {
  arena: string;
  hostId: string;
  phase: "lobby" | "retention" | "auction" | "done";
  config: Config;
  teams: Team[];
  queue: number[];
  pos: number;
  round: 1 | 2;
  lot: Lot | null;
  unsold: number[];
  results: Result[];
  paused: boolean;
  /** players the host added for this arena */
  custom: Player[];
  /** player id -> the team that had the player "last season" (retentions / RTM) */
  former: Record<string, string>;
  /** team id -> last season's players it may retain */
  offers: Record<string, number[]>;
  /** team id -> the players it chose to retain (present once the team has decided) */
  picks: Record<string, number[]>;
  /** time left in the retention window */
  retainMs: number;
}

export const PRESETS: Record<Config["mode"], Config> = {
  QUICK: { mode: "QUICK", purse: 5000, squadMax: 8, overseasMax: 3, timer: 12, pool: 40, filter: "ALL", retain: 0, rtm: 0 },
  CLASSIC: { mode: "CLASSIC", purse: 9000, squadMax: 15, overseasMax: 6, timer: 15, pool: 90, filter: "ALL", retain: 0, rtm: 0 },
  MEGA: { mode: "MEGA", purse: 12000, squadMax: 25, overseasMax: 8, timer: 15, pool: PLAYERS.length, filter: "ALL", retain: 0, rtm: 0 },
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
  | { type: "end" }
  /** change a team's name, colour or emblem (lobby only) */
  | { type: "team"; id: string; name?: string; color?: string; avatar?: string }
  /** host: take back the latest bid on the open lot */
  | { type: "undo" }
  | { type: "addPlayer"; player: { name: string; role: Role; overseas: boolean; base: number; rating: number } }
  | { type: "removePlayer"; pid: number }
  /** choose which of last season's players to keep */
  | { type: "retain"; id: string; pids: number[] }
  /** host: close the retention window now */
  | { type: "skip" }
  /** the former team answers a Right to Match offer */
  | { type: "rtm"; id: string; use: boolean };

const SOLD_PAUSE_MS = 3000;
const UNSOLD_PAUSE_MS = 2000;
export const RTM_MS = 8000;
export const RETAIN_MS = 60000;
/** players each team is handed as "last season's squad" when retentions or RTM are on */
const FORMER_SIZE = 4;

export function createState(arena: string, hostId: string): State {
  return { arena, hostId, phase: "lobby", config: PRESETS.CLASSIC, teams: [], queue: [], pos: 0, round: 1, lot: null, unsold: [], results: [], paused: false, custom: [], former: {}, offers: {}, picks: {}, retainMs: 0 };
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
export function buildQueue(pool: number, seed: number, filter: PoolFilter = "ALL", custom: Player[] = []): number[] {
  const rnd = mulberry32(seed);
  const all = poolPlayers(filter, custom);
  let chosen: Player[];
  if (pool >= all.length) chosen = all.slice();
  else {
    // keep a healthy role mix whatever the pool size
    const share: Record<string, number> = { BAT: 0.3, BOWL: 0.3, AR: 0.25, WK: 0.15 };
    chosen = [];
    for (const role of ["BAT", "BOWL", "AR", "WK"]) {
      const ofRole = shuffle(all.filter((p) => p.role === role && p.id < CUSTOM_ID), rnd).sort((a, b) => b.rating - a.rating + (rnd() - 0.5) * 16);
      chosen.push(...ofRole.slice(0, Math.round(pool * share[role])));
    }
    // the host's own players are always in
    for (const p of custom) if (!chosen.includes(p)) chosen.push(p);
  }
  const marquee = shuffle(chosen.filter((p) => p.rating >= 90), rnd);
  const rest = chosen.filter((p) => p.rating < 90);
  const sets = ["BAT", "AR", "WK", "BOWL"].flatMap((role) => shuffle(rest.filter((p) => p.role === role), rnd));
  return [...marquee, ...sets].map((p) => p.id);
}

/** Everyone who can come up for auction under a pool filter. */
export function poolPlayers(filter: PoolFilter, custom: Player[] = []): Player[] {
  const base = filter === "INDIAN" ? PLAYERS.filter((p) => !p.overseas) : filter === "OVERSEAS" ? PLAYERS.filter((p) => p.overseas) : PLAYERS;
  return [...base, ...custom];
}
/** The overseas limit does not apply when the whole pool is overseas. */
export const overseasCap = (c: Config) => (c.filter === "OVERSEAS" ? c.squadMax : c.overseasMax);
/** Price of the n-th retained player (0 = the first, most expensive slab). */
export function retainPrice(c: Config, n: number): number {
  const share = [0.15, 0.12, 0.09][Math.min(n, 2)];
  return Math.max(25, Math.round((c.purse * share) / 25) * 25);
}
const byRating = (a: number, b: number) => getPlayer(b).rating - getPlayer(a).rating || a - b;
/** Why a team cannot retain exactly these players — or null if it can. */
export function retainBlocker(s: State, teamId: string, pids: number[]): string | null {
  const team = s.teams.find((t) => t.id === teamId);
  if (!team || s.phase !== "retention") return "Retentions are closed";
  const offers = s.offers[teamId] ?? [];
  if (!Array.isArray(pids) || pids.length > s.config.retain) return `Keep at most ${s.config.retain}`;
  if (new Set(pids).size !== pids.length || !pids.every((p) => offers.includes(p))) return "Not your player";
  if (pids.filter((p) => getPlayer(p).overseas).length > overseasCap(s.config)) return "Too many overseas players";
  const cost = pids.reduce((n, _, i) => n + retainPrice(s.config, i), 0);
  if (cost > team.purse) return "Not enough purse";
  return null;
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
  if (player.overseas && overseasCount(team) >= overseasCap(s.config)) return "Overseas slots full";
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
    const lot: Lot = { pid, bid: getPlayer(pid).base, bidder: null, passed: [], status: "open", remainMs: s.config.timer * 1000, history: [], n: 0 };
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

/** The player goes to `teamId` at the current bid — through the hammer, or a Right to Match. */
function sell(s: State, teamId: string, viaRtm: boolean): State {
  const lot = s.lot!;
  const entry: SquadEntry = viaRtm ? { pid: lot.pid, price: lot.bid, rtm: true } : { pid: lot.pid, price: lot.bid };
  const teams = s.teams.map((t) => (t.id === teamId ? { ...t, purse: t.purse - lot.bid, squad: [...t.squad, entry], rtm: viaRtm ? t.rtm - 1 : t.rtm } : t));
  const result: Result = viaRtm ? { pid: lot.pid, team: teamId, price: lot.bid, rtm: true } : { pid: lot.pid, team: teamId, price: lot.bid };
  return { ...s, teams, results: [...s.results, result], lot: { ...lot, bidder: teamId, status: "sold", remainMs: SOLD_PAUSE_MS, rtmTeam: viaRtm ? teamId : null } };
}

/** The former team that may match the winning bid on this lot, if any. */
function rtmCandidate(s: State): Team | null {
  const lot = s.lot!;
  const formerId = s.former[String(lot.pid)];
  if (!formerId || formerId === lot.bidder) return null;
  const t = s.teams.find((x) => x.id === formerId);
  if (!t || t.rtm <= 0 || !(t.isBot || t.connected)) return null;
  if (t.squad.length >= s.config.squadMax || lot.bid > t.purse) return null;
  if (getPlayer(lot.pid).overseas && overseasCount(t) >= overseasCap(s.config)) return null;
  return t;
}

function hammer(s: State): State {
  const lot = s.lot!;
  if (lot.bidder) {
    const former = rtmCandidate(s);
    if (former) return { ...s, lot: { ...lot, status: "rtm", rtmTeam: former.id, remainMs: RTM_MS } };
    return sell(s, lot.bidder, false);
  }
  return { ...s, unsold: [...s.unsold, lot.pid], results: [...s.results, { pid: lot.pid, team: null, price: 0 }], lot: { ...lot, status: "unsold", remainMs: UNSOLD_PAUSE_MS } };
}

/** Settle the lot right away if no one is left to bid. */
function settleIfDone(s: State): State {
  if (s.phase !== "auction" || !s.lot || s.lot.status !== "open") return s;
  return contenders(s).length === 0 ? hammer(s) : s;
}

/** Hand every team a few of the pool's best players as "last season's squad". */
function dealFormer(s: State, seed: number): State {
  const per = Math.min(FORMER_SIZE, Math.floor(s.queue.length / (s.teams.length * 3)));
  if (per <= 0) return s;
  const rnd = mulberry32(seed ^ 0x5eed);
  const jitter = new Map(s.queue.map((pid) => [pid, getPlayer(pid).rating + (rnd() - 0.5) * 6]));
  const top = s.queue.slice().sort((x, y) => jitter.get(y)! - jitter.get(x)! || x - y).slice(0, per * s.teams.length);
  const former: Record<string, string> = {};
  const offers: Record<string, number[]> = {};
  for (const t of s.teams) offers[t.id] = [];
  top.forEach((pid, i) => {
    const round = Math.floor(i / s.teams.length);
    const seat = i % s.teams.length;
    const team = s.teams[round % 2 === 0 ? seat : s.teams.length - 1 - seat]; // snake order keeps it fair
    former[String(pid)] = team.id;
    offers[team.id].push(pid);
  });
  for (const id in offers) offers[id].sort(byRating);
  return { ...s, former, offers };
}

/** What a bot keeps: its best former players, if they are worth the slab price. */
function botPicks(s: State, team: Team): number[] {
  const out: number[] = [];
  for (const pid of s.offers[team.id] ?? []) {
    if (out.length >= s.config.retain) break;
    if (getPlayer(pid).rating < 86) continue;
    if (retainBlocker(s, team.id, [...out, pid]) === null) out.push(pid);
  }
  return out;
}

/** Close the retention window: kept players join their squads, everyone else goes to auction. */
function finishRetention(s: State): State {
  const kept = new Set<number>();
  const results: Result[] = [];
  const teams = s.teams.map((t) => {
    const picks = (s.picks[t.id] ?? []).slice().sort(byRating);
    if (retainBlocker(s, t.id, picks) !== null || picks.length === 0) return t;
    const squad = picks.map((pid, i) => ({ pid, price: retainPrice(s.config, i), kept: true }));
    for (const e of squad) { kept.add(e.pid); results.push({ pid: e.pid, team: t.id, price: e.price, kept: true }); }
    return { ...t, squad, purse: t.purse - squad.reduce((n, e) => n + e.price, 0) };
  });
  const former: Record<string, string> = {};
  if (s.config.rtm > 0) for (const pid in s.former) if (!kept.has(Number(pid))) former[pid] = s.former[pid];
  return openLot({ ...s, phase: "auction", teams, former, results, queue: s.queue.filter((pid) => !kept.has(pid)), pos: 0, retainMs: 0 });
}
function finishRetentionIfReady(s: State): State {
  const waiting = s.teams.some((t) => (t.isBot || t.connected) && !(t.id in s.picks));
  return waiting ? s : finishRetention(s);
}

const ROLES: Role[] = ["BAT", "BOWL", "AR", "WK"];
const cleanName = (name: unknown, max: number) => String(name ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);

// ---------- reducer ----------
export function reduce(s: State, a: Action): State {
  if (s.custom.length) registerCustom(s.custom);
  switch (a.type) {
    case "join": {
      const existing = s.teams.find((t) => t.id === a.id);
      if (existing) return { ...s, teams: s.teams.map((t) => (t.id === a.id ? { ...t, connected: true } : t)) };
      if (s.phase !== "lobby" || s.teams.length >= MAX_TEAMS) return s;
      const used = new Set(s.teams.map((t) => t.color));
      const color = TEAM_COLORS.find((c) => !used.has(c)) ?? TEAM_COLORS[0];
      let name = a.name.trim().slice(0, 16) || "PLAYER";
      const names = new Set(s.teams.map((t) => t.name.toUpperCase()));
      for (let n = 2; names.has(name.toUpperCase()); n++) name = `${a.name.trim().slice(0, 14)} ${n}`;
      const team: Team = { id: a.id, name, owner: name, rtm: s.config.rtm, avatar: a.avatar, color, isBot: !!a.isBot, connected: true, purse: s.config.purse, squad: [] };
      return { ...s, teams: [...s.teams, team] };
    }
    case "leave": {
      if (!s.teams.some((t) => t.id === a.id)) return s;
      if (s.phase === "lobby") return { ...s, teams: s.teams.filter((t) => t.id !== a.id) };
      const left = { ...s, teams: s.teams.map((t) => (t.id === a.id ? { ...t, connected: false } : t)) };
      if (s.phase === "retention") return finishRetentionIfReady(left);
      // a team that walks away while it is being offered a Right to Match gives it up
      if (left.lot?.status === "rtm" && left.lot.rtmTeam === a.id) return sell(left, left.lot.bidder!, false);
      return settleIfDone(left);
    }
    case "kick":
      if (s.phase !== "lobby" || a.id === s.hostId) return s;
      return { ...s, teams: s.teams.filter((t) => t.id !== a.id) };
    case "config":
      if (s.phase !== "lobby") return s;
      return { ...s, config: a.config, teams: s.teams.map((t) => ({ ...t, purse: a.config.purse, rtm: a.config.rtm })) };
    case "team": {
      if (s.phase !== "lobby") return s;
      const me = s.teams.find((t) => t.id === a.id);
      if (!me) return s;
      const others = s.teams.filter((t) => t.id !== a.id);
      const next = { ...me };
      const name = cleanName(a.name, 16);
      if (a.name !== undefined && name && !others.some((t) => t.name.toUpperCase() === name.toUpperCase())) next.name = name;
      if (a.color !== undefined && TEAM_COLORS.includes(a.color) && !others.some((t) => t.color === a.color)) next.color = a.color;
      if (a.avatar !== undefined && TEAM_EMBLEMS.includes(a.avatar)) next.avatar = a.avatar;
      if (next.name === me.name && next.color === me.color && next.avatar === me.avatar) return s;
      return { ...s, teams: s.teams.map((t) => (t.id === a.id ? next : t)) };
    }
    case "addPlayer": {
      if (s.phase !== "lobby" || s.custom.length >= MAX_CUSTOM || !a.player) return s;
      const name = cleanName(a.player.name, 24);
      if (!name || !ROLES.includes(a.player.role)) return s;
      const id = s.custom.reduce((m, p) => Math.max(m, p.id), CUSTOM_ID - 1) + 1;
      const overseas = !!a.player.overseas;
      const base = Math.min(200, Math.max(20, Math.round((Number(a.player.base) || 20) / 5) * 5));
      const rating = Math.min(99, Math.max(60, Math.round(Number(a.player.rating) || 75)));
      const player: Player = { id, key: `custom-${id}`, name, role: a.player.role, country: overseas ? "OVS" : "IND", overseas, base, rating };
      registerCustom([player]);
      return { ...s, custom: [...s.custom, player] };
    }
    case "removePlayer":
      if (s.phase !== "lobby" || !s.custom.some((p) => p.id === a.pid)) return s;
      return { ...s, custom: s.custom.filter((p) => p.id !== a.pid) };
    case "start": {
      if (s.phase !== "lobby" || s.teams.length < 2) return s;
      const queue = buildQueue(s.config.pool, a.seed, s.config.filter, s.custom);
      let next: State = { ...s, queue, pos: 0, round: 1, unsold: [], results: [], paused: false, former: {}, offers: {}, picks: {}, retainMs: 0, teams: s.teams.map((t) => ({ ...t, purse: s.config.purse, squad: [], rtm: s.config.rtm })) };
      if (s.config.retain > 0 || s.config.rtm > 0) next = dealFormer(next, a.seed);
      if (s.config.retain > 0 && Object.keys(next.offers).length > 0) {
        next = { ...next, phase: "retention", retainMs: RETAIN_MS };
        const picks: Record<string, number[]> = {};
        for (const t of next.teams) if (t.isBot) picks[t.id] = botPicks(next, t);
        return finishRetentionIfReady({ ...next, picks });
      }
      return openLot({ ...next, phase: "auction" });
    }
    case "retain": {
      if (s.phase !== "retention" || retainBlocker(s, a.id, a.pids) !== null) return s;
      return finishRetentionIfReady({ ...s, picks: { ...s.picks, [a.id]: a.pids.slice() } });
    }
    case "skip":
      return s.phase === "retention" ? finishRetention(s) : s;
    case "rtm": {
      const lot = s.lot;
      if (s.phase !== "auction" || !lot || lot.status !== "rtm" || lot.rtmTeam !== a.id) return s;
      return a.use ? sell(s, a.id, true) : sell(s, lot.bidder!, false);
    }
    case "undo": {
      const lot = s.lot;
      if (s.phase !== "auction" || !lot || lot.status !== "open" || lot.history.length === 0) return s;
      // only as far back as the bids we still remember
      if (lot.history.length === 1 && lot.n > 1) return s;
      const history = lot.history.slice(0, -1);
      const last = history[history.length - 1];
      return { ...s, lot: { ...lot, history, n: lot.n - 1, bid: last ? last.amount : getPlayer(lot.pid).base, bidder: last ? last.team : null, remainMs: s.config.timer * 1000 } };
    }
    case "bid": {
      const amount = a.amount;
      if (bidBlocker(s, a.id, amount) !== null) return s;
      const lot = s.lot!;
      const next: Lot = { ...lot, bid: amount, bidder: a.id, remainMs: s.config.timer * 1000, history: [...lot.history, { team: a.id, amount }].slice(-30), n: lot.n + 1 };
      return settleIfDone({ ...s, lot: next });
    }
    case "pass": {
      const lot = s.lot;
      if (s.phase !== "auction" || !lot || lot.status !== "open" || lot.bidder === a.id || lot.passed.includes(a.id)) return s;
      if (!s.teams.some((t) => t.id === a.id)) return s;
      return settleIfDone({ ...s, lot: { ...lot, passed: [...lot.passed, a.id] } });
    }
    case "tick": {
      if (s.phase === "retention") {
        const retainMs = s.retainMs - a.dt;
        return retainMs > 0 ? { ...s, retainMs } : finishRetention(s);
      }
      if (s.phase !== "auction" || !s.lot || s.paused) return s;
      const remainMs = s.lot.remainMs - a.dt;
      if (remainMs > 0) return { ...s, lot: { ...s.lot, remainMs } };
      if (s.lot.status === "open") return hammer(s);
      if (s.lot.status === "rtm") return sell(s, s.lot.bidder!, false);
      return openLot({ ...s, pos: s.pos + 1, lot: null });
    }
    case "pause":
      return s.phase === "auction" ? { ...s, paused: a.on } : s;
    case "end":
      return s.phase === "auction" || s.phase === "retention" ? { ...s, phase: "done", lot: null, paused: false } : s;
  }
}
