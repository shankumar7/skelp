import { ScrollView, Text, View, Pressable, StyleSheet, Animated } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { bidBlocker, nextBid, overseasCount, squadPower, State, Team } from "@/game/engine";
import { formatMoney, increment } from "@/game/money";
import { Session } from "@/game/net/session";
import { COUNTRY_LABEL, getPlayer, ROLE_LABEL } from "@/game/players";
import { Snapshot, useCountdown } from "@/game/useSession";
import { PlayerPhoto } from "./PlayerPhoto";
import { Tag } from "./Lobby";
import { confirm, s } from "./ui";

const TABS = ["BIDS", "TEAMS", "SQUADS"] as const;

/** The live auction room. */
export function Arena({ session, snapshot, insets, onExit }: { session: Session; snapshot: Snapshot; insets: any; onExit: () => void }) {
  const state = snapshot.state as State;
  const status = snapshot.status;
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("BIDS");
  const seconds = useCountdown(snapshot);
  const lot = state.lot;
  const me = state.teams.find((t) => t.id === session.myId);
  const teamOf = (id: string | null) => state.teams.find((t) => t.id === id);
  const stamp = useRef(new Animated.Value(0)).current;
  const settled = lot && lot.status !== "open";
  useEffect(() => {
    if (settled) { stamp.setValue(0); Animated.spring(stamp, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start(); }
  }, [settled, lot?.pid]);

  if (!lot || !me) return <View style={[s.screen, s.center]}><Text style={s.arenaComingSoonText}>PREPARING THE NEXT PLAYER…</Text></View>;
  const player = getPlayer(lot.pid);
  const leader = teamOf(lot.bidder);
  const min = nextBid(lot);
  const blocker = status !== "live" ? "Reconnecting to the host…" : lot.status !== "open" ? "Next player coming up…" : bidBlocker(state, me.id, min);
  const canPass = status === "live" && lot.status === "open" && !state.paused && lot.bidder !== me.id && !lot.passed.includes(me.id);
  const urgent = lot.status === "open" && seconds <= 5;
  const bid = (amount: number) => {
    if (bidBlocker(state, me.id, amount) !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    session.bid(amount);
  };
  // jump bids: skip one or two steps ahead to scare the room
  const jump1 = min + increment(min);
  const jump2 = jump1 + increment(jump1);
  const statusLabel = status !== "live" ? "RECONNECTING" : state.paused ? "PAUSED" : "LIVE";
  const statusColor = status !== "live" ? "#EF4444" : state.paused ? "#F59E0B" : "#22C55E";

  return (
    <View style={[s.screen, { backgroundColor: "#F8FAFC" }]}>
      <View style={[s.roomHeader, { paddingTop: insets.top + 8, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }]}>
        <Pressable onPress={onExit} style={s.arenaBackBtn} accessibilityLabel="Leave arena"><Ionicons name="close" size={24} color="#1E293B" /></Pressable>
        <View style={s.arenaTitleBox}>
          <Text style={s.arenaCode} numberOfLines={1}>{state.arena.toUpperCase()}</Text>
          <View style={s.arenaStatus}>
            <View style={[s.arenaDot, { backgroundColor: statusColor }]} />
            <Text style={[s.arenaLiveText, { color: statusColor }]}>{statusLabel} • {state.round === 2 ? "ACCELERATED " : ""}LOT {state.pos + 1}/{state.queue.length}</Text>
          </View>
        </View>
        <View style={[s.arenaUserBox, { backgroundColor: me.color }]}><Ionicons name={me.avatar as any} size={22} color="#FFF" /></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 190 }} showsVerticalScrollIndicator={false}>
        <View style={s.arenaPlayerSection}>
          <LinearGradient colors={["#2563EB", "#1E40AF"]} style={[s.arenaPlayerCard, { padding: 24 }]}>
            <View style={st.cardTop}>
              <View style={st.photoRing}><PlayerPhoto player={player} size={104} light /></View>
              <View style={{ alignItems: "center" }}>
                <Text style={s.arenaTimerLabel}>{lot.status === "open" ? (state.paused ? "PAUSED" : "CLOSING IN") : "NEXT IN"}</Text>
                <Text style={[s.arenaTimerVal, urgent && { color: "#FECACA" }]} accessibilityLabel={`${seconds} seconds left`}>{seconds}s</Text>
              </View>
            </View>
            <View style={{ marginTop: 18 }}>
              <View style={s.arenaCategoryBadge}><Text style={s.arenaCategoryText}>{player.overseas ? "OVERSEAS " : ""}{ROLE_LABEL[player.role]}{player.rating >= 90 ? " • MARQUEE" : ""}</Text></View>
              <Text style={[s.arenaPlayerName, { fontSize: 34 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{player.name.toUpperCase()}</Text>
              <Text style={s.arenaPlayerMeta}>{COUNTRY_LABEL[player.country] ?? player.country} • BASE {formatMoney(player.base)} • RATING {player.rating}</Text>
            </View>
            {settled && (
              <Animated.View pointerEvents="none" style={[st.stamp, { borderColor: lot.status === "sold" ? "#4ADE80" : "#FCA5A5", opacity: stamp, transform: [{ rotate: "-12deg" }, { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) }] }]}>
                <Text style={[st.stampText, { color: lot.status === "sold" ? "#4ADE80" : "#FCA5A5" }]}>{lot.status === "sold" ? "SOLD!" : "UNSOLD"}</Text>
              </Animated.View>
            )}
          </LinearGradient>
        </View>

        <View style={s.arenaStatsRow}>
          <View style={s.arenaStatItem}>
            <Text style={s.arenaStatLabel}>{lot.status === "sold" ? "SOLD FOR" : lot.bidder ? "CURRENT BID" : "BASE PRICE"}</Text>
            <Text style={s.arenaStatPrice}>{formatMoney(lot.bid)}</Text>
          </View>
          <View style={s.arenaStatDivider} />
          <View style={s.arenaStatItem}>
            <Text style={s.arenaStatLabel}>{lot.status === "sold" ? "SOLD TO" : "HIGHEST BIDDER"}</Text>
            <Text style={[s.arenaStatOwner, leader && { color: leader.color }]} numberOfLines={1}>{leader ? `${leader.name.toUpperCase()}${leader.id === me.id ? " (YOU)" : ""}` : lot.status === "unsold" ? "NO TAKERS" : "NO BIDS YET"}</Text>
          </View>
        </View>

        <View style={[s.arenaStatsRow, { marginTop: 12, paddingVertical: 14 }]}>
          <Mini l="YOUR PURSE" v={formatMoney(me.purse)} />
          <View style={s.arenaStatDivider} />
          <Mini l="SQUAD" v={`${me.squad.length}/${state.config.squadMax}`} />
          <View style={s.arenaStatDivider} />
          <Mini l="OVERSEAS" v={`${overseasCount(me)}/${state.config.overseasMax}`} />
        </View>

        <View style={[s.arenaLogHeader, { marginTop: 22 }]}>
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => setActiveTab(t)} style={[s.arenaTabBtn, activeTab === t && s.arenaTabBtnOn]}>
              <Text style={[s.arenaTabText, activeTab === t && s.arenaTabTextOn]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.arenaLogContainer}>
          {activeTab === "BIDS" && (
            lot.history.length === 0 ? (
              <View style={s.arenaComingSoon}><Text style={s.arenaComingSoonText}>{lot.status === "unsold" ? "NOBODY WANTED THIS ONE" : `OPENING BID ${formatMoney(player.base)} — WHO STARTS?`}</Text></View>
            ) : (
              lot.history.slice().reverse().map((h, i) => {
                const t = teamOf(h.team);
                return (
                  <View key={lot.history.length - i} style={s.arenaLogItem}>
                    <View style={[s.row, { flex: 1 }]}><View style={[s.arenaLogDot, { backgroundColor: t?.color ?? "#94A3B8" }]} /><Text style={s.arenaLogUser} numberOfLines={1}>{(t?.name ?? "?").toUpperCase()}</Text></View>
                    <Text style={[s.arenaLogPrice, { flexGrow: 0, flexShrink: 0, flexBasis: "auto" }]} numberOfLines={1}>{formatMoney(h.amount)}</Text>
                    <Text style={s.arenaLogTime}>{i === 0 ? "LATEST" : `#${lot.history.length - i}`}</Text>
                  </View>
                );
              })
            )
          )}
          {activeTab === "TEAMS" && (
            <>
              {state.teams.map((t) => (
                <View key={t.id} style={s.arenaLogItem}>
                  <View style={[s.row, { flex: 1 }]}>
                    <View style={[s.dashLeaderAvatar, { backgroundColor: t.color + "22" }]}><Ionicons name={t.avatar as any} size={16} color={t.color} /></View>
                    <View style={{ flex: 1 }}>
                      <View style={s.row}>
                        <Text style={s.arenaLogUser} numberOfLines={1}>{t.name.toUpperCase()}</Text>
                        {t.isBot && <Tag text="BOT" color="#64748B" />}
                        {!t.isBot && !t.connected && <Tag text="OFFLINE" color="#EF4444" />}
                        {lot.passed.includes(t.id) && lot.status === "open" && <Tag text="PASSED" color="#F59E0B" />}
                      </View>
                      <Text style={s.arenaLogTime}>{t.squad.length}/{state.config.squadMax} PLAYERS • {overseasCount(t)} OVERSEAS • POWER {squadPower(t)}</Text>
                    </View>
                  </View>
                  <Text style={[s.arenaLogPrice, { flexGrow: 0, flexShrink: 0, flexBasis: "auto", marginRight: 0 }]} numberOfLines={1}>{formatMoney(t.purse)}</Text>
                </View>
              ))}
              {session.isHost && (
                <View style={[s.arenaBidOptions, { marginTop: 8 }]}>
                  <Pressable onPress={() => session.pause(!state.paused)} style={s.arenaQuickBid}><Text style={s.arenaQuickBidText}>{state.paused ? "RESUME" : "PAUSE"}</Text></Pressable>
                  <Pressable onPress={() => confirm("END AUCTION?", "This finishes the auction for everyone and shows the final table.", () => session.end(), "END")} style={s.arenaQuickBid}><Text style={[s.arenaQuickBidText, { color: "#EF4444" }]}>END AUCTION</Text></Pressable>
                </View>
              )}
            </>
          )}
          {activeTab === "SQUADS" && <Squads state={state} myId={me.id} />}
        </View>
      </ScrollView>

      <View style={[s.arenaActionWrapper, { paddingBottom: insets.bottom + 10, backgroundColor: "rgba(255, 255, 255, 0.95)", borderTopColor: "#F1F5F9" }]}>
        <View style={s.arenaBidOptions}>
          <Pressable disabled={!canPass} onPress={() => session.pass()} style={[s.arenaQuickBid, !canPass && s.btnOff]} accessibilityLabel="Pass on this player">
            <Text style={[s.arenaQuickBidText, { color: "#EF4444" }]}>PASS</Text>
          </Pressable>
          {[jump1, jump2].map((amt) => {
            const ok = status === "live" && bidBlocker(state, me.id, amt) === null;
            return (
              <Pressable key={amt} disabled={!ok} onPress={() => bid(amt)} style={[s.arenaQuickBid, !ok && s.btnOff]} accessibilityLabel={`Jump bid ${formatMoney(amt)}`}>
                <Text style={s.arenaQuickBidText}>{formatMoney(amt)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable disabled={!!blocker} onPress={() => bid(min)} style={[s.arenaMainBid, !!blocker && { shadowOpacity: 0, elevation: 0 }]} accessibilityLabel={blocker ?? `Bid ${formatMoney(min)}`}>
          <LinearGradient colors={blocker ? ["#CBD5E1", "#94A3B8"] : ["#22C55E", "#16A34A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.arenaBidGradient}>
            <Text style={[s.arenaBidBtnText, !!blocker && { fontSize: 15, letterSpacing: 1 }]} numberOfLines={1} adjustsFontSizeToFit>{blocker ? blocker.toUpperCase() : `BID ${formatMoney(min)}`}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function Mini({ l, v }: { l: string; v: string }) {
  return <View style={s.arenaStatItem}><Text style={s.arenaStatLabel}>{l}</Text><Text style={s.arenaStatOwner}>{v}</Text></View>;
}

/** Every team's squad so far; your own first. */
export function Squads({ state, myId, open }: { state: State; myId: string; open?: boolean }) {
  const teams = state.teams.slice().sort((a, b) => (a.id === myId ? -1 : b.id === myId ? 1 : 0));
  return (
    <>
      {teams.map((t) => <SquadCard key={t.id} team={t} mine={t.id === myId} initiallyOpen={open || t.id === myId} />)}
    </>
  );
}
function SquadCard({ team, mine, initiallyOpen }: { team: Team; mine: boolean; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={[s.arenaLogItem, { flexDirection: "column", alignItems: "stretch" }]}>
      <Pressable onPress={() => setOpen(!open)} style={[s.row, { justifyContent: "space-between" }]}>
        <View style={[s.row, { flex: 1 }]}>
          <View style={[s.arenaLogDot, { backgroundColor: team.color }]} />
          <Text style={s.arenaLogUser} numberOfLines={1}>{team.name.toUpperCase()}{mine ? " (YOU)" : ""}</Text>
        </View>
        <Text style={s.arenaLogTime}>{team.squad.length} PLAYERS  </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="#94A3B8" />
      </Pressable>
      {open && (team.squad.length === 0 ? (
        <Text style={[s.arenaLogTime, { marginTop: 10 }]}>NO PLAYERS BOUGHT YET</Text>
      ) : (
        team.squad.map((e) => {
          const p = getPlayer(e.pid);
          return (
            <View key={e.pid} style={st.squadRow}>
              <PlayerPhoto player={p} size={34} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.squadName} numberOfLines={1}>{p.name}</Text>
                <Text style={s.arenaLogTime}>{ROLE_LABEL[p.role]} • {p.country} • RTG {p.rating}</Text>
              </View>
              <Text style={st.squadPrice} numberOfLines={1}>{formatMoney(e.price)}</Text>
            </View>
          );
        })
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  photoRing: { padding: 4, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.25)" },
  stamp: { position: "absolute", right: 20, top: 92, borderWidth: 4, borderRadius: 14, paddingHorizontal: 14, paddingTop: 6, backgroundColor: "rgba(15, 23, 42, 0.35)" },
  stampText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 30, letterSpacing: 2 },
  squadRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  squadName: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#1E293B" },
  squadPrice: { fontFamily: "LuckiestGuy_400Regular", fontSize: 14, color: "#2563EB", flexShrink: 0, marginLeft: 8 },
});
