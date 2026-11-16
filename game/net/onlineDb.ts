/**
 * Firebase Realtime Database behind the small `Db` interface that online play uses.
 * Guests are signed in anonymously, so playing online never needs an account.
 */
import { getApp } from "@react-native-firebase/app";
import { getAuth, signInAnonymously } from "@react-native-firebase/auth";
import { child, get, getDatabase, onChildAdded, onChildRemoved, onDisconnect, onValue, push, ref, remove, set } from "@react-native-firebase/database";
import { Db } from "./online";

export const onlineAvailable = true;

/** Where the project's database can live, most likely first (it is created in the Firebase console). */
const CANDIDATES = [
  "https://your-firebase-project-default-rtdb.asia-southeast1.firebasedatabase.app",
  "https://your-firebase-project-default-rtdb.firebaseio.com",
  "https://your-firebase-project-default-rtdb.europe-west1.firebasedatabase.app",
];
let found: string | null = null;

/** Find the database: an existing one answers "permission denied" to a stranger, a missing one answers "not found". */
async function locate(): Promise<string | null> {
  if (found) return found;
  let reachedInternet = false;
  for (const url of CANDIDATES) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    try {
      const res = await fetch(`${url}/.json?shallow=true`, { signal: ctl.signal });
      reachedInternet = true;
      if (res.status === 401 || res.status === 403 || res.status === 200) { found = url; return url; }
    } catch {
      // try the next one
    } finally {
      clearTimeout(timer);
    }
  }
  if (!reachedInternet) throw new Error("offline");
  return null;
}

export type OnlineResult = { ok: true; db: Db } | { ok: false; error: string };

/** Sign in (anonymously if needed), find the database and hand back a ready `Db`. */
export async function openOnline(): Promise<OnlineResult> {
  let url: string | null;
  try {
    url = await locate();
  } catch {
    return { ok: false, error: "Online play needs the internet. Check your connection and try again." };
  }
  if (!url) return { ok: false, error: "Online play is not switched on yet. Play over Wi-Fi or a hotspot for now." };
  try {
    const auth = getAuth();
    if (!auth.currentUser) await signInAnonymously(auth);
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("no user");
    const db = getDatabase(getApp(), url);
    const at = (path: string) => ref(db, path);
    const adapter: Db = {
      uid,
      get: async (path) => (await get(at(path))).val(),
      set: (path, value) => set(at(path), value),
      remove: (path) => remove(at(path)),
      push: (path, value) => { push(at(path), value).then(undefined, () => {}); },
      newKey: () => push(child(at("arenas"), "k")).key as string,
      // a listener the rules cut off (our connection was removed) reads as "gone"
      onValue: (path, cb) => onValue(at(path), (snap) => cb(snap.val()), () => cb(null)),
      onChildAdded: (path, cb) => onChildAdded(at(path), (snap) => cb(snap.key as string, snap.val()), () => {}),
      onChildRemoved: (path, cb) => onChildRemoved(at(path), (snap) => cb(snap.key as string), () => {}),
      removeOnDisconnect: (path) => { onDisconnect(at(path)).remove().catch(() => {}); },
      cancelOnDisconnect: (path) => { onDisconnect(at(path)).cancel().catch(() => {}); },
    };
    return { ok: true, db: adapter };
  } catch (e: any) {
    const code = String(e?.code ?? "");
    if (code.includes("operation-not-allowed") || code.includes("admin-restricted")) return { ok: false, error: "Online play is not switched on yet. Play over Wi-Fi or a hotspot for now." };
    return { ok: false, error: "Could not connect to online play. Check your internet connection and try again." };
  }
}
