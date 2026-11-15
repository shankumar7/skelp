/** Everything Skelp! remembers lives on this phone only (AsyncStorage) — no accounts on any server. */
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Profile {
  /** stable device/player id — lets a phone rejoin an arena after a Wi-Fi drop */
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarIdx: number;
  guest: boolean;
  passHash: string;
}
export interface HistoryItem { date: number; arena: string; rank: number; teams: number; power: number; spent: number; players: number }
export interface Stats { auctions: number; wins: number; spent: number; history: HistoryItem[] }
interface Saved { account: Profile | null; current: Profile | null; stats: Stats }

const KEY = "skelp.v1";
const EMPTY: Saved = { account: null, current: null, stats: { auctions: 0, wins: 0, spent: 0, history: [] } };
let cache: Saved | null = null;

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

/** Not cryptography — just keeps the local profile password out of plain sight on the device. */
export function hashPassword(name: string, password: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  const str = `skelp:${name.trim().toLowerCase()}:${password}`;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

export async function load(): Promise<Saved> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    cache = { ...EMPTY };
  }
  return cache!;
}
async function save(next: Saved) {
  cache = next;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch {}
}

export async function signUp(name: string, email: string, password: string, avatar: string, avatarIdx: number): Promise<Profile> {
  const d = await load();
  const p: Profile = { id: newId(), name: name.trim(), email: email.trim(), avatar, avatarIdx, guest: false, passHash: hashPassword(name, password) };
  await save({ ...d, account: p, current: p });
  return p;
}
/** Returns the profile, or a message explaining why sign-in failed. */
export async function signIn(name: string, password: string): Promise<Profile | string> {
  const d = await load();
  if (!d.account) return "No player is registered on this phone yet. Tap Join Now to create one.";
  if (d.account.name.toLowerCase() !== name.trim().toLowerCase()) return "That username is not registered on this phone.";
  if (d.account.passHash !== hashPassword(name, password)) return "Wrong password. Try again.";
  await save({ ...d, current: d.account });
  return d.account;
}
export async function signInGuest(name: string, avatar: string, avatarIdx: number): Promise<Profile> {
  const d = await load();
  const p: Profile = { id: newId(), name, email: "", avatar, avatarIdx, guest: true, passHash: "" };
  await save({ ...d, current: p });
  return p;
}
export async function signOut() {
  const d = await load();
  await save({ ...d, current: null });
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
  return stats;
}
