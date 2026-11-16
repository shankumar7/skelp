/**
 * Phone notifications for the moments that matter in an auction, shown only while Skelp! is in the
 * background. They are raised by the app itself (there is no server), so they work for as long as
 * Android keeps the app running behind the screen.
 */
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";

const CHANNEL = "auction";
let asked = false;
let allowed = false;

/** Ask for permission (once) and set up the Android channel. Safe to call often. */
export async function enableAlerts(): Promise<boolean> {
  if (asked) return allowed;
  asked = true;
  try {
    // while the app is open the arena itself shows what is happening: no banner on top of it
    Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }) });
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: "Auction alerts", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 200, 120, 200], lightColor: "#5B5FEF" });
    }
    let p = await Notifications.getPermissionsAsync();
    if (!p.granted && p.canAskAgain) p = await Notifications.requestPermissionsAsync();
    allowed = p.granted;
  } catch {
    allowed = false;
  }
  return allowed;
}

/** Show a notification now — but only if the player is not already looking at the app. */
export function alertPlayer(title: string, body: string) {
  if (!allowed || AppState.currentState === "active") return;
  Notifications.scheduleNotificationAsync({ content: { title, body, sound: true }, trigger: Platform.OS === "android" ? { channelId: CHANNEL } : null }).catch(() => {});
}
/** Clear what we posted once the player is back in the app. */
export function clearAlerts() {
  if (!allowed) return;
  Notifications.dismissAllNotificationsAsync().catch(() => {});
}
