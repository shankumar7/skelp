import { T, themed } from "@/components/skelp/theme";
import { ScrollView, Text, View, Pressable, StyleSheet, TextInput, Share } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Config, MAX_TEAMS, PoolFilter, poolPlayers, PRESETS, retainPrice, State, franchise, FRANCHISES } from "@/game/engine";
import { personality } from "@/game/bots";
import { MAX_CUSTOM, Role, ROLE_LABEL } from "@/game/players";
import { formatMoney } from "@/game/money";
import { getLocalIp } from "@/game/net/native";
import { makeJoinLink, Session } from "@/game/net/session";
import { openHotspotSettings } from "@/game/net/settings";
import { QrCode } from "./QrCode";
import { Backdrop, BigButton, Card, Column, k, RoundButton, s, SectionTitle, Segmented, Sheet, SoftButton, useLayout, TeamBadge } from "./ui";

const MODES: Config["mode"][] = ["QUICK", "CLASSIC", "MEGA"];
const TIMERS = [10, 15, 20] as const;
const FILTERS: PoolFilter[] = ["ALL", "INDIAN", "OVERSEAS"];
const ROLES: Role[] = ["BAT", "BOWL", "AR", "WK"];
const BASES = [20, 50, 100, 200] as const;
const RATINGS = [70, 80, 90, 95] as const;

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
  const online = session.online;
  const code = online ?? (ip ? ip.split(".")[3] : null);
  const invite = () => Share.share({ message: `Join my Skelp! auction 🏏\nOpen Skelp!, tap the arena code box and type: ${online}\n\nNo app yet? https://github.com/shankumar7/skelp/releases/latest/download/skelp.apk` }).catch(() => {});
  const canStart = state.teams.length >= 2;
  const me = state.teams.find((t) => t.id === session.myId);
  const auctioneer = host && !me;
  const { wide } = useLayout();
  const [editTeam, setEditTeam] = useState(false);
  const [addPlayer, setAddPlayer] = useState(false);
  const set = (change: Partial<Config>) => session.setConfig({ ...cfg, ...change });
  const poolSize = Math.min(cfg.pool + state.custom.length, poolPlayers(cfg.filter, state.custom).length);

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <Backdrop />
      <View style={[s.roomHeader, { paddingTop: insets.top + 8, paddingBottom: 14 }, T.clayHeader]}>
        <RoundButton icon="close" label="Leave arena" onPress={onExit} color={T.ink} />
        <View style={s.arenaTitleBox}>
          <Text style={s.arenaCode} numberOfLines={1}>{state.arena.toUpperCase()}</Text>
          <View style={s.arenaStatus}><View style={[s.arenaDot, { backgroundColor: T.gold }]} /><Text style={[s.arenaLiveText, { color: T.goldText }]}>LOBBY</Text></View>
        </View>
        {me ? <TeamBadge team={me} size={44} /> : <View style={s.arenaUserBox}><Ionicons name="tv" size={22} color={T.white} /></View>}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 150 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Column max={960} style={wide ? { flexDirection: "row", gap: 24, alignItems: "flex-start" } : null}>
          <View style={wide ? { flex: 1 } : null}>
            <LinearGradient colors={T.gradHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.hero, { marginTop: 18 }]}>
              <View style={st.heroRing} />
              <Ionicons name={session.lan ? (auctioneer ? "tv" : online ? "globe" : "wifi") : "game-controller"} size={140} color="rgba(255,255,255,0.10)" style={st.heroIcon} />
              <View style={s.arenaCategoryBadge}><Text style={s.arenaCategoryText}>{session.lan ? `${online ? "ONLINE • " : ""}${auctioneer ? "AUCTIONEER SCREEN" : host ? "YOU ARE THE HOST" : "CONNECTED TO HOST"}` : "SOLO PRACTICE"}</Text></View>
              {session.lan && host ? (
                <>
                  <Text style={st.codeLabel}>ARENA CODE</Text>
                  <Text style={[s.arenaPlayerName, { fontSize: 48 }]} selectable>{online ? online : code ? `#${code}` : "HOTSPOT"}</Text>
                  <Text style={s.arenaPlayerMeta}>{online ? "FRIENDS ANYWHERE JOIN WITH THIS CODE" : ip ? `HOST ADDRESS ${ip}` : "YOUR PHONE IS THE HOTSPOT / NO WI-FI ADDRESS"}</Text>
                  <Text style={st.hint}>{online ? "Everyone needs the internet. Keep Skelp! open on this phone — it runs the auction." : auctioneer ? "This screen runs the auction. Everyone joins and bids from their own phone." : "No internet needed. Everyone just has to be on the same Wi-Fi or on your hotspot."}</Text>
                </>
              ) : (
                <>
                  <Text style={[s.arenaPlayerName, { fontSize: 34 }]}>{session.lan ? "YOU'RE IN!" : "YOU VS BOTS"}</Text>
                  <Text style={st.hint}>{session.lan ? `Waiting for the host to start the auction. Keep the app open${online ? " and stay online" : ""}.` : "Warm up against AI bidders. Add or remove bots, pick a mode and start."}</Text>
                </>
              )}
            </LinearGradient>

            {session.lan && host && (
              <Card style={{ marginTop: 16 }}>
                <Text style={k.label}>HOW FRIENDS JOIN</Text>
                <View style={{ flexDirection: "row" }}>
                  <View style={st.qrBox}><QrCode value={makeJoinLink(ip, undefined, online)} size={132} /></View>
                  <View style={{ flex: 1, marginLeft: 16, justifyContent: "center" }}>
                    {online ? (
                      <>
                        <Step n={1} text="Send your friends the code — tap SHARE INVITE below." />
                        <Step n={2} text={`In Skelp! they type ${online} in the arena code box.`} />
                        <Step n={3} text="Sitting together? They can tap SCAN TO JOIN and point at this code." />
                      </>
                    ) : (
                      <>
                    <Step n={1} text={ip ? "Everyone joins the same Wi-Fi as you — or turn on your hotspot and let them connect to it." : "Turn on your mobile hotspot and tell your friends its name and password."} />
                    <Step n={2} text="They connect to it from their Wi-Fi settings." />
                    <Step n={3} text={`In Skelp! they tap SCAN TO JOIN and point at this code${code ? `, or type code ${code}` : ", or tap NEARBY"}.`} />
                      </>
                    )}
                  </View>
                </View>
                {online ? <BigButton title="SHARE INVITE" icon="share-social" small style={{ marginTop: 14 }} onPress={invite} /> : <SoftButton title="OPEN HOTSPOT SETTINGS" icon="wifi" color={T.primaryText} style={{ marginTop: 14 }} onPress={openHotspotSettings} />}
              </Card>
            )}

            {me && (
              <>
                <SectionTitle title="YOUR TEAM" action="CHANGE" onAction={() => setEditTeam(true)} />
                <Pressable onPress={() => setEditTeam(true)} accessibilityLabel="Choose your team">
                  <Card pad={16} style={s.row}>
                    <TeamBadge team={me} size={54} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={st.teamName} numberOfLines={1} adjustsFontSizeToFit>{(franchise(me.fr)?.name ?? me.name).toUpperCase()}</Text>
                      <Text style={st.teamMeta}>TAP TO CHOOSE YOUR IPL TEAM</Text>
                    </View>
                    <Ionicons name="swap-horizontal" size={20} color={T.dim} />
                  </Card>
                </Pressable>
              </>
            )}

            <SectionTitle title={`TEAMS ${state.teams.length}/${MAX_TEAMS}`} action={host && state.teams.length < MAX_TEAMS ? "+ ADD BOT" : undefined} onAction={() => session.addBot()} />
            <Card pad={18}>
              {state.teams.length === 0 && <Text style={[st.note, { marginBottom: 0, paddingVertical: 10 }]}>WAITING FOR PLAYERS TO JOIN…</Text>}
              {state.teams.map((t, i) => (
                <View key={t.id} style={[s.dashLeaderItem, i === state.teams.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[s.row, { flex: 1 }]}>
                    <View style={{ marginRight: 12 }}><TeamBadge team={t} size={34} /></View>
                    <View style={{ flex: 1 }}>
                      <View style={s.row}>
                        <Text style={[s.dashLeaderName, { flexShrink: 1 }]} numberOfLines={1}>{t.name.toUpperCase()}</Text>
                        {t.id === state.hostId && <Tag text="HOST" color={T.primaryText} />}
                        {t.id === session.myId && <Tag text="YOU" color={T.mintText} />}
                        {t.isBot && <Tag text="BOT" color={T.muted} />}
                      </View>
                      <Text style={st.teamMeta} numberOfLines={1}>{(franchise(t.fr)?.name ?? "").toUpperCase()} • {t.isBot ? `${t.owner} • ${personality(t.id).key}` : t.owner.toUpperCase()}</Text>
                    </View>
                  </View>
                  {host && t.id !== state.hostId && <Pressable onPress={() => session.kick(t.id)} hitSlop={10} accessibilityLabel={`Remove ${t.owner}`}><Ionicons name="close-circle" size={22} color={T.lineStrong} /></Pressable>}
                </View>
              ))}
            </Card>
          </View>

          <View style={wide ? { flex: 1 } : null}>
            <SectionTitle title="AUCTION RULES" style={wide ? { marginTop: 18 } : null} />
            <Card>
              <Text style={k.label}>MODE</Text>
              <Segmented options={MODES} value={cfg.mode} disabled={!host} onChange={(m) => session.setConfig({ ...PRESETS[m], timer: cfg.timer, filter: cfg.filter, retain: cfg.retain, rtm: cfg.rtm })} />
              <View style={st.rules}>
                <Rule v={formatMoney(cfg.purse).replace("₹", "")} l="PURSE" />
                <Rule v={String(poolSize)} l="PLAYERS" />
                <Rule v={String(cfg.squadMax)} l="MAX SQUAD" />
                <Rule v={cfg.filter === "OVERSEAS" ? "ANY" : String(cfg.overseasMax)} l="OVERSEAS" />
              </View>
              <Text style={[k.label, { marginTop: 18 }]}>BID CLOCK</Text>
              <Segmented options={TIMERS} value={cfg.timer as 10 | 15 | 20} disabled={!host} onChange={(t) => set({ timer: t })} labels={{ 10: "10 SEC", 15: "15 SEC", 20: "20 SEC" }} />
              <Text style={[k.label, { marginTop: 18 }]}>PLAYER POOL</Text>
              <Segmented options={FILTERS} value={cfg.filter} disabled={!host} onChange={(f) => set({ filter: f })} labels={{ ALL: "EVERYONE", INDIAN: "INDIAN", OVERSEAS: "OVERSEAS" }} />
              <Text style={[k.label, { marginTop: 18 }]}>RETENTIONS</Text>
              <Segmented options={[0, 1, 2, 3] as const} value={cfg.retain as 0 | 1 | 2 | 3} disabled={!host} onChange={(n) => set({ retain: n })} labels={{ 0: "OFF", 1: "KEEP 1", 2: "KEEP 2", 3: "KEEP 3" }} />
              <Text style={st.explain}>{cfg.retain > 0 ? `Each team gets a squad from "last season" and may keep up to ${cfg.retain} before the auction, from ${formatMoney(retainPrice(cfg, 0))} each.` : "Every player starts in the auction."}</Text>
              <Text style={[k.label, { marginTop: 18 }]}>RIGHT TO MATCH CARDS</Text>
              <Segmented options={[0, 1, 2] as const} value={cfg.rtm as 0 | 1 | 2} disabled={!host} onChange={(n) => set({ rtm: n })} labels={{ 0: "OFF", 1: "1 CARD", 2: "2 CARDS" }} />
              <Text style={st.explain}>{cfg.rtm > 0 ? "When a rival wins one of your former players, you can use a card to take the player at the winning bid." : "The highest bid always wins."}</Text>
              {!host && <Text style={[st.note, { marginTop: 16, marginBottom: 0 }]}>ONLY THE HOST CAN CHANGE THE RULES</Text>}
            </Card>

            {(host || state.custom.length > 0) && (
              <>
                <SectionTitle title={`YOUR OWN PLAYERS ${state.custom.length}/${MAX_CUSTOM}`} action={host && state.custom.length < MAX_CUSTOM ? "+ ADD PLAYER" : undefined} onAction={() => setAddPlayer(true)} />
                <Card pad={18}>
                  {state.custom.length === 0 && <Text style={st.explain}>Add friends, local heroes or legends to the pool. They go under the hammer with everyone else.</Text>}
                  {state.custom.map((p, i) => (
                    <View key={p.id} style={[s.dashLeaderItem, i === state.custom.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.dashLeaderName} numberOfLines={1}>{p.name}</Text>
                        <Text style={st.teamMeta}>{ROLE_LABEL[p.role]} • {p.overseas ? "OVERSEAS" : "INDIAN"} • BASE {formatMoney(p.base)} • RATING {p.rating}</Text>
                      </View>
                      {host && <Pressable onPress={() => session.removePlayer(p.id)} hitSlop={10} accessibilityLabel={`Remove player ${p.name}`}><Ionicons name="close-circle" size={22} color={T.lineStrong} /></Pressable>}
                    </View>
                  ))}
                </Card>
              </>
            )}
          </View>
        </Column>
      </ScrollView>

      <View style={[s.arenaActionWrapper, { paddingTop: 14, paddingBottom: insets.bottom + 12, backgroundColor: T.barBg, borderTopColor: T.line }]}>
        <Column>
          {host ? (
            <>
              <BigButton title="START AUCTION" tone="mint" icon="play" disabled={!canStart} onPress={() => session.start()} />
              {!canStart && <Text style={[st.note, { marginTop: 10, marginBottom: 0 }]}>NEED AT LEAST 2 TEAMS — WAIT FOR FRIENDS OR ADD A BOT</Text>}
            </>
          ) : (
            <View style={s.arenaQuickBid}><Text style={s.arenaQuickBidText}>WAITING FOR THE HOST TO START…</Text></View>
          )}
        </Column>
      </View>

      {me && <TeamSheet visible={editTeam} onClose={() => setEditTeam(false)} state={state} session={session} />}
      <PlayerSheet visible={addPlayer} onClose={() => setAddPlayer(false)} session={session} />
    </View>
  );
}

/** Choose which IPL franchise you run; ones already taken are greyed out. */
function TeamSheet({ visible, onClose, state, session }: { visible: boolean; onClose: () => void; state: State; session: Session }) {
  const me = state.teams.find((t) => t.id === session.myId)!;
  return (
    <Sheet visible={visible} onClose={onClose} title="CHOOSE YOUR TEAM">
      {FRANCHISES.map((f) => {
        const holder = state.teams.find((t) => t.fr === f.code);
        const mine = holder?.id === me.id;
        const taken = !!holder && !mine;
        return (
          <Pressable key={f.code} disabled={taken} onPress={() => { session.setTeam(f.code); onClose(); }} style={[st.frRow, mine && { borderColor: f.color, backgroundColor: f.color + "1F" }, taken && { opacity: 0.45 }]} accessibilityLabel={`Choose ${f.name}`} accessibilityState={{ selected: mine, disabled: taken }}>
            <TeamBadge team={{ fr: f.code, name: f.code, color: f.color }} size={42} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={st.frName} numberOfLines={1}>{f.name}</Text>
              <Text style={st.teamMeta}>{mine ? "YOUR TEAM" : taken ? `TAKEN BY ${holder!.owner.toUpperCase()}` : "AVAILABLE"}</Text>
            </View>
            {mine && <Ionicons name="checkmark-circle" size={24} color={f.color} />}
          </Pressable>
        );
      })}
      <Text style={[st.explain, { textAlign: "center", marginTop: 6 }]}>Team names are used for fun. Skelp! is not affiliated with the IPL or any franchise.</Text>
    </Sheet>
  );
}

/** Host adds a player of their own to the pool. */
function PlayerSheet({ visible, onClose, session }: { visible: boolean; onClose: () => void; session: Session }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("BAT");
  const [origin, setOrigin] = useState<"INDIAN" | "OVERSEAS">("INDIAN");
  const [base, setBase] = useState<(typeof BASES)[number]>(50);
  const [rating, setRating] = useState<(typeof RATINGS)[number]>(80);
  const clean = name.trim();
  const add = () => {
    session.addPlayer({ name: clean, role, overseas: origin === "OVERSEAS", base, rating });
    setName("");
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="ADD A PLAYER">
      <Text style={k.label}>PLAYER NAME</Text>
      <TextInput value={name} onChangeText={setName} maxLength={24} placeholder="For example: Gully Star" placeholderTextColor={T.dim} style={k.input} autoCapitalize="words" accessibilityLabel="Player name" />
      <Text style={[k.label, { marginTop: 16 }]}>ROLE</Text>
      <Segmented options={ROLES} value={role} onChange={setRole} labels={{ BAT: "BATTER", BOWL: "BOWLER", AR: "ALL-ROUND", WK: "KEEPER" }} />
      <Text style={[k.label, { marginTop: 16 }]}>FROM</Text>
      <Segmented options={["INDIAN", "OVERSEAS"] as const} value={origin} onChange={setOrigin} />
      <Text style={[k.label, { marginTop: 16 }]}>BASE PRICE</Text>
      <Segmented options={BASES} value={base} onChange={setBase} labels={{ 20: "₹20 L", 50: "₹50 L", 100: "₹1 Cr", 200: "₹2 Cr" }} />
      <Text style={[k.label, { marginTop: 16 }]}>RATING</Text>
      <Segmented options={RATINGS} value={rating} onChange={setRating} labels={{ 70: "70 SOLID", 80: "80 GOOD", 90: "90 STAR", 95: "95 LEGEND" }} />
      <BigButton title="ADD TO THE POOL" icon="add-circle" disabled={clean.length < 2} onPress={add} style={{ marginTop: 22 }} />
    </Sheet>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 8 }}>
      <View style={st.stepDot}><Text style={st.stepNum}>{n}</Text></View>
      <Text style={st.stepText}>{text}</Text>
    </View>
  );
}
function Tag({ text, color }: { text: string; color: string }) {
  return <View style={[st.tag, { backgroundColor: color + "1A" }]}><Text style={[st.tagText, { color }]}>{text}</Text></View>;
}
function Rule({ v, l }: { v: string; l: string }) {
  return <View style={st.rule}><Text style={st.ruleV} numberOfLines={1} adjustsFontSizeToFit>{v}</Text><Text style={st.ruleL} numberOfLines={1}>{l}</Text></View>;
}

const st = themed(() => StyleSheet.create({
  hero: { borderRadius: 32, padding: 24, overflow: "hidden", boxShadow: T.clayPrimary },
  heroRing: { position: "absolute", width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", top: -150, right: -90 },
  heroIcon: { position: "absolute", right: -22, bottom: -26 },
  emblem: { width: 52, height: 52, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  teamName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 20, color: T.ink, letterSpacing: 0.8 },
  frRow: { flexDirection: "row", alignItems: "center", backgroundColor: T.card, borderRadius: 20, padding: 12, marginBottom: 10, borderWidth: 2, borderColor: T.cardEdge, boxShadow: T.claySoft },
  frName: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: T.ink },
  teamMeta: { fontFamily: "Inter_700Bold", fontSize: 9, color: T.muted, letterSpacing: 0.6, marginTop: 1 },
  dot: { width: 34, height: 34, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rules: { flexDirection: "row", gap: 8, marginTop: 14 },
  rule: { flex: 1, backgroundColor: T.sand, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 4, alignItems: "center", boxShadow: T.clayPocket },
  ruleV: { fontFamily: "LuckiestGuy_400Regular", fontSize: 17, color: T.primaryText },
  ruleL: { fontFamily: "Inter_800ExtraBold", fontSize: 7.5, color: T.muted, letterSpacing: 0.8, marginTop: 2 },
  explain: { fontFamily: "Inter_600SemiBold", fontSize: 11.5, color: T.muted, lineHeight: 17, marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", boxShadow: "inset 0px -5px 8px rgba(0, 0, 0, 0.2), inset 0px 5px 8px rgba(255, 255, 255, 0.4)" },
  swatchOn: { borderWidth: 3, borderColor: T.card, boxShadow: "0px 0px 0px 2px " + T.ink },
  emblemPick: { width: 50, height: 50, borderRadius: 17, backgroundColor: T.card, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: T.line, boxShadow: T.claySoft },
  joinCard: { backgroundColor: T.card, borderRadius: 28, padding: 20, marginHorizontal: 20, marginTop: 16, boxShadow: T.clayCard },
  qrBox: { borderRadius: 18, overflow: "hidden", alignSelf: "flex-start", boxShadow: T.claySoft },
  stepDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: T.primary, alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 1 },
  stepNum: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.white },
  stepText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 11, color: T.ink2, lineHeight: 16 },
  settingsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: T.primarySoft, borderRadius: 16, paddingVertical: 12, marginTop: 14, boxShadow: T.claySoft },
  settingsText: { fontFamily: "Inter_800ExtraBold", fontSize: 11, color: T.primaryText, letterSpacing: 1 },
  codeLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: T.onPrimaryDim, letterSpacing: 3 },
  hint: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: T.onPrimarySoft, marginTop: 12, lineHeight: 18 },
  note: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: T.dim, letterSpacing: 1, textAlign: "center", marginBottom: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  tagText: { fontFamily: "Inter_800ExtraBold", fontSize: 8, letterSpacing: 1 },
}));
export { Tag };
