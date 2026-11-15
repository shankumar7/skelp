import { ScrollView, Text, View, Pressable, Animated, TextInput, ActivityIndicator } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { formatMoney } from "@/game/money";
import { getLocalIp, transport } from "@/game/net/native";
import { ArenaInfo } from "@/game/net/protocol";
import { ClientSession, HostSession, resolveCode, scan, Session } from "@/game/net/session";
import { Profile, Stats } from "@/game/storage";
import { notify, s } from "./ui";

/** Home base: find arenas on the local network, host one, or practise against bots. */
export function Dashboard({ profile, stats, insets, onLogout, onEnter, onPool }: { profile: Profile; stats: Stats; insets: any; onLogout: () => void; onEnter: (session: Session) => void; onPool: () => void }) {
  const dashAnim = useRef(new Animated.Value(0)).current;
  const [code, setCode] = useState("");
  const [arenas, setArenas] = useState<ArenaInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const scanRef = useRef<{ cancel(): void } | null>(null);
  const me = { id: profile.id, name: profile.name, avatar: profile.avatar };

  const rescan = useCallback(async () => {
    if (!transport) return;
    scanRef.current?.cancel();
    setArenas([]);
    setScanning(true);
    const ip = await getLocalIp();
    const job = scan(transport, ip, (a) => setArenas((list) => (list.some((x) => x.host === a.host) ? list : [...list, a])));
    scanRef.current = job;
    await job.done;
    if (scanRef.current === job) setScanning(false);
  }, []);

  useEffect(() => {
    Animated.timing(dashAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
    rescan();
    return () => scanRef.current?.cancel();
  }, []);

  const slideUp = (delay: number) => ({
    opacity: dashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [{ translateY: dashAnim.interpolate({ inputRange: [0, 1], outputRange: [20 + delay / 10, 0] }) }],
  });

  const join = (host: string) => {
    if (!transport) return notify("NOT AVAILABLE HERE", "Joining arenas over Wi-Fi works in the Android app. Try SOLO PRACTICE here.");
    scanRef.current?.cancel();
    onEnter(new ClientSession(transport, host, me));
  };
  const joinByCode = async () => {
    if (!code.trim()) return;
    const host = resolveCode(code, await getLocalIp());
    if (!host) return notify("CHECK THE CODE", "Type the arena code shown on the host's phone (for example 42), or the full host address like 192.168.43.1.");
    join(host);
  };
  const hostArena = async (lan: boolean) => {
    if (busy) return;
    if (lan && !transport) return notify("NOT AVAILABLE HERE", "Hosting over Wi-Fi works in the Android app. Try SOLO PRACTICE here.");
    setBusy(true);
    scanRef.current?.cancel();
    const session = new HostSession(me, lan ? `${profile.name}'s Arena` : "Practice Arena");
    try {
      if (lan && transport) await session.serve(transport);
      else { session.addBot(); session.addBot(); session.addBot(); }
      onEnter(session);
    } catch {
      session.leave();
      notify("COULD NOT HOST", "Skelp! could not open its port on this phone. Close other copies of the app and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[s.screen, { backgroundColor: "#F1EADF" }]}>
      <View style={[s.dashHeader, { paddingTop: insets.top + 10 }]}>
        <View style={[s.row, { flex: 1 }]}>
          <View style={s.dashUserCircle}><Ionicons name={profile.avatar as any} size={28} color="#5B5FEF" /></View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={s.dashGreeting}>WELCOME BACK,</Text>
            <Text style={s.dashName} numberOfLines={1}>{profile.name.toUpperCase()}</Text>
          </View>
        </View>
        <Pressable onPress={onLogout} style={s.dashLogout} accessibilityLabel="Log out"><Ionicons name="log-out-outline" size={24} color="#7A748F" /></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[s.dashSearchBox, { paddingVertical: 4 }, slideUp(0)]}>
          <Ionicons name="search" size={20} color="#A39DB5" />
          <TextInput value={code} onChangeText={setCode} onSubmitEditing={joinByCode} placeholder="ENTER ARENA CODE..." placeholderTextColor="#A39DB5" keyboardType="numbers-and-punctuation" returnKeyType="go" autoCapitalize="none" style={[s.dashSearchPlaceholder, { flex: 1, color: "#2A2545", paddingVertical: 10 }]} />
          {code.trim().length > 0 && <Pressable onPress={joinByCode} hitSlop={10} accessibilityLabel="Join with code"><Ionicons name="arrow-forward-circle" size={28} color="#5B5FEF" /></Pressable>}
        </Animated.View>

        <Animated.View style={[s.dashJoinHero, slideUp(100)]}>
          <Pressable onPress={rescan} accessibilityLabel="Find nearby arenas">
            <LinearGradient colors={["#5B5FEF", "#4A4DDB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.dashJoinGradient}>
              <View style={{ flex: 1 }}>
                <Text style={s.dashJoinTitle}>FIND NEARBY ARENAS</Text>
                <Text style={s.dashJoinSub}>SAME WI-FI OR HOTSPOT • NO INTERNET NEEDED</Text>
              </View>
              <View style={s.dashJoinArrow}>{scanning ? <ActivityIndicator color="#FFF" /> : <Ionicons name="wifi" size={24} color="#FFF" />}</View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <View style={s.dashSectionHeader}>
          <Text style={s.dashSectionTitle}>LIVE AUCTIONS</Text>
          <Pressable onPress={rescan} hitSlop={10}><Text style={s.dashViewAll}>{scanning ? "SCANNING…" : "RESCAN"}</Text></Pressable>
        </View>

        <Animated.View style={slideUp(200)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }} contentContainerStyle={{ paddingHorizontal: 24 }}>
            {arenas.map((a) => {
              const open = a.phase === "lobby" && a.teams < a.max;
              return (
                <Pressable key={a.host} onPress={() => join(a.host)} style={s.dashAucCard}>
                  <View style={[s.dashAucBadge, !open && { backgroundColor: "#F1EADF" }]}><Text style={[s.dashAucBadgeText, !open && { color: "#7A748F" }]}>{open ? "OPEN" : a.phase === "lobby" ? "FULL" : "IN PROGRESS"}</Text></View>
                  <Text style={s.dashAucTitle} numberOfLines={2}>{a.arena.toUpperCase()}</Text>
                  <View style={s.dashAucMeta}>
                    <Ionicons name="people-outline" size={12} color="#7A748F" /><Text style={s.dashAucStat}>{a.teams}/{a.max}</Text>
                    <View style={s.dashAucDot} />
                    <Ionicons name="flash-outline" size={12} color="#7A748F" /><Text style={s.dashAucStat}>{a.mode}</Text>
                  </View>
                </Pressable>
              );
            })}
            {arenas.length === 0 && (
              <View style={s.dashAucCard}>
                <View style={[s.dashAucBadge, { backgroundColor: "#F1EADF" }]}><Text style={[s.dashAucBadgeText, { color: "#7A748F" }]}>{scanning ? "SEARCHING" : "NONE FOUND"}</Text></View>
                <Text style={s.dashAucTitle} numberOfLines={2}>{scanning ? "LOOKING FOR ARENAS…" : "NO ARENA NEARBY"}</Text>
                <View style={s.dashAucMeta}><Text style={s.dashAucStat}>{scanning ? "CHECKING YOUR NETWORK" : "HOST ONE BELOW"}</Text></View>
              </View>
            )}
            <Pressable onPress={() => hostArena(false)} style={s.dashAucCard} accessibilityLabel="Solo practice">
              <View style={[s.dashAucBadge, { backgroundColor: "#E3E1FF" }]}><Text style={[s.dashAucBadgeText, { color: "#4A3FC4" }]}>OFFLINE</Text></View>
              <Text style={s.dashAucTitle} numberOfLines={2}>SOLO PRACTICE</Text>
              <View style={s.dashAucMeta}><Ionicons name="hardware-chip-outline" size={12} color="#7A748F" /><Text style={s.dashAucStat}>YOU VS BOTS</Text></View>
            </Pressable>
          </ScrollView>
        </Animated.View>

        <View style={s.dashSectionHeader}><Text style={s.dashSectionTitle}>YOUR PERFORMANCE</Text></View>
        <Animated.View style={[s.dashStatsRow, slideUp(300)]}>
          <View style={s.dashStatBox}><Text style={s.dashStatVal}>{stats.auctions}</Text><Text style={s.dashStatLab}>AUCTIONS</Text></View>
          <View style={s.dashStatBox}><Text style={s.dashStatVal}>{stats.wins}</Text><Text style={s.dashStatLab}>WINS</Text></View>
          <View style={s.dashStatBox}><Text style={[s.dashStatVal, stats.spent >= 1000 && { fontSize: 18 }]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(stats.spent)}</Text><Text style={s.dashStatLab}>SPENT</Text></View>
        </Animated.View>

        <View style={s.dashSectionHeader}><Text style={s.dashSectionTitle}>RECENT AUCTIONS</Text></View>
        <Animated.View style={[s.dashLeaderboard, slideUp(400)]}>
          {stats.history.length === 0 && <Text style={[s.arenaComingSoonText, { textAlign: "center", paddingVertical: 14 }]}>PLAY YOUR FIRST AUCTION TO SEE IT HERE</Text>}
          {stats.history.slice(0, 5).map((h, i, arr) => (
            <View key={h.date} style={[s.dashLeaderItem, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[s.row, { flex: 1 }]}>
                <Text style={[s.dashRank, h.rank === 1 && { color: "#F5A623" }]}>{h.rank}</Text>
                <View style={s.dashLeaderAvatar}><Ionicons name={h.rank === 1 ? "trophy" : "podium"} size={16} color="#5B5FEF" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dashLeaderName} numberOfLines={1}>{h.arena.toUpperCase()}</Text>
                  <Text style={s.arenaLogTime}>PLACED {h.rank} OF {h.teams} • {h.players} PLAYERS • {formatMoney(h.spent)}</Text>
                </View>
              </View>
              <Text style={s.dashPoints}>{h.power} PWR</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View style={[slideUp(500), { marginTop: 24 }]}>
          <Pressable style={[s.dashCreateBtn, busy && s.btnOff]} onPress={() => hostArena(true)} accessibilityLabel="Host your own arena">
            <View style={s.dashCreateIconBox}>{busy ? <ActivityIndicator color="#FFF" /> : <Ionicons name="add" size={20} color="#FFF" />}</View>
            <Text style={s.dashCreateText}>HOST YOUR OWN ARENA</Text>
          </Pressable>
          <Pressable style={[s.dashCreateBtn, { marginTop: 12 }]} onPress={onPool} accessibilityLabel="Browse the player pool">
            <View style={[s.dashCreateIconBox, { backgroundColor: "#FFB238", boxShadow: "inset 0px -5px 8px rgba(170, 100, 0, 0.35), inset 0px 5px 8px rgba(255, 255, 255, 0.45)" }]}><Ionicons name="people" size={20} color="#FFF" /></View>
            <Text style={s.dashCreateText}>SCOUT THE PLAYER POOL</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
