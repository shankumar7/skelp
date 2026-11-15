import TcpSocket from "react-native-tcp-socket";
import * as Network from "expo-network";
import { Platform } from "react-native";
import { makeTransport, Transport } from "./transport";

/** Last known Wi-Fi client address of this phone (null: not on Wi-Fi, or this phone is the hotspot). */
let wifiIp: string | null = null;

/**
 * Real TCP sockets on Android / iOS. While the phone is a Wi-Fi client, connections are bound to Wi-Fi:
 * a hotspot has no internet, so Android would otherwise send them over mobile data. Off Wi-Fi (or on the
 * phone that is sharing the hotspot) they go out normally.
 */
export const transport: Transport | null = makeTransport(TcpSocket, () =>
  Platform.OS === "android" && wifiIp ? [{ interface: "wifi" }, {}] : [{}],
);

/** This phone's Wi-Fi address, or null when it is the hotspot owner / offline. */
export async function getLocalIp(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    wifiIp = !ip || ip === "0.0.0.0" || ip.includes(":") ? null : ip;
  } catch {
    wifiIp = null;
  }
  return wifiIp;
}
