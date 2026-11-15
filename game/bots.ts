/** Simple AI bidders — used for solo practice and to fill empty seats in a LAN arena. */
import { Action, bidBlocker, nextBid, State, Team } from "./engine";
import { getPlayer } from "./players";

export const BOT_NAMES = ["RAJA", "VEERA", "KABIR", "ZARA", "ARJUN", "MEERA", "ROCKY", "TARA", "DEV"];
export const BOT_AVATARS = ["flash", "trophy", "rocket", "skull", "planet", "construct", "thunderstorm", "eye", "heart"];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/** The most this bot is willing to pay for a player (in lakhs). Stable per bot+player. */
export function valuation(s: State, team: Team, pid: number): number {
  const p = getPlayer(pid);
  const taste = 0.6 + hash(team.id + ":" + pid) * 0.7; // every bot rates players a bit differently
  const quality = Math.max(0, (p.rating - 64) / 31);
  const scale = s.config.purse / 10000;
  let value = Math.max(p.base, Math.round((quality * quality * 1700 * taste * scale) / 5) * 5);
  // keep enough money back to fill the rest of the squad at a modest price
  const slotsLeft = Math.max(0, Math.min(s.config.squadMax, 11) - team.squad.length - 1);
  value = Math.min(value, team.purse - slotsLeft * 40);
  // need-based nudge: want at least one keeper and a few bowlers
  const have = team.squad.filter((e) => getPlayer(e.pid).role === p.role).length;
  if (have === 0) value = Math.round(value * 1.15);
  return value;
}

export class BotBrain {
  private timers = new Map<string, number>();
  private lotKey = "";
  constructor(private rnd: () => number = Math.random) {}

  /** Advance bot clocks by dt ms and return the actions the bots want to take now. */
  step(s: State, dt: number): Action[] {
    const lot = s.lot;
    if (s.phase !== "auction" || !lot || lot.status !== "open" || s.paused) return [];
    const key = `${s.round}:${lot.pid}:${lot.bid}:${lot.bidder}`;
    if (key !== this.lotKey) {
      this.lotKey = key;
      this.timers.clear();
      for (const t of s.teams) if (t.isBot) this.timers.set(t.id, 700 + this.rnd() * Math.min(2600, s.config.timer * 250));
    }
    const out: Action[] = [];
    for (const t of s.teams) {
      if (!t.isBot || !this.timers.has(t.id)) continue;
      const left = this.timers.get(t.id)! - dt;
      if (left > 0) { this.timers.set(t.id, left); continue; }
      this.timers.delete(t.id);
      if (lot.bidder === t.id || lot.passed.includes(t.id)) continue;
      const amount = nextBid(lot);
      if (bidBlocker(s, t.id, amount) === null && amount <= valuation(s, t, lot.pid)) {
        out.push({ type: "bid", id: t.id, amount });
        break; // one bot bid per step — the others re-think against the new price
      }
      out.push({ type: "pass", id: t.id });
    }
    return out;
  }
}
