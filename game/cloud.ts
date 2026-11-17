/**
 * Online accounts and cloud backup through Firebase (the project in google-services.json).
 *  - Firebase Auth: email + password accounts, or "Continue with Google". Firebase itself sends the account emails
 *    (address verification, password reset) — no mail server or password lives in this app.
 *  - Firestore: one document per player, users/{uid}, holding the profile and stats.
 *    Firestore queues writes made offline and sends them when the phone is back online,
 *    so finishing an auction on a hotspot without internet still ends up in the cloud.
 * Auctions themselves never touch the internet; they stay phone-to-phone over Wi-Fi.
 */
import { GoogleSignin, isCancelledResponse } from "@react-native-google-signin/google-signin";
import {
  createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, getAuth, GoogleAuthProvider, signInWithCredential, reauthenticateWithCredential, reload,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile,
} from "@react-native-firebase/auth";
import { deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc } from "@react-native-firebase/firestore";
import { friendlyError } from "./cloudErrors";
import type { CloudProfile, CloudResult } from "./cloudTypes";

export type { CloudProfile, CloudResult } from "./cloudTypes";
export const cloudAvailable = true;

const auth = () => getAuth();

/**
 * The OAuth "Web client" Firebase created when Google sign-in was enabled. It is not kept in the source:
 * it comes from EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (in the private .env.local file, or a CI secret) and is
 * filled in when the app is bundled.
 */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
let googleReady = false;

/** Show Google's account picker; returns an ID token, or null if the player backed out. */
async function googleIdToken(): Promise<string | null> {
  if (!GOOGLE_WEB_CLIENT_ID) throw Object.assign(new Error("no-web-client"), { code: "auth/operation-not-allowed" });
  if (!googleReady) {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    googleReady = true;
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (isCancelledResponse(res)) return null;
  if (!res.data.idToken) throw Object.assign(new Error("no-id-token"), { code: "google/no-id-token" });
  return res.data.idToken;
}

const usesGoogle = () => !!auth().currentUser?.providerData.some((p) => p.providerId === "google.com");
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

/** "Continue with Google". `value` is null when the player closes the account picker. */
export function signInWithGoogle() {
  return attempt(async () => {
    const token = await googleIdToken();
    if (!token) return null;
    const cred = await signInWithCredential(auth(), GoogleAuthProvider.credential(token));
    const user = cred.user;
    const saved = await readProfile(user.uid);
    return { uid: user.uid, email: user.email ?? "", name: saved?.name ?? user.displayName ?? "", saved };
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
  const google = usesGoogle();
  signOut(auth()).catch(() => {});
  if (google) GoogleSignin.signOut().catch(() => {});      // next time, show the account picker again
}

/** Delete the cloud data and the account. Firebase asks the player to prove it is them again first:
 *  the password for email accounts, the Google account picker for Google accounts. */
export function deleteAccount(password: string) {
  return attempt(async () => {
    const user = auth().currentUser;
    if (!user) throw new Error("not-signed-in");
    if (usesGoogle()) {
      const token = await googleIdToken();
      if (!token) throw Object.assign(new Error("cancelled"), { code: "google/cancelled" });
      await reauthenticateWithCredential(user, GoogleAuthProvider.credential(token));
    } else {
      if (!user.email) throw new Error("not-signed-in");
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    }
    await deleteDoc(userDoc(user.uid)).catch(() => {});
    await deleteUser(user);
    GoogleSignin.revokeAccess().catch(() => {});
  });
}
