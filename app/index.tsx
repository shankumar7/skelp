import { T, themed } from "@/components/skelp/theme";
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
  Appearance,
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
import { About, Affiliation } from "@/components/skelp/About";
import { History } from "@/components/skelp/History";
import { getTheme, setTheme, ThemeName } from "@/components/skelp/theme";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { Dashboard } from "@/components/skelp/Dashboard";
import { PlayerPool } from "@/components/skelp/PlayerPool";
import { Session } from "@/game/net/session";
import { setSoundOn } from "@/game/sound";
import { Archive, load, newId, Profile, recordAuction, saveArchive, saveTheme, setSignedIn, signInGuest, signOut, Stats, updateProfile } from "@/game/storage";
import * as cloud from "@/game/cloud";

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
      <Animated.View style={[s.splashStatusBox, { opacity: logoOp }]}><Text style={s.splashBrandName}>SKELP!</Text><Text style={s.splashTagline}>THE ULTIMATE ARENA</Text><View style={s.miniLoader}><ActivityIndicator size="small" color={T.primaryText} /></View><View style={{ marginTop: 22 }}><Affiliation /></View></Animated.View>
    </Animated.View>
  );
}

function AvatarSelectionScreen({ insets, onSelect, name, busy }: any) {
  const avatars = [
    { n: "shield-checkmark", c: T.primaryText, t: "GUARDIAN" },
    { n: "flash", c: "#10B981", t: "SPEED" },
    { n: "trophy", c: "#F5A623", t: "CHAMP" },
    { n: "rocket", c: "#FFB238", t: "MOONER" },
    { n: "skull", c: T.sub, t: "FINISH" },
    { n: "heart", c: "#FF6B6B", t: "FAVE" },
    { n: "planet", c: "#EC4899", t: "PLANET" },
    { n: "construct", c: "#0EA5E9", t: "ARCHI" },
    { n: "thunderstorm", c: "#6366F1", t: "STORM" },
    { n: "eye", c: T.ink2, t: "ANALYST" }
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
              <View style={[s.avatarIconCircle, { backgroundColor: T.card, borderColor: isSel ? av.c : av.c + "40", borderWidth: isSel ? 2 : 1 }]}><Ionicons name={av.n as any} size={28} color={av.c} /></View>
              <Text style={[s.avatarMiniTag, { color: av.c }, isSel && { fontFamily: 'Inter_800ExtraBold' }]}>{isSel ? "READY" : av.t}</Text>
            </Pressable>
          );
        })}</View>
        <View style={s.avatarFooter}>
          {selectedIdx !== null && (
            <AnimatedPressable style={[s.premiumSubmitBtn, busy && s.btnOff]} disabled={busy} onPress={() => onSelect(avatars[selectedIdx].n, selectedIdx)}>
              <Text style={s.premiumSubmitBtnText}>{busy ? "CREATING ACCOUNT…" : "ENTER ARENA"}</Text>
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
      <Animated.View style={[s.authStatusWrapper, { opacity: statusPulse }]}><Text style={[s.authStatusTextUnified, { color: T.dim }]}>GET READY TO OUTBID!</Text></Animated.View>
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
        <Animated.View style={[s.welcomeTitleWrapper, { opacity: titleOp, transform: [{ translateY: titleSlide }] }]}><Text style={s.welcomeTitle}>SKELP!</Text><Text style={s.welcomeWelcome}>WELCOME TO THE ARENA</Text><View style={{ marginTop: 18 }}><Affiliation /></View></Animated.View>
      </View>
      <Animated.View style={[s.welcomeActions, { opacity: btnOp }]}><Animated.View style={{ transform: [{ translateY: btnY[0] }] }}><AnimatedPressable style={s.premiumClayBtn} onPress={onLogin}><View style={s.clayBtnContent}><Text style={s.clayBtnTitle}>DO YOU KNOW US?</Text></View></AnimatedPressable></Animated.View><Animated.View style={{ transform: [{ translateY: btnY[1] }] }}><AnimatedPressable style={s.premiumClayBtnSec} onPress={onSignUp}><View style={s.clayBtnContent}><Text style={s.clayBtnSecondaryTitle} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>WANT TO GET ACQUAINTED?</Text></View></AnimatedPressable></Animated.View><Animated.View style={{ transform: [{ translateY: btnY[2] }] }}><AnimatedPressable style={s.clayBtnGuest} onPress={onGuest}><Text style={s.clayBtnGuestText}>OR CONTINUE AS A GUEST</Text></AnimatedPressable></Animated.View></Animated.View>
    </View>
  );
}

// the splash plays once per launch, not again when the theme is switched
let booted = false;

/** Loads the saved theme, then shows the app; switching theme remounts every screen with the new palette. */
export default function HomeScreen() {
  const [theme, setThemeState] = useState<ThemeName | null>(null);
  useEffect(() => {
    load().then((d) => {
      const fromUrl = Platform.OS === "web" && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("theme") : null;
      const next: ThemeName = fromUrl === "dark" || fromUrl === "light" ? fromUrl : d.theme ?? (Appearance.getColorScheme() === "dark" ? "dark" : "light");
      setTheme(next);
      setThemeState(next);
    });
  }, []);
  useEffect(() => { if (theme) SystemUI.setBackgroundColorAsync(T.bg).catch(() => {}); }, [theme]);
  if (!theme) return <View style={{ flex: 1, backgroundColor: "#FAF7F2" }} />;
  const toggle = () => {
    const next: ThemeName = getTheme() === "dark" ? "light" : "dark";
    setTheme(next);
    saveTheme(next);
    setThemeState(next);
  };
  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Home key={theme} onTheme={toggle} />
    </>
  );
}

function Home({ onTheme }: { onTheme: () => void }) {
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
  const [authNotice, setAuthNotice] = useState("");
  const [busy, setBusy] = useState(false);
  /** a Google account signing in for the first time picks an avatar before entering */
  const [googleSignup, setGoogleSignup] = useState<{ uid: string; email: string } | null>(null);
  const [bootDone, setBootDone] = useState(booted);
  const [archive, setArchive] = useState<Archive[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
  const [showPool, setShowPool] = useState(false);

  // the app runs from the copy on this phone; signed-in players also sync to Firebase
  useEffect(() => { load().then((d) => { setSoundOn(d.sound !== false); setProfile(d.current); setStats(d.stats); setArchive(d.archive); setStored(true); }); }, []);

  if (!fontsLoaded || !stored || !bootDone) return <BootSplash insets={insets} ready={fontsLoaded && stored} onDone={() => { booted = true; setBootDone(true); }} />;

  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const handleAuth = async () => {
    setAuthError(""); setAuthNotice("");
    if (!EMAIL_RE.test(email.trim())) return setAuthError("That email address does not look right.");
    if (isLogin) {
      setBusy(true);
      const res = await cloud.signIn(email, password);
      setBusy(false);
      if (!res.ok) return setAuthError(res.error);
      const v = res.value;
      const p: Profile = {
        id: newId(), uid: v.uid, email: v.email, verified: v.verified, guest: false, provider: "password",
        name: (v.name || v.email.split("@")[0]).slice(0, 16),
        avatar: v.saved?.avatar ?? "shield-checkmark", avatarIdx: v.saved?.avatarIdx ?? 0,
      };
      setStats(await setSignedIn(p, v.saved ? { ...v.saved.stats, history: v.saved.history } : null));
      setPending(p);
      setIsAuthenticating(true);
      return;
    }
    const name = displayName.trim();
    if (name.length < 2) return setAuthError("Pick a username with at least 2 characters.");
    if (password.length < 6) return setAuthError("Use a password with at least 6 characters.");
    setIsGuest(false);
    setIsSelectingAvatar(true);
  };
  const signInGoogle = async () => {
    setAuthError(""); setAuthNotice("");
    setBusy(true);
    const res = await cloud.signInWithGoogle();
    setBusy(false);
    if (!res.ok) return setAuthError(res.error);
    const v = res.value;
    if (!v) return;                                          // closed the account picker
    if (!v.saved) {                                          // first time: choose an avatar
      setDisplayName((v.name || v.email.split("@")[0]).trim().slice(0, 16));
      setGoogleSignup({ uid: v.uid, email: v.email });
      setIsGuest(false);
      setIsSelectingAvatar(true);
      return;
    }
    const p: Profile = { id: newId(), uid: v.uid, email: v.email, verified: true, guest: false, provider: "google", name: v.saved.name.slice(0, 16), avatar: v.saved.avatar, avatarIdx: v.saved.avatarIdx };
    setStats(await setSignedIn(p, { ...v.saved.stats, history: v.saved.history }));
    setPending(p);
    setIsAuthenticating(true);
  };
  const forgotPassword = async () => {
    setAuthError(""); setAuthNotice("");
    if (!EMAIL_RE.test(email.trim())) return setAuthError("Type your email address above, then tap Forgot password.");
    setBusy(true);
    const res = await cloud.resetPassword(email);
    setBusy(false);
    if (!res.ok) return setAuthError(res.error);
    setAuthNotice(`We sent a password reset link to ${email.trim()}. Check your inbox and spam folder.`);
  };
  const onAvatar = async (icon: string, idx: number) => {
    if (googleSignup) {
      const p: Profile = { id: newId(), uid: googleSignup.uid, email: googleSignup.email, verified: true, guest: false, provider: "google", name: displayName.trim() || "PLAYER", avatar: icon, avatarIdx: idx };
      setStats(await setSignedIn(p, null));                   // also creates the cloud profile
      setGoogleSignup(null);
      setPending(p);
      setIsSelectingAvatar(false);
      setIsAuthenticating(true);
      return;
    }
    if (isGuest) {
      setPending(await signInGuest(displayName, icon, idx));
      setIsSelectingAvatar(false);
      setIsAuthenticating(true);
      return;
    }
    setBusy(true);
    const res = await cloud.signUp(email, password, displayName.trim(), icon, idx);
    setBusy(false);
    if (!res.ok) { setAuthError(res.error); setIsSelectingAvatar(false); return; }
    const p: Profile = { id: newId(), uid: res.value.uid, email: res.value.email, verified: res.value.verified, guest: false, provider: "password", name: displayName.trim(), avatar: icon, avatarIdx: idx };
    setStats(await setSignedIn(p, null));
    setPending(p);
    setIsSelectingAvatar(false);
    setIsAuthenticating(true);
  };
  const onAuthDone = () => {
    setIsAuthenticating(false);
    setProfile(pending);
    setPending(null);
    setPassword(""); setEmail(""); setDisplayName(""); setAuthError(""); setAuthNotice("");
  };
  const logout = async () => {
    const signedIn = !!profile?.uid;
    if (signedIn) cloud.logOut();
    await signOut(signedIn);
    if (signedIn) setStats({ auctions: 0, wins: 0, spent: 0, history: [] });
    setProfile(null); setSession(null); setShowGreeting(true);
  };
  const startSignUp = async () => { await logout(); setIsLogin(false); setShowGreeting(false); };
  const onProfile = async (changes: Partial<Profile>) => { const p = await updateProfile(changes); if (p) setProfile(p); };

  if (showAbout) return <About onBack={() => setShowAbout(false)} insets={insets} />;
  if (isSelectingAvatar) return <AvatarSelectionScreen insets={insets} onSelect={onAvatar} name={displayName} busy={busy} />;
  if (isAuthenticating) return <AuthenticatingScreen onFinish={onAuthDone} name={pending?.name ?? displayName} />;

  if (profile) {
    if (session) return <ArenaFlow key={session.myId + session.isHost} session={session} insets={insets} onExit={() => setSession(null)} onFinished={(item, full) => { if (item) recordAuction(item).then(setStats); saveArchive(full).then(setArchive); }} />;
    if (showHistory) return <History archive={archive} insets={insets} onBack={() => setShowHistory(false)} onChange={setArchive} />;
    if (showPool) return <PlayerPool insets={insets} onBack={() => setShowPool(false)} />;
    return <Dashboard profile={profile} stats={stats} insets={insets} onLogout={logout} onEnter={setSession} onPool={() => setShowPool(true)} onProfile={onProfile} onCreateAccount={startSignUp} onAbout={() => setShowAbout(true)} onHistory={() => setShowHistory(true)} onTheme={onTheme} />;
  }
  if (showGreeting) return <WelcomeGreeting insets={insets} onLogin={() => { setIsLogin(true); setAuthError(""); setAuthNotice(""); setShowGreeting(false); }} onSignUp={() => { setIsLogin(false); setAuthError(""); setAuthNotice(""); setShowGreeting(false); }} onGuest={() => { setIsGuest(true); setDisplayName("Guest" + Math.floor(100 + Math.random() * 899)); setIsSelectingAvatar(true); }} onAbout={() => { setShowAbout(true); }} />;
  return <LoginScreen isLogin={isLogin} setIsLogin={(v: boolean) => { setIsLogin(v); setAuthError(""); setAuthNotice(""); }} handleAuth={handleAuth} authError={authError} authNotice={authNotice} busy={busy} onForgot={forgotPassword} onGoogle={signInGoogle} insets={insets} password={password} setPassword={setPassword} displayName={displayName} setDisplayName={setDisplayName} email={email} setEmail={setEmail} onBack={() => setShowGreeting(true)} onAbout={() => { setShowAbout(true); }} />;
}

function Field({ label, value, onChange, placeholder, focused, onFocus, onBlur, secure, right, ...rest }: any) {
  return (
    <View style={s.clayField}>
      <Text style={s.clayLabel}>{label}</Text>
      <View style={[s.premiumClayInput, focused && s.premiumClayInputOn]}>
        <TextInput placeholder={placeholder} placeholderTextColor={T.muted} value={value} onChangeText={onChange} onFocus={onFocus} onBlur={onBlur} secureTextEntry={secure} style={s.clayInputInner} {...rest} />
        {right}
      </View>
    </View>
  );
}

function LoginScreen({ isLogin, setIsLogin, handleAuth, authError, authNotice, busy, onForgot, onGoogle, insets, password, setPassword, displayName, setDisplayName, email, setEmail, onBack, onAbout }: any) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => { fade.setValue(0); slide.setValue(20); Animated.parallel([Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }), Animated.spring(slide, { toValue: 0, tension: 25, friction: 6, useNativeDriver: true })]).start(); }, [isLogin]);
  const canSubmit = !busy && (isLogin ? email.trim() && password : email.trim() && password && displayName.trim());
  const focus = (f: string) => () => setFocusedField(f);
  const blur = () => setFocusedField(null);
  return (
    <View style={s.screen}>
      <FormBackground />
      <KeyboardAvoidingView style={s.flex1} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + (isLogin ? 20 : 10), paddingBottom: insets.bottom + 60, paddingHorizontal: 24, flexGrow: 1, justifyContent: "flex-start" }} bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
            <View style={s.fullWidthTop}><Pressable style={s.clayBack} onPress={onBack} hitSlop={20}><Text style={s.clayBackText}>←</Text></Pressable><Pressable onPress={onAbout} style={s.clayLogoMini}><Image source={require("../assets/images/circlelogo.png")} style={s.logoImg} resizeMode="contain" /></Pressable></View>
            <View style={s.fullWidthContent}>
              <Text style={[s.expansiveTitle, !isLogin && s.expansiveTitleSmaller, { color: T.primaryText }]}>{isLogin ? "SIGN IN" : "REGISTER"}</Text>
              <Text style={s.expansiveSub}>{isLogin ? "Welcome back to the arena!" : "Your stats are backed up to your account"}</Text>
              <View style={s.clayForm}>
                {!isLogin && <Field label="USERNAME" placeholder="Name other players will see" value={displayName} onChange={setDisplayName} focused={focusedField === "name"} onFocus={focus("name")} onBlur={blur} maxLength={16} autoCapitalize="words" />}
                <Field label="EMAIL" placeholder="you@example.com" value={email} onChange={setEmail} focused={focusedField === "email"} onFocus={focus("email")} onBlur={blur} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
                <Field label="PASSWORD" placeholder={isLogin ? "Your password" : "At least 6 characters"} value={password} onChange={setPassword} focused={focusedField === "pw"} onFocus={focus("pw")} onBlur={blur} secure={!showPassword} autoCapitalize="none" autoComplete={isLogin ? "current-password" : "new-password"}
                  right={<Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}><Text style={s.clayToggleText}>{showPassword ? "HIDE" : "SHOW"}</Text></Pressable>} />
                {isLogin && (
                  <Pressable onPress={onForgot} disabled={busy} hitSlop={8} style={{ alignSelf: "flex-end", marginTop: -4 }}>
                    <Text style={[s.claySwitchLink, { fontSize: 12 }]}>Forgot password?</Text>
                  </Pressable>
                )}
                {!!authError && <Text style={{ fontFamily: "Inter_700Bold", fontSize: 12, color: T.coralText, marginLeft: 2, lineHeight: 18 }}>{authError}</Text>}
                {!!authNotice && <Text style={{ fontFamily: "Inter_700Bold", fontSize: 12, color: T.mintText, marginLeft: 2, lineHeight: 18 }}>{authNotice}</Text>}
                <AnimatedPressable style={[s.premiumSubmitBtn, !canSubmit && s.btnOff]} onPress={handleAuth} disabled={!canSubmit}>
                  <Text style={s.premiumSubmitBtnText}>{busy ? "PLEASE WAIT…" : isLogin ? "LOG IN" : "CHOOSE AVATAR"}</Text>
                </AnimatedPressable>
                <View style={s.clayDivider}><View style={s.clayLine} /><Text style={s.clayOr}>or</Text><View style={s.clayLine} /></View>
                <AnimatedPressable style={[s.premiumGoogleBtn, busy && s.btnOff]} onPress={onGoogle} disabled={busy}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginRight: 12 }} />
                  <Text style={s.clayGoogleText}>CONTINUE WITH GOOGLE</Text>
                </AnimatedPressable>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: T.dim, textAlign: "center", lineHeight: 16 }}>
                  {isLogin ? "Signing in needs internet once. Auctions themselves never do." : "We'll email you a link to confirm your address."}
                </Text>
              </View>
              <View style={s.claySwitchBox}><Text style={s.claySwitchText}>{isLogin ? "New here? " : "Already a member? "}<Text style={s.claySwitchLink} onPress={() => setIsLogin(!isLogin)}>{isLogin ? "Create an account" : "Sign in"}</Text></Text></View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
