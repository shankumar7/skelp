import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Config, MAX_TEAMS, PRESETS, State } from "@/game/engine";
import { formatMoney } from "@/game/money";
import { getLocalIp } from "@/game/net/native";
import { Session } from "@/game/net/session";
import { s } from "./ui";

const MODES: Config["mode"][] = ["QUICK", "CLASSIC", "MEGA"];
const TIMERS = [10, 15, 20];

/** Waiting room: shows the arena code, who has joined, and (for the host) the auction rules. */
export function Lobby({ session, state, insets, onExit }: { session: Session; state: State; insets: any; onExit: () => void }) {
  const [ip, setIp] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const read = () => getLocalIp().then((v) => { if (alive) setIp(v); });
    read();
    const t = setInterval(read, 4000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  const host = session.isHost;
  const cfg = state.config;
  const code = ip ? ip.split(".")[3] : null;
  const canStart = state.teams.length >= 2;

  return (
    <View style={[s.screen, { backgroundColor: "#F8FAFC" }]}>
      <View style={[s.roomHeader, { paddingTop: insets.top + 8, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }]}>
        <Pressable onPress={onExit} style={s.arenaBackBtn} accessibilityLabel="Leave arena"><Ionicons name="close" size={24} color="#1E293B" /></Pressable>
        <View style={s.arenaTitleBox}>
          <Text style={s.arenaCode} numberOfLines={1}>{state.arena.toUpperCase()}</Text>
          <View style={s.arenaStatus}><View style={[s.arenaDot, { backgroundColor: "#F59E0B" }]} /><Text style={[s.arenaLiveText, { color: "#F59E0B" }]}>LOBBY</Text></View>
        </View>
        <View style={s.arenaUserBox}><Ionicons name={(state.teams.find((t) => t.id === session.myId)?.avatar ?? "person") as any} size={22} color="#FFF" /></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 150 }} showsVerticalScrollIndicator={false}>
        <View style={s.arenaPlayerSection}>
          <LinearGradient colors={["#2563EB", "#1E40AF"]} style={[s.arenaPlayerCard, { padding: 24 }]}>
            <View style={s.arenaPlayerImagePlaceholder}><Ionicons name={session.lan ? "wifi" : "game-controller"} size={150} color="rgba(255,255,255,0.25)" /></View>
            <View style={s.arenaCategoryBadge}><Text style={s.arenaCategoryText}>{session.lan ? (host ? "YOU ARE THE HOST" : "CONNECTED TO HOST") : "SOLO PRACTICE"}</Text></View>
            {session.lan && host ? (
              <>
                <Text style={st.codeLabel}>ARENA CODE</Text>
                <Text style={[s.arenaPlayerName, { fontSize: 48 }]}>{code ? `#${code}` : "HOTSPOT"}</Text>
                <Text style={s.arenaPlayerMeta}>{ip ? `HOST ADDRESS ${ip}` : "YOUR PHONE IS THE HOTSPOT / NO WI-FI ADDRESS"}</Text>
                <Text style={st.hint}>Friends on the same Wi-Fi or hotspot open Skelp! and tap FIND NEARBY ARENAS{code ? `, or type code ${code}` : ""}. No internet needed.</Text>
              </>
            ) : (
              <>
                <Text style={[s.arenaPlayerName, { fontSize: 34 }]}>{session.lan ? "YOU'RE IN!" : "YOU VS BOTS"}</Text>
                <Text style={st.hint}>{session.lan ? "Waiting for the host to start the auction. Keep the app open." : "Warm up against AI bidders. Add or remove bots, pick a mode and start."}</Text>
              </>
            )}
          </LinearGradient>
        </View>

        <View style={[s.dashSectionHeader, { paddingHorizontal: 24, marginTop: 24 }]}>
          <Text style={s.dashSectionTitle}>TEAMS {state.teams.length}/{MAX_TEAMS}</Text>
          {host && state.teams.length < MAX_TEAMS && <Pressable onPress={() => session.addBot()} hitSlop={10}><Text style={s.dashViewAll}>+ ADD BOT</Text></Pressable>}
        </View>
        <View style={[s.dashLeaderboard, { marginHorizontal: 20 }]}>
          {state.teams.map((t, i) => (
            <View key={t.id} style={[s.dashLeaderItem, i === state.teams.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[s.row, { flex: 1 }]}>
                <View style={[s.dashLeaderAvatar, { backgroundColor: t.color + "22" }]}><Ionicons name={t.avatar as any} size={16} color={t.color} /></View>
                <Text style={s.dashLeaderName} numberOfLines={1}>{t.name.toUpperCase()}</Text>
                {t.id === state.hostId && <Tag text="HOST" color="#2563EB" />}
                {t.id === session.myId && <Tag text="YOU" color="#16A34A" />}
                {t.isBot && <Tag text="BOT" color="#64748B" />}
              </View>
              {host && t.id !== state.hostId ? (
                <Pressable onPress={() => session.kick(t.id)} hitSlop={10} accessibilityLabel={`Remove ${t.name}`}><Ionicons name="close-circle" size={22} color="#CBD5E1" /></Pressable>
              ) : (
                <Text style={s.dashPoints}>{formatMoney(cfg.purse)}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={[s.dashSectionHeader, { paddingHorizontal: 24, marginTop: 24 }]}><Text style={s.dashSectionTitle}>AUCTION RULES</Text></View>
        <View style={[s.arenaLogHeader, { marginTop: 0 }]}>
          {MODES.map((m) => (
            <Pressable key={m} disabled={!host} onPress={() => session.setConfig({ ...PRESETS[m], timer: cfg.timer })} style={[s.arenaTabBtn, cfg.mode === m && s.arenaTabBtnOn]}>
              <Text style={[s.arenaTabText, cfg.mode === m && s.arenaTabTextOn]}>{m}</Text>
            </Pressable>
          ))}
        </View>
        <View style={[s.dashStatsRow, { marginHorizontal: 20, marginTop: 16 }]}>
          <Rule v={formatMoney(cfg.purse).replace("₹", "")} l="PURSE" />
          <Rule v={String(cfg.pool)} l="PLAYERS" />
          <Rule v={String(cfg.squadMax)} l="MAX SQUAD" />
          <Rule v={String(cfg.overseasMax)} l="OVERSEAS" />
        </View>
        <View style={[s.arenaLogHeader, { marginTop: 16, alignItems: "center" }]}>
          <Text style={[s.arenaStatLabel, { marginBottom: 0, marginRight: 4 }]}>BID CLOCK</Text>
          {TIMERS.map((t) => (
            <Pressable key={t} disabled={!host} onPress={() => session.setConfig({ ...cfg, timer: t })} style={[s.arenaTabBtn, { paddingHorizontal: 16 }, cfg.timer === t && s.arenaTabBtnOn]}>
              <Text style={[s.arenaTabText, cfg.timer === t && s.arenaTabTextOn]}>{t}S</Text>
            </Pressable>
          ))}
        </View>
        {!host && <Text style={[st.note, { marginTop: 14 }]}>ONLY THE HOST CAN CHANGE THE RULES</Text>}
      </ScrollView>

      <View style={[s.arenaActionWrapper, { paddingTop: 14, paddingBottom: insets.bottom + 10, backgroundColor: "rgba(255, 255, 255, 0.95)", borderTopColor: "#F1F5F9" }]}>
        {host ? (
          <>
            <Pressable disabled={!canStart} onPress={() => session.start()} style={[s.arenaMainBid, !canStart && s.btnOff]} accessibilityLabel="Start auction">
              <LinearGradient colors={["#22C55E", "#16A34A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.arenaBidGradient}>
                <Text style={s.arenaBidBtnText}>START AUCTION</Text>
              </LinearGradient>
            </Pressable>
            {!canStart && <Text style={st.note}>NEED AT LEAST 2 TEAMS — WAIT FOR FRIENDS OR ADD A BOT</Text>}
          </>
        ) : (
          <View style={[s.arenaQuickBid, { marginBottom: 10 }]}><Text style={s.arenaQuickBidText}>WAITING FOR THE HOST TO START…</Text></View>
        )}
      </View>
    </View>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return <View style={[st.tag, { backgroundColor: color + "1A" }]}><Text style={[st.tagText, { color }]}>{text}</Text></View>;
}
function Rule({ v, l }: { v: string; l: string }) {
  return <View style={[s.dashStatBox, { padding: 14 }]}><Text style={[s.dashStatVal, { fontSize: 18 }]} numberOfLines={1} adjustsFontSizeToFit>{v}</Text><Text style={s.dashStatLab}>{l}</Text></View>;
}

const st = StyleSheet.create({
  codeLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#BFDBFE", letterSpacing: 3 },
  hint: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#DBEAFE", marginTop: 12, lineHeight: 18 },
  note: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#94A3B8", letterSpacing: 1, textAlign: "center", marginBottom: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  tagText: { fontFamily: "Inter_800ExtraBold", fontSize: 8, letterSpacing: 1 },
});
export { Tag };
