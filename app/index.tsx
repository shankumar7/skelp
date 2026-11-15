import {
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Easing,
  Image,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { useEffect, useRef, useState } from "react";
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

import { s, SCREEN_H, SCREEN_W, EnhancedBackground, FormBackground, AnimatedPressable } from "@/components/skelp/ui";
import { ArenaFlow } from "@/components/skelp/ArenaFlow";
import { Dashboard } from "@/components/skelp/Dashboard";
import { PlayerPool } from "@/components/skelp/PlayerPool";
import { Session } from "@/game/net/session";
import { load, Profile, recordAuction, signIn, signInGuest, signOut, signUp, Stats } from "@/game/storage";
import CREDITS from "@/game/data/credits.json";

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
      <View style={s.auraContainer}><Animated.View style={[s.impactRing, { opacity: impactRing.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: impactRing.interpolate({ inputRange: [0, 1], outputRange: [0.5, 4] }) }] }]} /><Animated.View style={[s.auraRing, { transform: [{ rotateZ: orbit1.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }, { scaleX: 1.1 }, { scaleY: 0.4 }] }]} /><Animated.View style={[s.auraRing, { borderColor: "rgba(91, 95, 239, 0.4)", transform: [{ rotateZ: orbit2.interpolate({ inputRange: [0, 1], outputRange: ["360deg", "0deg"] }) }, { scaleX: 0.5 }, { scaleY: 1.1 }] }]} /><Animated.View style={[s.claySplashLogo, { transform: [{ scale: logoScale }, { translateY: logoFloat }] }]}><Image source={require("../assets/images/circlelogo.png")} style={s.splashHeroLogo} resizeMode="contain" /></Animated.View></View>
      <Animated.View style={[s.splashStatusBox, { opacity: logoOp }]}><Text style={s.splashBrandName}>SKELP!</Text><Text style={s.splashTagline}>THE ULTIMATE ARENA</Text><View style={s.miniLoader}><ActivityIndicator size="small" color="#5B5FEF" /></View></Animated.View>
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

  const [showCredits, setShowCredits] = useState(false);
  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

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
            <Ionicons name="arrow-back" size={24} color="#2A2545" />
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
              <View style={[s.aboutStatusPill, { backgroundColor: '#E3E1FF' }]}><Text style={[s.aboutStatusText, { color: '#4A3FC4' }]}>V1.0</Text></View>
            </View>
          </Animated.View>

          {/* Description Section */}
          <Animated.View style={[s.aboutInfoCard, { transform: [{ translateY: itemSlide[1] }] }]}>
            <Text style={s.aboutInfoHeadline}>ULTIMATE IPL AUCTION ARENA</Text>
            <Text style={s.aboutInfoBody}>
              Skelp! is the IPL-style player auction you play with your friends: everyone gets the same purse, players come under the hammer one by one, and the highest bid wins.
              {"\n\n"}
              It works fully offline. One phone hosts the arena and everyone on the same Wi-Fi or mobile hotspot joins it — no internet, no server, no sign-up on the cloud.
            </Text>
          </Animated.View>

          {/* Developer Section */}
          <Animated.View style={[s.aboutDevCard, { transform: [{ translateY: itemSlide[2] }] }]}>
            <Text style={s.aboutDevLabel}>CRAFTED BY</Text>

            <Text style={s.aboutDevNameHero} numberOfLines={1} adjustsFontSizeToFit={true}>PITTA SHANKUMAR</Text>

            <View style={s.aboutSocialRowSingle}>
              {[
                { n: "logo-github", c: "#3B3560", l: "https://github.com/shankumar7" },
                { n: "logo-linkedin", c: "#0077B5", l: "https://www.linkedin.com/in/shankumar7/" },
                { n: "mail", c: "#FF6B6B", l: "mailto:skelpsupport@gmail.com" },
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

          {/* Photo credits */}
          <Animated.View style={[s.aboutInfoCard, { marginTop: 20, marginBottom: 0, transform: [{ translateY: itemSlide[3] }] }]}>
            <Text style={s.aboutInfoHeadline}>PLAYER PHOTOS</Text>
            <Text style={[s.aboutInfoBody, { fontSize: 13, lineHeight: 20 }]}>
              Player photos come from Wikimedia Commons and are used under their free licences (Creative Commons / public domain). Skelp! is a fan-made game and is not affiliated with the IPL, the BCCI or any franchise.
            </Text>
            <Pressable onPress={() => setShowCredits(!showCredits)} style={{ marginTop: 14 }}>
              <Text style={[s.dashViewAll, { letterSpacing: 1 }]}>{showCredits ? "HIDE" : "SHOW"} {CREDITS.length} PHOTO CREDITS</Text>
            </Pressable>
            {showCredits && (CREDITS as { name: string; artist: string; license: string }[]).map((c) => (
              <Text key={c.name} style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#7A748F", marginTop: 8, lineHeight: 16 }}>
                <Text style={{ color: "#2A2545", fontFamily: "Inter_700Bold" }}>{c.name}</Text> — {c.artist} ({c.license})
              </Text>
            ))}
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function AvatarSelectionScreen({ insets, onSelect, name }: any) {
  const avatars = [
    { n: "shield-checkmark", c: "#5B5FEF", t: "GUARDIAN" },
    { n: "flash", c: "#10B981", t: "SPEED" },
    { n: "trophy", c: "#F5A623", t: "CHAMP" },
    { n: "rocket", c: "#FFB238", t: "MOONER" },
    { n: "skull", c: "#5A5478", t: "FINISH" },
    { n: "heart", c: "#FF6B6B", t: "FAVE" },
    { n: "planet", c: "#EC4899", t: "PLANET" },
    { n: "construct", c: "#0EA5E9", t: "ARCHI" },
    { n: "thunderstorm", c: "#6366F1", t: "STORM" },
    { n: "eye", c: "#3B3560", t: "ANALYST" }
  ];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;
  useEffect(() => { Animated.parallel([Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }), Animated.spring(slide, { toValue: 0, tension: 20, friction: 6, useNativeDriver: true })]).start(); }, []);
  return (
    <View style={s.screen}>
      <FormBackground />
      <Animated.View style={[s.flex1, { opacity: fade, transform: [{ translateY: slide }], paddingTop: insets.top + (SCREEN_H * 0.08), paddingHorizontal: 24 }]}>
        <View style={s.avatarHeader}><Text style={s.avatarTitle}>PLAYER SELECT</Text><Text style={s.avatarSub} numberOfLines={1} adjustsFontSizeToFit>{name.toUpperCase()}, ASSIGN YOUR ARENA IDENTITY</Text></View>
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
    Animated.timing(progress, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
    progress.addListener(({ value }) => setPercent(Math.floor(value * 100)));
    Animated.loop(Animated.sequence([Animated.timing(statusPulse, { toValue: 0.5, duration: 700, useNativeDriver: true }), Animated.timing(statusPulse, { toValue: 1, duration: 700, useNativeDriver: true })])).start();
    const timer = setTimeout(() => onFinish(), 2200);
    return () => { progress.removeAllListeners(); clearTimeout(timer); };
  }, []);
  return (
    <Animated.View style={[s.screen, s.center, { opacity: fade }]}>
      <FormBackground />
      <View style={s.authGreetingBox}><Text style={s.authGreetingTitle}>HELLO,</Text><Text style={s.authGreetingName}>{name || "PLAYER"}</Text></View>
      <View style={s.clayProgressContainer}><View style={s.clayProgressPocket}><Animated.View style={[s.clayProgressBar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} /></View><Text style={s.clayPercentText}>{percent}%</Text></View>
      <Animated.View style={[s.authStatusWrapper, { opacity: statusPulse }]}><Text style={[s.authStatusTextUnified, { color: "#A39DB5" }]}>GET READY TO OUTBID!</Text></Animated.View>
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
  const [stored, setStored] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, setPending] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ auctions: 0, wins: 0, spent: 0, history: [] });
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [bootDone, setBootDone] = useState(false);
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
  const [aboutFromCorner, setAboutFromCorner] = useState(false);
  const [showPool, setShowPool] = useState(false);

  // the saved profile and stats live on this phone only
  useEffect(() => { load().then((d) => { setProfile(d.current); setStats(d.stats); setStored(true); }); }, []);

  if (!fontsLoaded || !stored || !bootDone) return <BootSplash insets={insets} ready={fontsLoaded && stored} onDone={() => setBootDone(true)} />;

  const handleAuth = async () => {
    setAuthError("");
    const name = displayName.trim();
    if (isLogin) {
      const res = await signIn(name, password);
      if (typeof res === "string") return setAuthError(res);
      setPending(res);
      setIsAuthenticating(true);
      return;
    }
    if (name.length < 2) return setAuthError("Pick a username with at least 2 characters.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setAuthError("That email address does not look right.");
    if (password.length < 4) return setAuthError("Use a password with at least 4 characters.");
    setIsGuest(false);
    setIsSelectingAvatar(true);
  };
  const onAvatar = async (icon: string, idx: number) => {
    const p = isGuest ? await signInGuest(displayName, icon, idx) : await signUp(displayName, email, password, icon, idx);
    setPending(p);
    setIsSelectingAvatar(false);
    setIsAuthenticating(true);
  };
  const onAuthDone = () => {
    setIsAuthenticating(false);
    setProfile(pending);
    setPending(null);
    setPassword(""); setEmail(""); setDisplayName(""); setAuthError("");
  };
  const logout = () => { signOut(); setProfile(null); setSession(null); setShowGreeting(true); };

  if (showAbout) return <AboutSkelp onBack={() => setShowAbout(false)} insets={insets} fromCorner={aboutFromCorner} />;
  if (isSelectingAvatar) return <AvatarSelectionScreen insets={insets} onSelect={onAvatar} name={displayName} />;
  if (isAuthenticating) return <AuthenticatingScreen onFinish={onAuthDone} name={pending?.name ?? displayName} />;

  if (profile) {
    if (session) return <ArenaFlow key={session.myId + session.isHost} session={session} insets={insets} onExit={() => setSession(null)} onFinished={(item) => { recordAuction(item).then(setStats); }} />;
    if (showPool) return <PlayerPool insets={insets} onBack={() => setShowPool(false)} />;
    return <Dashboard profile={profile} stats={stats} insets={insets} onLogout={logout} onEnter={setSession} onPool={() => setShowPool(true)} />;
  }
  if (showGreeting) return <WelcomeGreeting insets={insets} onLogin={() => { setIsLogin(true); setAuthError(""); setShowGreeting(false); }} onSignUp={() => { setIsLogin(false); setAuthError(""); setShowGreeting(false); }} onGuest={() => { setIsGuest(true); setDisplayName("Guest" + Math.floor(100 + Math.random() * 899)); setIsSelectingAvatar(true); }} onAbout={() => { setAboutFromCorner(false); setShowAbout(true); }} />;
  return <LoginScreen isLogin={isLogin} setIsLogin={(v: boolean) => { setIsLogin(v); setAuthError(""); }} handleAuth={handleAuth} authError={authError} insets={insets} password={password} setPassword={setPassword} displayName={displayName} setDisplayName={setDisplayName} email={email} setEmail={setEmail} onBack={() => setShowGreeting(true)} onAbout={() => { setAboutFromCorner(true); setShowAbout(true); }} />;
}

function LoginScreen({ isLogin, setIsLogin, handleAuth, authError, insets, password, setPassword, displayName, setDisplayName, email, setEmail, onBack, onAbout }: any) {
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
              <Text style={[s.expansiveTitle, !isLogin && s.expansiveTitleSmaller, { color: "#5B5FEF" }]}>{isLogin ? "SIGN IN" : "REGISTER"}</Text>
              <Text style={s.expansiveSub}>{isLogin ? "Welcome Back to the Arena!" : "Your profile is saved on this phone only"}</Text>
              <View style={s.clayForm}>
                {!isLogin && (
                  <View style={s.clayField}>
                    <Text style={s.clayLabel}>EMAIL ID</Text>
                    <View style={[s.premiumClayInput, focusedField === "email" && s.premiumClayInputOn]}>
                      <TextInput 
                        placeholder="Your email address" 
                        placeholderTextColor="#7A748F" 
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
                <View style={s.clayField}><Text style={s.clayLabel}>USERNAME</Text><View style={[s.premiumClayInput, focusedField === "name" && s.premiumClayInputOn]}><TextInput placeholder={isLogin ? "Your username" : "Create username"} placeholderTextColor="#7A748F" value={displayName} onChangeText={setDisplayName} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} style={s.clayInputInner} /></View></View>
                <View style={s.clayField}><Text style={s.clayLabel}>PASSWORD</Text><View style={[s.premiumClayInput, focusedField === "pw" && s.premiumClayInputOn]}><TextInput placeholder="Password" placeholderTextColor="#7A748F" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} onFocus={() => setFocusedField("pw")} onBlur={() => setFocusedField(null)} style={s.clayInputInner} /><Pressable onPress={() => setShowPassword(!showPassword)}><Text style={s.clayToggleText}>{showPassword ? "HIDE" : "SHOW"}</Text></Pressable></View></View>
                {!!authError && <Text style={{ fontFamily: "Inter_700Bold", fontSize: 12, color: "#FF6B6B", marginLeft: 2 }}>{authError}</Text>}
                <AnimatedPressable style={[s.premiumSubmitBtn, !canSubmit && s.btnOff]} onPress={handleAuth} disabled={!canSubmit}><Text style={s.premiumSubmitBtnText}>{isLogin ? "LOG IN" : "SIGN UP"}</Text></AnimatedPressable>
              </View>
              <View style={s.claySwitchBox}><Text style={s.claySwitchText}>{isLogin ? "New here? " : "Already member? "}<Text style={s.claySwitchLink} onPress={() => setIsLogin(!isLogin)}>{isLogin ? "Join Now" : "Sign In"}</Text></Text></View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
