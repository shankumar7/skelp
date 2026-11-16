import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { overseasCap, retainBlocker, retainPrice, State } from "@/game/engine";
import { formatMoney } from "@/game/money";
import { Session } from "@/game/net/session";
import { getPlayer, ROLE_LABEL } from "@/game/players";
import { PlayerPhoto } from "./PlayerPhoto";
import { T, themed } from "./theme";
import { Backdrop, BigButton, Card, Chip, Column, confirm, k, RoundButton, s, SectionTitle } from "./ui";

/** Before the hammer: every team decides which of last season's players to keep. */
export function Retention({ session, state, stamp, insets, onExit }: { session: Session; state: State; stamp: number; insets: any; onExit: () => void }) {
  // count down locally between updates from the host
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const me = state.teams.find((t) => t.id === session.myId);
  const offers = me ? state.offers[me.id] ?? [] : [];
  const decided = me ? me.id in state.picks : true;
  const [chosen, setChosen] = useState<number[]>([]);
  const max = state.config.retain;
  // the best player takes the most expensive slab
  const ordered = chosen.slice().sort((a, b) => getPlayer(b).rating - getPlayer(a).rating || a - b);
  const cost = ordered.reduce((n, _, i) => n + retainPrice(state.config, i), 0);
  const blocker = me ? retainBlocker(state, me.id, ordered) : null;
  const seconds = Math.max(0, Math.ceil((state.retainMs - Math.max(0, now - stamp)) / 1000));
  const waitingFor = state.teams.filter((t) => !(t.id in state.picks) && (t.isBot || t.connected));
  const toggle = (pid: number) => setChosen((list) => (list.includes(pid) ? list.filter((p) => p !== pid) : list.length >= max ? list : [...list, pid]));

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <Backdrop />
      <View style={[s.roomHeader, { paddingTop: insets.top + 8, paddingBottom: 14 }, T.clayHeader]}>
        <RoundButton icon="close" label="Leave arena" onPress={onExit} color={T.ink} />
        <View style={s.arenaTitleBox}>
          <Text style={s.arenaCode} numberOfLines={1}>{state.arena.toUpperCase()}</Text>
          <View style={s.arenaStatus}><View style={[s.arenaDot, { backgroundColor: T.gold }]} /><Text style={[s.arenaLiveText, { color: T.goldText }]}>RETENTIONS • {seconds}S LEFT</Text></View>
        </View>
        <View style={st.clock}><Text style={st.clockText}>{seconds}</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 130 }} showsVerticalScrollIndicator={false}>
        <Column>
          <Card style={{ marginTop: 18 }}>
            <View style={s.row}>
              <Ionicons name="shield-checkmark" size={22} color={T.primaryText} />
              <Text style={st.title}>{decided ? (me ? "YOUR CHOICE IS IN" : "TEAMS ARE CHOOSING") : "KEEP YOUR STARS"}</Text>
            </View>
            <Text style={[k.body, { marginTop: 8, color: T.sub }]}>
              {decided
                ? "The auction starts as soon as every team has decided, or when the clock runs out."
                : `These players were in your squad last season. Keep up to ${max} at a fixed price before the auction — the rest go under the hammer${state.config.rtm > 0 ? ", where your Right to Match cards can still bring them back" : ""}.`}
            </Text>
            {!decided && (
              <View style={[s.row, { gap: 8, marginTop: 12, flexWrap: "wrap" }]}>
                {Array.from({ length: max }, (_, i) => <Chip key={i} text={`${["1ST", "2ND", "3RD"][i]} ${formatMoney(retainPrice(state.config, i))}`} color={T.primaryText} soft={T.primarySoft} />)}
              </View>
            )}
          </Card>

          {me && !decided && (
            <>
              <SectionTitle title={`LAST SEASON'S SQUAD • ${chosen.length}/${max} KEPT`} />
              {offers.map((pid) => {
                const p = getPlayer(pid);
                const at = ordered.indexOf(pid);
                const on = at >= 0;
                return (
                  <Pressable key={pid} onPress={() => toggle(pid)} style={[st.offer, on && st.offerOn]} accessibilityLabel={`${on ? "Release" : "Keep"} ${p.name}`} accessibilityState={{ selected: on }}>
                    <PlayerPhoto player={p} size={52} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={st.name} numberOfLines={1}>{p.name}</Text>
                      <Text style={st.meta}>{ROLE_LABEL[p.role]} • {p.country} • RATING {p.rating}</Text>
                      {on && <Text style={st.price}>KEEP FOR {formatMoney(retainPrice(state.config, at))}</Text>}
                    </View>
                    <View style={[st.check, on && { backgroundColor: T.primary, borderColor: T.primary }]}>{on && <Ionicons name="checkmark" size={16} color="#FFF" />}</View>
                  </Pressable>
                );
              })}
              <Text style={st.note}>PURSE AFTER RETENTIONS: {formatMoney(me.purse - cost)} • OVERSEAS LIMIT {overseasCap(state.config)}</Text>
            </>
          )}

          <SectionTitle title="TEAMS" />
          <Card pad={18}>
            {state.teams.map((t, i) => {
              const ready = t.id in state.picks;
              return (
                <View key={t.id} style={[st.teamRow, i === state.teams.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[st.dot, { backgroundColor: t.color + "22" }]}><Ionicons name={t.avatar as any} size={15} color={t.color} /></View>
                  <Text style={[st.name, { flex: 1, fontSize: 14 }]} numberOfLines={1}>{t.name.toUpperCase()}{t.id === session.myId ? " (YOU)" : ""}</Text>
                  {ready ? <Chip text={`KEPT ${state.picks[t.id].length}`} color={T.mintText} soft={T.mintSoft} icon="checkmark" /> : <Chip text={t.connected || t.isBot ? "DECIDING" : "OFFLINE"} color={T.goldText} soft={T.goldSoft} />}
                </View>
              );
            })}
          </Card>
        </Column>
      </ScrollView>

      <View style={[s.arenaActionWrapper, { paddingTop: 14, paddingBottom: insets.bottom + 12, backgroundColor: T.barBg, borderTopColor: T.line }]}>
        <Column>
          {me && !decided ? (
            <>
              <BigButton title={chosen.length ? `KEEP ${chosen.length} FOR ${formatMoney(cost)}` : "KEEP NOBODY"} tone="mint" disabled={!!blocker} onPress={() => session.retain(ordered)} />
              {!!blocker && <Text style={[st.note, { color: T.coralText }]}>{blocker.toUpperCase()}</Text>}
            </>
          ) : session.isHost ? (
            <BigButton title="START THE AUCTION NOW" icon="play" onPress={() => (waitingFor.length ? confirm("START NOW?", `${waitingFor.length} team${waitingFor.length === 1 ? " has" : "s have"} not decided yet and will keep nobody.`, () => session.skipRetention(), "START") : session.skipRetention())} />
          ) : (
            <View style={s.arenaQuickBid}><Text style={s.arenaQuickBidText}>WAITING FOR {waitingFor.length} TEAM{waitingFor.length === 1 ? "" : "S"}…</Text></View>
          )}
        </Column>
      </View>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  clock: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.goldSoft, alignItems: "center", justifyContent: "center" },
  clockText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 17, color: T.goldText, marginTop: 2 },
  title: { fontFamily: "LuckiestGuy_400Regular", fontSize: 20, color: T.ink, letterSpacing: 1, marginLeft: 10, marginTop: 3 },
  offer: { flexDirection: "row", alignItems: "center", backgroundColor: T.card, borderRadius: 24, padding: 14, marginBottom: 12, boxShadow: T.claySoft, borderWidth: 2, borderColor: T.cardEdge },
  offerOn: { borderColor: T.primary, backgroundColor: T.primarySoft },
  name: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: T.ink },
  meta: { fontFamily: "Inter_700Bold", fontSize: 10, color: T.muted, letterSpacing: 0.4 },
  price: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.primaryText, letterSpacing: 0.8, marginTop: 4 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: T.lineStrong, alignItems: "center", justifyContent: "center" },
  note: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: T.muted, letterSpacing: 1, textAlign: "center", marginTop: 8 },
  teamRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.line },
  dot: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
}));
