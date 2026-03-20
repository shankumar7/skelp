import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Easing,
  Image,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Linking,
} from "react-native";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { LuckiestGuy_400Regular } from "@expo-google-fonts/luckiest-guy";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

// --- PARTIAL GRID ---
function PartialGrid({ color = "#2563EB", opacity = 0.1 }) {
  const vLines = 10;
  const hLines = 16;
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]}>
      {[...Array(vLines)].map((_, i) => (
        <View key={`v-${i}`} style={[s.gridLineV, { left: (SCREEN_W / vLines) * i, backgroundColor: color, height: i % 2 === 0 ? "100%" : i % 3 === 0 ? "40%" : "70%", top: i % 3 === 0 ? "30%" : 0 }]} />
      ))}
      {[...Array(hLines)].map((_, i) => (
        <View key={`h-${i}`} style={[s.gridLineH, { top: (SCREEN_H / hLines) * i, backgroundColor: color, width: i % 4 === 0 ? "90%" : i % 2 === 0 ? "30%" : "60%", left: i % 4 === 0 ? "5%" : i % 2 === 0 ? "70%" : "0%" }]} />
      ))}
    </View>
  );
}

// --- ENHANCED BACKGROUND ---
function EnhancedBackground() {
  const blob1Pos = useRef(new Animated.ValueXY({ x: -50, y: -100 })).current;
  const blob2Pos = useRef(new Animated.ValueXY({ x: SCREEN_W - 200, y: SCREEN_H - 200 })).current;
  const blob3Pos = useRef(new Animated.ValueXY({ x: SCREEN_W / 2, y: SCREEN_H / 2 })).current;
  useEffect(() => {
    const moveBlob = (val: Animated.ValueXY, xRange: [number, number], yRange: [number, number], duration: number) => {
      Animated.loop(Animated.sequence([Animated.timing(val, { toValue: { x: xRange[1], y: yRange[1] }, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(val, { toValue: { x: xRange[0], y: yRange[0] }, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true })])).start();
    };
    moveBlob(blob1Pos, [-80, 20], [-120, -50], 15000);
    moveBlob(blob2Pos, [SCREEN_W - 250, SCREEN_W - 100], [SCREEN_H - 250, SCREEN_H - 100], 18000);
    moveBlob(blob3Pos, [SCREEN_W * 0.1, SCREEN_W * 0.4], [SCREEN_H * 0.3, SCREEN_H * 0.6], 25000);
  }, []);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]}>
      <Animated.View style={[s.bgBlob, s.bgBlob1, { transform: blob1Pos.getTranslateTransform() }]} />
      <Animated.View style={[s.bgBlob, s.bgBlob2, { transform: blob2Pos.getTranslateTransform() }]} />
      <Animated.View style={[s.bgBlob, s.bgBlob3, { transform: blob3Pos.getTranslateTransform() }]} />
      <PartialGrid />
    </View>
  );
}

// --- FORM BACKGROUND ---
function FormBackground() {
  const ringsScale = useRef(new Animated.Value(0.8)).current;
  const ringsOp = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.parallel([Animated.timing(ringsScale, { toValue: 1.2, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.sequence([Animated.timing(ringsOp, { toValue: 0.8, duration: 3000, useNativeDriver: true }), Animated.timing(ringsOp, { toValue: 0.3, duration: 3000, useNativeDriver: true })])])).start();
  }, []);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F7F9FC" }]}>
      <View style={[s.formLightBlob, { top: -50, right: -50, backgroundColor: "rgba(37, 99, 235, 0.05)" }]} />
      <View style={[s.formLightBlob, { bottom: "20%", left: -100, backgroundColor: "rgba(34, 197, 94, 0.04)" }]} />
      <View style={s.center}><Animated.View style={[s.formRing, { opacity: ringsOp, transform: [{ scale: ringsScale }] }]} /><Animated.View style={[s.formRing, { opacity: Animated.multiply(ringsOp, 0.5), transform: [{ scale: Animated.multiply(ringsScale, 1.4) }] }]} /></View>
      <PartialGrid color="#94A3B8" opacity={0.05} />
    </View>
  );
}

// --- ANIMATED PRESSABLE ---
const AnimatedPressable = ({ children, onPress, style, disabled }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => { if (!disabled) Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start(); };
  const onPressOut = () => { if (!disabled) Animated.spring(scale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }).start(); };
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

function BootSplash({ insets, ready, onDone }: any) {
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.2)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const impactRing = useRef(new Animated.Value(0)).current;
  const orbit1 = useRef(new Animated.Value(0)).current;
  const orbit2 = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const [bootVisible, setBootVisible] = useState(true);
  useEffect(() => {
    Animated.parallel([Animated.timing(logoOp, { toValue: 1, duration: 600, useNativeDriver: true }), Animated.spring(logoScale, { toValue: 1, tension: 40, friction: 5, useNativeDriver: true }), Animated.timing(impactRing, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true })]).start();
    Animated.loop(Animated.sequence([Animated.timing(logoFloat, { toValue: -12, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(logoFloat, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })])).start();
    const runOrbit = (v: Animated.Value, duration: number) => Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })).start();
    runOrbit(orbit1, 3500); runOrbit(orbit2, 5000);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => { Animated.timing(fadeOut, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => { onDone(); setBootVisible(false); }); }, 2800);
    return () => clearTimeout(t);
  }, [ready]);
  if (!bootVisible) return null;
  return (
    <Animated.View style={[s.screen, s.center, { opacity: fadeOut, position: "absolute", width: "100%", height: "100%", zIndex: 999 }]}>
      <EnhancedBackground />
      <View style={s.auraContainer}><Animated.View style={[s.impactRing, { opacity: impactRing.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: impactRing.interpolate({ inputRange: [0, 1], outputRange: [0.5, 4] }) }] }]} /><Animated.View style={[s.auraRing, { transform: [{ rotateZ: orbit1.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }, { scaleX: 1.1 }, { scaleY: 0.4 }] }]} /><Animated.View style={[s.auraRing, { borderColor: "rgba(37, 99, 235, 0.4)", transform: [{ rotateZ: orbit2.interpolate({ inputRange: [0, 1], outputRange: ["360deg", "0deg"] }) }, { scaleX: 0.5 }, { scaleY: 1.1 }] }]} /><Animated.View style={[s.claySplashLogo, { transform: [{ scale: logoScale }, { translateY: logoFloat }] }]}><Image source={require("../assets/images/circlelogo.png")} style={s.splashHeroLogo} resizeMode="contain" /></Animated.View></View>
      <Animated.View style={[s.splashStatusBox, { opacity: logoOp }]}><Text style={s.splashBrandName}>SKELP!</Text><Text style={s.splashTagline}>THE ULTIMATE ARENA</Text><View style={s.miniLoader}><ActivityIndicator size="small" color="#2563EB" /></View></Animated.View>
    </Animated.View>
  );
}

function AboutSkelp({ onBack, insets, fromCorner }: { onBack: () => void; insets: any; fromCorner?: boolean }) {
  const spreadScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const itemSlide = [
    useRef(new Animated.Value(40)).current,
    useRef(new Animated.Value(40)).current,
    useRef(new Animated.Value(40)).current,
    useRef(new Animated.Value(40)).current,
  ];

  useEffect(() => {
    Animated.sequence([
      Animated.timing(spreadScale, {
        toValue: 1,
        duration: 1600, // Slower for visibility
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.stagger(200, itemSlide.map(v => 
          Animated.spring(v, { toValue: 0, tension: 15, friction: 8, useNativeDriver: true })
        ))
      ])
    ]).start();
  }, []);

  const openLink = (url: string) => Linking.openURL(url);

  const circlePos: any = fromCorner 
    ? { top: insets.top + (SCREEN_H < 800 ? 12 : 28), right: 54 } 
    : { top: SCREEN_H / 2 - 50, left: SCREEN_W / 2 - 50 };

  return (
    <View style={s.aboutScreen}>
      {/* Animated Circle Spread */}
      <Animated.View 
        style={[
          s.aboutSpreadCircle, 
          circlePos,
          { 
            transform: [
              { scale: spreadScale.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }
            ] 
          }
        ]} 
      />
      
      <Animated.View style={[s.flex1, { opacity: contentFade, zIndex: 1 }]}>
        {/* Navigation Bar / Header */}
        <View style={[s.aboutHeader, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={onBack} style={s.aboutHeaderBackBtn}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </Pressable>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={[s.aboutScrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Main Hero Section */}
          <Animated.View style={[s.aboutHero, { transform: [{ translateY: itemSlide[0] }] }]}>
            <View style={s.aboutLogoRing}>
              <Image source={require("../assets/images/circlelogo.png")} style={s.aboutLogoFull} resizeMode="contain" />
            </View>
            <Text style={s.aboutHeroTitle}>SKELP!</Text>
            <View style={s.aboutStatusRow}>
              <View style={[s.aboutStatusPill, { backgroundColor: '#E0E7FF' }]}><Text style={[s.aboutStatusText, { color: '#4338CA' }]}>V1.0</Text></View>
            </View>
          </Animated.View>

          {/* Description Section */}
          <Animated.View style={[s.aboutInfoCard, { transform: [{ translateY: itemSlide[1] }] }]}>
            <Text style={s.aboutInfoHeadline}>ULTIMATE IPL AUCTION ARENA</Text>
            <Text style={s.aboutInfoBody}>
              Skelp! is designed for the elite bidders who demand speed, precision, and an immersive arena experience.
              {"\n\n"}
              Whether you're scouting players for a local league or hosting a full-scale online auction, Skelp! delivers professional tools to manage purses, track bids, and secure your dream team.
            </Text>
          </Animated.View>

          {/* Developer Section */}
          <Animated.View style={[s.aboutDevCard, { transform: [{ translateY: itemSlide[2] }] }]}>
            <Text style={s.aboutDevLabel}>CRAFTED BY</Text>

            <Text style={s.aboutDevNameHero} numberOfLines={1} adjustsFontSizeToFit={true}>PITTA SHANKUMAR</Text>

            <View style={s.aboutSocialRowSingle}>
              {[
                { n: "logo-github", c: "#334155", l: "https://github.com/shankumar7" },
                { n: "logo-linkedin", c: "#0077B5", l: "https://www.linkedin.com/in/shankumar7/" },
                { n: "mail", c: "#EF4444", l: "mailto:skelpsupport@gmail.com" },
                { n: "logo-twitter", c: "#000", l: "https://x.com/shankumar_7" },
                { n: "logo-instagram", c: "#E4405F", l: "https://www.instagram.com/shankumar_7/" }
              ].map((scl, i) => (
                <Pressable key={i} onPress={() => openLink(scl.l)} style={s.aboutSocialIconHero}>
                  <Ionicons name={scl.n as any} size={18} color={scl.c} />
                </Pressable>
              ))}
            </View>

            <Text style={s.aboutDevBioHero}>Friendly Neighbourhood Developer</Text>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function MainArenaView({ insets, onExit, name, avatar, timer, currentBid, onBid }: any) {
  const [activeTab, setActiveTab] = useState("BID");
  return (
    <View style={[s.screen, { backgroundColor: "#F8FAFC" }]}>
      
      {/* Room Header */}
      <View style={[s.roomHeader, { paddingTop: insets.top, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}>
        <Pressable onPress={onExit} style={s.arenaBackBtn}><Ionicons name="close" size={24} color="#1E293B" /></Pressable>
        <View style={s.arenaTitleBox}><Text style={[s.arenaCode, { color: '#1E293B' }]}>ARENA #402</Text><View style={s.arenaStatus}><View style={s.arenaDot} /><Text style={s.arenaLiveText}>LIVE</Text></View></View>
        <View style={[s.arenaUserBox, { overflow: 'hidden' }]}><Ionicons name={avatar as any} size={22} color="#FFF" /></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Player Card Section */}
        <View style={s.arenaPlayerSection}>
          <LinearGradient colors={['#2563EB', '#1E40AF']} style={s.arenaPlayerCard}>
            <View style={s.arenaPlayerImagePlaceholder}><Ionicons name="person" size={120} color="rgba(255,255,255,0.08)" /></View>
            <View style={s.arenaPlayerInfo}>
              <View style={s.arenaCategoryBadge}><Text style={s.arenaCategoryText}>OVERSEAS BATSMAN</Text></View>
              <Text style={s.arenaPlayerName}>STEVE SMITH</Text>
              <Text style={s.arenaPlayerMeta}>AUSTRALIA • 34YRS • BASE: ₹2.0 Cr</Text>
            </View>
            <View style={s.arenaTimerBox}>
              <Text style={s.arenaTimerLabel}>CLOSING IN</Text>
              <Text style={s.arenaTimerVal}>{timer}s</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Bidding Stats */}
        <View style={s.arenaStatsRow}>
          <View style={s.arenaStatItem}><Text style={s.arenaStatLabel}>CURRENT BID</Text><Text style={s.arenaStatPrice}>₹{currentBid.toLocaleString()}</Text></View>
          <View style={s.arenaStatDivider} />
          <View style={s.arenaStatItem}><Text style={s.arenaStatLabel}>HIGHEST BIDDER</Text><Text style={s.arenaStatOwner}>ARYAN (YOU)</Text></View>
        </View>

        {/* Tabs / Logs Section */}
        <View style={s.arenaLogHeader}>
          {["BID", "STATS", "SQUAD"].map(t => (
            <Pressable key={t} onPress={() => setActiveTab(t)} style={[s.arenaTabBtn, activeTab === t && s.arenaTabBtnOn]}>
              <Text style={[s.arenaTabText, activeTab === t && s.arenaTabTextOn]}>{t}S</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.arenaLogContainer}>
          {activeTab === "BID" ? (
            <View style={{ gap: 12 }}>
              {[
                { n: "SHANKUMAR", b: "+₹5.0 L", t: "2s ago", c: "#22C55E" },
                { n: "ARYAN", b: "+₹2.0 L", t: "5s ago", c: "#2563EB" },
                { n: "ANIKA", b: "+₹1.0 L", t: "12s ago", c: "#64748B" }
              ].map((log, i) => (
                <View key={i} style={s.arenaLogItem}>
                  <View style={s.row}><View style={[s.arenaLogDot, { backgroundColor: log.c }]} /><Text style={s.arenaLogUser}>{log.n}</Text></View>
                  <Text style={s.arenaLogPrice}>{log.b}</Text>
                  <Text style={s.arenaLogTime}>{log.t}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.arenaComingSoon}><Text style={s.arenaComingSoonText}>{activeTab} DATA LOADING...</Text></View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bidding Controls */}
      <View style={[s.arenaActionWrapper, { paddingBottom: insets.bottom + 10, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderTopColor: '#F1F5F9' }]}>
        <View style={s.arenaBidOptions}>
          {[2, 5, 10].map(val => (
            <Pressable key={val} onPress={() => onBid(val * 100000)} style={s.arenaQuickBid}>
              <Text style={s.arenaQuickBidText}>+₹{val}L</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => onBid(100000)} style={s.arenaMainBid}>
          <LinearGradient colors={['#22C55E', '#16A34A']} start={{x:0, y:0}} end={{x:1, y:1}} style={s.arenaBidGradient}>
            <Text style={s.arenaBidBtnText}>PLACE BID +₹1.0 L</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function MainDashboard({ onJoin, onLogout, insets, name, avatar, opacity }: { onJoin: () => void; onLogout: () => void; insets: any; name: string; avatar: string; opacity: any }) {
  const dashAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(dashAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
  }, []);

  const slideUp = (delay: number) => ({
    opacity: dashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [{
      translateY: dashAnim.interpolate({ inputRange: [0, 1], outputRange: [20 + delay / 10, 0] })
    }]
  });

  return (
    <View style={[s.screen, { backgroundColor: "#F1F5F9" }]}>
      {/* Header */}
      <View style={[s.dashHeader, { paddingTop: insets.top + 10 }]}>
        <View style={s.row}>
          <View style={s.dashUserCircle}><Ionicons name={avatar as any} size={28} color="#2563EB" /></View>
          <View style={{ marginLeft: 12 }}>
            <Text style={s.dashGreeting}>WELCOME BACK,</Text>
            <Text style={s.dashName}>{name ? name.toUpperCase() : "SOLO PLAYER"}</Text>
          </View>
        </View>
        <Pressable onPress={onLogout} style={s.dashLogout}><Ionicons name="log-out-outline" size={24} color="#64748B" /></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Search */}
        <Animated.View style={[s.dashSearchBox, slideUp(0)]}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <Text style={s.dashSearchPlaceholder}>ENTER ARENA CODE...</Text>
        </Animated.View>

        {/* Hero CTA */}
        <Animated.View style={[s.dashJoinHero, slideUp(100)]}>
          <LinearGradient colors={['#2563EB', '#1D4ED8']} start={{x:0, y:0}} end={{x:1, y:1}} style={s.dashJoinGradient}>
            <View style={{ flex: 1 }}>
              <Text style={s.dashJoinTitle}>JOIN PUBLIC ARENA</Text>
              <Text style={s.dashJoinSub}>FIND THE BEST CRIC TALENTS</Text>
            </View>
            <View style={s.dashJoinArrow}><Ionicons name="arrow-forward" size={24} color="#FFF" /></View>
          </LinearGradient>
        </Animated.View>

        {/* Horizontal Auctions */}
        <View style={s.dashSectionHeader}>
          <Text style={s.dashSectionTitle}>LIVE AUCTIONS</Text>
          <Pressable><Text style={s.dashViewAll}>DISCOVER ALL</Text></Pressable>
        </View>

        <Animated.View style={slideUp(200)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24, paddingHorizontal: 24 }}>
            {[
              { t: "MEGA AUCTION 2026", s: "48 PLY", b: "₹2.4 Cr", l: true, tag: "HOT" },
              { t: "PREMIER LEAGUE V1", s: "12 PLY", b: "₹88 L", l: false, tag: "NEW" },
              { t: "CLASH OF TITANS", s: "6 PLY", b: "₹1.1 Cr", l: true, tag: "LIVE" }
            ].map((auc, i) => (
              <Pressable key={i} onPress={onJoin} style={s.dashAucCard}>
                <View style={[s.dashAucBadge, !auc.l && { backgroundColor: '#F1F5F9' }]}>
                  <Text style={[s.dashAucBadgeText, !auc.l && { color: '#64748B' }]}>{auc.tag}</Text>
                </View>
                <Text style={s.dashAucTitle} numberOfLines={2}>{auc.t}</Text>
                <View style={s.dashAucMeta}>
                  <Ionicons name="people-outline" size={12} color="#64748B" />
                  <Text style={s.dashAucStat}>{auc.s}</Text>
                  <View style={s.dashAucDot} />
                  <Ionicons name="wallet-outline" size={12} color="#64748B" />
                  <Text style={s.dashAucStat}>{auc.b}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Stats Row */}
        <View style={s.dashSectionHeader}>
          <Text style={s.dashSectionTitle}>YOUR PERFORMANCE</Text>
        </View>

        <Animated.View style={[s.dashStatsRow, slideUp(300)]}>
          <View style={s.dashStatBox}><Text style={s.dashStatVal}>12</Text><Text style={s.dashStatLab}>WINS</Text></View>
          <View style={s.dashStatBox}><Text style={s.dashStatVal}>₹14M</Text><Text style={s.dashStatLab}>SPENT</Text></View>
          <View style={s.dashStatBox}><Text style={s.dashStatVal}>92%</Text><Text style={s.dashStatLab}>WIN RATE</Text></View>
        </Animated.View>

        {/* Leaderboard/Social */}
        <View style={s.dashSectionHeader}>
          <Text style={s.dashSectionTitle}>TOP BIDDERS</Text>
        </View>

        <Animated.View style={[s.dashLeaderboard, slideUp(400)]}>
          {[
            { n: "ARYAN", p: "42k", a: "planet" },
            { n: "SHANKUMAR", p: "38k", a: "shield-checkmark" },
            { n: "ANIKA", p: "31k", a: "flash" }
          ].map((user, i) => (
            <View key={i} style={s.dashLeaderItem}>
              <View style={s.row}>
                <Text style={s.dashRank}>{i+1}</Text>
                <View style={s.dashLeaderAvatar}><Ionicons name={user.a as any} size={16} color="#2563EB" /></View>
                <Text style={s.dashLeaderName}>{user.n}</Text>
              </View>
              <Text style={s.dashPoints}>{user.p} PTS</Text>
            </View>
          ))}
        </Animated.View>

        {/* Create CTA */}
        <Animated.View style={[slideUp(500), { marginTop: 24 }]}>
          <Pressable style={s.dashCreateBtn}>
            <View style={s.dashCreateIconBox}><Ionicons name="add" size={20} color="#FFF" /></View>
            <Text style={s.dashCreateText}>HOST YOUR OWN ARENA</Text>
          </Pressable>
        </Animated.View>

      </ScrollView>
    </View>
  );
}



function AvatarSelectionScreen({ insets, onSelect, name }: any) {
  const avatars = [
    { n: "shield-checkmark", c: "#2563EB", t: "GUARDIAN" },
    { n: "flash", c: "#10B981", t: "SPEED" },
    { n: "trophy", c: "#EAB308", t: "CHAMP" },
    { n: "rocket", c: "#F59E0B", t: "MOONER" },
    { n: "skull", c: "#475569", t: "FINISH" },
    { n: "heart", c: "#EF4444", t: "FAVE" },
    { n: "planet", c: "#EC4899", t: "PLANET" },
    { n: "construct", c: "#0EA5E9", t: "ARCHI" },
    { n: "thunderstorm", c: "#6366F1", t: "STORM" },
    { n: "eye", c: "#334155", t: "ANALYST" }
  ];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;
  useEffect(() => { Animated.parallel([Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }), Animated.spring(slide, { toValue: 0, tension: 20, friction: 6, useNativeDriver: true })]).start(); }, []);
  return (
    <View style={s.screen}>
      <FormBackground />
      <Animated.View style={[s.flex1, { opacity: fade, transform: [{ translateY: slide }], paddingTop: insets.top + (SCREEN_H * 0.08), paddingHorizontal: 24 }]}>
        <View style={s.avatarHeader}><Text style={s.avatarTitle}>PLAYER SELECT</Text><Text style={s.avatarSub}>{name.toUpperCase()}, ASSIGN YOUR ARENA IDENTITY</Text></View>
        <View style={s.avatarGrid}>{avatars.map((av, idx) => {
          const isSel = selectedIdx === idx;
          return (
            <Pressable key={idx} onPress={() => setSelectedIdx(idx)} style={[s.avatarItem, isSel && s.avatarItemOn]}>
              <View style={[s.avatarIconCircle, { backgroundColor: "#FFF", borderColor: isSel ? av.c : av.c + "40", borderWidth: isSel ? 2 : 1 }]}><Ionicons name={av.n as any} size={28} color={av.c} /></View>
              <Text style={[s.avatarMiniTag, { color: av.c }, isSel && { fontFamily: 'Inter_800ExtraBold' }]}>{isSel ? "READY" : av.t}</Text>
            </Pressable>
          );
        })}</View>
        <View style={s.avatarFooter}>
          {selectedIdx !== null && (
            <AnimatedPressable style={s.premiumSubmitBtn} onPress={() => onSelect(avatars[selectedIdx].n, selectedIdx)}>
              <Text style={s.premiumSubmitBtnText}>ENTER ARENA</Text>
            </AnimatedPressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

function AuthenticatingScreen({ onFinish, name }: { onFinish: () => void; name: string }) {
  const fade = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [percent, setPercent] = useState(0);
  const statusPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.timing(progress, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
    progress.addListener(({ value }) => setPercent(Math.floor(value * 100)));
    Animated.loop(Animated.sequence([Animated.timing(statusPulse, { toValue: 0.5, duration: 700, useNativeDriver: true }), Animated.timing(statusPulse, { toValue: 1, duration: 700, useNativeDriver: true })])).start();
    const timer = setTimeout(() => onFinish(), 4000);
    return () => { progress.removeAllListeners(); clearTimeout(timer); };
  }, []);
  return (
    <Animated.View style={[s.screen, s.center, { opacity: fade }]}>
      <FormBackground />
      <View style={s.authGreetingBox}><Text style={s.authGreetingTitle}>HELLO,</Text><Text style={s.authGreetingName}>{name || "PLAYER"}</Text></View>
      <View style={s.clayProgressContainer}><View style={s.clayProgressPocket}><Animated.View style={[s.clayProgressBar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} /></View><Text style={s.clayPercentText}>{percent}%</Text></View>
      <Animated.View style={[s.authStatusWrapper, { opacity: statusPulse }]}><Text style={[s.authStatusTextUnified, { color: "#94A3B8" }]}>GET READY TO OUTBID!</Text></Animated.View>
    </Animated.View>
  );
}

function WelcomeGreeting({ onLogin, onSignUp, onGuest, insets, onAbout }: any) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const glint = useRef(new Animated.Value(0)).current;
  const titleOp = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const btnOp = useRef(new Animated.Value(0)).current;
  const btnY = [useRef(new Animated.Value(40)).current, useRef(new Animated.Value(40)).current, useRef(new Animated.Value(40)).current];
  useEffect(() => {
    Animated.sequence([Animated.parallel([Animated.spring(logoScale, { toValue: 1, damping: 12, useNativeDriver: true }), Animated.timing(titleOp, { toValue: 1, duration: 600, useNativeDriver: true }), Animated.timing(titleSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1)), useNativeDriver: true })]), Animated.parallel([Animated.timing(btnOp, { toValue: 1, duration: 800, useNativeDriver: true }), Animated.stagger(150, btnY.map(v => Animated.timing(v, { toValue: 0, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true })))])]).start();
    Animated.loop(Animated.sequence([Animated.timing(glint, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.delay(1000), Animated.timing(glint, { toValue: 0, duration: 0, useNativeDriver: true })])).start();
    Animated.loop(Animated.sequence([Animated.timing(logoPulse, { toValue: 1.04, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(logoPulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })])).start();
  }, []);
  return (
    <View style={[s.screen, { paddingTop: Math.max(insets.top, 50), paddingBottom: Math.max(insets.bottom, 40) }]}>
      <EnhancedBackground />
      <View style={s.welcomeMain}>
        <Pressable onPress={onAbout}>
          <Animated.View style={[s.clayLogoBox, { transform: [{ scale: logoScale }, { scale: logoPulse }] }]}>
            <Image source={require("../assets/images/circlelogo.png")} style={s.welcomeLogo} resizeMode="contain" />
            <Animated.View style={[s.glintBar, { transform: [{ translateX: glint.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] }) }] }]} />
          </Animated.View>
        </Pressable>
        <Animated.View style={[s.welcomeTitleWrapper, { opacity: titleOp, transform: [{ translateY: titleSlide }] }]}><Text style={s.welcomeTitle}>SKELP!</Text><Text style={s.welcomeWelcome}>WELCOME TO THE ARENA</Text></Animated.View>
      </View>
      <Animated.View style={[s.welcomeActions, { opacity: btnOp }]}><Animated.View style={{ transform: [{ translateY: btnY[0] }] }}><AnimatedPressable style={s.premiumClayBtn} onPress={onLogin}><View style={s.clayBtnContent}><Text style={s.clayBtnTitle}>DO YOU KNOW US?</Text></View></AnimatedPressable></Animated.View><Animated.View style={{ transform: [{ translateY: btnY[1] }] }}><AnimatedPressable style={s.premiumClayBtnSec} onPress={onSignUp}><View style={s.clayBtnContent}><Text style={s.clayBtnSecondaryTitle} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>WANT TO GET ACQUAINTED?</Text></View></AnimatedPressable></Animated.View><Animated.View style={{ transform: [{ translateY: btnY[2] }] }}><AnimatedPressable style={s.clayBtnGuest} onPress={onGuest}><Text style={s.clayBtnGuestText}>OR CONTINUE AS A GUEST</Text></AnimatedPressable></Animated.View></Animated.View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ LuckiestGuy_400Regular, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const [connected, setConnected] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showGreeting, setShowGreeting] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [bootDone, setBootDone] = useState(false);
  const [currentBid, setCurrentBid] = useState(2400);
  const [timer, setTimer] = useState(38);
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("shield-checkmark");
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState(0);
  const [aboutFromCorner, setAboutFromCorner] = useState(false);
  const [inArena, setInArena] = useState(false);
  const contentOp = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (fontsLoaded && bootDone && connected) Animated.timing(contentOp, { toValue: 1, duration: 600, useNativeDriver: true }).start(); }, [fontsLoaded, bootDone, connected]);
  if (!fontsLoaded || !bootDone) return <BootSplash insets={insets} ready={fontsLoaded} onDone={() => setBootDone(true)} />;
  const handleAuth = () => {
    if (isLogin) {
      setIsAuthenticating(true);
    } else {
      setIsSelectingAvatar(true);
    }
  };
  const onAuthDone = () => {
    // NOTE: This is where you will integrate Firebase Authentication and Firestore.
    // Data ready for storage:
    // { username: displayName, email: email, password: password, avatarIndex: selectedAvatarIdx }
    setIsAuthenticating(false);
    setConnected(true);
  };
  const disconnect = () => { setConnected(false); setInArena(false); setShowGreeting(true); };
  if (showAbout) return <AboutSkelp onBack={() => setShowAbout(false)} insets={insets} fromCorner={aboutFromCorner} />;
  if (isSelectingAvatar) return <AvatarSelectionScreen insets={insets} onSelect={(icon: string, idx: number) => { setSelectedAvatar(icon); setSelectedAvatarIdx(idx); setIsSelectingAvatar(false); setIsAuthenticating(true); }} name={displayName} />;
  if (isAuthenticating) return <AuthenticatingScreen onFinish={onAuthDone} name={displayName} />;
  
  if (connected) {
    if (inArena) {
      return (
        <MainArenaView 
          insets={insets} 
          onExit={() => setInArena(false)} 
          name={displayName} 
          avatar={selectedAvatar} 
          timer={timer} 
          currentBid={currentBid} 
          onBid={(val: number) => setCurrentBid(p => p + val)}
        />
      );
    }
    return <MainDashboard onJoin={() => setInArena(true)} onLogout={disconnect} insets={insets} name={displayName} avatar={selectedAvatar} opacity={contentOp} />;
  }
  if (showGreeting) return <WelcomeGreeting insets={insets} onLogin={() => { setIsLogin(true); setShowGreeting(false); }} onSignUp={() => { setIsLogin(false); setShowGreeting(false); }} onGuest={() => { setIsLogin(false); setDisplayName("Guest" + Math.floor(100 + Math.random() * 899)); setIsSelectingAvatar(true); setShowGreeting(false); }} onAbout={() => { setAboutFromCorner(false); setShowAbout(true); }} />;
  return <LoginScreen isLogin={isLogin} setIsLogin={setIsLogin} handleAuth={handleAuth} insets={insets} password={password} setPassword={setPassword} displayName={displayName} setDisplayName={setDisplayName} email={email} setEmail={setEmail} onBack={() => setShowGreeting(true)} onAbout={() => { setAboutFromCorner(true); setShowAbout(true); }} />;
}

function LoginScreen({ isLogin, setIsLogin, handleAuth, insets, password, setPassword, displayName, setDisplayName, email, setEmail, onBack, onAbout }: any) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => { fade.setValue(0); slide.setValue(20); Animated.parallel([Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }), Animated.spring(slide, { toValue: 0, tension: 25, friction: 6, useNativeDriver: true })]).start(); }, [isLogin]);
  const canSubmit = isLogin ? (displayName.trim() && password.trim()) : (displayName.trim() && password.trim() && email.trim());
  return (
    <View style={s.screen}>
      <FormBackground />
      <KeyboardAvoidingView style={s.flex1} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + (isLogin ? 20 : 10), paddingBottom: insets.bottom + 60, paddingHorizontal: 24, flexGrow: 1, justifyContent: "flex-start" }} bounces={false} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
            <View style={s.fullWidthTop}><Pressable style={s.clayBack} onPress={onBack} hitSlop={20}><Text style={s.clayBackText}>←</Text></Pressable><Pressable onPress={onAbout} style={s.clayLogoMini}><Image source={require("../assets/images/circlelogo.png")} style={s.logoImg} resizeMode="contain" /></Pressable></View>
            <View style={s.fullWidthContent}>
              <Text style={[s.expansiveTitle, !isLogin && s.expansiveTitleSmaller, { color: "#2563EB" }]}>{isLogin ? "SIGN IN" : "REGISTER"}</Text>
              <Text style={s.expansiveSub}>{isLogin ? "Welcome Back to the Arena!" : "Join the world's most elite arena"}</Text>
              <View style={s.clayForm}>
                {!isLogin && (
                  <View style={s.clayField}>
                    <Text style={s.clayLabel}>EMAIL ID</Text>
                    <View style={[s.premiumClayInput, focusedField === "email" && s.premiumClayInputOn]}>
                      <TextInput 
                        placeholder="Your email address" 
                        placeholderTextColor="#64748B" 
                        value={email} 
                        onChangeText={setEmail} 
                        onFocus={() => setFocusedField("email")} 
                        onBlur={() => setFocusedField(null)} 
                        style={s.clayInputInner} 
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                )}
                <View style={s.clayField}><Text style={s.clayLabel}>USERNAME</Text><View style={[s.premiumClayInput, focusedField === "name" && s.premiumClayInputOn]}><TextInput placeholder={isLogin ? "Your username" : "Create username"} placeholderTextColor="#64748B" value={displayName} onChangeText={setDisplayName} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} style={s.clayInputInner} /></View></View>
                <View style={s.clayField}><Text style={s.clayLabel}>PASSWORD</Text><View style={[s.premiumClayInput, focusedField === "pw" && s.premiumClayInputOn]}><TextInput placeholder="Password" placeholderTextColor="#64748B" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} onFocus={() => setFocusedField("pw")} onBlur={() => setFocusedField(null)} style={s.clayInputInner} /><Pressable onPress={() => setShowPassword(!showPassword)}><Text style={s.clayToggleText}>{showPassword ? "HIDE" : "SHOW"}</Text></Pressable></View></View>
                <AnimatedPressable style={[s.premiumSubmitBtn, !canSubmit && s.btnOff]} onPress={handleAuth} disabled={!canSubmit}><Text style={s.premiumSubmitBtnText}>{isLogin ? "LOG IN" : "SIGN UP"}</Text></AnimatedPressable>
                <View style={s.clayDivider}><View style={s.clayLine} /><Text style={s.clayOr}>Or continue with</Text><View style={s.clayLine} /></View>
                <AnimatedPressable style={s.premiumGoogleBtn}><Image source={{ uri: "https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" }} style={s.googleRealLogo} /><Text style={s.clayGoogleText}>SIGN IN WITH GOOGLE</Text></AnimatedPressable>
              </View>
              <View style={s.claySwitchBox}><Text style={s.claySwitchText}>{isLogin ? "New here? " : "Already member? "}<Text style={s.claySwitchLink} onPress={() => setIsLogin(!isLogin)}>{isLogin ? "Join Now" : "Sign In"}</Text></Text></View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F9FC", overflow: "hidden" },
  center: { justifyContent: "center", alignItems: "center" },
  flex1: { flex: 1 },
  bgBlob: { position: "absolute", borderRadius: 999 },
  bgBlob1: { width: 300, height: 300, backgroundColor: "rgba(37, 99, 235, 0.08)" },
  bgBlob2: { width: 400, height: 400, backgroundColor: "rgba(37, 99, 235, 0.1)" },
  bgBlob3: { width: 250, height: 250, backgroundColor: "rgba(99, 102, 241, 0.06)" },
  gridLineV: { position: "absolute", width: 1.2 },
  gridLineH: { position: "absolute", height: 1.2 },
  formLightBlob: { position: "absolute", width: 400, height: 400, borderRadius: 200 },
  formRing: { position: "absolute", width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: "rgba(37, 99, 235, 0.1)" },
  authGreetingBox: { alignItems: "center", marginBottom: 30 },
  authGreetingTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: "#94A3B8", letterSpacing: 4 },
  authGreetingName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 36, color: "#2563EB", textAlign: "center", marginTop: 4, textTransform: "uppercase" },
  clayProgressContainer: { width: "80%", alignItems: "center" },
  clayProgressPocket: { width: "100%", height: 32, backgroundColor: "#E2E8F0", borderRadius: 16, borderBottomWidth: 3, borderBottomColor: "#FFF", overflow: "hidden" },
  clayProgressBar: { height: "100%", backgroundColor: "#2563EB", borderRadius: 16, borderBottomWidth: 5, borderBottomColor: "rgba(30, 64, 175, 0.4)", borderTopWidth: 1.5, borderTopColor: "rgba(255,255,255,0.3)" },
  clayPercentText: { fontFamily: "Poppins_800ExtraBold", fontSize: 13, color: "#2563EB", marginTop: 12 },
  authStatusWrapper: { position: "absolute", bottom: 60 },
  authStatusTextUnified: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: "#94A3B8", letterSpacing: 3, textTransform: "uppercase" },
  fullWidthTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  clayBack: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 4, borderBottomWidth: 3, borderBottomColor: "#E2E8F0" },
  clayBackText: { fontSize: 22, color: "#1E293B", fontFamily: "Poppins_600SemiBold" },
  clayLogoMini: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF", padding: 8, shadowColor: "#2563EB", shadowOpacity: 0.1, shadowRadius: 15, elevation: 8, borderBottomWidth: 3, borderBottomColor: "#DBEAFE" },
  logoImg: { width: "100%", height: "100%" },
  fullWidthContent: { width: "100%" },
  expansiveTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 60, color: "#2563EB", letterSpacing: 1.5 },
  expansiveTitleSmaller: { fontSize: 48 },
  expansiveSub: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#94A3B8", marginTop: -6, marginBottom: 20, letterSpacing: 0.5 },
  clayForm: { gap: 14 }, clayField: { gap: 6 },
  clayLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#94A3B8", letterSpacing: 2, marginLeft: 2 },
  premiumClayInput: { backgroundColor: "#FFF", borderRadius: 22, paddingHorizontal: 22, paddingVertical: 2, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 12, elevation: 3, borderBottomWidth: 4, borderBottomColor: "#F1F5F9", borderTopWidth: 1, borderTopColor: "#F8FAFC" },
  premiumClayInputOn: { borderBottomColor: "#E0E7FF", backgroundColor: "#FAFBFF" },
  clayInputInner: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#1E293B", paddingVertical: 12 },
  clayToggleText: { fontFamily: "Poppins_800ExtraBold", fontSize: 10, color: "#2563EB", letterSpacing: 0.5 },
  premiumSubmitBtn: { backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 24, alignItems: "center", shadowColor: "#2563EB", shadowOpacity: 0.35, shadowRadius: 15, elevation: 8, borderBottomWidth: 6, borderBottomColor: "#1E40AF", borderTopWidth: 1.5, borderTopColor: "rgba(255,255,255,0.3)" },
  btnOff: { opacity: 0.4 }, premiumSubmitBtnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 20, color: "#FFF", letterSpacing: 2 },
  clayDivider: { flexDirection: "row", alignItems: "center", marginVertical: 12 },
  clayLine: { flex: 1, height: 1.5, backgroundColor: "#E2E8F0", borderRadius: 1 },
  clayOr: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#CBD5E1", marginHorizontal: 14, textTransform: "uppercase", letterSpacing: 1.5 },
  premiumGoogleBtn: { backgroundColor: "#FFF", borderRadius: 22, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 5, borderBottomWidth: 4, borderBottomColor: "#F1F5F9", borderTopWidth: 1, borderTopColor: "#FFF" },
  googleRealLogo: { width: 22, height: 22, marginRight: 14 },
  clayGoogleText: { fontFamily: "Poppins_700Bold", fontSize: 13, color: "#334155", letterSpacing: 0.5 },
  claySwitchBox: { marginTop: 20, paddingBottom: 10, alignItems: "center" },
  claySwitchText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#64748B" },
  claySwitchLink: { color: "#2563EB", fontFamily: "Inter_800ExtraBold", textDecorationLine: "underline" },
  premiumClayBtn: { backgroundColor: "#2563EB", borderRadius: 32, paddingVertical: 20, paddingHorizontal: 32, marginBottom: 12, shadowColor: "#2563EB", shadowOpacity: 0.4, shadowRadius: 15, elevation: 12, borderBottomWidth: 6, borderBottomColor: "rgba(30, 64, 175, 0.8)", borderTopWidth: 2, borderTopColor: "rgba(255,255,255,0.2)", alignItems: "center" },
  premiumClayBtnSec: { backgroundColor: "#FFF", borderRadius: 32, paddingVertical: 20, paddingHorizontal: 32, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, elevation: 5, borderBottomWidth: 6, borderBottomColor: "#F1F5F9", borderTopWidth: 1, borderTopColor: "#FFF", alignItems: "center" },
  clayBtnContent: { width: "100%", alignItems: "center" },
  clayBtnTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 20, color: "#FFF", letterSpacing: 1.5 },
  clayBtnSecondaryTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 18, color: "#334155", letterSpacing: 1.2, width: "100%", textAlign: "center" },
  clayBtnGuest: { padding: 12, alignItems: "center" },
  clayBtnGuestText: { fontFamily: "Poppins_700Bold", fontSize: 12, color: "#94A3B8", textDecorationLine: "underline" },
  claySplashLogo: { width: 130, height: 130, borderRadius: 65, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 25, elevation: 20, borderBottomWidth: 10, borderBottomColor: "#F8FAFC", borderTopWidth: 1.5, borderTopColor: "#FFF" },
  clayLogoBox: { width: 190, height: 190, borderRadius: 95, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#2563EB", shadowOpacity: 0.15, shadowRadius: 35, elevation: 25, marginBottom: 24, borderBottomWidth: 12, borderBottomColor: "#F0F7FF", borderRightWidth: 4, borderRightColor: "#F8FBFF", overflow: "hidden" },
  auraContainer: { width: 300, height: 300, alignItems: "center", justifyContent: "center" },
  auraRing: { position: "absolute", width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: "rgba(37, 99, 235, 0.2)" },
  impactRing: { position: "absolute", width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#2563EB" },
  splashHeroLogo: { width: 100, height: 100 },
  splashStatusBox: { position: "absolute", bottom: 80, alignItems: "center", width: "100%" },
  splashBrandName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 32, color: "#1E293B", letterSpacing: 2, textAlign: "center", width: "100%" },
  splashTagline: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#94A3B8", letterSpacing: 4, marginTop: 4, textAlign: "center", width: "100%" },
  miniLoader: { marginTop: 24 },
  welcomeMain: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%" },
  welcomeLogo: { width: 140, height: 140 },
  glintBar: { position: "absolute", width: 50, height: "150%", backgroundColor: "rgba(255,255,255,0.6)", transform: [{ rotate: "25deg" }] },
  welcomeTitleWrapper: { alignItems: "center", width: "100%" },
  welcomeTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 72, color: "#2563EB", letterSpacing: 2, textAlign: "center" },
  welcomeWelcome: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#94A3B8", letterSpacing: 6, marginTop: -8, textAlign: "center" },
  welcomeActions: { paddingHorizontal: 24, paddingBottom: 10, width: "100%" },
  roomHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { padding: 8 }, backText: { fontFamily: "Poppins_700Bold", fontSize: 12, color: "#EF4444" },
  roomInfo: { alignItems: "center" }, roomTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 14, color: "#1E293B" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" }, liveText: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#EF4444" },
  clayMiniUser: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.1)", shadowColor: "#2563EB", shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  userInitial: { fontFamily: "LuckiestGuy_400Regular", fontSize: 18, color: "#FFF" },
  mainArena: { flex: 1, paddingHorizontal: 20, justifyContent: "space-evenly" },
  itemCard: { backgroundColor: "#FFF", borderRadius: 32, padding: 22, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderBottomWidth: 8, borderBottomColor: "#F1F5F9" },
  itemLabel: { backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  itemLabelText: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#64748B" },
  itemName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 32, color: "#1E293B", textAlign: "center" },
  itemMeta: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#64748B", marginTop: 4 },
  timerContainer: { marginTop: 16, alignItems: "center" },
  timerLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#EF4444", letterSpacing: 1 },
  timerValue: { fontFamily: "LuckiestGuy_400Regular", fontSize: 42, color: "#1E293B" },
  bidDisplay: { alignItems: "center" },
  bidTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 12, color: "#64748B", letterSpacing: 1.5 },
  bidVal: { fontFamily: "LuckiestGuy_400Regular", fontSize: 64, color: "#2563EB" },
  clayBidBtn: { backgroundColor: "#22C55E", paddingVertical: 20, borderRadius: 28, alignItems: "center", shadowColor: "#22C55E", shadowOpacity: 0.4, shadowRadius: 15, elevation: 12, borderBottomWidth: 8, borderBottomColor: "rgba(0,0,0,0.15)" },
  clayBidBtnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 24, color: "#FFF" },

  // --- REDESIGNED ABOUT PAGE STYLES ---
  aboutScreen: { flex: 1, backgroundColor: "#2563EB" },
  aboutSpreadCircle: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "#F8FAFC", zIndex: 0 },
  aboutHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 15, zIndex: 10, backgroundColor: 'transparent' },
  aboutHeaderBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  aboutHeaderTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: "#1E293B", letterSpacing: 4 },
  aboutScrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  aboutHero: { alignItems: "center", marginBottom: 30 },
  aboutLogoRing: { width: 140, height: 140, borderRadius: 70, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#2563EB", shadowOpacity: 0.1, shadowRadius: 20, elevation: 15, borderBottomWidth: 10, borderBottomColor: "#F1F5F9" },
  aboutLogoFull: { width: 90, height: 90 },
  aboutHeroTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 64, color: "#2563EB", marginTop: 20, letterSpacing: 4 },
  aboutStatusRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  aboutStatusPill: { backgroundColor: "rgba(34, 197, 94, 0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  aboutStatusText: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#15803D", letterSpacing: 1.5 },
  aboutInfoCard: { backgroundColor: "#FFF", borderRadius: 32, padding: 28, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 20, elevation: 5, marginBottom: 20 },
  aboutInfoHeadline: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: "#94A3B8", letterSpacing: 2, marginBottom: 12 },
  aboutInfoBody: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#334155", lineHeight: 26 },
  aboutDevCard: { backgroundColor: "#FFF", borderRadius: 32, padding: 30, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 20, elevation: 5, alignItems: "center", width: '100%' },
  aboutDevLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#94A3B8", letterSpacing: 4, marginBottom: 12 },
  aboutDevNameHero: { fontFamily: "LuckiestGuy_400Regular", fontSize: 36, color: "#1E293B", letterSpacing: 1.5, textAlign: 'center', marginBottom: 20, width: '100%' },
  aboutSocialRowSingle: { flexDirection: "row", gap: 10, marginBottom: 24, justifyContent: 'center' },
  aboutSocialIconHero: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "#E2E8F0" },
  aboutDevBioHero: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 20 },
  aboutPrimaryBtn: { backgroundColor: "#2563EB", paddingVertical: 20, borderRadius: 28, alignItems: "center", shadowColor: "#2563EB", shadowOpacity: 0.35, shadowRadius: 15, elevation: 12, borderBottomWidth: 8, borderBottomColor: "#1E40AF" },
  aboutPrimaryBtnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 24, color: "#FFF", letterSpacing: 2 },
  avatarHeader: { alignItems: "center", marginBottom: 40 },
  avatarTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 32, color: "#2563EB", letterSpacing: 2 },
  avatarSub: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#94A3B8", letterSpacing: 4, marginTop: 4, textAlign: 'center' },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  avatarItem: { width: "18%", marginBottom: 15, alignItems: 'center' },
  avatarIconCircle: { width: "100%", aspectRatio: 1, borderRadius: 20, borderBottomWidth: 3, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  avatarMiniTag: { fontFamily: 'Inter_800ExtraBold', fontSize: 6, marginTop: 4, letterSpacing: 0.5 },
  avatarItemOn: { transform: [{ scale: 1.1 }] },
  avatarFooter: { marginTop: 'auto', marginBottom: 40, width: '100%' },
  dashHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dashGreeting: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#94A3B8', letterSpacing: 2 },
  dashName: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 22, color: '#1E293B' },
  dashUserCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#DBEAFE' },
  dashLogout: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  dashSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginTop: 20, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  dashSearchPlaceholder: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#94A3B8' },
  dashJoinHero: { borderRadius: 24, marginTop: 20, shadowColor: '#2563EB', shadowOpacity: 0.25, shadowRadius: 15, elevation: 12, overflow: 'hidden' },
  dashJoinGradient: { padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dashJoinTitle: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 24, color: '#FFF', letterSpacing: 1 },
  dashJoinSub: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#BFDBFE', letterSpacing: 2, marginTop: 4 },
  dashJoinArrow: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  dashSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 },
  dashSectionTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: '#94A3B8', letterSpacing: 2, textTransform: 'uppercase' },
  dashViewAll: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#2563EB' },
  dashAucCard: { width: 200, backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginRight: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderBottomWidth: 4, borderBottomColor: '#F1F5F9' },
  dashAucBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 16 },
  dashAucBadgeText: { fontFamily: 'Inter_800ExtraBold', fontSize: 8, color: '#166534', letterSpacing: 1 },
  dashAucTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#1E293B', lineHeight: 20 },
  dashAucMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 4 },
  dashAucStat: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#64748B' },
  dashAucDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 4 },
  dashStatsRow: { flexDirection: 'row', gap: 12 },
  dashStatBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderBottomWidth: 3, borderBottomColor: '#F8FAFC' },
  dashStatVal: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 24, color: '#2563EB' },
  dashStatLab: { fontFamily: 'Inter_800ExtraBold', fontSize: 8, color: '#94A3B8', letterSpacing: 1, marginTop: 4 },
  dashLeaderboard: { backgroundColor: '#FFF', borderRadius: 28, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 20, elevation: 3 },
  dashLeaderItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dashRank: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 16, color: '#94A3B8', width: 24 },
  dashLeaderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dashLeaderName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#1E293B' },
  dashPoints: { fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: '#2563EB' },
  dashCreateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, padding: 10, paddingLeft: 10, borderBottomWidth: 4, borderBottomColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  dashCreateIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  dashCreateText: { fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: '#1E293B', marginLeft: 16, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  arenaBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  arenaTitleBox: { alignItems: 'center' },
  arenaCode: { fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: '#1E293B', letterSpacing: 2 },
  arenaStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  arenaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  arenaLiveText: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#22C55E', letterSpacing: 1 },
  arenaUserBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.2)' },
  arenaPlayerSection: { paddingHorizontal: 20, marginTop: 10 },
  arenaPlayerCard: { borderRadius: 32, padding: 30, shadowColor: '#2563EB', shadowOpacity: 0.15, shadowRadius: 20, elevation: 15, overflow: 'hidden' },
  arenaPlayerImagePlaceholder: { position: 'absolute', right: -20, bottom: -20, opacity: 0.3 },
  arenaPlayerInfo: { marginTop: 40 },
  arenaCategoryBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 16 },
  arenaCategoryText: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#FFF' },
  arenaPlayerName: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 42, color: '#FFF', letterSpacing: 2 },
  arenaPlayerMeta: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFF', marginTop: 4, opacity: 0.8 },
  arenaTimerBox: { position: 'absolute', right: 20, top: 40, alignItems: 'center' },
  arenaTimerLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#FECACA', letterSpacing: 1 },
  arenaTimerVal: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 32, color: '#FFF' },
  arenaStatsRow: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 20, marginTop: 20, borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  arenaStatItem: { flex: 1, alignItems: 'center' },
  arenaStatLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
  arenaStatPrice: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 24, color: '#2563EB' },
  arenaStatOwner: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#1E293B' },
  arenaStatDivider: { width: 1, height: '60%', backgroundColor: '#F1F5F9' },
  arenaLogHeader: { flexDirection: 'row', paddingHorizontal: 24, marginTop: 30, gap: 12 },
  arenaTabBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  arenaTabBtnOn: { backgroundColor: '#2563EB' },
  arenaTabText: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: '#94A3B8', letterSpacing: 1 },
  arenaTabTextOn: { color: '#FFF' },
  arenaLogContainer: { paddingHorizontal: 24, marginTop: 20 },
  arenaLogItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1, marginBottom: 8 },
  arenaLogDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  arenaLogUser: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#1E293B' },
  arenaLogPrice: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 16, color: '#2563EB', flex: 1, textAlign: 'right', marginRight: 15 },
  arenaLogTime: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#94A3B8' },
  arenaComingSoon: { padding: 40, alignItems: 'center' },
  arenaComingSoonText: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: '#94A3B8', letterSpacing: 2 },
  arenaActionWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, borderTopWidth: 1 },
  arenaBidOptions: { flexDirection: 'row', gap: 12, marginBottom: 15, marginTop: 15 },
  arenaQuickBid: { flex: 1, backgroundColor: '#F1F5F9', height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: '#E2E8F0' },
  arenaQuickBidText: { fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: '#475569' },
  arenaMainBid: { height: 64, borderRadius: 20, overflow: 'hidden', shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8, marginBottom: 10 },
  arenaBidGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  arenaBidBtnText: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 22, color: '#FFF', letterSpacing: 2 },
});
