import { Image, Linking, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import CREDITS from "@/game/data/credits.json";
import { PLAYERS } from "@/game/players";
import { APP_VERSION } from "@/game/updater";
import { T, themed } from "./theme";
import { Backdrop, Card, Chip, Column, k, ListRow, Rise, SectionTitle, TopBar } from "./ui";
import { UpdateCard } from "./Update";

const open = (url: string) => Linking.openURL(url).catch(() => {});
export const SUPPORT_EMAIL = "skelpsupport@gmail.com";
export const CLASSCOM_URL = "https://classcom.tech";
const VERSION = APP_VERSION.replace(/\.0$/, "");

const SOCIALS = [
  { icon: "logo-github", label: "GitHub", url: "https://github.com/shankumar7" },
  { icon: "logo-linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/shankumar7/" },
  { icon: "logo-twitter", label: "X", url: "https://x.com/shankumar_7" },
  { icon: "logo-instagram", label: "Instagram", url: "https://www.instagram.com/shankumar_7/" },
  { icon: "mail", label: "Email", url: `mailto:${SUPPORT_EMAIL}` },
];
const WHATS_NEW = [
  ["albums", "Players come up in sets", "Marquee first, then Batters Set 1, Bowlers Set 1… the most popular players in the earlier sets."],
  ["star", "Shortlist", "Star the players you want; Skelp! tells you the moment they come up."],
  ["wallet", "Every purse at a glance", "A strip in the arena shows each team's purse and squad, and your safe maximum bid."],
  ["enter", "Rejoin", "Closed the app mid-auction? The dashboard offers you your arena back."],
  ["shield", "Run a real IPL team", "Pick one of the ten franchises in the lobby; each has its own crest in the team colours."],
  ["list", "Players list in the arena", "See who is on the block, who is still to come, and who went where for how much."],
  ["globe", "Play online", "Host an arena for friends anywhere: they join over the internet with a six-character code."],
  ["sync", "In-app updates", "Skelp! checks for new versions and installs them for you."],
  ["card", "Right to Match & retentions", "Keep last season's stars, or match the winning bid with an RTM card."],
  ["tv", "Auctioneer mode", "Put the auction on a shared screen while everyone bids from their phone."],
  ["people", "Custom player pools", "Indian-only or overseas-only pools, plus your own players."],
  ["moon", "Dark mode", "The same soft clay look, easier on the eyes at night."],
  ["time", "Auction history", "Every auction you finish is saved with its full squads."],
  ["image", "Share as a picture", "Send the final table as an image."],
] as const;

/** The small "Affiliated with ClassCom" line used on the splash and welcome screens. */
export function Affiliation({ light }: { light?: boolean }) {
  return (
    <Pressable onPress={() => open(CLASSCOM_URL)} hitSlop={8} accessibilityRole="link" accessibilityLabel="Affiliated with ClassCom">
      <Text style={[st.affil, light && { color: T.onPrimaryDim }]}>AFFILIATED WITH <Text style={[st.affilBrand, light && { color: T.onPrimary }]}>CLASSCOM</Text></Text>
    </Pressable>
  );
}

export function About({ onBack, insets }: { onBack: () => void; insets: any }) {
  const [showCredits, setShowCredits] = useState(false);
  return (
    <View style={st.screen}>
      <Backdrop />
      <TopBar title="ABOUT" onBack={onBack} insets={insets} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Column>
          <Rise>
            <LinearGradient colors={T.gradHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
              <View style={st.heroRing1} /><View style={st.heroRing2} />
              <View style={st.logoRing}><Image source={require("../../assets/images/circlelogo.png")} style={{ width: 62, height: 62 }} resizeMode="contain" /></View>
              <Text style={st.heroTitle}>SKELP!</Text>
              <Text style={st.heroSub}>THE AUCTION ARENA FOR CRICKET FANS</Text>
              <View style={st.heroChips}>
                <View style={st.heroChip}><Text style={st.heroChipText}>VERSION {VERSION}</Text></View>
                <View style={st.heroChip}><Text style={st.heroChipText}>ANDROID</Text></View>
                <View style={st.heroChip}><Text style={st.heroChipText}>FREE & OPEN SOURCE</Text></View>
              </View>
              <View style={{ marginTop: 16 }}><Affiliation light /></View>
            </LinearGradient>
          </Rise>

          <Rise delay={60} style={{ marginTop: 18 }}><UpdateCard /></Rise>

          <SectionTitle title="ABOUT THE APP" />
          <Rise delay={120}>
            <Card>
              <Text style={k.body}>
                Skelp! is the IPL-style player auction you play with your friends. Everyone gets the same purse, real players come under the hammer one by one, the clock ticks, and the highest bid takes the player home.
                {"\n\n"}
                Play nearby with no internet at all: one phone hosts the arena and everyone on the same Wi-Fi or mobile hotspot joins it, phone to phone. Or play online with friends anywhere using an arena code. Create a free account to back up your stats, or simply play as a guest.
              </Text>
              <View style={st.facts}>
                <Fact v={String(PLAYERS.length)} l="PLAYERS" />
                <Fact v="10" l="TEAMS" />
                <Fact v="2" l="WAYS TO PLAY" />
              </View>
            </Card>
          </Rise>

          <SectionTitle title={`NEW IN ${VERSION}`} />
          <Rise delay={160}>
            <Card pad={18}>
              {WHATS_NEW.map(([icon, title, sub], i) => (
                <ListRow key={title} icon={icon} color={[T.primary, T.mint, T.gold, T.coral][i % 4]} title={title} sub={sub} last={i === WHATS_NEW.length - 1} />
              ))}
            </Card>
          </Rise>

          <SectionTitle title="ABOUT THE DEVELOPER" />
          <Rise delay={200}>
            <View style={[k.card, { overflow: "hidden" }]}>
              <View>
                <Image source={require("../../assets/images/developer.jpg")} style={st.devPhoto} resizeMode="cover" accessibilityLabel="Pitta Shankumar watching the sea at sunset" />
                <LinearGradient colors={["transparent", T.card]} style={st.devFade} />
              </View>
              <View style={{ paddingHorizontal: 22, paddingBottom: 22, marginTop: -18 }}>
                <Chip text="DESIGNED & BUILT BY" color={T.primaryText} soft={T.primarySoft} />
                <Text style={st.devName} numberOfLines={1} adjustsFontSizeToFit>PITTA SHANKUMAR</Text>
                <Text style={st.devBio}>Friendly Neighbourhood Developer</Text>
                <View style={st.socials}>
                  {SOCIALS.map((x) => (
                    <Pressable key={x.label} onPress={() => open(x.url)} style={({ pressed }) => [st.social, pressed && { transform: [{ scale: 0.92 }] }]} accessibilityRole="link" accessibilityLabel={x.label}>
                      <Ionicons name={x.icon as any} size={19} color={T.ink2} />
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => open(`mailto:${SUPPORT_EMAIL}`)} style={st.mailRow} accessibilityRole="link">
                  <Ionicons name="mail-outline" size={15} color={T.primaryText} />
                  <Text style={st.mailText}>{SUPPORT_EMAIL}</Text>
                </Pressable>
              </View>
            </View>
          </Rise>

          <Rise delay={240} style={{ marginTop: 18 }}>
            <Pressable onPress={() => open(CLASSCOM_URL)} accessibilityRole="link" accessibilityLabel="Open classcom.tech">
              <Card pad={18} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={st.ccMark}><Text style={st.ccMarkText}>C</Text></View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={st.ccLabel}>AFFILIATED WITH</Text>
                  <Text style={st.ccName}>ClassCom</Text>
                  <Text style={st.ccLink}>classcom.tech</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={T.dim} />
              </Card>
            </Pressable>
          </Rise>

          <SectionTitle title="GOOD TO KNOW" />
          <Rise delay={280}>
            <Card pad={18}>
              <ListRow icon="lock-closed" color={T.mint} title="Privacy" sub="Wi-Fi auctions never leave your network; online auctions are relayed through Firebase and deleted when the arena closes. Accounts are optional. No ads. Anonymous crash reports help fix bugs." />
              <ListRow icon="document-text" color={T.primary} title="MIT licence" sub="The source code is free to read, use and change." onPress={() => open("https://github.com/shankumar7/skelp")} />
              <ListRow icon="help-buoy" color={T.gold} title="Help and feedback" sub={SUPPORT_EMAIL} onPress={() => open(`mailto:${SUPPORT_EMAIL}`)} />
              <ListRow icon="images" color={T.coral} title="Player photos" sub={`${CREDITS.length} photos from Wikimedia Commons, used under their free licences. Tap for the credits.`} onPress={() => setShowCredits(!showCredits)} right={<Ionicons name={showCredits ? "chevron-up" : "chevron-down"} size={18} color={T.dim} />} last />
              {showCredits && (CREDITS as { name: string; artist: string; license: string }[]).map((c) => (
                <Text key={c.name} style={st.credit}><Text style={{ color: T.ink, fontFamily: "Inter_700Bold" }}>{c.name}</Text> — {c.artist} ({c.license})</Text>
              ))}
            </Card>
          </Rise>

          <Text style={st.foot}>Skelp! is a fan-made game. It is not affiliated with or endorsed by the IPL, the BCCI or any franchise. Player ratings and prices are game-design values.</Text>
          <Text style={[st.foot, { marginTop: 6 }]}>© 2026 Pitta Shankumar · Version {APP_VERSION}</Text>
        </Column>
      </ScrollView>
    </View>
  );
}

function Fact({ v, l }: { v: string; l: string }) {
  return <View style={st.fact}><Text style={st.factV}>{v}</Text><Text style={st.factL}>{l}</Text></View>;
}

const st = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  hero: { borderRadius: 32, paddingVertical: 28, paddingHorizontal: 22, alignItems: "center", overflow: "hidden", boxShadow: T.clayPrimary },
  heroRing1: { position: "absolute", width: 320, height: 320, borderRadius: 160, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", top: -120, right: -110 },
  heroRing2: { position: "absolute", width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", bottom: -90, left: -70 },
  logoRing: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", boxShadow: "0px 10px 20px rgba(20, 20, 90, 0.35), inset 0px -6px 10px rgba(60, 50, 110, 0.12)" },
  heroTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 46, color: "#FFF", letterSpacing: 3, marginTop: 14 },
  heroSub: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.onPrimaryDim, letterSpacing: 2, marginTop: -2, textAlign: "center" },
  heroChips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16 },
  heroChip: { backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 11, paddingVertical: 5, borderRadius: 11 },
  heroChipText: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#FFF", letterSpacing: 1 },
  affil: { fontFamily: "Inter_700Bold", fontSize: 10, color: T.dim, letterSpacing: 2, textAlign: "center" },
  affilBrand: { fontFamily: "Inter_800ExtraBold", color: T.primaryText },
  facts: { flexDirection: "row", gap: 10, marginTop: 18 },
  fact: { flex: 1, backgroundColor: T.sand, borderRadius: 18, paddingVertical: 12, alignItems: "center", boxShadow: T.clayPocket },
  factV: { fontFamily: "LuckiestGuy_400Regular", fontSize: 22, color: T.primaryText },
  factL: { fontFamily: "Inter_800ExtraBold", fontSize: 8, color: T.muted, letterSpacing: 1, marginTop: 2, textAlign: "center" },
  devPhoto: { width: "100%", height: 190 },
  devFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 70 },
  devName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 30, color: T.ink, letterSpacing: 1.2, marginTop: 10 },
  devBio: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: T.muted, marginTop: 2 },
  socials: { flexDirection: "row", gap: 10, marginTop: 18 },
  social: { width: 46, height: 46, borderRadius: 16, backgroundColor: T.bg, alignItems: "center", justifyContent: "center", boxShadow: T.claySoft, borderWidth: 1, borderColor: T.cardEdge },
  mailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, alignSelf: "flex-start", backgroundColor: T.primarySoft, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 },
  mailText: { fontFamily: "Inter_700Bold", fontSize: 13, color: T.primaryText },
  ccMark: { width: 52, height: 52, borderRadius: 18, backgroundColor: T.ink, alignItems: "center", justifyContent: "center", boxShadow: "0px 8px 14px rgba(35, 31, 61, 0.30), inset 0px -5px 8px rgba(0, 0, 0, 0.3), inset 0px 5px 8px rgba(255, 255, 255, 0.18)" },
  ccMarkText: { fontFamily: "Poppins_800ExtraBold", fontSize: 26, color: T.bg, marginTop: 2 },
  ccLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: T.muted, letterSpacing: 1.6 },
  ccName: { fontFamily: "Poppins_700Bold", fontSize: 20, color: T.ink, marginTop: -1 },
  ccLink: { fontFamily: "Inter_700Bold", fontSize: 12, color: T.primaryText, marginTop: -2 },
  credit: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: T.muted, marginTop: 8, lineHeight: 16 },
  foot: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: T.dim, textAlign: "center", lineHeight: 17, marginTop: 26, paddingHorizontal: 10 },
}));
