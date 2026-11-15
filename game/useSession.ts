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

/** Time left on the current lot (whole seconds, and as a 0..1 fraction of the bid clock), animated locally between host updates. */
export function useCountdown({ state, status, stamp }: Snapshot): { seconds: number; fraction: number } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  const lot = state?.lot;
  if (!state || !lot) return { seconds: 0, fraction: 0 };
  const running = lot.status === "open" && !state.paused && status === "live";
  const elapsed = running || lot.status !== "open" ? Math.max(0, now - stamp) : 0;
  const ms = Math.max(0, lot.remainMs - elapsed);
  const total = lot.status === "open" ? state.config.timer * 1000 : 3000;
  return { seconds: Math.ceil(ms / 1000), fraction: Math.min(1, ms / total) };
}
