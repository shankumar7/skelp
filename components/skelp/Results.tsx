import { Platform, ScrollView, Share, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { spent, squadPower, standings, State } from "@/game/engine";
import { formatMoney } from "@/game/money";
import { getPlayer } from "@/game/players";
import { play } from "@/game/sound";
import { Squads } from "./Arena";
import { T, themed } from "./theme";
import { Backdrop, BigButton, Card, Column, IconBadge, Rise, SectionTitle, SoftButton } from "./ui";

/** Final table once the hammer has fallen on the last player. */
export function Results({ state, myId, insets, onExit }: { state: State; myId: string; insets: any; onExit: () => void }) {
  const table = standings(state);
  const champ = table[0];
  const iWon = !!champ && champ.id === myId;
  useEffect(() => { play(iWon ? "win" : "sold"); }, [iWon]);
  const sales = state.teams.flatMap((t) => t.squad.filter((e) => !e.kept).map((e) => ({ ...e, team: t })));
  const top = sales.slice().sort((a, b) => b.price - a.price)[0];
  // steal of the auction: the most rating points per crore among quality players
  const steal = sales.filter((x) => getPlayer(x.pid).rating >= 80).sort((a, b) => getPlayer(b.pid).rating / b.price - getPlayer(a.pid).rating / a.price)[0];
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const shareText = () => {
    const lines = [`🏏 SKELP! — ${state.arena.toUpperCase()}`, "", ...table.map((t, i) => `${i + 1}. ${t.name} — power ${squadPower(t)}, ${t.squad.length} players, ${formatMoney(spent(t))} spent`)];
    if (top) lines.push("", `💸 Costliest: ${getPlayer(top.pid).name} (${formatMoney(top.price)}, ${top.team.name})`);
    if (steal) lines.push(`🤝 Steal: ${getPlayer(steal.pid).name} (${formatMoney(steal.price)}, ${steal.team.name})`);
    const mine = state.teams.find((t) => t.id === myId);
    if (mine && mine.squad.length) lines.push("", `My squad: ${mine.squad.map((e) => getPlayer(e.pid).name).join(", ")}`);
    Share.share({ message: lines.join("\n") }).catch(() => {});
  };
  /** Turn the result card into a picture and open the share sheet; falls back to text. */
  const shareImage = async () => {
    if (Platform.OS === "web" || sharing) return shareText();
    setSharing(true);
    try {
      const { captureRef } = require("react-native-view-shot");
      const Sharing = require("expo-sharing");
      const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile" });
      if (!(await Sharing.isAvailableAsync())) throw new Error("no share sheet");
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share the result" });
    } catch {
      shareText();
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Column>
          <Text style={st.title}>AUCTION COMPLETE</Text>
          <Text style={st.sub}>{state.arena.toUpperCase()} • {sales.length} PLAYERS SOLD</Text>

          {/* everything inside this view is what gets shared as a picture */}
          <View ref={cardRef} collapsable={false} style={st.shot}>
            <Rise>
              <LinearGradient colors={T.gradHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
                <View style={st.ring} />
                <Ionicons name="trophy" size={150} color="rgba(255,255,255,0.12)" style={st.heroIcon} />
                <View style={st.badge}><Ionicons name="trophy" size={11} color="#FFE9A8" /><Text style={st.badgeText}>STRONGEST SQUAD</Text></View>
                <Text style={st.champ} numberOfLines={1} adjustsFontSizeToFit>{champ ? champ.name.toUpperCase() : "—"}{iWon ? " (YOU)" : ""}</Text>
                {champ && <Text style={st.champMeta}>POWER {squadPower(champ)} • {champ.squad.length} PLAYERS • SPENT {formatMoney(spent(champ))}</Text>}
              </LinearGradient>
            </Rise>

            <Card pad={18} style={{ marginTop: 16 }}>
              <Text style={st.cardLabel}>FINAL TABLE</Text>
              {table.map((t, i) => (
                <View key={t.id} style={[st.row, i === table.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[st.rank, i === 0 && { backgroundColor: T.goldSoft }]}><Text style={[st.rankText, i === 0 && { color: T.goldText }]}>{i + 1}</Text></View>
                  <View style={[st.dot, { backgroundColor: t.color + "22" }]}><Ionicons name={t.avatar as any} size={15} color={t.color} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.team} numberOfLines={1}>{t.name.toUpperCase()}{t.id === myId ? " (YOU)" : ""}</Text>
                    <Text style={st.meta}>{t.squad.length} PLAYERS • {formatMoney(t.purse)} LEFT</Text>
                  </View>
                  <Text style={st.power}>{squadPower(t)} PWR</Text>
                </View>
              ))}
            </Card>

            {top && (
              <View style={st.awards}>
                <Award icon="cash" color={T.coral} label="COSTLIEST BUY" value={formatMoney(top.price)} who={`${getPlayer(top.pid).name} • ${top.team.name}`} />
                {steal ? <Award icon="pricetag" color={T.mint} label="STEAL OF THE AUCTION" value={formatMoney(steal.price)} who={`${getPlayer(steal.pid).name} • ${steal.team.name}`} /> : <Award icon="close-circle" color={T.gold} label="WENT UNSOLD" value={String(state.unsold.length)} who="players nobody wanted" />}
              </View>
            )}
            <Text style={st.brand}>SKELP! • THE AUCTION ARENA • POWER = RATING OF EACH TEAM&apos;S BEST XI</Text>
          </View>

          <View style={[st.actions]}>
            <BigButton title={sharing ? "PREPARING…" : "SHARE AS A PICTURE"} icon="image" tone="mint" small style={{ flex: 1.6 }} onPress={shareImage} />
            <SoftButton title="SHARE TEXT" icon="share-social" style={{ flex: 1, height: 50 }} onPress={shareText} />
          </View>

          <SectionTitle title="SQUADS" />
          <Squads state={state} myId={myId} />

          <BigButton title="BACK TO DASHBOARD" style={{ marginTop: 18 }} onPress={onExit} />
        </Column>
      </ScrollView>
    </View>
  );
}

function Award({ icon, color, label, value, who }: { icon: any; color: string; label: string; value: string; who: string }) {
  return (
    <Card pad={16} style={{ flex: 1 }}>
      <IconBadge name={icon} color={color} size={36} />
      <Text style={[st.cardLabel, { marginTop: 12, marginBottom: 2 }]}>{label}</Text>
      <Text style={st.awardVal} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={st.meta} numberOfLines={2}>{who.toUpperCase()}</Text>
    </Card>
  );
}

const st = themed(() => StyleSheet.create({
  title: { fontFamily: "LuckiestGuy_400Regular", fontSize: 30, color: T.ink, letterSpacing: 1.5, textAlign: "center" },
  sub: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.muted, letterSpacing: 2, textAlign: "center", marginTop: 2 },
  shot: { backgroundColor: T.bg, marginHorizontal: -10, paddingHorizontal: 10, paddingTop: 18, paddingBottom: 10, borderRadius: 20 },
  hero: { borderRadius: 32, padding: 24, overflow: "hidden", boxShadow: T.clayPrimary },
  ring: { position: "absolute", width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", top: -150, right: -90 },
  heroIcon: { position: "absolute", right: -24, bottom: -28 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "rgba(255, 214, 107, 0.24)", paddingHorizontal: 11, paddingVertical: 5, borderRadius: 11 },
  badgeText: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#FFE9A8", letterSpacing: 1.2 },
  champ: { fontFamily: "LuckiestGuy_400Regular", fontSize: 38, color: "#FFF", letterSpacing: 1.5, marginTop: 14 },
  champMeta: { fontFamily: "Inter_700Bold", fontSize: 11, color: T.onPrimarySoft, letterSpacing: 0.6, marginTop: 2 },
  cardLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.muted, letterSpacing: 1.5, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.line },
  rank: { width: 30, height: 30, borderRadius: 11, backgroundColor: T.sand, alignItems: "center", justifyContent: "center", marginRight: 10 },
  rankText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 15, color: T.muted, marginTop: 2 },
  dot: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  team: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: T.ink },
  meta: { fontFamily: "Inter_700Bold", fontSize: 9, color: T.muted, letterSpacing: 0.5, marginTop: 1, lineHeight: 13 },
  power: { fontFamily: "Inter_800ExtraBold", fontSize: 11, color: T.primaryText, marginLeft: 8 },
  awards: { flexDirection: "row", gap: 12, marginTop: 16 },
  awardVal: { fontFamily: "LuckiestGuy_400Regular", fontSize: 22, color: T.ink },
  brand: { fontFamily: "Inter_800ExtraBold", fontSize: 7.5, color: T.dim, letterSpacing: 1, textAlign: "center", marginTop: 14 },
  actions: { flexDirection: "row", gap: 12, marginTop: 14, alignItems: "center" },
}));
