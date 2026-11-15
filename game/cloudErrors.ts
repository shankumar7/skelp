/** Turns Firebase error codes into sentences a player can act on. */
const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists. Sign in instead.",
  "auth/invalid-email": "That email address does not look right.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/wrong-password": "Wrong email or password.",
  "auth/user-not-found": "Wrong email or password.",
  "auth/invalid-credential": "Wrong email or password.",
  "auth/invalid-login-credentials": "Wrong email or password.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed": "No internet connection. Connect to the internet to sign in, or continue as a guest.",
  "auth/requires-recent-login": "For safety, sign out and sign in again, then try once more.",
  "auth/operation-not-allowed": "Online accounts are not switched on yet. Continue as a guest for now.",
  "auth/configuration-not-found": "Online accounts are not switched on yet. Continue as a guest for now.",
  "auth/missing-email": "Enter your email address first.",
};

export function friendlyError(e: unknown): string {
  const err = e as { code?: string; message?: string } | null;
  const code = err?.code ?? "";
  const message = String(err?.message ?? e ?? "");
  if (MESSAGES[code]) return MESSAGES[code];
  if (/CONFIGURATION_NOT_FOUND|OPERATION_NOT_ALLOWED|PASSWORD_LOGIN_DISABLED/.test(message)) return MESSAGES["auth/configuration-not-found"];
  if (/network|timeout|unavailable|offline/i.test(code + " " + message)) return MESSAGES["auth/network-request-failed"];
  if (message === "not-signed-in") return "You are not signed in.";
  return "Something went wrong. Please try again.";
}
