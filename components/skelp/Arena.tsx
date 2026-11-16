import { T, themed } from "@/components/skelp/theme";
import { ScrollView, Text, View, Pressable, StyleSheet, Animated } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { bidBlocker, nextBid, overseasCap, overseasCount, safeMaxBid, setOf, squadPower, State, Team } from "@/game/engine";
import { toggleStar, useStars } from "@/game/stars";
import { formatMoney, increment } from "@/game/money";
import { REACTIONS } from "@/game/net/protocol";
import { Session } from "@/game/net/session";
import { COUNTRY_LABEL, getPlayer, Role, ROLE_LABEL } from "@/game/players";
import { Snapshot, useCountdown } from "@/game/useSession";
import { PlayerPhoto } from "./PlayerPhoto";
import { Tag } from "./Lobby";
import { isSoundOn, play, setSoundOn } from "@/game/sound";
import { saveSound } from "@/game/storage";
import { Backdrop, BigButton, Chip, Column, confirm, RoundButton, s, Segmented, SoftButton, useLayout, TeamBadge } from "./ui";

const TABS = ["BIDS", "TEAMS", "SQUADS", "PLAYERS"] as const;

/** The live auction room. */
export function Arena({ session, snapshot, insets, onExit }: { session: Session; snapshot: Snapshot; insets: any; onExit: () => void }) {
  const state = snapshot.state as State;
  const status = snapshot.status;
  const { wide } = useLayout();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>(session.isHost && !snapshot.state?.teams.some((t) => t.id === session.myId) ? "TEAMS" : "BIDS");
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
  const stars = useStars();

  // --- outbid alert: you held the bid and someone just went higher ---
  const [alert, setAlert] = useState<string | null>(null);
  const prev = useRef<{ pid: number; bidder: string | null; status: string } | null>(null);
  const lotPid = lot?.pid, lotBidder = lot?.bidder ?? null, lotStatus = lot?.status;
  useEffect(() => {
    const before = prev.current;
    prev.current = lotPid === undefined ? null : { pid: lotPid, bidder: lotBidder, status: lotStatus! };
    if (lotPid === undefined) return;
    if (!before || before.pid !== lotPid) {
      play("lot", 0.7);
      // a new player: say so if they are on the shortlist, or if a new set is starting
      const set = setOf(state, lotPid);
      if (stars.has(lotPid)) { setAlert("★ ON YOUR SHORTLIST!"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
      else if (set && set.n === 1 && state.round === 1) setAlert(`NOW: ${set.label}`);
      return;
    }
    const myId = session.myId;
    // the room's soundtrack: your bid, a rival's bid, being outbid, the hammer
    if (lotStatus === "open" && before.bidder !== lotBidder) play(lotBidder === myId ? "bid" : before.bidder === myId ? "outbid" : "rival", lotBidder === myId || before.bidder === myId ? 1 : 0.6);
    if (before.status !== "sold" && lotStatus === "sold") play("sold");
    if (before.status === "open" && lotStatus === "rtm") play("rival");
    if (before.status === "open" && lotStatus === "unsold") play("unsold", 0.8);
    // the price jumps when it changes
    if (before.bidder !== lotBidder) { pricePop.setValue(1.25); Animated.spring(pricePop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start(); }
    if (before.bidder === myId && lotBidder !== myId && lotStatus === "open") {
      setAlert(`OUTBID BY ${(state.teams.find((t) => t.id === lotBidder)?.name ?? "A RIVAL").toUpperCase()}!`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else if (before.status === "rtm" && lotStatus === "sold" && before.bidder === myId && lotBidder !== myId) {
      setAlert("OUTBID — RIGHT TO MATCH USED!");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else if (before.status !== "sold" && lotStatus === "sold" && lotBidder === myId) {
      setAlert("YOU GOT YOUR PLAYER!");
      setParty((n) => n + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [lotPid, lotBidder, lotStatus]);
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 2200);
    return () => clearTimeout(t);
  }, [alert]);

  // --- emoji reactions floating over the player card ---
  // --- a little celebration when you win a player ---
  const [party, setParty] = useState(0);
  useEffect(() => {
    if (!party) return;
    const emojis = ["🎉", "🏏", "🎊", "🙌", "🎉", "⭐"];
    const base = bubbleSeq.current;
    bubbleSeq.current += emojis.length;
    emojis.forEach((emoji, i) => {
      const key = base + i + 1;
      setTimeout(() => {
        setBubbles((list) => [...list.slice(-10), { key, emoji, who: "", color: "transparent", x: 6 + i * 15 }]);
        setTimeout(() => setBubbles((list) => list.filter((b) => b.key !== key)), 2300);
      }, i * 110);
    });
  }, [party]);
  // --- the player card eases in for every new lot ---
  const cardIn = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    cardIn.setValue(0);
    Animated.timing(cardIn, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [lotPid]);

  const [bubbles, setBubbles] = useState<{ key: number; emoji: string; who: string; color: string; x: number }[]>([]);
  const bubbleSeq = useRef(0);
  useEffect(() => session.onReaction((teamId, emoji) => {
    const t = session.getState()?.teams.find((x) => x.id === teamId);
    const key = ++bubbleSeq.current;
    setBubbles((list) => [...list.slice(-7), { key, emoji, who: (t?.name ?? "").toUpperCase(), color: t?.color ?? T.primaryText, x: 8 + ((key * 37) % 60) }]);
    setTimeout(() => setBubbles((list) => list.filter((b) => b.key !== key)), 2300);
  }), [session]);

  if (!lot) return <View style={[s.screen, s.center]}><Text style={s.arenaComingSoonText}>PREPARING THE NEXT PLAYER…</Text></View>;
  const myId = me?.id ?? "";
  const ping = snapshot.latency;
  const set = setOf(state, lot.pid);
  const starred = stars.has(lot.pid);
  const former = teamOf(state.former[String(lot.pid)] ?? null);
  const rtmTeam = lot.status === "rtm" ? teamOf(lot.rtmTeam ?? null) : undefined;
  const myRtm = !!me && lot.status === "rtm" && lot.rtmTeam === me.id;
  const canUndo = session.isHost && lot.status === "open" && lot.history.length > 0 && !(lot.history.length === 1 && lot.n > 1);
  const player = getPlayer(lot.pid);
  const leader = teamOf(lot.bidder);
  const min = nextBid(lot);
  const blocker = status !== "live" ? "Reconnecting to the host…" : lot.status === "rtm" ? `${(rtmTeam?.name ?? "A team").toUpperCase()} may match the bid…` : lot.status !== "open" ? "Next player coming up…" : bidBlocker(state, myId, min);
  const canPass = !!me && status === "live" && lot.status === "open" && !state.paused && lot.bidder !== myId && !lot.passed.includes(myId);
  const bid = (amount: number) => {
    if (bidBlocker(state, myId, amount) !== null) return;
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
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <Backdrop />
      <View style={[s.roomHeader, { paddingTop: insets.top + 8, paddingBottom: 14 }, T.clayHeader]}>
        <RoundButton icon="close" label="Leave arena" onPress={onExit} color={T.ink} />
        <View style={s.arenaTitleBox}>
          <Text style={s.arenaCode} numberOfLines={1}>{state.arena.toUpperCase()}</Text>
          <View style={s.arenaStatus}>
            <View style={[s.arenaDot, { backgroundColor: statusColor }]} />
            <Text style={[s.arenaLiveText, { color: statusColor }]}>{statusLabel} • {state.round === 2 ? "ACCELERATED " : ""}LOT {state.pos + 1}/{state.queue.length}</Text>
            {!session.isHost && status === "live" && ping !== null && <Signal ms={ping} />}
          </View>
        </View>
        {me ? <TeamBadge team={me} size={44} /> : <View style={s.arenaUserBox}><Ionicons name="tv" size={22} color={T.white} /></View>}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + (me ? 190 : 110) }} showsVerticalScrollIndicator={false}>
       <Column max={1100} style={wide ? { flexDirection: "row", alignItems: "flex-start" } : null}>
        <View style={wide ? { flex: 1 } : null}>
        <View style={s.arenaPlayerSection}>
          <LinearGradient colors={T.gradHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.arenaPlayerCard, { padding: 24 }]}>
            <View style={st.cardRing} />
            <View style={st.cardTop}>
              <View style={st.photoRing}><PlayerPhoto player={player} size={104} light /></View>
              <View style={{ alignItems: "center" }}>
                <Text style={s.arenaTimerLabel}>{lot.status === "open" ? (state.paused ? "PAUSED" : "CLOSING IN") : lot.status === "rtm" ? "DECIDING" : "NEXT IN"}</Text>
                <ClockText snapshot={snapshot} />
              </View>
            </View>
            <Animated.View style={{ marginTop: 18, opacity: cardIn, transform: [{ translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
              {set && <Text style={st.setLine}>{set.label} • {set.n} OF {set.of}</Text>}
              <View style={[s.row, { gap: 8, flexWrap: "wrap" }]}>
                {starred && <View style={[s.arenaCategoryBadge, { backgroundColor: "rgba(255, 214, 107, 0.32)" }]}><Text style={[s.arenaCategoryText, { color: "#FFE9A8" }]}>★ SHORTLIST</Text></View>}
                <View style={s.arenaCategoryBadge}><Text style={s.arenaCategoryText}>{player.overseas ? "OVERSEAS " : ""}{ROLE_LABEL[player.role]}{player.rating >= 90 ? " • MARQUEE" : ""}</Text></View>
                {former && <View style={[s.arenaCategoryBadge, { backgroundColor: "rgba(255, 214, 107, 0.28)" }]}><Text style={[s.arenaCategoryText, { color: "#FFE9A8" }]}>EX-{former.name.toUpperCase()}{former.rtm > 0 ? " • RTM" : ""}</Text></View>}
              </View>
              <Text style={[s.arenaPlayerName, { fontSize: 34 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{player.name.toUpperCase()}</Text>
              <Text style={s.arenaPlayerMeta}>{COUNTRY_LABEL[player.country] ?? player.country} • BASE {formatMoney(player.base)} • RATING {player.rating}</Text>
            </Animated.View>
            <ClockBar snapshot={snapshot} />
            {settled && (
              <Animated.View pointerEvents="none" style={[st.stamp, { borderColor: lot.status === "sold" ? "#7CEBCB" : lot.status === "rtm" ? "#FFD66B" : "#FFB3B3", opacity: stamp, transform: [{ rotate: "-12deg" }, { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) }] }]}>
                <Text style={[st.stampText, { color: lot.status === "sold" ? "#7CEBCB" : lot.status === "rtm" ? "#FFD66B" : "#FFB3B3" }]}>{lot.status === "sold" ? (lot.rtmTeam ? "RTM!" : "SOLD!") : lot.status === "rtm" ? "RTM?" : "UNSOLD"}</Text>
              </Animated.View>
            )}
          </LinearGradient>
          {bubbles.map((b) => <Bubble key={b.key} emoji={b.emoji} who={b.who} color={b.color} x={b.x} />)}
          {alert && <View style={[st.alert, { backgroundColor: alert.startsWith("OUTBID") ? "#FF6B6B" : alert.startsWith("★") ? "#F59E1B" : alert.startsWith("NOW") ? T.ink : "#2EC4A0" }]} accessibilityLiveRegion="polite"><Text style={st.alertText}>{alert}</Text></View>}
        </View>

        <View style={s.arenaStatsRow}>
          <View style={s.arenaStatItem}>
            <Text style={s.arenaStatLabel}>{lot.status === "sold" ? "SOLD FOR" : lot.bidder ? "CURRENT BID" : "BASE PRICE"}</Text>
            <Animated.Text style={[s.arenaStatPrice, { transform: [{ scale: pricePop }] }]}>{formatMoney(lot.bid)}</Animated.Text>
          </View>
          <View style={s.arenaStatDivider} />
          <View style={s.arenaStatItem}>
            <Text style={s.arenaStatLabel}>{lot.status === "sold" ? (lot.rtmTeam ? "MATCHED BY" : "SOLD TO") : "HIGHEST BIDDER"}</Text>
            <Text style={[s.arenaStatOwner, leader && { color: leader.color }]} numberOfLines={1}>{leader ? `${leader.name.toUpperCase()}${leader.id === myId ? " (YOU)" : ""}` : lot.status === "unsold" ? "NO TAKERS" : "NO BIDS YET"}</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {state.teams.map((t) => {
            const leading = lot.bidder === t.id;
            const out = lot.status === "open" && lot.passed.includes(t.id);
            return (
              <View key={t.id} style={[st.purseChip, leading && { borderColor: t.color, backgroundColor: t.color + "1F" }, out && { opacity: 0.45 }]} accessibilityLabel={`${t.name}: ${formatMoney(t.purse)} left, ${t.squad.length} players${leading ? ", leading" : out ? ", passed" : ""}`}>
                <TeamBadge team={t} size={26} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={st.purseName}>{t.name}{t.id === myId ? " • YOU" : ""}</Text>
                  <Text style={st.purseVal}>{formatMoney(t.purse)} <Text style={st.purseSub}>• {t.squad.length}/{state.config.squadMax}{out ? " • PASS" : ""}</Text></Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        {rtmTeam && (
          <View style={st.rtmBanner}>
            <Ionicons name="card" size={18} color={T.goldText} />
            <Text style={st.rtmText}>{myRtm ? `YOUR FORMER PLAYER! MATCH ${formatMoney(lot.bid)} WITH A RIGHT TO MATCH CARD?` : `${rtmTeam.name.toUpperCase()} CAN MATCH THE BID WITH A RIGHT TO MATCH CARD`}</Text>
          </View>
        )}

        {me && (
          <>
            <View style={[s.arenaStatsRow, { marginTop: 12, paddingVertical: 14 }]}>
              <Mini l="YOUR PURSE" v={formatMoney(me.purse)} />
              <View style={s.arenaStatDivider} />
              <Mini l="SQUAD" v={`${me.squad.length}/${state.config.squadMax}`} />
              <View style={s.arenaStatDivider} />
              <Mini l="OVERSEAS" v={`${overseasCount(me)}/${overseasCap(state.config)}`} />
              {state.config.rtm > 0 && <><View style={s.arenaStatDivider} /><Mini l="RTM CARDS" v={String(me.rtm)} /></>}
            </View>
            <Text style={st.roles}>{(["BAT", "BOWL", "AR", "WK"] as Role[]).map((r) => `${r} ${me.squad.filter((e) => getPlayer(e.pid).role === r).length}`).join("   •   ")}</Text>
            {me.squad.length < Math.min(state.config.squadMax, 11) && <Text style={[st.roles, { marginTop: 4, color: lot.status === "open" && min > safeMaxBid(state, me) ? T.coralText : T.muted }]}>SAFE MAX BID {formatMoney(safeMaxBid(state, me))} TO STILL FILL YOUR XI</Text>}
          </>
        )}
        </View>
        <View style={wide ? { flex: 1 } : null}>

        <View style={st.reactRow}>
          {REACTIONS.map((e) => (
            <Pressable key={e} onPress={() => session.react(e)} style={st.reactBtn} accessibilityLabel={`React ${e}`}><Text style={st.reactEmoji}>{e}</Text></Pressable>
          ))}
          <Pressable onPress={() => { const on = !soundOn; setSound(on); setSoundOn(on); saveSound(on); if (on) play("tap"); }} style={[st.reactBtn, { backgroundColor: soundOn ? T.primarySoft : T.sand }]} accessibilityLabel={soundOn ? "Mute sounds" : "Turn sounds on"}>
            <Ionicons name={soundOn ? "volume-high" : "volume-mute"} size={20} color={soundOn ? T.primaryText : T.dim} />
          </Pressable>
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 18 }}><Segmented options={TABS} value={activeTab} onChange={setActiveTab} /></View>

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
                    <View style={[s.row, { flex: 1 }]}><View style={[s.arenaLogDot, { backgroundColor: t?.color ?? T.dim }]} /><Text style={s.arenaLogUser} numberOfLines={1}>{(t?.name ?? "?").toUpperCase()}</Text></View>
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
                    <View style={{ marginRight: 12 }}><TeamBadge team={t} size={34} /></View>
                    <View style={{ flex: 1 }}>
                      <View style={s.row}>
                        <Text style={s.arenaLogUser} numberOfLines={1}>{t.name.toUpperCase()}</Text>
                        {t.isBot && <Tag text="BOT" color={T.muted} />}
                        {!t.isBot && !t.connected && <Tag text="OFFLINE" color="#FF6B6B" />}
                        {lot.passed.includes(t.id) && lot.status === "open" && <Tag text="PASSED" color="#FFB238" />}
                      </View>
                      <Text style={s.arenaLogTime} numberOfLines={1}>{t.owner.toUpperCase()} • {t.squad.length}/{state.config.squadMax} • {overseasCount(t)} OVS • PWR {squadPower(t)}{state.config.rtm > 0 ? ` • ${t.rtm} RTM` : ""}</Text>
                    </View>
                  </View>
                  <Text style={[s.arenaLogPrice, { flexGrow: 0, flexShrink: 0, flexBasis: "auto", marginRight: 0 }]} numberOfLines={1}>{formatMoney(t.purse)}</Text>
                </View>
              ))}
              {session.isHost && me && <HostControls session={session} state={state} canUndo={canUndo} />}
            </>
          )}
          {activeTab === "SQUADS" && <Squads state={state} myId={myId} />}
          {activeTab === "PLAYERS" && <PlayerList state={state} />}
        </View>
        </View>
       </Column>
      </ScrollView>

      <View style={[s.arenaActionWrapper, { paddingBottom: insets.bottom + 10, backgroundColor: T.barBg, borderTopColor: T.line }]}>
       <Column>
        {!me ? (
          <View style={{ paddingTop: 6, paddingBottom: 4 }}><HostControls session={session} state={state} canUndo={canUndo} /></View>
        ) : myRtm ? (
          <View style={[s.row, { gap: 12, marginTop: 15, marginBottom: 10 }]}>
            <SoftButton title="LET GO" color={T.coralText} style={{ flex: 1, height: 60, borderRadius: 20 }} onPress={() => session.rtm(false)} />
            <BigButton title={`MATCH ${formatMoney(lot.bid)}`} tone="gold" icon="card" style={{ flex: 2 }} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); session.rtm(true); }} />
          </View>
        ) : (
        <>
        <View style={s.arenaBidOptions}>
          <Pressable disabled={!canPass} onPress={() => session.pass()} style={[s.arenaQuickBid, !canPass && s.btnOff]} accessibilityLabel="Pass on this player">
            <Text style={[s.arenaQuickBidText, { color: "#FF6B6B" }]}>PASS</Text>
          </Pressable>
          {[jump1, jump2].map((amt) => {
            const ok = status === "live" && bidBlocker(state, myId, amt) === null;
            return (
              <Pressable key={amt} disabled={!ok} onPress={() => bid(amt)} style={[s.arenaQuickBid, !ok && s.btnOff]} accessibilityLabel={`Jump bid ${formatMoney(amt)}`}>
                <Text style={s.arenaQuickBidText}>{formatMoney(amt)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable disabled={!!blocker} onPress={() => bid(min)} style={[s.arenaMainBid, !!blocker && { shadowOpacity: 0, boxShadow: "0px 8px 16px rgba(42, 37, 69, 0.14)" }]} accessibilityLabel={blocker ?? `Bid ${formatMoney(min)}`}>
          <LinearGradient colors={blocker ? T.gradOff : T.gradMint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.arenaBidGradient, !!blocker && { boxShadow: "inset 0px -8px 12px rgba(42, 37, 69, 0.22), inset 0px 8px 12px rgba(255, 255, 255, 0.45)" }]}>
            <Text style={[s.arenaBidBtnText, !!blocker && { fontSize: 15, letterSpacing: 1 }]} numberOfLines={1} adjustsFontSizeToFit>{blocker ? blocker.toUpperCase() : `BID ${formatMoney(min)}`}</Text>
          </LinearGradient>
        </Pressable>
        </>
        )}
       </Column>
      </View>
    </View>
  );
}

const LIST_FILTERS = ["ALL", "UPCOMING", "SOLD", "UNSOLD", "★"] as const;
/** Every player in this auction, set by set: who is on the block, who is still to come, who went where and for how much. */
function PlayerList({ state }: { state: State }) {
  const [filter, setFilter] = useState<(typeof LIST_FILTERS)[number]>("ALL");
  const [showAll, setShowAll] = useState(false);
  const stars = useStars();
  const lot = state.lot;
  const done = new Map(state.results.map((r) => [r.pid, r]));
  type Row = { pid: number; kind: "now" | "next" | "sold" | "unsold"; n?: number };
  const upcoming: Row[] = state.queue.slice(state.pos + 1).map((pid, i) => ({ pid, kind: "next", n: i + 1 }));
  const finished: Row[] = state.results.slice().reverse().map((r) => ({ pid: r.pid, kind: r.team ? "sold" : "unsold" }));
  // a lot that has just been hammered is already in the results
  const current: Row[] = lot && !done.has(lot.pid) ? [{ pid: lot.pid, kind: "now" }] : [];
  const everyone = [...current, ...upcoming, ...finished];
  const rows = filter === "UPCOMING" ? upcoming : filter === "SOLD" ? finished.filter((r) => r.kind === "sold") : filter === "UNSOLD" ? finished.filter((r) => r.kind === "unsold") : filter === "★" ? everyone.filter((r) => stars.has(r.pid)) : everyone;
  const shown = showAll ? rows : rows.slice(0, 30);
  const label = (pid: number) => state.sets.find((x) => x.pids.includes(pid))?.label ?? "";
  const grouped = filter === "ALL" || filter === "UPCOMING";
  return (
    <>
      <View style={[s.row, { gap: 8, marginBottom: 12, flexWrap: "wrap" }]}>
        {LIST_FILTERS.map((f) => {
          const count = f === "ALL" ? everyone.length : f === "UPCOMING" ? upcoming.length : f === "★" ? everyone.filter((r) => stars.has(r.pid)).length : finished.filter((r) => r.kind === (f === "SOLD" ? "sold" : "unsold")).length;
          return (
            <Pressable key={f} onPress={() => { setFilter(f); setShowAll(false); }} style={[st.filter, filter === f && st.filterOn]} accessibilityLabel={f === "★" ? "Show my shortlist" : `Show ${f.toLowerCase()} players`} accessibilityState={{ selected: filter === f }}>
              <Text style={[st.filterText, filter === f && { color: T.white }]}>{f} {count}</Text>
            </Pressable>
          );
        })}
      </View>
      {rows.length === 0 && <View style={s.arenaComingSoon}><Text style={[s.arenaComingSoonText, { textAlign: "center", lineHeight: 16 }]}>{filter === "SOLD" ? "NO PLAYER HAS BEEN SOLD YET" : filter === "UNSOLD" ? "NOBODY HAS GONE UNSOLD" : filter === "★" ? "TAP THE STAR NEXT TO A PLAYER TO SHORTLIST THEM.\nYOU WILL BE TOLD WHEN THEY COME UP." : "NO MORE PLAYERS TO COME"}</Text></View>}
      {shown.map((row, i) => {
        const p = getPlayer(row.pid);
        const r = done.get(row.pid);
        const t = r?.team ? state.teams.find((x) => x.id === r.team) : undefined;
        const on = stars.has(row.pid);
        const setLabel = grouped && row.kind !== "sold" && row.kind !== "unsold" ? label(row.pid) : "";
        const prev = i > 0 ? shown[i - 1] : null;
        const header = setLabel && (!prev || prev.kind === "now" || label(prev.pid) !== setLabel) && row.kind === "next";
        const doneHeader = grouped && (row.kind === "sold" || row.kind === "unsold") && (!prev || prev.kind === "now" || prev.kind === "next");
        return (
          <View key={`${row.kind}-${row.pid}`}>
            {header && state.round === 1 && <Text style={st.setHeader}>{setLabel}</Text>}
            {doneHeader && <Text style={st.setHeader}>ALREADY UNDER THE HAMMER</Text>}
            <View style={[s.arenaLogItem, { paddingVertical: 12 }, row.kind === "now" && { borderWidth: 2, borderColor: T.primary }]}>
              <PlayerPhoto player={p} size={38} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.squadName} numberOfLines={1}>{p.name}</Text>
                <Text style={s.arenaLogTime} numberOfLines={1}>{ROLE_LABEL[p.role]} • {p.country} • RTG {p.rating} • BASE {formatMoney(p.base)}</Text>
              </View>
              {row.kind === "now" && <Chip text="ON THE BLOCK" color={T.primaryText} soft={T.primarySoft} />}
              {row.kind === "next" && <Text style={s.arenaLogTime}>{row.n === 1 ? "NEXT" : `IN ${row.n}`}</Text>}
              {row.kind === "unsold" && <Chip text="UNSOLD" color={T.coralText} soft={T.coralSoft} />}
              {row.kind === "sold" && t && r && (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={st.squadPrice} numberOfLines={1}>{formatMoney(r.price)}</Text>
                  <Text style={[s.arenaLogTime, { color: t.color }]} numberOfLines={1}>{r.kept ? "RETAINED BY" : r.rtm ? "RTM BY" : "SOLD TO"} {t.name.toUpperCase()}</Text>
                </View>
              )}
              {(row.kind === "now" || row.kind === "next") && (
                <Pressable onPress={() => toggleStar(row.pid)} hitSlop={10} style={{ marginLeft: 10 }} accessibilityLabel={`${on ? "Remove" : "Add"} ${p.name} ${on ? "from" : "to"} shortlist`}>
                  <Ionicons name={on ? "star" : "star-outline"} size={20} color={on ? T.gold : T.dim} />
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
      {rows.length > shown.length && <SoftButton title={`SHOW ALL ${rows.length} PLAYERS`} icon="chevron-down" color={T.primaryText} style={{ marginTop: 4 }} onPress={() => setShowAll(true)} />}
    </>
  );
}

/** Pause, undo the latest bid, or end the auction — host only. */
function HostControls({ session, state, canUndo }: { session: Session; state: State; canUndo: boolean }) {
  return (
    <View style={[s.row, { gap: 10, marginTop: 8 }]}>
      <SoftButton title={state.paused ? "RESUME" : "PAUSE"} icon={state.paused ? "play" : "pause"} style={{ flex: 1 }} onPress={() => session.pause(!state.paused)} />
      <SoftButton title="UNDO" icon="arrow-undo" disabled={!canUndo} style={{ flex: 1 }} onPress={() => confirm("UNDO THE LAST BID?", "The price goes back to the bid before it and the clock restarts.", () => session.undo(), "UNDO")} />
      <SoftButton title="END" icon="stop" color={T.coralText} style={{ flex: 1 }} onPress={() => confirm("END AUCTION?", "This finishes the auction for everyone and shows the final table.", () => session.end(), "END")} />
    </View>
  );
}

// The countdown lives in its own small components so the five-times-a-second clock refresh
// re-renders only these, not the whole arena screen.
function ClockText({ snapshot }: { snapshot: Snapshot }) {
  const { seconds } = useCountdown(snapshot);
  const open = snapshot.state?.lot?.status === "open";
  const ticking = open && !snapshot.state?.paused && snapshot.status === "live" && seconds > 0 && seconds <= 5;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!ticking) return;
    play("tick", 0.8); // the last five seconds tick audibly, and the clock beats with them
    pulse.setValue(1.35);
    Animated.spring(pulse, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [ticking, seconds]);
  return <Animated.Text style={[s.arenaTimerVal, open && seconds <= 5 && { color: "#FFD6D6" }, { transform: [{ scale: pulse }] }]} accessibilityLabel={`${seconds} seconds left`}>{seconds}s</Animated.Text>;
}
/** Connection quality to the host: three bars and the round-trip time. */
function Signal({ ms }: { ms: number }) {
  const level = ms < 150 ? 3 : ms < 450 ? 2 : 1;
  const color = level === 3 ? "#2EC4A0" : level === 2 ? "#F5A623" : "#FF6B6B";
  return (
    <View style={st.signal} accessibilityLabel={`Connection ${level === 3 ? "good" : level === 2 ? "fair" : "slow"}, ${ms} milliseconds`}>
      {[1, 2, 3].map((n) => <View key={n} style={{ width: 3, height: 3 + n * 2.5, borderRadius: 1.5, marginRight: 1.5, backgroundColor: n <= level ? color : T.lineStrong }} />)}
      <Text style={[st.signalText, { color }]}>{ms} MS</Text>
    </View>
  );
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
      {!!who && <View style={[st.bubbleTag, { backgroundColor: color }]}><Text style={st.bubbleWho} numberOfLines={1}>{who}</Text></View>}
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
          <Text style={[s.arenaLogUser, { flexShrink: 1 }]} numberOfLines={1}>{team.name.toUpperCase()}{mine ? " (YOU)" : ""}</Text>
        </View>
        <Text style={s.arenaLogTime}>{team.squad.length} PLAYERS  </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={T.dim} />
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
              {e.kept && <Chip text="KEPT" color={T.primaryText} soft={T.primarySoft} />}
              {e.rtm && <Chip text="RTM" color={T.goldText} soft={T.goldSoft} />}
              <Text style={st.squadPrice} numberOfLines={1}>{formatMoney(e.price)}</Text>
            </View>
          );
        })
      ))}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  signal: { flexDirection: "row", alignItems: "flex-end", marginLeft: 8 },
  signalText: { fontFamily: "Inter_800ExtraBold", fontSize: 8, letterSpacing: 0.6, marginLeft: 3 },
  setLine: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#D9D6FF", letterSpacing: 1.6, marginBottom: 8 },
  setHeader: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.primaryText, letterSpacing: 1.6, marginTop: 10, marginBottom: 8, marginLeft: 4 },
  purseChip: { flexDirection: "row", alignItems: "center", backgroundColor: T.card, borderRadius: 16, paddingVertical: 7, paddingLeft: 8, paddingRight: 12, borderWidth: 1.5, borderColor: T.cardEdge, boxShadow: T.claySoft, marginBottom: 6 },
  purseName: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: T.muted, letterSpacing: 0.8 },
  purseVal: { fontFamily: "Poppins_700Bold", fontSize: 12, color: T.ink, marginTop: -1 },
  purseSub: { fontFamily: "Inter_700Bold", fontSize: 9, color: T.muted },
  filter: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: T.card, boxShadow: T.claySoft },
  filterOn: { backgroundColor: T.primary, boxShadow: T.clayPrimary },
  filterText: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.muted, letterSpacing: 0.8 },
  cardRing: { position: "absolute", width: 320, height: 320, borderRadius: 160, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", top: -170, right: -110 },
  rtmBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.goldSoft, marginHorizontal: 20, marginTop: 12, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16 },
  rtmText: { flex: 1, fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.goldText, letterSpacing: 0.8, lineHeight: 15 },
  alert: { position: "absolute", top: -6, alignSelf: "center", paddingHorizontal: 18, paddingVertical: 9, borderRadius: 18, boxShadow: "0px 8px 16px rgba(42, 37, 69, 0.25), inset 0px -4px 6px rgba(0, 0, 0, 0.15), inset 0px 4px 6px rgba(255, 255, 255, 0.35)" },
  alertText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 15, color: T.white, letterSpacing: 1 },
  roles: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: T.dim, letterSpacing: 1, textAlign: "center", marginTop: 10 },
  reactRow: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20, marginTop: 12 },
  clockTrack: { height: 10, borderRadius: 5, backgroundColor: "rgba(20, 20, 90, 0.35)", marginTop: 16, overflow: "hidden", boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.25)" },
  clockFill: { height: "100%", borderRadius: 5 },
  reactBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.card, alignItems: "center", justifyContent: "center", boxShadow: T.claySoft },
  reactEmoji: { fontSize: 21 },
  bubble: { position: "absolute", bottom: 20, alignItems: "center" },
  bubbleEmoji: { fontSize: 38 },
  bubbleTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: -2, maxWidth: 110 },
  bubbleWho: { fontFamily: "Inter_800ExtraBold", fontSize: 8, color: T.white, letterSpacing: 1 },
  nextChip: { flexDirection: "row", alignItems: "center", backgroundColor: T.card, borderRadius: 18, paddingVertical: 5, paddingLeft: 5, paddingRight: 12, marginRight: 8, gap: 7, boxShadow: T.claySoft },
  nextName: { fontFamily: "Poppins_600SemiBold", fontSize: 11, color: T.ink, maxWidth: 110 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  photoRing: { padding: 4, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.25)" },
  stamp: { position: "absolute", right: 20, top: 92, borderWidth: 4, borderRadius: 14, paddingHorizontal: 14, paddingTop: 6, backgroundColor: "rgba(42, 37, 69, 0.35)" },
  stampText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 30, letterSpacing: 2 },
  squadRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  squadName: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: T.ink },
  squadPrice: { fontFamily: "LuckiestGuy_400Regular", fontSize: 14, color: T.primaryText, flexShrink: 0, marginLeft: 8 },
}));
