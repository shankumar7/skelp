/**
 * Online accounts and cloud backup through Firebase (project "your-firebase-project").
 *  - Firebase Auth: email + password accounts. Firebase itself sends the account emails
 *    (address verification, password reset) — no mail server or password lives in this app.
 *  - Firestore: one document per player, users/{uid}, holding the profile and stats.
 *    Firestore queues writes made offline and sends them when the phone is back online,
 *    so finishing an auction on a hotspot without internet still ends up in the cloud.
 * Auctions themselves never touch the internet; they stay phone-to-phone over Wi-Fi.
 */
import {
  createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, getAuth, reauthenticateWithCredential, reload,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile,
} from "@react-native-firebase/auth";
import { deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc } from "@react-native-firebase/firestore";
import { friendlyError } from "./cloudErrors";
import type { CloudProfile, CloudResult } from "./cloudTypes";

export type { CloudProfile, CloudResult } from "./cloudTypes";
export const cloudAvailable = true;

const auth = () => getAuth();
const userDoc = (uid: string) => doc(getFirestore(), "users", uid);

async function attempt<T>(fn: () => Promise<T>): Promise<CloudResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

/** The profile saved in Firestore, or null if there is none (or the database is unreachable). */
async function readProfile(uid: string): Promise<CloudProfile | null> {
  try {
    const snap = await getDoc(userDoc(uid));
    return snap.exists() ? (snap.data() as CloudProfile) : null;
  } catch {
    return null;
  }
}

/** Save profile + stats. Never throws and never waits for the network: Firestore syncs it later. */
export function saveProfile(uid: string, data: Omit<CloudProfile, "updatedAt">) {
  setDoc(userDoc(uid), { ...data, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
}

export function signUp(email: string, password: string, name: string, avatar: string, avatarIdx: number) {
  return attempt(async () => {
    const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password);
    const user = cred.user;
    await updateProfile(user, { displayName: name }).catch(() => {});
    await sendEmailVerification(user).catch(() => {});
    saveProfile(user.uid, { name, avatar, avatarIdx, stats: { auctions: 0, wins: 0, spent: 0 }, history: [] });
    return { uid: user.uid, email: user.email ?? email.trim(), verified: user.emailVerified };
  });
}

export function signIn(email: string, password: string) {
  return attempt(async () => {
    const cred = await signInWithEmailAndPassword(auth(), email.trim(), password);
    const user = cred.user;
    const saved = await readProfile(user.uid);
    return { uid: user.uid, email: user.email ?? email.trim(), verified: user.emailVerified, name: saved?.name ?? user.displayName ?? "", saved };
  });
}

export const resetPassword = (email: string) => attempt(() => sendPasswordResetEmail(auth(), email.trim()));

export function resendVerification() {
  return attempt(async () => {
    const user = auth().currentUser;
    if (!user) throw new Error("not-signed-in");
    await sendEmailVerification(user);
  });
}

/** Ask Firebase whether the address has been verified since we last looked. */
export function refreshVerified() {
  return attempt(async () => {
    const user = auth().currentUser;
    if (!user) return false;
    await reload(user);
    return !!auth().currentUser?.emailVerified;
  });
}

export function currentUid(): string | null {
  return auth().currentUser?.uid ?? null;
}

export function logOut() {
  signOut(auth()).catch(() => {});
}

/** Delete the cloud data and the account. Firebase asks for the password again for safety. */
export function deleteAccount(password: string) {
  return attempt(async () => {
    const user = auth().currentUser;
    if (!user || !user.email) throw new Error("not-signed-in");
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    await deleteDoc(userDoc(user.uid)).catch(() => {});
    await deleteUser(user);
  });
}
