/** Browsers (the web preview) have no Firebase native SDK: online accounts are an Android feature. */
import type { CloudProfile, CloudResult } from "./cloudTypes";

export type { CloudProfile, CloudResult } from "./cloudTypes";
export const cloudAvailable = false;
const off = async <T,>(): Promise<CloudResult<T>> => ({ ok: false, error: "Online accounts work in the Android app. Continue as a guest to try Skelp! here." });

export const saveProfile = (_uid: string, _data: Omit<CloudProfile, "updatedAt">) => {};
export const signUp = (_e: string, _p: string, _n: string, _a: string, _i: number) => off<{ uid: string; email: string; verified: boolean }>();
export const signIn = (_e: string, _p: string) => off<{ uid: string; email: string; verified: boolean; name: string; saved: CloudProfile | null }>();
export const signInWithGoogle = () => off<{ uid: string; email: string; name: string; saved: CloudProfile | null } | null>();
export const resetPassword = (_e: string) => off<void>();
export const resendVerification = () => off<void>();
export const refreshVerified = () => off<boolean>();
export const currentUid = (): string | null => null;
export const logOut = () => {};
export const deleteAccount = (_p: string) => off<void>();
