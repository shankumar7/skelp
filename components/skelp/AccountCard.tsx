import { ActivityIndicator, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as cloud from "@/game/cloud";
import { Profile } from "@/game/storage";
import { CLAY_CARD, CLAY_SOFT, confirm, s } from "./ui";

/** Shown at the top of the dashboard until the player confirms their email address. */
export function VerifyBanner({ profile, onProfile }: { profile: Profile; onProfile: (c: Partial<Profile>) => void }) {
  const [busy, setBusy] = useState<"check" | "send" | null>(null);
  const [note, setNote] = useState("");
  if (profile.guest || profile.verified || !profile.uid || profile.provider === "google") return null;
  const check = async () => {
    setBusy("check"); setNote("");
    const r = await cloud.refreshVerified();
    setBusy(null);
    if (!r.ok) return setNote(r.error);
    if (r.value) onProfile({ verified: true });
    else setNote("Not confirmed yet. Open the link in the email, then tap again.");
  };
  const resend = async () => {
    setBusy("send"); setNote("");
    const r = await cloud.resendVerification();
    setBusy(null);
    setNote(r.ok ? `Sent again to ${profile.email}. Check your spam folder too.` : r.error);
  };
  return (
    <View style={[st.card, { marginTop: 16, borderLeftWidth: 5, borderLeftColor: "#FFB238" }]}>
      <View style={s.row}>
        <Ionicons name="mail-unread" size={20} color="#DE8A12" />
        <Text style={st.title}>CONFIRM YOUR EMAIL</Text>
      </View>
      <Text style={st.body}>We sent a link to <Text style={{ fontFamily: "Inter_700Bold", color: "#2A2545" }}>{profile.email}</Text>. Confirming lets you reset your password if you forget it.</Text>
      {!!note && <Text style={st.note}>{note}</Text>}
      <View style={st.btnRow}>
        <Pressable onPress={check} disabled={!!busy} style={[st.btn, st.btnPrimary]}>
          {busy === "check" ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={[st.btnText, { color: "#FFF" }]}>I&apos;VE CONFIRMED</Text>}
        </Pressable>
        <Pressable onPress={resend} disabled={!!busy} style={st.btn}>
          {busy === "send" ? <ActivityIndicator color="#5B5FEF" size="small" /> : <Text style={st.btnText}>RESEND EMAIL</Text>}
        </Pressable>
      </View>
    </View>
  );
}

/** Account section at the foot of the dashboard. */
export function AccountCard({ profile, onCreateAccount, onDeleted }: { profile: Profile; onCreateAccount: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (profile.guest || !profile.uid) {
    return (
      <View style={st.card}>
        <View style={s.row}><Ionicons name="cloud-offline" size={20} color="#7A748F" /><Text style={st.title}>PLAYING AS A GUEST</Text></View>
        <Text style={st.body}>Your stats live only on this phone. Create a free account to back them up and sign in on any phone.</Text>
        <View style={st.btnRow}>
          <Pressable onPress={onCreateAccount} style={[st.btn, st.btnPrimary]}><Text style={[st.btnText, { color: "#FFF" }]}>CREATE ACCOUNT</Text></Pressable>
        </View>
      </View>
    );
  }
  const google = profile.provider === "google";
  const doDelete = async () => {
    setBusy(true); setError("");
    const r = await cloud.deleteAccount(password);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onDeleted();
  };
  return (
    <View style={st.card}>
      <View style={s.row}><Ionicons name="cloud-done" size={20} color="#16A07E" /><Text style={st.title}>BACKED UP TO YOUR ACCOUNT</Text></View>
      <Text style={st.body}>{profile.email}{google ? "  ·  Google account" : ""}{"\n"}Your profile and stats sync whenever this phone is online.</Text>
      {!deleting ? (
        <Pressable onPress={() => setDeleting(true)} hitSlop={8} style={{ marginTop: 12 }}><Text style={[st.btnText, { color: "#E04848", fontSize: 11 }]}>DELETE ACCOUNT…</Text></Pressable>
      ) : (
        <View style={{ marginTop: 12 }}>
          <Text style={st.body}>This permanently deletes your account and its backed-up stats. {google ? "Google will ask you to choose your account to confirm." : "Enter your password to confirm."}</Text>
          {!google && (
            <View style={[s.premiumClayInput, { marginTop: 10 }]}>
              <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#7A748F" secureTextEntry autoCapitalize="none" style={s.clayInputInner} />
            </View>
          )}
          {!!error && <Text style={[st.note, { color: "#E04848" }]}>{error}</Text>}
          <View style={st.btnRow}>
            <Pressable disabled={busy || (!google && !password)} onPress={() => confirm("DELETE ACCOUNT?", "This cannot be undone.", doDelete, "DELETE")} style={[st.btn, { backgroundColor: "#E04848", opacity: busy || (!google && !password) ? 0.5 : 1 }]}>
              {busy ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={[st.btnText, { color: "#FFF" }]}>DELETE</Text>}
            </Pressable>
            <Pressable onPress={() => { setDeleting(false); setPassword(""); setError(""); }} style={st.btn}><Text style={st.btnText}>CANCEL</Text></Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: "#FFF", borderRadius: 24, padding: 18, marginTop: 24, boxShadow: CLAY_CARD },
  title: { fontFamily: "Inter_800ExtraBold", fontSize: 11, color: "#2A2545", letterSpacing: 1.5, marginLeft: 8 },
  body: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#5A5478", lineHeight: 18, marginTop: 8 },
  note: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#14806A", marginTop: 8, lineHeight: 16 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: { flex: 1, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F1EADF", boxShadow: CLAY_SOFT },
  btnPrimary: { backgroundColor: "#5B5FEF", boxShadow: "0px 6px 12px rgba(91, 95, 239, 0.3), inset 0px -4px 6px rgba(40, 40, 150, 0.35), inset 0px 4px 6px rgba(255, 255, 255, 0.35)" },
  btnText: { fontFamily: "Inter_800ExtraBold", fontSize: 11, color: "#5B5FEF", letterSpacing: 1 },
});
