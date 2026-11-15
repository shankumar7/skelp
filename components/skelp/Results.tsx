import { ScrollView, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { spent, squadPower, standings, State } from "@/game/engine";
import { formatMoney } from "@/game/money";
import { getPlayer } from "@/game/players";
import { Squads } from "./Arena";
import { AnimatedPressable, s } from "./ui";

/** Final table once the hammer has fallen on the last player. */
export function Results({ state, myId, insets, onExit }: { state: State; myId: string; insets: any; onExit: () => void }) {
  const table = standings(state);
  const champ = table[0];
  const sales = state.teams.flatMap((t) => t.squad.map((e) => ({ ...e, team: t })));
  const top = sales.slice().sort((a, b) => b.price - a.price)[0];
  return (
    <View style={[s.screen, { backgroundColor: "#F1F5F9" }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.avatarTitle, { textAlign: "center" }]}>AUCTION COMPLETE</Text>
        <Text style={s.avatarSub}>{state.arena.toUpperCase()} • {sales.length} PLAYERS SOLD</Text>

        <LinearGradient colors={["#2563EB", "#1E40AF"]} style={[s.arenaPlayerCard, { padding: 24, marginTop: 24 }]}>
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
                <Text style={[s.dashRank, i === 0 && { color: "#EAB308" }]}>{i + 1}</Text>
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
            <View style={s.dashStatBox}><Text style={[s.dashStatVal, { fontSize: 18 }]}>{state.unsold.length}</Text><Text style={s.dashStatLab}>WENT UNSOLD</Text></View>
          </View>
        )}

        <View style={s.dashSectionHeader}><Text style={s.dashSectionTitle}>SQUADS</Text></View>
        <Squads state={state} myId={myId} />

        <AnimatedPressable style={[s.premiumSubmitBtn, { marginTop: 24 }]} onPress={onExit}><Text style={s.premiumSubmitBtnText}>BACK TO DASHBOARD</Text></AnimatedPressable>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  note: { fontFamily: "Inter_800ExtraBold", fontSize: 8, color: "#94A3B8", letterSpacing: 1, textAlign: "center", marginTop: 10 },
});
