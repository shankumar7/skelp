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
export const getPlayer = (id: number): Player => byId.get(id)!;

export const ROLE_LABEL: Record<Role, string> = { BAT: "BATTER", BOWL: "BOWLER", AR: "ALL-ROUNDER", WK: "WICKET-KEEPER" };
export const COUNTRY_LABEL: Record<string, string> = {
  IND: "INDIA", AUS: "AUSTRALIA", ENG: "ENGLAND", SA: "SOUTH AFRICA", NZ: "NEW ZEALAND",
  WI: "WEST INDIES", AFG: "AFGHANISTAN", SL: "SRI LANKA", BAN: "BANGLADESH",
};
