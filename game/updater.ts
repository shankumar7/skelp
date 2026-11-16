/**
 * In-app updates. Skelp! is shared as an APK, so there is no app store to update it:
 * the app asks GitHub for the latest release, downloads the APK and hands it to Android's installer.
 * Android only installs it if it is signed with the same key as the app already on the phone.
 */
import { Platform } from "react-native";
import pkg from "../package.json";

export const APP_VERSION: string = pkg.version;
const REPO = "shankumar7/skelp";
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;
const FALLBACK_APK = `https://github.com/${REPO}/releases/latest/download/skelp.apk`;

export interface Update { version: string; notes: string; url: string; size: number; page: string }

/** "v1.5" / "1.5.0" -> [1, 5, 0] */
export function parseVersion(v: string): number[] {
  const m = String(v).trim().replace(/^v/i, "").match(/^\d+(\.\d+)*/);
  const parts = (m ? m[0] : "0").split(".").map(Number);
  while (parts.length < 3) parts.push(0);
  return parts;
}
/** > 0 when `a` is newer than `b`. */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a), y = parseVersion(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
/** Release notes as plain lines: markdown headings, bullets and links stripped. */
export function tidyNotes(body: string): string {
  return String(body ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").replace(/^\s*[-*]\s+/, "• ").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(.+?)\]\((.+?)\)/g, "$1").replace(/`/g, "").trimEnd())
    .filter((l, i, all) => l.trim() !== "" || (i > 0 && all[i - 1].trim() !== ""))
    .join("\n")
    .trim()
    .slice(0, 1500);
}
/** Turn GitHub's "latest release" answer into an Update, or null if it is not newer than `current`. */
export function pickUpdate(release: any, current = APP_VERSION): Update | null {
  if (!release || typeof release.tag_name !== "string" || release.draft || release.prerelease) return null;
  if (compareVersions(release.tag_name, current) <= 0) return null;
  const apk = Array.isArray(release.assets) ? release.assets.find((a: any) => typeof a?.name === "string" && a.name.toLowerCase().endsWith(".apk")) : null;
  const url = typeof apk?.browser_download_url === "string" && apk.browser_download_url.startsWith(`https://github.com/${REPO}/`) ? apk.browser_download_url : FALLBACK_APK;
  return { version: parseVersion(release.tag_name).join(".").replace(/\.0$/, ""), notes: tidyNotes(release.body), url, size: Number(apk?.size) || 0, page: RELEASES_URL };
}

export const canSelfUpdate = Platform.OS === "android";

/** Ask GitHub whether a newer Skelp! exists. Never throws: resolves null when offline or up to date. */
export async function checkForUpdate(timeoutMs = 8000): Promise<{ ok: true; update: Update | null } | { ok: false }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" }, signal: ctl.signal });
    if (!res.ok) return { ok: false };
    return { ok: true, update: pickUpdate(await res.json()) };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

/** Download the APK (reporting 0..1 progress) and open Android's installer on it. */
export async function downloadAndInstall(update: Update, onProgress: (fraction: number) => void): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canSelfUpdate) return { ok: false, error: "Updates install only on Android." };
  try {
    const FileSystem = require("expo-file-system/legacy");
    const IntentLauncher = require("expo-intent-launcher");
    const target = `${FileSystem.cacheDirectory}skelp-${update.version}.apk`;
    await FileSystem.deleteAsync(target, { idempotent: true });
    const job = FileSystem.createDownloadResumable(update.url, target, {}, (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
      const total = p.totalBytesExpectedToWrite > 0 ? p.totalBytesExpectedToWrite : update.size;
      if (total > 0) onProgress(Math.min(1, p.totalBytesWritten / total));
    });
    const done = await job.downloadAsync();
    if (!done || done.status !== 200) return { ok: false, error: "The download did not finish. Check your internet connection and try again." };
    const info = await FileSystem.getInfoAsync(target);
    if (!info.exists || (info.size ?? 0) < 1_000_000) return { ok: false, error: "The downloaded file looks incomplete. Please try again." };
    onProgress(1);
    const contentUri = await FileSystem.getContentUriAsync(target);
    // FLAG_GRANT_READ_URI_PERMISSION (1) lets the system installer read our file
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: contentUri, flags: 1, type: "application/vnd.android.package-archive" });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not download the update. Check your internet connection and try again." };
  }
}
