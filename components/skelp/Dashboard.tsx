import { T, themed } from "@/components/skelp/theme";
import { ScrollView, Text, View, Pressable, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { formatMoney } from "@/game/money";
import { getLocalIp, transport } from "@/game/net/native";
import { ArenaInfo } from "@/game/net/protocol";
import { ClientSession, HostSession, resolveCode, scan, Session } from "@/game/net/session";
import { lookupOnline, makeOnlineTransport, normaliseCode } from "@/game/net/online";
import { openOnline } from "@/game/net/onlineDb";
import { openHotspotSettings, openWifiSettings } from "@/game/net/settings";
import { QrScanner } from "./QrScanner";
import { AccountCard, VerifyBanner } from "./AccountCard";
import { isSoundOn, play, setSoundOn } from "@/game/sound";
import { Profile, saveSound, Stats } from "@/game/storage";
import { AVATARS } from "./avatars";
import { UpdateBanner } from "./Update";
import { Backdrop, BigButton, Card, Chip, Column, IconBadge, k, ListRow, notify, Rise, RoundButton, s, SectionTitle, Segmented, Sheet, SoftButton, useLayout } from "./ui";

/** Home base: find arenas on the local network, host one, or practise against bots. */
export function Dashboard({ profile, stats, insets, onLogout, onEnter, onPool, onProfile, onCreateAccount, onAbout, onHistory, onTheme }: { profile: Profile; stats: Stats; insets: any; onLogout: () => void; onEnter: (session: Session) => void; onPool: () => void; onProfile: (c: Partial<Profile>) => void; onCreateAccount: () => void; onAbout: () => void; onHistory: () => void; onTheme: () => void }) {
  const { wide } = useLayout();
  const [hostSheet, setHostSheet] = useState(false);
  const [where, setWhere] = useState<"NEARBY" | "ONLINE">("NEARBY");
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState("");
  const [arenas, setArenas] = useState<ArenaInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [soundOn, setSound] = useState(isSoundOn());
  const scanRef = useRef<{ cancel(): void } | null>(null);
  const [myIp, setMyIp] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const autoJoin = useRef(false);
  const me = { id: profile.id, name: profile.name, avatar: profile.avatar };

  const rescan = useCallback(async () => {
    if (!transport) return;
    scanRef.current?.cancel();
    setArenas([]);
    setScanning(true);
    const ip = await getLocalIp();
    setMyIp(ip);
    const job = scan(transport, ip, (a) => {
      setArenas((list) => (list.some((x) => x.host === a.host) ? list : [...list, a]));
      // came here from a QR code without an address: walk straight into the first open arena
      if (autoJoin.current && a.phase === "lobby") { autoJoin.current = false; joinRef.current(a.host); }
    });
    scanRef.current = job;
    await job.done;
    if (scanRef.current !== job) return;
    setScanning(false);
    if (autoJoin.current) {
      autoJoin.current = false;
      notify("COULD NOT FIND THE ARENA", "Make sure this phone is connected to the host's hotspot (or the same Wi-Fi) in Wi-Fi settings, then scan again.");
    }
  }, []);

  useEffect(() => {
    rescan();
    return () => scanRef.current?.cancel();
  }, []);

  const join = (host: string, port?: number) => {
    if (!transport) return notify("NOT AVAILABLE HERE", "Joining arenas over Wi-Fi works in the Android app. Try SOLO PRACTICE here.");
    scanRef.current?.cancel();
    onEnter(new ClientSession(transport, host, me, port));
  };
  const joinRef = useRef(join);
  joinRef.current = join;
  /** Join an arena played over the internet, by its six-character code. */
  const joinOnline = async (arenaCode: string) => {
    if (busy) return;
    setBusy(true);
    scanRef.current?.cancel();
    try {
      const opened = await openOnline();
      if (!opened.ok) return notify("ONLINE PLAY", opened.error);
      const found = await lookupOnline(opened.db, arenaCode);
      if (!found.ok) return notify("COULD NOT JOIN", found.error);
      onEnter(new ClientSession(makeOnlineTransport(opened.db, arenaCode), arenaCode, me, 0, true));
    } finally {
      setBusy(false);
    }
  };
  const onQr = (link: { host: string | null; port: number; online?: string }) => {
    setShowQr(false);
    if (link.online) return void joinOnline(link.online);
    if (link.host) return join(link.host, link.port);
    autoJoin.current = true; // the host is a hotspot and does not know its own address: search for it
    rescan();
  };
  const joinByCode = async () => {
    if (!code.trim()) return;
    const online = normaliseCode(code);
    if (online) return joinOnline(online);
    const host = resolveCode(code, await getLocalIp());
    if (!host) return notify("CHECK THE CODE", "Type the code shown on the host's phone: six letters and numbers for an online arena (for example K7M2QX), or a short number for a Wi-Fi arena (for example 42).");
    join(host);
  };
  const hostOnline = async (auctioneer: boolean) => {
    if (busy) return;
    setHostSheet(false);
    setBusy(true);
    scanRef.current?.cancel();
    const session = new HostSession(me, `${profile.name}'s Arena`, Math.random, auctioneer);
    try {
      const opened = await openOnline();
      if (!opened.ok) { session.leave(); return notify("ONLINE PLAY", opened.error); }
      await session.serveOnline(opened.db);
      onEnter(session);
    } catch {
      session.leave();
      notify("COULD NOT HOST ONLINE", "Skelp! could not open an online arena. Check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  };
  const hostArena = async (lan: boolean, auctioneer = false) => {
    if (busy) return;
    if (lan && where === "ONLINE") return hostOnline(auctioneer);
    setHostSheet(false);
    if (lan && !transport) return notify("NOT AVAILABLE HERE", "Hosting over Wi-Fi works in the Android app. Try SOLO PRACTICE here.");
    setBusy(true);
    scanRef.current?.cancel();
    const session = new HostSession(me, lan ? `${profile.name}'s Arena` : "Practice Arena", Math.random, auctioneer);
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

  if (showQr) return <QrScanner insets={insets} onClose={() => setShowQr(false)} onScanned={onQr} />;
  const dark = T.name === "dark";
  const toggleSound = () => { const on = !soundOn; setSound(on); setSoundOn(on); saveSound(on); if (on) play("bid"); };
  const winRate = stats.auctions ? Math.round((stats.wins / stats.auctions) * 100) : 0;

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <Backdrop />
      <View style={[st.header, T.clayHeader, { paddingTop: insets.top + 12 }]}>
        <Column max={900} style={s.row}>
          <Pressable onPress={() => setEditing(true)} style={[s.row, { flex: 1 }]} accessibilityLabel="Edit profile">
            <View style={st.avatar}>
              <Ionicons name={profile.avatar as any} size={26} color={T.primaryText} />
              <View style={st.avatarEdit}><Ionicons name="pencil" size={9} color="#FFF" /></View>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={st.greeting}>WELCOME BACK,</Text>
              <Text style={st.name} numberOfLines={1}>{profile.name.toUpperCase()}</Text>
            </View>
          </Pressable>
          <View style={[s.row, { gap: 8 }]}>
            <RoundButton icon={dark ? "sunny" : "moon"} label={dark ? "Switch to light mode" : "Switch to dark mode"} onPress={onTheme} />
            <RoundButton icon={soundOn ? "volume-high" : "volume-mute"} label={soundOn ? "Mute sounds" : "Turn sounds on"} onPress={toggleSound} active={soundOn} />
            <RoundButton icon="log-out-outline" label="Log out" onPress={onLogout} />
          </View>
        </Column>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Column max={900}>
          <UpdateBanner />
          <VerifyBanner profile={profile} onProfile={onProfile} />

          <View style={wide ? st.twoCol : null}>
            <View style={wide ? { flex: 1 } : null}>
              <Rise style={{ marginTop: 20 }}>
                <LinearGradient colors={T.gradHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
                  <View style={st.heroRing1} /><View style={st.heroRing2} />
                  <Ionicons name="hammer" size={130} color="rgba(255,255,255,0.10)" style={st.heroIcon} />
                  <Text style={st.heroKicker}>THE HAMMER IS WAITING</Text>
                  <Text style={st.heroTitle}>START AN AUCTION</Text>
                  <Text style={st.heroSub}>Host for friends nearby on Wi-Fi or a hotspot, or online for friends anywhere.</Text>
                  <View style={[s.row, { gap: 10, marginTop: 18 }]}>
                    <Pressable onPress={() => setHostSheet(true)} disabled={busy} style={({ pressed }) => [st.heroBtn, pressed && { transform: [{ scale: 0.97 }] }]} accessibilityLabel="Host your own arena">
                      {busy ? <ActivityIndicator color={T.primary} /> : <Ionicons name="add-circle" size={18} color={T.primary} />}
                      <Text style={st.heroBtnText}>HOST ARENA</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowQr(true)} style={({ pressed }) => [st.heroBtn, st.heroBtnGhost, pressed && { transform: [{ scale: 0.97 }] }]} accessibilityLabel="Scan QR to join">
                      <Ionicons name="qr-code" size={16} color="#FFF" />
                      <Text style={[st.heroBtnText, { color: "#FFF" }]}>SCAN TO JOIN</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </Rise>

              <Rise delay={60} style={st.tiles}>
                <Tile icon="game-controller" color={T.primary} title="SOLO PRACTICE" sub="You vs bots" onPress={() => hostArena(false)} label="Solo practice" />
                <Tile icon="people" color={T.gold} title="PLAYER POOL" sub="Scout everyone" onPress={onPool} label="Browse the player pool" />
                <Tile icon="time" color={T.mint} title="HISTORY" sub="Past auctions" onPress={onHistory} label="Auction history" />
                <Tile icon="information-circle" color={T.coral} title="ABOUT" sub="App & updates" onPress={onAbout} label="About Skelp" />
              </Rise>

              <SectionTitle title="JOIN AN ARENA" action={scanning ? "SCANNING…" : "RESCAN"} onAction={rescan} />
              <Rise delay={120}>
                <Card pad={16}>
                  <View style={s.row}>
                    <View style={[st.netDot, { backgroundColor: myIp ? T.mint : T.gold }]} />
                    <Text style={st.netText} numberOfLines={2}>{myIp ? `ON WI-FI • ${myIp}` : "NOT ON WI-FI — JOIN THE HOST'S HOTSPOT, OR HOST WITH YOURS"}</Text>
                  </View>
                  <View style={st.codeBox}>
                    <Ionicons name="keypad" size={18} color={T.dim} />
                    <TextInput value={code} onChangeText={setCode} onSubmitEditing={joinByCode} placeholder="ENTER ARENA CODE..." placeholderTextColor={T.dim} returnKeyType="go" autoCapitalize="characters" autoCorrect={false} maxLength={15} style={st.codeInput} />
                    {busy ? <ActivityIndicator color={T.primaryText} /> : code.trim().length > 0 && <Pressable onPress={joinByCode} hitSlop={10} accessibilityLabel="Join with code"><Ionicons name="arrow-forward-circle" size={30} color={T.primaryText} /></Pressable>}
                  </View>
                  <Text style={[st.netText, { flex: 0, marginTop: 8 }]}>ONLINE ARENA? TYPE ITS 6-CHARACTER CODE • WI-FI ARENA? TYPE ITS NUMBER</Text>
                  <View style={[s.row, { gap: 10, marginTop: 12 }]}>
                    <SoftButton title="NEARBY" icon="search" color={T.primaryText} style={{ flex: 1 }} onPress={rescan} />
                    <SoftButton title="WI-FI" icon="wifi" style={{ flex: 1 }} onPress={openWifiSettings} />
                    <SoftButton title="HOTSPOT" icon="radio" style={{ flex: 1 }} onPress={openHotspotSettings} />
                  </View>
                </Card>
              </Rise>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 18 }}>
                {arenas.map((a) => {
                  const open = a.phase === "lobby" && a.teams < a.max;
                  return (
                    <Pressable key={a.host} onPress={() => join(a.host)} style={st.arena} accessibilityLabel={`Join ${a.arena}`}>
                      <Chip text={open ? "OPEN" : a.phase === "lobby" ? "FULL" : "IN PROGRESS"} color={open ? T.mintText : T.muted} soft={open ? T.mintSoft : T.sand} />
                      <Text style={st.arenaTitle} numberOfLines={2}>{a.arena.toUpperCase()}</Text>
                      <View style={[s.row, { gap: 5, marginTop: 10 }]}>
                        <Ionicons name="people-outline" size={12} color={T.muted} /><Text style={st.arenaMeta}>{a.teams}/{a.max}</Text>
                        <View style={st.sep} />
                        <Ionicons name="flash-outline" size={12} color={T.muted} /><Text style={st.arenaMeta}>{a.mode}</Text>
                      </View>
                    </Pressable>
                  );
                })}
                {arenas.length === 0 && (
                  <View style={[st.arena, { width: 260 }]}>
                    <Chip text={scanning ? "SEARCHING" : "NONE FOUND"} color={T.muted} soft={T.sand} />
                    <Text style={st.arenaTitle} numberOfLines={2}>{scanning ? "LOOKING FOR ARENAS…" : "NO ARENA NEARBY"}</Text>
                    <Text style={[st.arenaMeta, { marginTop: 10 }]}>{scanning ? "CHECKING YOUR NETWORK" : "HOST ONE, OR SCAN THE HOST'S QR"}</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={wide ? { flex: 1 } : null}>
              <SectionTitle title="YOUR PERFORMANCE" style={wide ? { marginTop: 20 } : { marginTop: 10 }} />
              <Rise delay={180} style={s.dashStatsRow}>
                <Stat icon="hammer" color={T.primary} value={String(stats.auctions)} label="AUCTIONS" />
                <Stat icon="trophy" color={T.gold} value={String(stats.wins)} label={stats.auctions ? `WINS • ${winRate}%` : "WINS"} />
                <Stat icon="wallet" color={T.mint} value={formatMoney(stats.spent).replace("₹", "")} label="SPENT" />
              </Rise>

              <SectionTitle title="RECENT AUCTIONS" action={stats.history.length ? "SEE ALL" : undefined} onAction={onHistory} />
              <Rise delay={240}>
                <Card pad={18}>
                  {stats.history.length === 0 && (
                    <View style={{ alignItems: "center", paddingVertical: 14 }}>
                      <Ionicons name="podium-outline" size={30} color={T.dim} />
                      <Text style={[st.arenaMeta, { marginTop: 8, textAlign: "center" }]}>PLAY YOUR FIRST AUCTION TO SEE IT HERE</Text>
                    </View>
                  )}
                  {stats.history.slice(0, 4).map((h, i, arr) => (
                    <Pressable key={h.date} onPress={onHistory} style={[st.histRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[st.histRank, h.rank === 1 && { backgroundColor: T.goldSoft }]}><Text style={[st.histRankText, h.rank === 1 && { color: T.goldText }]}>{h.rank}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.histName} numberOfLines={1}>{h.arena.toUpperCase()}</Text>
                        <Text style={st.histMeta}>PLACED {h.rank} OF {h.teams} • {h.players} PLAYERS • {formatMoney(h.spent)}</Text>
                      </View>
                      <Text style={st.histPower}>{h.power} PWR</Text>
                    </Pressable>
                  ))}
                </Card>
              </Rise>

              <AccountCard profile={profile} onCreateAccount={onCreateAccount} onDeleted={onLogout} />
            </View>
          </View>
        </Column>
      </ScrollView>

      <Sheet visible={hostSheet} onClose={() => setHostSheet(false)} title="HOST AN ARENA">
        <Text style={k.label}>WHERE ARE YOUR FRIENDS?</Text>
        <Segmented options={["NEARBY", "ONLINE"] as const} value={where} onChange={setWhere} labels={{ NEARBY: "NEARBY • WI-FI", ONLINE: "ANYWHERE • ONLINE" }} />
        <Text style={[k.body, { color: T.muted, marginVertical: 14 }]}>{where === "ONLINE" ? "Everyone needs the internet. Friends join from anywhere with a six-character code." : "No internet needed. Friends join over the same Wi-Fi, or your phone's hotspot."}</Text>
        <Card pad={16}>
          <ListRow icon="person-add" color={T.primary} title="Play and host" sub="You own a team and bid like everyone else. Best for a group of friends." onPress={() => hostArena(true)} />
          <ListRow icon="tv" color={T.mint} title="Auctioneer screen" sub="This device shows the auction on a big screen; everyone bids from their own phone." onPress={() => hostArena(true, true)} last />
        </Card>
      </Sheet>
      <EditProfile visible={editing} profile={profile} onClose={() => setEditing(false)} onSave={(c) => { onProfile(c); setEditing(false); }} />
    </View>
  );
}

function Tile({ icon, color, title, sub, onPress, label }: { icon: any; color: string; title: string; sub: string; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={({ pressed }) => [st.tile, pressed && { transform: [{ scale: 0.96 }] }]}>
      <IconBadge name={icon} color={color} size={42} />
      <Text style={st.tileTitle} numberOfLines={1}>{title}</Text>
      <Text style={st.tileSub} numberOfLines={1}>{sub}</Text>
    </Pressable>
  );
}
function Stat({ icon, color, value, label }: { icon: any; color: string; value: string; label: string }) {
  return (
    <View style={st.stat}>
      <IconBadge name={icon} color={color} size={36} />
      <Text style={st.statVal} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={st.statLab} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** Change the name and avatar other players see. */
function EditProfile({ visible, profile, onClose, onSave }: { visible: boolean; profile: Profile; onClose: () => void; onSave: (c: Partial<Profile>) => void }) {
  const [name, setName] = useState(profile.name);
  const [idx, setIdx] = useState(Math.max(0, AVATARS.findIndex((a) => a.n === profile.avatar)));
  useEffect(() => { if (visible) { setName(profile.name); setIdx(Math.max(0, AVATARS.findIndex((a) => a.n === profile.avatar))); } }, [visible]);
  const clean = name.trim().slice(0, 16);
  return (
    <Sheet visible={visible} onClose={onClose} title="EDIT PROFILE">
      <Text style={k.label}>NAME OTHER PLAYERS SEE</Text>
      <TextInput value={name} onChangeText={setName} maxLength={16} placeholder="Your name" placeholderTextColor={T.dim} style={k.input} autoCapitalize="words" accessibilityLabel="Your name" />
      <Text style={[k.label, { marginTop: 18 }]}>AVATAR</Text>
      <View style={st.avatarGrid}>
        {AVATARS.map((a, i) => (
          <Pressable key={a.n} onPress={() => setIdx(i)} style={[st.avatarPick, i === idx && { borderColor: a.c, backgroundColor: a.c + "1F" }]} accessibilityLabel={`Avatar ${a.t.toLowerCase()}`}>
            <Ionicons name={a.n as any} size={24} color={a.c} />
          </Pressable>
        ))}
      </View>
      <BigButton title="SAVE" disabled={clean.length < 2} onPress={() => onSave({ name: clean, avatar: AVATARS[idx].n, avatarIdx: idx })} style={{ marginTop: 20 }} />
      {clean.length < 2 && <Text style={[st.arenaMeta, { textAlign: "center", marginTop: 10 }]}>USE AT LEAST 2 CHARACTERS</Text>}
    </Sheet>
  );
}

const st = themed(() => StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  avatar: { width: 52, height: 52, borderRadius: 20, backgroundColor: T.primarySoft, alignItems: "center", justifyContent: "center", boxShadow: T.claySoft },
  avatarEdit: { position: "absolute", right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: T.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: T.card },
  greeting: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: T.muted, letterSpacing: 2 },
  name: { fontFamily: "LuckiestGuy_400Regular", fontSize: 23, color: T.ink, letterSpacing: 0.5 },
  twoCol: { flexDirection: "row", gap: 24, alignItems: "flex-start" },
  hero: { borderRadius: 32, padding: 24, overflow: "hidden", boxShadow: T.clayPrimary },
  heroRing1: { position: "absolute", width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", top: -150, right: -90 },
  heroRing2: { position: "absolute", width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", top: -80, right: -30 },
  heroIcon: { position: "absolute", right: -18, bottom: -22, transform: [{ rotate: "-18deg" }] },
  heroKicker: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: T.onPrimaryDim, letterSpacing: 2.2 },
  heroTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 30, color: "#FFF", letterSpacing: 1.2, marginTop: 6 },
  heroSub: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: T.onPrimarySoft, lineHeight: 19, marginTop: 2, maxWidth: 300 },
  heroBtn: { flex: 1, height: 50, borderRadius: 18, backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0px 8px 16px rgba(20, 20, 90, 0.30), inset 0px -5px 8px rgba(60, 50, 110, 0.12)" },
  heroBtnGhost: { backgroundColor: "rgba(255,255,255,0.18)", boxShadow: "inset 0px 1px 0px rgba(255, 255, 255, 0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" },
  heroBtnText: { fontFamily: "Inter_800ExtraBold", fontSize: 12, color: "#4A4DDB", letterSpacing: 1 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  tile: { flexGrow: 1, flexBasis: "45%", backgroundColor: T.card, borderRadius: 24, padding: 16, boxShadow: T.clayCard, borderWidth: 1, borderColor: T.cardEdge },
  tileTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 12, color: T.ink, letterSpacing: 0.8, marginTop: 12 },
  tileSub: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: T.muted, marginTop: 1 },
  netDot: { width: 8, height: 8, borderRadius: 4, marginRight: 9 },
  netText: { flex: 1, fontFamily: "Inter_800ExtraBold", fontSize: 9, color: T.muted, letterSpacing: 1, lineHeight: 14 },
  codeBox: { flexDirection: "row", alignItems: "center", backgroundColor: T.sand, borderRadius: 18, paddingHorizontal: 16, marginTop: 12, gap: 10, boxShadow: T.clayPocket, minHeight: 50 },
  codeInput: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 13, color: T.ink, paddingVertical: 12, letterSpacing: 0.5 },
  arena: { width: 190, backgroundColor: T.card, borderRadius: 24, padding: 18, marginRight: 12, boxShadow: T.claySoft, borderWidth: 1, borderColor: T.cardEdge },
  arenaTitle: { fontFamily: "Poppins_700Bold", fontSize: 15, color: T.ink, lineHeight: 20, marginTop: 12 },
  arenaMeta: { fontFamily: "Inter_700Bold", fontSize: 10, color: T.muted, letterSpacing: 0.6 },
  sep: { width: 3, height: 3, borderRadius: 2, backgroundColor: T.lineStrong, marginHorizontal: 3 },
  stat: { flex: 1, backgroundColor: T.card, borderRadius: 24, paddingVertical: 16, paddingHorizontal: 8, alignItems: "center", boxShadow: T.clayCard, borderWidth: 1, borderColor: T.cardEdge },
  statVal: { fontFamily: "LuckiestGuy_400Regular", fontSize: 22, color: T.ink, marginTop: 10 },
  statLab: { fontFamily: "Inter_800ExtraBold", fontSize: 8, color: T.muted, letterSpacing: 1, marginTop: 2 },
  histRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.line },
  histRank: { width: 34, height: 34, borderRadius: 12, backgroundColor: T.primarySoft, alignItems: "center", justifyContent: "center", marginRight: 12 },
  histRankText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 16, color: T.primaryText, marginTop: 2 },
  histName: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: T.ink },
  histMeta: { fontFamily: "Inter_700Bold", fontSize: 9, color: T.muted, letterSpacing: 0.4, marginTop: 1 },
  histPower: { fontFamily: "Inter_800ExtraBold", fontSize: 11, color: T.primaryText, marginLeft: 8 },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  avatarPick: { width: 54, height: 54, borderRadius: 18, backgroundColor: T.card, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: T.line, boxShadow: T.claySoft },
}));
