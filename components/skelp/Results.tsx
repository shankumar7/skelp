import { ScrollView, Share, Text, View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { spent, squadPower, standings, State } from "@/game/engine";
import { formatMoney } from "@/game/money";
import { getPlayer } from "@/game/players";
import { Squads } from "./Arena";
import { useEffect } from "react";
import { play } from "@/game/sound";
import { AnimatedPressable, s } from "./ui";

/** Final table once the hammer has fallen on the last player. */
export function Results({ state, myId, insets, onExit }: { state: State; myId: string; insets: any; onExit: () => void }) {
  const table = standings(state);
  const champ = table[0];
  const iWon = champ?.id === myId;
  useEffect(() => { play(iWon ? "win" : "sold"); }, [iWon]);
  const sales = state.teams.flatMap((t) => t.squad.map((e) => ({ ...e, team: t })));
  const top = sales.slice().sort((a, b) => b.price - a.price)[0];
  // steal of the auction: the most rating points per crore among quality players
  const steal = sales.filter((x) => getPlayer(x.pid).rating >= 80).sort((a, b) => getPlayer(b.pid).rating / b.price - getPlayer(a.pid).rating / a.price)[0];
  const share = () => {
    const lines = [`🏏 SKELP! — ${state.arena.toUpperCase()}`, "", ...table.map((t, i) => `${i + 1}. ${t.name} — power ${squadPower(t)}, ${t.squad.length} players, ${formatMoney(spent(t))} spent`)];
    if (top) lines.push("", `💸 Costliest: ${getPlayer(top.pid).name} (${formatMoney(top.price)}, ${top.team.name})`);
    if (steal) lines.push(`🤝 Steal: ${getPlayer(steal.pid).name} (${formatMoney(steal.price)}, ${steal.team.name})`);
    const mine = state.teams.find((t) => t.id === myId);
    if (mine && mine.squad.length) lines.push("", `My squad: ${mine.squad.map((e) => getPlayer(e.pid).name).join(", ")}`);
    Share.share({ message: lines.join("\n") }).catch(() => {});
  };
  return (
    <View style={[s.screen, { backgroundColor: "#F1EADF" }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.avatarTitle, { textAlign: "center" }]}>AUCTION COMPLETE</Text>
        <Text style={s.avatarSub}>{state.arena.toUpperCase()} • {sales.length} PLAYERS SOLD</Text>

        <LinearGradient colors={["#5B5FEF", "#3F42C8"]} style={[s.arenaPlayerCard, { padding: 24, marginTop: 24 }]}>
          <View style={s.arenaPlayerImagePlaceholder}><Ionicons name="trophy" size={150} color="rgba(255,255,255,0.25)" /></View>
          <View style={s.arenaCategoryBadge}><Text style={s.arenaCategoryText}>STRONGEST SQUAD</Text></View>
          <Text style={[s.arenaPlayerName, { fontSize: 36 }]} numberOfLines={1} adjustsFontSizeToFit>{champ ? champ.name.toUpperCase() : "—"}{champ?.id === myId ? " (YOU)" : ""}</Text>
          {champ && <Text style={s.arenaPlayerMeta}>POWER {squadPower(champ)} • {champ.squad.length} PLAYERS • SPENT {formatMoney(spent(champ))}</Text>}
        </LinearGradient>

        <View style={s.dashSectionHeader}><Text style={s.dashSectionTitle}>FINAL TABLE</Text></View>
        <View style={s.dashLeaderboard}>
          {table.map((t, i) => (
            <View key={t.id} style={[s.dashLeaderItem, i === table.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[s.row, { flex: 1 }]}>
                <Text style={[s.dashRank, i === 0 && { color: "#F5A623" }]}>{i + 1}</Text>
                <View style={[s.dashLeaderAvatar, { backgroundColor: t.color + "22" }]}><Ionicons name={t.avatar as any} size={16} color={t.color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dashLeaderName} numberOfLines={1}>{t.name.toUpperCase()}{t.id === myId ? " (YOU)" : ""}</Text>
                  <Text style={s.arenaLogTime}>{t.squad.length} PLAYERS • {formatMoney(t.purse)} LEFT</Text>
                </View>
              </View>
              <Text style={s.dashPoints}>{squadPower(t)} PWR</Text>
            </View>
          ))}
        </View>
        <Text style={st.note}>POWER = TOTAL RATING OF EACH TEAM&apos;S BEST XI</Text>

        {top && (
          <View style={[s.dashStatsRow, { marginTop: 20 }]}>
            <View style={s.dashStatBox}><Text style={[s.dashStatVal, { fontSize: 18 }]}>{formatMoney(top.price)}</Text><Text style={s.dashStatLab} numberOfLines={2}>COSTLIEST: {getPlayer(top.pid).name.toUpperCase()}</Text></View>
            {steal ? (
              <View style={s.dashStatBox}><Text style={[s.dashStatVal, { fontSize: 18, color: "#2EC4A0" }]}>{formatMoney(steal.price)}</Text><Text style={s.dashStatLab} numberOfLines={2}>STEAL: {getPlayer(steal.pid).name.toUpperCase()}</Text></View>
            ) : (
              <View style={s.dashStatBox}><Text style={[s.dashStatVal, { fontSize: 18 }]}>{state.unsold.length}</Text><Text style={s.dashStatLab}>WENT UNSOLD</Text></View>
            )}
          </View>
        )}

        <View style={s.dashSectionHeader}><Text style={s.dashSectionTitle}>SQUADS</Text></View>
        <Squads state={state} myId={myId} />

        <Pressable style={[s.dashCreateBtn, { marginTop: 20 }]} onPress={share} accessibilityLabel="Share results">
          <View style={[s.dashCreateIconBox, { backgroundColor: "#2EC4A0", boxShadow: "inset 0px -5px 8px rgba(10, 110, 85, 0.35), inset 0px 5px 8px rgba(255, 255, 255, 0.45)" }]}><Ionicons name="share-social" size={20} color="#FFF" /></View>
          <Text style={s.dashCreateText}>SHARE THE RESULTS</Text>
        </Pressable>

        <AnimatedPressable style={[s.premiumSubmitBtn, { marginTop: 16 }]} onPress={onExit}><Text style={s.premiumSubmitBtnText}>BACK TO DASHBOARD</Text></AnimatedPressable>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  note: { fontFamily: "Inter_800ExtraBold", fontSize: 8, color: "#A39DB5", letterSpacing: 1, textAlign: "center", marginTop: 10 },
});
