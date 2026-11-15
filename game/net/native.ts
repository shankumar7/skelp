import TcpSocket from "react-native-tcp-socket";
import * as Network from "expo-network";
import { makeTransport, Transport } from "./transport";

/** Real TCP sockets on Android / iOS. */
export const transport: Transport | null = makeTransport(TcpSocket);

/** This phone's Wi-Fi address, or null when it is the hotspot owner / offline. */
export async function getLocalIp(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    if (!ip || ip === "0.0.0.0" || ip.includes(":")) return null;
    return ip;
  } catch {
    return null;
  }
}
