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

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

// --- ENHANCED BACKGROUND COMPONENT ---
function EnhancedBackground() {
  const blob1Pos = useRef(new Animated.ValueXY({ x: -50, y: -100 })).current;
  const blob2Pos = useRef(new Animated.ValueXY({ x: SCREEN_W - 200, y: SCREEN_H - 200 })).current;
  const blob3Pos = useRef(new Animated.ValueXY({ x: SCREEN_W / 2, y: SCREEN_H / 2 })).current;

  useEffect(() => {
    const moveBlob = (val: Animated.ValueXY, xRange: [number, number], yRange: [number, number], duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: { x: xRange[1], y: yRange[1] }, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(val, { toValue: { x: xRange[0], y: yRange[0] }, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    };
    moveBlob(blob1Pos, [-80, 20], [-120, -50], 15000);
    moveBlob(blob2Pos, [SCREEN_W - 250, SCREEN_W - 100], [SCREEN_H - 250, SCREEN_H - 100], 18000);
    moveBlob(blob3Pos, [SCREEN_W * 0.1, SCREEN_W * 0.4], [SCREEN_H * 0.3, SCREEN_H * 0.6], 25000);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[s.bgBlob, s.bgBlob1, { transform: blob1Pos.getTranslateTransform() }]} />
      <Animated.View style={[s.bgBlob, s.bgBlob2, { transform: blob2Pos.getTranslateTransform() }]} />
      <Animated.View style={[s.bgBlob, s.bgBlob3, { transform: blob3Pos.getTranslateTransform() }]} />
      <View style={s.gridOverlay}>
        {[...Array(8)].map((_, i) => <View key={`v-${i}`} style={[s.gridLineV, { left: (SCREEN_W / 8) * i }]} />)}
        {[...Array(12)].map((_, i) => <View key={`h-${i}`} style={[s.gridLineH, { top: (SCREEN_H / 12) * i }]} />)}
      </View>
    </View>
  );
}

// --- REUSABLE ANIMATED PRESSABLE ---
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
    Animated.parallel([
      Animated.timing(logoOp, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 40, friction: 5, useNativeDriver: true }),
      Animated.timing(impactRing, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(logoFloat, { toValue: -12, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(logoFloat, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    const runOrbit = (v: Animated.Value, duration: number) => Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })).start();
    runOrbit(orbit1, 3500); runOrbit(orbit2, 5000);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      Animated.timing(fadeOut, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => { onDone(); setBootVisible(false); });
    }, 2800);
    return () => clearTimeout(t);
  }, [ready]);

  if (!bootVisible) return null;
  return (
    <Animated.View style={[s.screen, s.center, { opacity: fadeOut, position: "absolute", width: "100%", height: "100%", zIndex: 999 }]}>
      <EnhancedBackground />
      <View style={s.auraContainer}>
        <Animated.View style={[s.impactRing, { opacity: impactRing.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: impactRing.interpolate({ inputRange: [0, 1], outputRange: [0.5, 4] }) }] }]} />
        <Animated.View style={[s.auraRing, { transform: [{ rotateZ: orbit1.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }, { scaleX: 1.1 }, { scaleY: 0.4 }] }]} />
        <Animated.View style={[s.auraRing, { borderColor: "rgba(37, 99, 235, 0.4)", transform: [{ rotateZ: orbit2.interpolate({ inputRange: [0, 1], outputRange: ["360deg", "0deg"] }) }, { scaleX: 0.5 }, { scaleY: 1.1 }] }]} />
        <Animated.View style={[s.claySplashLogo, { transform: [{ scale: logoScale }, { translateY: logoFloat }] }]}>
          <Image source={require("../assets/images/circlelogo.png")} style={s.splashHeroLogo} resizeMode="contain" />
        </Animated.View>
      </View>
      <Animated.View style={[s.splashStatusBox, { opacity: logoOp }]}>
        <Text style={s.splashBrandName}>SKELP!</Text>
        <Text style={s.splashTagline}>THE ULTIMATE ARENA</Text>
        <View style={s.miniLoader}><ActivityIndicator size="small" color="#2563EB" /></View>
      </Animated.View>
    </Animated.View>
  );
}

function AuthenticatingScreen({ onFinish, name }: { onFinish: () => void; name: string }) {
  const fade = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [percent, setPercent] = useState(0);
  const statusPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    
    // Progress Animation
    Animated.timing(progress, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();

    // Listen to percentage
    progress.addListener(({ value }) => {
      setPercent(Math.floor(value * 100));
    });

    // Pulse Status
    Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(statusPulse, { toValue: 1, duration: 700, useNativeDriver: true })
      ])
    ).start();

    const timer = setTimeout(() => { onFinish(); }, 4000);
    return () => { progress.removeAllListeners(); clearTimeout(timer); };
  }, []);

  return (
    <Animated.View style={[s.screen, s.center, { opacity: fade }]}>
      <EnhancedBackground />
      <View style={s.authGreetingBox}>
        <Text style={s.authGreetingTitle}>HELLO,</Text>
        <Text style={s.authGreetingName}>{name || "PLAYER"}</Text>
      </View>

      <View style={s.clayProgressContainer}>
        <View style={s.clayProgressPocket}>
          <Animated.View 
            style={[
              s.clayProgressBar, 
              { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }
            ]} 
          />
        </View>
        <Text style={s.clayPercentText}>{percent}%</Text>
      </View>

      <Animated.View style={[s.authStatusWrapper, { opacity: statusPulse }]}>
        <Text style={s.authStatusTextUnified}>GET READY TO OUTBID!</Text>
      </Animated.View>
    </Animated.View>
  );
}

function WelcomeGreeting({ onLogin, onSignUp, onGuest, insets }: any) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const glint = useRef(new Animated.Value(0)).current;
  const titleOp = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const btnOp = useRef(new Animated.Value(0)).current;
  const btnY = [useRef(new Animated.Value(40)).current, useRef(new Animated.Value(40)).current, useRef(new Animated.Value(40)).current];

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, damping: 12, useNativeDriver: true }),
        Animated.timing(titleOp, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(titleSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1)), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnOp, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.stagger(150, btnY.map(v => Animated.timing(v, { toValue: 0, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true })))
      ])
    ]).start();
    Animated.loop(Animated.sequence([Animated.timing(glint, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.delay(1000), Animated.timing(glint, { toValue: 0, duration: 0, useNativeDriver: true })])).start();
    Animated.loop(Animated.sequence([Animated.timing(logoPulse, { toValue: 1.04, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.timing(logoPulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true })])).start();
  }, []);

  return (
    <View style={[s.screen, { paddingTop: Math.max(insets.top, 50), paddingBottom: Math.max(insets.bottom, 40) }]}>
      <EnhancedBackground />
      <View style={s.welcomeMain}>
        <Animated.View style={[s.clayLogoBox, { transform: [{ scale: logoScale }, { scale: logoPulse }] }]}>
          <Image source={require("../assets/images/circlelogo.png")} style={s.welcomeLogo} resizeMode="contain" />
          <Animated.View style={[s.glintBar, { transform: [{ translateX: glint.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] }) }] }]} />
        </Animated.View>
        <Animated.View style={[s.welcomeTitleWrapper, { opacity: titleOp, transform: [{ translateY: titleSlide }] }]}>
          <Text style={s.welcomeTitle}>SKELP!</Text>
          <Text style={s.welcomeWelcome}>WELCOME TO THE ARENA</Text>
        </Animated.View>
      </View>
      <Animated.View style={[s.welcomeActions, { opacity: btnOp }]}>
        <Animated.View style={{ transform: [{ translateY: btnY[0] }] }}>
          <AnimatedPressable style={s.premiumClayBtn} onPress={onLogin}><View style={s.clayBtnContent}><Text style={s.clayBtnTitle}>DO YOU KNOW US?</Text></View></AnimatedPressable>
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: btnY[1] }] }}>
          <AnimatedPressable style={s.premiumClayBtnSec} onPress={onSignUp}>
            <View style={s.clayBtnContent}>
              <Text style={s.clayBtnSecondaryTitle} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>WANT TO GET ACQUAINTED?</Text>
            </View>
          </AnimatedPressable>
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: btnY[2] }] }}>
          <AnimatedPressable style={s.clayBtnGuest} onPress={onGuest}><Text style={s.clayBtnGuestText}>OR CONTINUE AS A GUEST</Text></AnimatedPressable>
        </Animated.View>
      </Animated.View>
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bootDone, setBootDone] = useState(false);
  const [currentBid, setCurrentBid] = useState(2400);
  const [timer, setTimer] = useState(38);
  const contentOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (fontsLoaded && bootDone && connected) Animated.timing(contentOp, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fontsLoaded, bootDone, connected]);

  if (!fontsLoaded || !bootDone) return <BootSplash insets={insets} ready={fontsLoaded} onDone={() => setBootDone(true)} />;
  const handleAuth = () => setIsAuthenticating(true);
  const onAuthDone = () => { setIsAuthenticating(false); setConnected(true); };
  const disconnect = () => { setConnected(false); setShowGreeting(true); };

  if (isAuthenticating) return <AuthenticatingScreen onFinish={onAuthDone} name={displayName} />;
  if (connected) {
    return (
      <View style={[s.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <EnhancedBackground />
        <Animated.View style={[s.flex1, { opacity: contentOp }]}>
          <View style={s.roomHeader}><Pressable onPress={disconnect} style={s.backBtn}><Text style={s.backText}>LEAVE</Text></Pressable><View style={s.roomInfo}><Text style={s.roomTitle}>ARENA #402</Text><View style={s.liveBadge}><View style={s.dot} /><Text style={s.liveText}>LIVE</Text></View></View><View style={[s.clayMiniUser]}><Text style={s.userInitial}>{displayName?.[0] || "U"}</Text></View></View>
          <View style={s.mainArena}><View style={s.itemCard}><View style={s.itemLabel}><Text style={s.itemLabelText}>CURRENT ITEM</Text></View><Text style={s.itemName}>STEVE SMITH</Text><Text style={s.itemMeta}>BATSMAN • AUSTRALIA</Text><View style={s.timerContainer}><Text style={s.timerLabel}>ENDING IN</Text><Text style={s.timerValue}>{timer}s</Text></View></View><View style={s.bidDisplay}><Text style={s.bidTitle}>CURRENT BID</Text><Text style={s.bidVal}>₹{currentBid.toLocaleString()}</Text></View><Pressable onPress={() => setCurrentBid(prev => prev + 100)} style={s.clayBidBtn}><Text style={s.clayBidBtnText}>PLACE BID +₹100</Text></Pressable></View>
        </Animated.View>
      </View>
    );
  }

  if (showGreeting) return <WelcomeGreeting insets={insets} onLogin={() => { setIsLogin(true); setShowGreeting(false); }} onSignUp={() => { setIsLogin(false); setShowGreeting(false); }} onGuest={() => { handleAuth(); setDisplayName("Guest"); setShowGreeting(false); }} />;
  return <LoginScreen isLogin={isLogin} setIsLogin={setIsLogin} handleAuth={handleAuth} insets={insets} email={email} setEmail={setEmail} password={password} setPassword={setPassword} displayName={displayName} setDisplayName={setDisplayName} onBack={() => setShowGreeting(true)} />;
}

function LoginScreen({ isLogin, setIsLogin, handleAuth, insets, email, setEmail, password, setPassword, displayName, setDisplayName, onBack }: any) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fade.setValue(0); slide.setValue(20);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 25, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [isLogin]);

  const canSubmit = isLogin ? email.trim() && password.trim() : email.trim() && password.trim() && displayName.trim();

  return (
    <View style={s.screen}>
      <EnhancedBackground />
      <KeyboardAvoidingView style={s.flex1} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + (isLogin ? 20 : 10), paddingBottom: insets.bottom + 60, paddingHorizontal: 24, flexGrow: 1, justifyContent: "flex-start" }} bounces={false} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
            <View style={s.fullWidthTop}>
              <Pressable style={s.clayBack} onPress={onBack} hitSlop={20}><Text style={s.clayBackText}>←</Text></Pressable>
              <View style={s.clayLogoMini}><Image source={require("../assets/images/circlelogo.png")} style={s.logoImg} resizeMode="contain" /></View>
            </View>
            <View style={s.fullWidthContent}>
              <Text style={[s.expansiveTitle, !isLogin && s.expansiveTitleSmaller]}>{isLogin ? "SIGN IN" : "REGISTER"}</Text>
              <Text style={s.expansiveSub}>{isLogin ? "Welcome Back to the Arena!" : "Join the world's most elite arena"}</Text>
              <View style={s.clayForm}>
                {!isLogin && (
                  <View style={s.clayField}>
                    <Text style={s.clayLabel}>DISPLAY NAME</Text>
                    <View style={[s.premiumClayInput, focusedField === "name" && s.premiumClayInputOn]}>
                      <TextInput placeholder="Your display name" placeholderTextColor="#64748B" value={displayName} onChangeText={setDisplayName} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} style={s.clayInputInner} />
                    </View>
                  </View>
                )}
                <View style={s.clayField}>
                  <Text style={s.clayLabel}>EMAIL ADDRESS</Text>
                  <View style={[s.premiumClayInput, focusedField === "email" && s.premiumClayInputOn]}>
                    <TextInput placeholder="Email address" placeholderTextColor="#64748B" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} style={s.clayInputInner} />
                  </View>
                </View>
                <View style={s.clayField}>
                  <Text style={s.clayLabel}>PASSWORD</Text>
                  <View style={[s.premiumClayInput, focusedField === "pw" && s.premiumClayInputOn]}>
                    <TextInput placeholder="Password" placeholderTextColor="#64748B" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} onFocus={() => setFocusedField("pw")} onBlur={() => setFocusedField(null)} style={s.clayInputInner} />
                    <Pressable onPress={() => setShowPassword(!showPassword)}><Text style={s.clayToggleText}>{showPassword ? "HIDE" : "SHOW"}</Text></Pressable>
                  </View>
                </View>
                <AnimatedPressable style={[s.premiumSubmitBtn, !canSubmit && s.btnOff]} onPress={handleAuth} disabled={!canSubmit}>
                  <Text style={s.premiumSubmitBtnText}>{isLogin ? "LOG IN" : "SIGN UP"}</Text>
                </AnimatedPressable>
                <View style={s.clayDivider}><View style={s.clayLine} /><Text style={s.clayOr}>Or continue with</Text><View style={s.clayLine} /></View>
                <AnimatedPressable style={s.premiumGoogleBtn} onPress={handleAuth}>
                  <Image source={{ uri: "https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" }} style={s.googleRealLogo} />
                  <Text style={s.clayGoogleText}>SIGN IN WITH GOOGLE</Text>
                </AnimatedPressable>
              </View>
              <View style={s.claySwitchBox}>
                <Text style={s.claySwitchText}>{isLogin ? "New here? " : "Already member? "}<Text style={s.claySwitchLink} onPress={() => setIsLogin(!isLogin)}>{isLogin ? "Join Now" : "Sign In"}</Text></Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F9FC" },
  center: { justifyContent: "center", alignItems: "center" },
  flex1: { flex: 1 },
  bgBlob: { position: "absolute", borderRadius: 999 },
  bgBlob1: { width: 300, height: 300, backgroundColor: "rgba(37, 99, 235, 0.08)" },
  bgBlob2: { width: 400, height: 400, backgroundColor: "rgba(37, 99, 235, 0.1)" },
  bgBlob3: { width: 250, height: 250, backgroundColor: "rgba(99, 102, 241, 0.06)" },
  gridOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  gridLineV: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "#2563EB" },
  gridLineH: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "#2563EB" },
  
  // AUTH GREETING / PROGRESS BAR
  authGreetingBox: { alignItems: "center", marginBottom: 40 },
  authGreetingTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 14, color: "#94A3B8", letterSpacing: 4 },
  authGreetingName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 42, color: "#2563EB", textAlign: "center", marginTop: 4, textTransform: "uppercase" },
  
  clayProgressContainer: { width: "80%", alignItems: "center" },
  clayProgressPocket: { width: "100%", height: 32, backgroundColor: "#F1F5F9", borderRadius: 16, borderBottomWidth: 3, borderBottomColor: "#FFF", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  clayProgressBar: { height: "100%", backgroundColor: "#2563EB", borderRadius: 16, borderBottomWidth: 5, borderBottomColor: "rgba(30, 64, 175, 0.4)", borderTopWidth: 1.5, borderTopColor: "rgba(255,255,255,0.3)" },
  clayPercentText: { fontFamily: "Poppins_800ExtraBold", fontSize: 13, color: "#2563EB", marginTop: 12 },

  authStatusWrapper: { position: "absolute", bottom: 60 },
  authStatusTextUnified: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: "#94A3B8", letterSpacing: 3, textTransform: "uppercase" },

  fullWidthTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  clayBack: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 4, borderBottomWidth: 3, borderBottomColor: "#E2E8F0" },
  clayBackText: { fontSize: 22, color: "#1E293B", fontFamily: "Poppins_600SemiBold" },
  clayLogoMini: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF", padding: 8, shadowColor: "#2563EB", shadowOpacity: 0.1, shadowRadius: 15, elevation: 8, borderBottomWidth: 3, borderBottomColor: "#DBEAFE" },
  logoImg: { width: "100%", height: "100%" },
  fullWidthContent: { width: "100%" },
  expansiveTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 60, color: "#2563EB", letterSpacing: 1.5 },
  expansiveTitleSmaller: { fontSize: 48 },
  expansiveSub: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#94A3B8", marginTop: -6, marginBottom: 24, letterSpacing: 0.5 },
  clayForm: { gap: 14 }, clayField: { gap: 6 },
  clayLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#94A3B8", letterSpacing: 2, marginLeft: 2 },
  premiumClayInput: { backgroundColor: "#FFF", borderRadius: 22, paddingHorizontal: 22, paddingVertical: 2, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 12, elevation: 3, borderBottomWidth: 4, borderBottomColor: "#F1F5F9", borderTopWidth: 1, borderTopColor: "#F8FAFC" },
  premiumClayInputOn: { borderBottomColor: "#E0E7FF", backgroundColor: "#FAFBFF" },
  clayInputInner: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#1E293B", paddingVertical: 12 },
  clayToggleText: { fontFamily: "Poppins_800ExtraBold", fontSize: 10, color: "#2563EB", letterSpacing: 0.5 },
  premiumSubmitBtn: { backgroundColor: "#2563EB", paddingVertical: 18, borderRadius: 24, alignItems: "center", shadowColor: "#2563EB", shadowOpacity: 0.35, shadowRadius: 20, elevation: 12, borderBottomWidth: 6, borderBottomColor: "#1E40AF", borderTopWidth: 1.5, borderTopColor: "rgba(255,255,255,0.3)" },
  btnOff: { opacity: 0.4 }, premiumSubmitBtnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 22, color: "#FFF", letterSpacing: 2.5 },
  clayDivider: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  clayLine: { flex: 1, height: 1.5, backgroundColor: "#E2E8F0", borderRadius: 1 },
  clayOr: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#CBD5E1", marginHorizontal: 14, textTransform: "uppercase", letterSpacing: 1.5 },
  premiumGoogleBtn: { backgroundColor: "#FFF", borderRadius: 24, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 5, borderBottomWidth: 4, borderBottomColor: "#F1F5F9", borderTopWidth: 1, borderTopColor: "#FFF" },
  googleRealLogo: { width: 22, height: 22, marginRight: 14 },
  clayGoogleText: { fontFamily: "Poppins_700Bold", fontSize: 13, color: "#334155", letterSpacing: 0.5 },
  claySwitchBox: { marginTop: 24, paddingBottom: 10, alignItems: "center" },
  claySwitchText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#64748B" },
  claySwitchLink: { color: "#2563EB", fontFamily: "Inter_800ExtraBold", textDecorationLine: "underline" },

  premiumClayBtn: { backgroundColor: "#2563EB", borderRadius: 32, paddingVertical: 24, paddingHorizontal: 32, marginBottom: 16, shadowColor: "#2563EB", shadowOpacity: 0.4, shadowRadius: 20, elevation: 15, borderBottomWidth: 8, borderBottomColor: "rgba(30, 64, 175, 0.8)", borderTopWidth: 2, borderTopColor: "rgba(255,255,255,0.2)", alignItems: "center" },
  premiumClayBtnSec: { backgroundColor: "#FFF", borderRadius: 32, paddingVertical: 24, paddingHorizontal: 32, marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 15, elevation: 6, borderBottomWidth: 8, borderBottomColor: "#F1F5F9", borderTopWidth: 1, borderTopColor: "#FFF", alignItems: "center" },
  clayBtnContent: { width: "100%", alignItems: "center" },
  clayBtnTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 22, color: "#FFF", letterSpacing: 1.5 },
  clayBtnSecondaryTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 20, color: "#334155", letterSpacing: 1.2, width: "100%", textAlign: "center" },
  clayBtnGuest: { padding: 16, alignItems: "center" },
  clayBtnGuestText: { fontFamily: "Poppins_700Bold", fontSize: 13, color: "#94A3B8", textDecorationLine: "underline" },

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
  welcomeActions: { paddingHorizontal: 24, paddingBottom: 20, width: "100%" },
  
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
});
