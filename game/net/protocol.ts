import { Action, State } from "../engine";

export const PORT = 47474;
export const PROTOCOL = 1;

export type ClientMsg =
  | { t: "probe" }
  | { t: "hello"; v: number; id: string; name: string; avatar: string }
  | { t: "act"; a: Action }
  | { t: "ping" };

export type ServerMsg =
  | { t: "info"; v: number; arena: string; teams: number; max: number; phase: State["phase"]; mode: string }
  | { t: "welcome"; id: string }
  | { t: "state"; s: State }
  | { t: "reject"; reason: string }
  | { t: "pong" };

export interface ArenaInfo { host: string; arena: string; teams: number; max: number; phase: State["phase"]; mode: string }

/** JSON on one ASCII-only line, so a multi-byte character can never be split across TCP chunks. */
export function encode(msg: ClientMsg | ServerMsg): string {
  return JSON.stringify(msg).replace(/[\u007f-￿]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}
export function decode<T>(line: string): T | null {
  try {
    const m = JSON.parse(line);
    return m && typeof m.t === "string" ? (m as T) : null;
  } catch {
    return null;
  }
}
