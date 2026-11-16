/** The web preview has no Firebase native SDK: online play is an Android feature. */
import { Db } from "./online";

export const onlineAvailable = false;
export type OnlineResult = { ok: true; db: Db } | { ok: false; error: string };
export async function openOnline(): Promise<OnlineResult> {
  return { ok: false, error: "Online play works in the Android app. Try SOLO PRACTICE here." };
}
