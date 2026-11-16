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
  /** how the account signs in (missing on guests and profiles made before 1.4) */
  provider?: "password" | "google";
}
export interface HistoryItem { date: number; arena: string; rank: number; teams: number; power: number; spent: number; players: number }
export interface Stats { auctions: number; wins: number; spent: number; history: HistoryItem[] }
/** A finished auction kept on this phone in full, so it can be browsed later. */
export interface ArchiveTeam { id: string; name: string; fr?: string; owner: string; color: string; avatar: string; isBot: boolean; purse: number; power: number; squad: { pid: number; price: number; kept?: boolean; rtm?: boolean }[] }
export interface ArchivePlayer { id: number; name: string; role: string; country: string; overseas: boolean; base: number; rating: number }
export interface Archive { date: number; arena: string; mode: string; myId: string; sold: number; unsold: number; teams: ArchiveTeam[]; custom: ArchivePlayer[] }
export type ThemeChoice = "light" | "dark";
/** The arena this phone last joined, so it can get back in after the app was closed. */
export interface LastArena { arena: string; online: string | null; host: string; port: number; at: number }
interface Saved { current: Profile | null; stats: Stats; sound: boolean; theme?: ThemeChoice; archive: Archive[]; skippedUpdate?: string; stars?: number[]; lastArena?: LastArena | null }
export const MAX_ARCHIVE = 20;

const KEY = "skelp.v1";
const EMPTY_STATS: Stats = { auctions: 0, wins: 0, spent: 0, history: [] };
const EMPTY: Saved = { current: null, stats: EMPTY_STATS, sound: true, archive: [] };
let cache: Saved | null = null;

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export async function load(): Promise<Saved> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // profiles from before online accounts (1.0 – 1.2) were local-only: keep their stats, sign them out
    const current: Profile | null = parsed.current && "uid" in parsed.current ? parsed.current : null;
    cache = { ...EMPTY, ...parsed, current, archive: Array.isArray(parsed.archive) ? parsed.archive : [] };
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
  // a new name or avatar also goes to the cloud copy
  if ("name" in changes || "avatar" in changes) backup(current, d.stats);
  return current;
}
export async function saveTheme(theme: ThemeChoice) {
  const d = await load();
  await save({ ...d, theme });
}
export async function saveStars(stars: number[]) {
  const d = await load();
  await save({ ...d, stars: stars.slice(0, 300) });
}
export async function saveLastArena(lastArena: LastArena | null) {
  const d = await load();
  if (!lastArena && !d.lastArena) return;
  await save({ ...d, lastArena });
}
/** Remember that the player does not want to be asked about this version again. */
export async function skipUpdate(version: string) {
  const d = await load();
  await save({ ...d, skippedUpdate: version });
}
/** Keep the full result of an auction on this phone (newest first). */
export async function saveArchive(item: Archive): Promise<Archive[]> {
  const d = await load();
  const archive = [item, ...d.archive.filter((a) => a.date !== item.date)].slice(0, MAX_ARCHIVE);
  await save({ ...d, archive });
  return archive;
}
export async function deleteArchive(date: number): Promise<Archive[]> {
  const d = await load();
  const archive = d.archive.filter((a) => a.date !== date);
  await save({ ...d, archive });
  return archive;
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
