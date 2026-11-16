/** AI bidders — used for solo practice and to fill empty seats in a LAN arena. */
import { Action, bidBlocker, nextBid, State, Team } from "./engine";
import { increment } from "./money";
import { getPlayer, Role } from "./players";

export const BOT_NAMES = ["RAJA", "VEERA", "KABIR", "ZARA", "ARJUN", "MEERA", "ROCKY", "TARA", "DEV"];
export const BOT_AVATARS = ["flash", "trophy", "rocket", "skull", "planet", "construct", "thunderstorm", "eye", "heart"];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/** Every bot has a bidding style. */
export interface Personality {
  key: "STAR HUNTER" | "BARGAIN HUNTER" | "BALANCED" | "PACE LOVER" | "BIG HITTER" | "ALL-ROUND FAN";
  /** multiplier on stars (rating 88+) and on everyone else */
  star: number;
  rest: number;
  /** extra appetite per role */
  love: Partial<Record<Role, number>>;
  /** chance of a jump bid instead of the minimum raise */
  jump: number;
  /** thinking-time multiplier */
  pace: number;
}
const PERSONALITIES: Personality[] = [
  { key: "STAR HUNTER", star: 1.35, rest: 0.8, love: {}, jump: 0.3, pace: 0.8 },
  { key: "BARGAIN HUNTER", star: 0.8, rest: 1.1, love: {}, jump: 0, pace: 1.3 },
  { key: "BALANCED", star: 1, rest: 1, love: {}, jump: 0.1, pace: 1 },
  { key: "PACE LOVER", star: 1, rest: 0.95, love: { BOWL: 1.3 }, jump: 0.1, pace: 1 },
  { key: "BIG HITTER", star: 1.1, rest: 0.95, love: { BAT: 1.25, WK: 1.1 }, jump: 0.2, pace: 0.9 },
  { key: "ALL-ROUND FAN", star: 1, rest: 1, love: { AR: 1.35 }, jump: 0.1, pace: 1.1 },
];
export const personality = (teamId: string): Personality => PERSONALITIES[Math.floor(hash("style:" + teamId) * PERSONALITIES.length)];

/** How many of each role a squad of `size` should aim for. */
export function roleTargets(size: number): Record<Role, number> {
  const n = Math.max(4, size);
  const wk = n >= 14 ? 2 : 1;
  const ar = Math.max(1, Math.round(n * 0.2));
  const bowl = Math.max(1, Math.round(n * 0.35));
  return { WK: wk, AR: ar, BOWL: bowl, BAT: Math.max(1, n - wk - ar - bowl) };
}

/** The most this bot is willing to pay for a player (in lakhs). Stable per bot+player. */
export function valuation(s: State, team: Team, pid: number): number {
  const p = getPlayer(pid);
  const style = personality(team.id);
  const taste = 0.7 + hash(team.id + ":" + pid) * 0.5; // every bot rates players a bit differently
  const quality = Math.max(0, (p.rating - 64) / 31);
  const scale = s.config.purse / 10000;
  let value = quality * quality * 1700 * taste * scale;
  value *= (p.rating >= 88 ? style.star : style.rest) * (style.love[p.role] ?? 1);

  // squad balance: pay up for roles the squad is short of, lose interest once a role is covered
  const goal = Math.min(s.config.squadMax, 11);
  const targets = roleTargets(goal);
  const have = team.squad.filter((e) => getPlayer(e.pid).role === p.role).length;
  if (have === 0) {
    // nobody in this role yet: if few of them are still to come, this one is a must-have
    let coming = 0;
    for (let i = s.pos + 1; i < s.queue.length; i++) if (getPlayer(s.queue[i]).role === p.role) coming++;
    value *= coming < s.teams.length ? 2 : 1.25;
    if (coming < s.teams.length) value = Math.max(value, p.base * 2.5);
  }
  else if (have < targets[p.role]) value *= 1.1;
  else if (have >= targets[p.role] + 1) value *= 0.45;
  else value *= 0.75;

  // late in the auction with money to burn: loosen up; with seats still to fill: get less picky
  const lotsLeft = Math.max(1, s.queue.length - s.pos);
  const seatsLeft = Math.max(0, goal - team.squad.length);
  if (seatsLeft > 0 && lotsLeft <= seatsLeft * s.teams.length) value *= 1.3;
  if (seatsLeft > 0) value = Math.max(value, Math.min(p.base * 1.5, (team.purse / seatsLeft) * 0.6));
  if (team.squad.length >= goal) value *= 0.6; // the eleven is done: only bargains from here

  value = Math.max(p.base, Math.round(value / 5) * 5);
  // keep enough money back to fill the rest of the eleven at a modest price
  const reserve = Math.max(0, seatsLeft - 1) * 40;
  return Math.min(value, team.purse - reserve);
}

export class BotBrain {
  private timers = new Map<string, number>();
  private lotKey = "";
  constructor(private rnd: () => number = Math.random) {}

  /** Advance bot clocks by dt ms and return the actions the bots want to take now. */
  step(s: State, dt: number): Action[] {
    const lot = s.lot;
    if (s.phase !== "auction" || !lot || s.paused) return [];
    if (lot.status === "rtm") return this.rtmStep(s, dt);
    if (lot.status !== "open") return [];
    const key = `${s.round}:${lot.pid}:${lot.bid}:${lot.bidder}:${lot.n}`;
    if (key !== this.lotKey) {
      this.lotKey = key;
      this.timers.clear();
      for (const t of s.teams) if (t.isBot) this.timers.set(t.id, (700 + this.rnd() * Math.min(2600, s.config.timer * 250)) * personality(t.id).pace);
    }
    const out: Action[] = [];
    for (const t of s.teams) {
      if (!t.isBot || !this.timers.has(t.id)) continue;
      const left = this.timers.get(t.id)! - dt;
      if (left > 0) { this.timers.set(t.id, left); continue; }
      this.timers.delete(t.id);
      if (lot.bidder === t.id || lot.passed.includes(t.id)) continue;
      const min = nextBid(lot);
      const worth = valuation(s, t, lot.pid);
      if (bidBlocker(s, t.id, min) === null && min <= worth) {
        // a confident bot sometimes jumps the price to scare the room
        let amount = min;
        const jump = min + increment(min) * 2;
        if (this.rnd() < personality(t.id).jump && jump <= worth * 0.8 && bidBlocker(s, t.id, jump) === null) amount = jump;
        out.push({ type: "bid", id: t.id, amount });
        break; // one bot bid per step — the others re-think against the new price
      }
      out.push({ type: "pass", id: t.id });
    }
    return out;
  }

  /** A bot that is offered a Right to Match thinks for a moment, then answers. */
  private rtmStep(s: State, dt: number): Action[] {
    const lot = s.lot!;
    const team = s.teams.find((t) => t.id === lot.rtmTeam);
    if (!team?.isBot) return [];
    const key = `rtm:${s.round}:${lot.pid}`;
    if (key !== this.lotKey) {
      this.lotKey = key;
      this.timers.clear();
      this.timers.set(team.id, 1200 + this.rnd() * 1500);
    }
    const left = (this.timers.get(team.id) ?? 0) - dt;
    if (left > 0) { this.timers.set(team.id, left); return []; }
    return [{ type: "rtm", id: team.id, use: lot.bid <= valuation(s, team, lot.pid) * 1.15 }];
  }
}
