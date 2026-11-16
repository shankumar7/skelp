import data from "./data/players.json";

export type Role = "BAT" | "BOWL" | "AR" | "WK";

export interface Player {
  id: number;
  key: string;
  name: string;
  role: Role;
  country: string;
  overseas: boolean;
  /** base price in lakhs */
  base: number;
  /** Skelp! rating (60-99) — a game-design number used for bots and final squad power */
  rating: number;
}

export const PLAYERS: Player[] = data as Player[];
const byId = new Map(PLAYERS.map((p) => [p.id, p]));
/** Players a host added for one arena carry ids from here up; they travel inside the auction state. */
export const CUSTOM_ID = 10001;
export const MAX_CUSTOM = 20;
const custom = new Map<number, Player>();
const UNKNOWN: Player = { id: 0, key: "unknown", name: "UNKNOWN PLAYER", role: "BAT", country: "IND", overseas: false, base: 20, rating: 60 };
/** Make an arena's custom players known to getPlayer (called by the engine and by clients on every state). */
export function registerCustom(list: Player[]) {
  for (const p of list) custom.set(p.id, p);
}
export const getPlayer = (id: number): Player => byId.get(id) ?? custom.get(id) ?? UNKNOWN;
export const isCustom = (id: number) => id >= CUSTOM_ID;

export const ROLE_LABEL: Record<Role, string> = { BAT: "BATTER", BOWL: "BOWLER", AR: "ALL-ROUNDER", WK: "WICKET-KEEPER" };
export const COUNTRY_LABEL: Record<string, string> = {
  IND: "INDIA", AUS: "AUSTRALIA", ENG: "ENGLAND", SA: "SOUTH AFRICA", NZ: "NEW ZEALAND",
  WI: "WEST INDIES", OVS: "OVERSEAS", AFG: "AFGHANISTAN", SL: "SRI LANKA", BAN: "BANGLADESH",
};
