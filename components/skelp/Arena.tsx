import { ScrollView, Text, View, Pressable, StyleSheet, Animated } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { bidBlocker, nextBid, overseasCount, squadPower, State, Team } from "@/game/engine";
import { formatMoney, increment } from "@/game/money";
import { REACTIONS } from "@/game/net/protocol";
import { Session } from "@/game/net/session";
import { COUNTRY_LABEL, getPlayer, Role, ROLE_LABEL } from "@/game/players";
import { Snapshot, useCountdown } from "@/game/useSession";
import { PlayerPhoto } from "./PlayerPhoto";
import { Tag } from "./Lobby";
import { isSoundOn, play, setSoundOn } from "@/game/sound";
import { saveSound } from "@/game/storage";
import { CLAY_HEADER, CLAY_SOFT, confirm, s } from "./ui";

const TABS = ["BIDS", "TEAMS", "SQUADS", "SOLD"] as const;

/** The live auction room. */
export function Arena({ session, snapshot, insets, onExit }: { session: Session; snapshot: Snapshot; insets: any; onExit: () => void }) {
  const state = snapshot.state as State;
  const status = snapshot.status;
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("BIDS");
  const [soundOn, setSound] = useState(isSoundOn());
  const lot = state.lot;
  const me = state.teams.find((t) => t.id === session.myId);
  const teamOf = (id: string | null) => state.teams.find((t) => t.id === id);
  const stamp = useRef(new Animated.Value(0)).current;
  const settled = lot && lot.status !== "open";
  useEffect(() => {
    if (settled) { stamp.setValue(0); Animated.spring(stamp, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start(); }
  }, [settled, lot?.pid]);

  const pricePop = useRef(new Animated.Value(1)).current;

  // --- outbid alert: you held the bid and someone just went higher ---
  const [alert, setAlert] = useState<string | null>(null);
  const prev = useRef<{ pid: number; bidder: string | null; status: string } | null>(null);
  const lotPid = lot?.pid, lotBidder = lot?.bidder ?? null, lotStatus = lot?.status;
  useEffect(() => {
    const before = prev.current;
    prev.current = lotPid === undefined ? null : { pid: lotPid, bidder: lotBidder, status: lotStatus! };
    if (lotPid === undefined) return;
    if (!before || before.pid !== lotPid) { play("lot", 0.7); return; }
    const myId = session.myId;
    // the room's soundtrack: your bid, a rival's bid, being outbid, the hammer
    if (lotStatus === "open" && before.bidder !== lotBidder) play(lotBidder === myId ? "bid" : before.bidder === myId ? "outbid" : "rival", lotBidder === myId || before.bidder === myId ? 1 : 0.6);
    if (before.status === "open" && lotStatus === "sold") play("sold");
    if (before.status === "open" && lotStatus === "unsold") play("unsold", 0.8);
    // the price jumps when it changes
    if (before.bidder !== lotBidder) { pricePop.setValue(1.25); Animated.spring(pricePop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start(); }
    if (before.bidder === myId && lotBidder !== myId && lotStatus === "open") {
      setAlert(`OUTBID BY ${(state.teams.find((t) => t.id === lotBidder)?.name ?? "A RIVAL").toUpperCase()}!`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else if (before.status === "open" && lotStatus === "sold" && lotBidder === myId) {
      setAlert("YOU GOT YOUR PLAYER!");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [lotPid, lotBidder, lotStatus]);
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 2200);
    return () => clearTimeout(t);
  }, [alert]);

  // --- emoji reactions floating over the player card ---
  const [bubbles, setBubbles] = useState<{ key: number; emoji: string; who: string; color: string; x: number }[]>([]);
  const bubbleSeq = useRef(0);
  useEffect(() => session.onReaction((teamId, emoji) => {
    const t = session.getState()?.teams.find((x) => x.id === teamId);
    const key = ++bubbleSeq.current;
    setBubbles((list) => [...list.slice(-7), { key, emoji, who: (t?.name ?? "").toUpperCase(), color: t?.color ?? "#5B5FEF", x: 8 + ((key * 37) % 60) }]);
    setTimeout(() => setBubbles((list) => list.filter((b) => b.key !== key)), 2300);
  }), [session]);

  if (!lot || !me) return <View style={[s.screen, s.center]}><Text style={s.arenaComingSoonText}>PREPARING THE NEXT PLAYER…</Text></View>;
  const player = getPlayer(lot.pid);
  const leader = teamOf(lot.bidder);
  const min = nextBid(lot);
  const blocker = status !== "live" ? "Reconnecting to the host…" : lot.status !== "open" ? "Next player coming up…" : bidBlocker(state, me.id, min);
  const canPass = status === "live" && lot.status === "open" && !state.paused && lot.bidder !== me.id && !lot.passed.includes(me.id);
  const bid = (amount: number) => {
    if (bidBlocker(state, me.id, amount) !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    session.bid(amount);
  };
  // jump bids: skip one or two steps ahead to scare the room
  const jump1 = min + increment(min);
  const jump2 = jump1 + increment(jump1);
  const upNext = state.queue.slice(state.pos + 1, state.pos + 5).map(getPlayer);
  const statusLabel = status !== "live" ? "RECONNECTING" : state.paused ? "PAUSED" : "LIVE";
  const statusColor = status !== "live" ? "#FF6B6B" : state.paused ? "#FFB238" : "#2EC4A0";

  return (
    <View style={[s.screen, { backgroundColor: "#FBF7F0" }]}>
      <View style={[s.roomHeader, { paddingTop: insets.top + 8, paddingBottom: 14 }, CLAY_HEADER]}>
        <Pressable onPress={onExit} style={s.arenaBackBtn} accessibilityLabel="Leave arena"><Ionicons name="close" size={24} color="#2A2545" /></Pressable>
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
          <LinearGradient colors={["#5B5FEF", "#3F42C8"]} style={[s.arenaPlayerCard, { padding: 24 }]}>
            <View style={st.cardTop}>
              <View style={st.photoRing}><PlayerPhoto player={player} size={104} light /></View>
              <View style={{ alignItems: "center" }}>
                <Text style={s.arenaTimerLabel}>{lot.status === "open" ? (state.paused ? "PAUSED" : "CLOSING IN") : "NEXT IN"}</Text>
                <ClockText snapshot={snapshot} />
              </View>
            </View>
            <View style={{ marginTop: 18 }}>
              <View style={s.arenaCategoryBadge}><Text style={s.arenaCategoryText}>{player.overseas ? "OVERSEAS " : ""}{ROLE_LABEL[player.role]}{player.rating >= 90 ? " • MARQUEE" : ""}</Text></View>
              <Text style={[s.arenaPlayerName, { fontSize: 34 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{player.name.toUpperCase()}</Text>
              <Text style={s.arenaPlayerMeta}>{COUNTRY_LABEL[player.country] ?? player.country} • BASE {formatMoney(player.base)} • RATING {player.rating}</Text>
            </View>
            <ClockBar snapshot={snapshot} />
            {settled && (
              <Animated.View pointerEvents="none" style={[st.stamp, { borderColor: lot.status === "sold" ? "#7CEBCB" : "#FFB3B3", opacity: stamp, transform: [{ rotate: "-12deg" }, { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) }] }]}>
                <Text style={[st.stampText, { color: lot.status === "sold" ? "#7CEBCB" : "#FFB3B3" }]}>{lot.status === "sold" ? "SOLD!" : "UNSOLD"}</Text>
              </Animated.View>
            )}
          </LinearGradient>
          {bubbles.map((b) => <Bubble key={b.key} emoji={b.emoji} who={b.who} color={b.color} x={b.x} />)}
          {alert && <View style={[st.alert, { backgroundColor: alert.startsWith("OUTBID") ? "#FF6B6B" : "#2EC4A0" }]}><Text style={st.alertText}>{alert}</Text></View>}
        </View>

        <View style={s.arenaStatsRow}>
          <View style={s.arenaStatItem}>
            <Text style={s.arenaStatLabel}>{lot.status === "sold" ? "SOLD FOR" : lot.bidder ? "CURRENT BID" : "BASE PRICE"}</Text>
            <Animated.Text style={[s.arenaStatPrice, { transform: [{ scale: pricePop }] }]}>{formatMoney(lot.bid)}</Animated.Text>
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
        <Text style={st.roles}>{(["BAT", "BOWL", "AR", "WK"] as Role[]).map((r) => `${r} ${me.squad.filter((e) => getPlayer(e.pid).role === r).length}`).join("   •   ")}</Text>

        <View style={st.reactRow}>
          {REACTIONS.map((e) => (
            <Pressable key={e} onPress={() => session.react(e)} style={st.reactBtn} accessibilityLabel={`React ${e}`}><Text style={st.reactEmoji}>{e}</Text></Pressable>
          ))}
          <Pressable onPress={() => { const on = !soundOn; setSound(on); setSoundOn(on); saveSound(on); if (on) play("tap"); }} style={[st.reactBtn, { backgroundColor: soundOn ? "#EEEDFF" : "#F1EADF" }]} accessibilityLabel={soundOn ? "Mute sounds" : "Turn sounds on"}>
            <Ionicons name={soundOn ? "volume-high" : "volume-mute"} size={20} color={soundOn ? "#5B5FEF" : "#A39DB5"} />
          </Pressable>
        </View>

        <View style={[s.arenaLogHeader, { marginTop: 18, gap: 8 }]}>
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => setActiveTab(t)} style={[s.arenaTabBtn, { paddingHorizontal: 14 }, activeTab === t && s.arenaTabBtnOn]}>
              <Text style={[s.arenaTabText, activeTab === t && s.arenaTabTextOn]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.arenaLogContainer}>
          {activeTab === "BIDS" && upNext.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 24, alignItems: "center" }}>
              <Text style={[s.arenaStatLabel, { marginBottom: 0, marginRight: 10 }]}>UP NEXT</Text>
              {upNext.map((p) => (
                <View key={p.id} style={st.nextChip}>
                  <PlayerPhoto player={p} size={26} />
                  <Text style={st.nextName} numberOfLines={1}>{p.name}</Text>
                  <Text style={s.arenaLogTime}>{formatMoney(p.base)}</Text>
                </View>
              ))}
            </ScrollView>
          )}
          {activeTab === "BIDS" && (
            lot.history.length === 0 ? (
              <View style={s.arenaComingSoon}><Text style={s.arenaComingSoonText}>{lot.status === "unsold" ? "NOBODY WANTED THIS ONE" : `OPENING BID ${formatMoney(player.base)} — WHO STARTS?`}</Text></View>
            ) : (
              lot.history.slice().reverse().map((h, i) => {
                const t = teamOf(h.team);
                return (
                  <View key={lot.history.length - i} style={s.arenaLogItem}>
                    <View style={[s.row, { flex: 1 }]}><View style={[s.arenaLogDot, { backgroundColor: t?.color ?? "#A39DB5" }]} /><Text style={s.arenaLogUser} numberOfLines={1}>{(t?.name ?? "?").toUpperCase()}</Text></View>
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
                        {t.isBot && <Tag text="BOT" color="#7A748F" />}
                        {!t.isBot && !t.connected && <Tag text="OFFLINE" color="#FF6B6B" />}
                        {lot.passed.includes(t.id) && lot.status === "open" && <Tag text="PASSED" color="#FFB238" />}
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
                  <Pressable onPress={() => confirm("END AUCTION?", "This finishes the auction for everyone and shows the final table.", () => session.end(), "END")} style={s.arenaQuickBid}><Text style={[s.arenaQuickBidText, { color: "#FF6B6B" }]}>END AUCTION</Text></Pressable>
                </View>
              )}
            </>
          )}
          {activeTab === "SQUADS" && <Squads state={state} myId={me.id} />}
          {activeTab === "SOLD" && (
            state.results.length === 0 ? (
              <View style={s.arenaComingSoon}><Text style={s.arenaComingSoonText}>NO PLAYER HAS GONE UNDER THE HAMMER YET</Text></View>
            ) : (
              state.results.slice().reverse().map((r) => {
                const p = getPlayer(r.pid);
                const t = teamOf(r.team);
                return (
                  <View key={r.pid} style={s.arenaLogItem}>
                    <PlayerPhoto player={p} size={34} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={st.squadName} numberOfLines={1}>{p.name}</Text>
                      <Text style={[s.arenaLogTime, t && { color: t.color }]} numberOfLines={1}>{t ? `SOLD TO ${t.name.toUpperCase()}` : "UNSOLD"}</Text>
                    </View>
                    <Text style={[st.squadPrice, !t && { color: "#A39DB5" }]} numberOfLines={1}>{t ? formatMoney(r.price) : "—"}</Text>
                  </View>
                );
              })
            )
          )}
        </View>
      </ScrollView>

      <View style={[s.arenaActionWrapper, { paddingBottom: insets.bottom + 10, backgroundColor: "rgba(255, 255, 255, 0.95)", borderTopColor: "#F1EADF" }]}>
        <View style={s.arenaBidOptions}>
          <Pressable disabled={!canPass} onPress={() => session.pass()} style={[s.arenaQuickBid, !canPass && s.btnOff]} accessibilityLabel="Pass on this player">
            <Text style={[s.arenaQuickBidText, { color: "#FF6B6B" }]}>PASS</Text>
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
        <Pressable disabled={!!blocker} onPress={() => bid(min)} style={[s.arenaMainBid, !!blocker && { shadowOpacity: 0, boxShadow: "0px 8px 16px rgba(42, 37, 69, 0.14)" }]} accessibilityLabel={blocker ?? `Bid ${formatMoney(min)}`}>
          <LinearGradient colors={blocker ? ["#C9C4D6", "#A39DB5"] : ["#2EC4A0", "#1FA587"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.arenaBidGradient, !!blocker && { boxShadow: "inset 0px -8px 12px rgba(42, 37, 69, 0.22), inset 0px 8px 12px rgba(255, 255, 255, 0.45)" }]}>
            <Text style={[s.arenaBidBtnText, !!blocker && { fontSize: 15, letterSpacing: 1 }]} numberOfLines={1} adjustsFontSizeToFit>{blocker ? blocker.toUpperCase() : `BID ${formatMoney(min)}`}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// The countdown lives in its own small components so the five-times-a-second clock refresh
// re-renders only these, not the whole arena screen.
function ClockText({ snapshot }: { snapshot: Snapshot }) {
  const { seconds } = useCountdown(snapshot);
  const open = snapshot.state?.lot?.status === "open";
  const ticking = open && !snapshot.state?.paused && snapshot.status === "live" && seconds > 0 && seconds <= 5;
  useEffect(() => { if (ticking) play("tick", 0.8); }, [ticking, seconds]); // last five seconds tick audibly
  return <Text style={[s.arenaTimerVal, open && seconds <= 5 && { color: "#FFD6D6" }]} accessibilityLabel={`${seconds} seconds left`}>{seconds}s</Text>;
}
function ClockBar({ snapshot }: { snapshot: Snapshot }) {
  const { seconds, fraction } = useCountdown(snapshot);
  const open = snapshot.state?.lot?.status === "open";
  return (
    <View style={st.clockTrack}>
      <View style={[st.clockFill, { width: `${Math.round(fraction * 100)}%`, backgroundColor: !open ? "rgba(255,255,255,0.55)" : seconds <= 5 ? "#FF6B6B" : "#FFD66B" }]} />
    </View>
  );
}

/** One emoji floating up and fading out. */
function Bubble({ emoji, who, color, x }: { emoji: string; who: string; color: string; x: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 2200, useNativeDriver: true }).start(); }, [a]);
  return (
    <Animated.View pointerEvents="none" style={[st.bubble, { left: `${x}%`, opacity: a.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -150] }) }, { scale: a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1.15, 1] }) }] }]}>
      <Text style={st.bubbleEmoji}>{emoji}</Text>
      <View style={[st.bubbleTag, { backgroundColor: color }]}><Text style={st.bubbleWho} numberOfLines={1}>{who}</Text></View>
    </Animated.View>
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
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="#A39DB5" />
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
  alert: { position: "absolute", top: -6, alignSelf: "center", paddingHorizontal: 18, paddingVertical: 9, borderRadius: 18, boxShadow: "0px 8px 16px rgba(42, 37, 69, 0.25), inset 0px -4px 6px rgba(0, 0, 0, 0.15), inset 0px 4px 6px rgba(255, 255, 255, 0.35)" },
  alertText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 15, color: "#FFF", letterSpacing: 1 },
  roles: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#A39DB5", letterSpacing: 1, textAlign: "center", marginTop: 10 },
  reactRow: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20, marginTop: 12 },
  clockTrack: { height: 10, borderRadius: 5, backgroundColor: "rgba(20, 20, 90, 0.35)", marginTop: 16, overflow: "hidden", boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.25)" },
  clockFill: { height: "100%", borderRadius: 5 },
  reactBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", boxShadow: CLAY_SOFT },
  reactEmoji: { fontSize: 21 },
  bubble: { position: "absolute", bottom: 20, alignItems: "center" },
  bubbleEmoji: { fontSize: 38 },
  bubbleTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: -2, maxWidth: 110 },
  bubbleWho: { fontFamily: "Inter_800ExtraBold", fontSize: 8, color: "#FFF", letterSpacing: 1 },
  nextChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 18, paddingVertical: 5, paddingLeft: 5, paddingRight: 12, marginRight: 8, gap: 7, boxShadow: CLAY_SOFT },
  nextName: { fontFamily: "Poppins_600SemiBold", fontSize: 11, color: "#2A2545", maxWidth: 110 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  photoRing: { padding: 4, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.25)" },
  stamp: { position: "absolute", right: 20, top: 92, borderWidth: 4, borderRadius: 14, paddingHorizontal: 14, paddingTop: 6, backgroundColor: "rgba(42, 37, 69, 0.35)" },
  stampText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 30, letterSpacing: 2 },
  squadRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  squadName: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#2A2545" },
  squadPrice: { fontFamily: "LuckiestGuy_400Regular", fontSize: 14, color: "#5B5FEF", flexShrink: 0, marginLeft: 8 },
});
