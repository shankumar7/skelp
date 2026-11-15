import { Linking, Platform } from "react-native";

async function open(actions: string[]) {
  if (Platform.OS !== "android") { Linking.openSettings().catch(() => {}); return; }
  for (const action of actions) {
    try { await Linking.sendIntent(action); return; } catch {}
  }
  Linking.openSettings().catch(() => {});
}
/** Jump to the phone's hotspot settings (falls back to general network settings on phones that hide the page). */
export const openHotspotSettings = () => open(["android.settings.TETHER_SETTINGS", "android.settings.WIRELESS_SETTINGS", "android.settings.SETTINGS"]);
/** Jump to the phone's Wi-Fi list. */
export const openWifiSettings = () => open(["android.settings.WIFI_SETTINGS", "android.settings.WIRELESS_SETTINGS", "android.settings.SETTINGS"]);
