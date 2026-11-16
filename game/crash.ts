/** Crash reporting (Firebase Crashlytics). Reports are anonymous: no name, email or auction data is attached. */
export function reportError(error: unknown, where = "render") {
  try {
    const crashlytics = require("@react-native-firebase/crashlytics").default;
    const err = error instanceof Error ? error : new Error(String(error));
    crashlytics().log(`Skelp! error in ${where}`);
    crashlytics().recordError(err);
  } catch {
    // reporting must never be the thing that breaks the app
  }
}
