import { Transport } from "./transport";

/** Browsers cannot open raw TCP sockets — LAN play is native-only, solo play still works. */
export const transport: Transport | null = null;
export async function getLocalIp(): Promise<string | null> {
  return null;
}
