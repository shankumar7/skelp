export interface CloudStats { auctions: number; wins: number; spent: number }
export interface CloudHistoryItem { date: number; arena: string; rank: number; teams: number; power: number; spent: number; players: number }
export interface CloudProfile {
  name: string;
  avatar: string;
  avatarIdx: number;
  stats: CloudStats;
  history: CloudHistoryItem[];
  updatedAt?: unknown;
}
export type CloudResult<T> = { ok: true; value: T } | { ok: false; error: string };
