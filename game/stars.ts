/** The player's shortlist: players starred in the pool, remembered on this phone and flagged when they come up for auction. */
import { useSyncExternalStore } from "react";
import { saveStars } from "./storage";

let stars: ReadonlySet<number> = new Set();
const watchers = new Set<() => void>();
const subscribe = (w: () => void) => { watchers.add(w); return () => { watchers.delete(w); }; };
const snapshot = () => stars;

export function initStars(list: number[] | undefined) {
  stars = new Set((list ?? []).filter((n) => Number.isInteger(n)));
  watchers.forEach((w) => w());
}
export function toggleStar(pid: number) {
  const next = new Set(stars);
  if (!next.delete(pid)) next.add(pid);
  stars = next;
  saveStars([...next]);
  watchers.forEach((w) => w());
}
export const useStars = (): ReadonlySet<number> => useSyncExternalStore(subscribe, snapshot, snapshot);
