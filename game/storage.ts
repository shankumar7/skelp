/**
 * What Skelp! remembers on the phone (AsyncStorage). Signed-in players also have a cloud copy in
 * Firebase (see cloud.ts); this local copy is what the app runs from, so it works fully offline.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveProfile } from "./cloud";

export interface Profile {
  /** stable device/player id — lets a phone rejoin an arena after a Wi-Fi drop */
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarIdx: number;
  guest: boolean;
  /** Firebase account id; null for guests */
  uid: string | null;
  /** whether the email address has been confirmed */
  verified: boolean;
}
export interface HistoryItem { date: number; arena: string; rank: number; teams: number; power: number; spent: number; players: number }
export interface Stats { auctions: number; wins: number; spent: number; history: HistoryItem[] }
interface Saved { current: Profile | null; stats: Stats; sound: boolean }

const KEY = "skelp.v1";
const EMPTY_STATS: Stats = { auctions: 0, wins: 0, spent: 0, history: [] };
const EMPTY: Saved = { current: null, stats: EMPTY_STATS, sound: true };
let cache: Saved | null = null;

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export async function load(): Promise<Saved> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // profiles from before online accounts (1.0 – 1.2) were local-only: keep their stats, sign them out
    const current: Profile | null = parsed.current && "uid" in parsed.current ? parsed.current : null;
    cache = { ...EMPTY, ...parsed, current };
  } catch {
    cache = { ...EMPTY };
  }
  return cache!;
}
async function save(next: Saved) {
  cache = next;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch {}
}

/** Combine the phone's stats with the cloud copy: keep whichever has more auctions, and every history item. */
export function mergeStats(local: Stats, cloud: Partial<Stats> | null | undefined): Stats {
  if (!cloud) return local;
  const c: Stats = { ...EMPTY_STATS, ...cloud, history: Array.isArray(cloud.history) ? cloud.history : [] };
  const base = c.auctions > local.auctions ? c : local;
  const seen = new Set<number>();
  const history = [...local.history, ...c.history]
    .filter((h) => h && typeof h.date === "number" && !seen.has(h.date) && seen.add(h.date))
    .sort((x, y) => y.date - x.date)
    .slice(0, 10);
  return { auctions: base.auctions, wins: base.wins, spent: base.spent, history };
}

function backup(p: Profile, stats: Stats) {
  if (p.uid) saveProfile(p.uid, { name: p.name, avatar: p.avatar, avatarIdx: p.avatarIdx, stats: { auctions: stats.auctions, wins: stats.wins, spent: stats.spent }, history: stats.history });
}

/** Store a freshly signed-in (or signed-up) account, merging in its cloud stats. */
export async function setSignedIn(p: Profile, cloudStats?: Partial<Stats> | null): Promise<Stats> {
  const d = await load();
  const stats = mergeStats(d.stats, cloudStats);
  await save({ ...d, current: p, stats });
  backup(p, stats);
  return stats;
}

export async function updateProfile(changes: Partial<Profile>): Promise<Profile | null> {
  const d = await load();
  if (!d.current) return null;
  const current = { ...d.current, ...changes };
  await save({ ...d, current });
  return current;
}

export async function signInGuest(name: string, avatar: string, avatarIdx: number): Promise<Profile> {
  const d = await load();
  const p: Profile = { id: newId(), name, email: "", avatar, avatarIdx, guest: true, uid: null, verified: false };
  await save({ ...d, current: p });
  return p;
}
/** Sign out. Stats stay on the phone; a signed-in player's stats were already backed up. */
export async function signOut(clearStats = false) {
  const d = await load();
  await save({ ...d, current: null, stats: clearStats ? EMPTY_STATS : d.stats });
}
export async function recordAuction(item: HistoryItem): Promise<Stats> {
  const d = await load();
  const stats: Stats = {
    auctions: d.stats.auctions + 1,
    wins: d.stats.wins + (item.rank === 1 ? 1 : 0),
    spent: d.stats.spent + item.spent,
    history: [item, ...d.stats.history].slice(0, 10),
  };
  await save({ ...d, stats });
  if (d.current) backup(d.current, stats);
  return stats;
}
export async function saveSound(on: boolean) {
  const d = await load();
  await save({ ...d, sound: on });
}
