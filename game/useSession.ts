import { useEffect, useState } from "react";
import { State } from "./engine";
import { Session, Status } from "./net/session";

export interface Snapshot { state: State | null; status: Status; stamp: number }
const snap = (s: Session): Snapshot => ({ state: s.getState(), status: s.getStatus(), stamp: s.getStamp() });

/** Mirror the session into React state so screens re-render whenever it changes. */
export function useSession(session: Session): Snapshot {
  const [value, setValue] = useState<Snapshot>(() => snap(session));
  useEffect(() => {
    setValue(snap(session));
    return session.subscribe(() => setValue(snap(session)));
  }, [session]);
  return value;
}

/** Seconds left on the current lot, animated locally between host updates. */
export function useCountdown({ state, status, stamp }: Snapshot): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  const lot = state?.lot;
  if (!state || !lot) return 0;
  const running = lot.status === "open" && !state.paused && status === "live";
  const elapsed = running || lot.status !== "open" ? Math.max(0, now - stamp) : 0;
  return Math.max(0, Math.ceil((lot.remainMs - elapsed) / 1000));
}
