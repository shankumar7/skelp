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
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { LuckiestGuy_400Regular } from "@expo-google-fonts/luckiest-guy";
import {
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
} from "@expo-google-fonts/inter";

const { height: SCREEN_H } = Dimensions.get("window");

function BootSplash({
  insets,
  ready,
  onDone,
}: {
  insets: any;
  ready: boolean;
  onDone: () => void;
}) {
  const containerScale = useRef(new Animated.Value(0.6)).current;
  const containerOp = useRef(new Animated.Value(0)).current;
  const spinCW = useRef(new Animated.Value(0)).current;
  const spinCCW = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(1)).current;
  const haloOp = useRef(new Animated.Value(0.3)).current;
  const shineX = useRef(new Animated.Value(-120)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const doneRef = useRef(false);

  useEffect(() => {
    // 1. Spring Entrance
    Animated.parallel([
      Animated.spring(containerScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(containerOp, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Loop: Clockwise Ring
    Animated.loop(
      Animated.timing(spinCW, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 3. Loop: Counter-Clockwise Ring (slower)
    Animated.loop(
      Animated.timing(spinCCW, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 4. Glow Halo Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(haloScale, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(haloScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. Shimmer Sweep (Regular intervals)
    Animated.loop(
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(shineX, {
          toValue: 120,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shineX, { toValue: -120, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!ready || doneRef.current) return;
    const t = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        doneRef.current = true;
        onDone();
      });
    }, 2800);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <Animated.View style={[s.screen, s.center, { opacity: fadeOut }]}>
      <Animated.View
        style={[
          s.bootWrap,
          {
            opacity: containerOp,
            transform: [{ scale: containerScale }],
          },
        ]}
      >
        <View style={s.premiumFrame}>
          {/* Sonar / Halo Ring */}
          <Animated.View
            style={[
              s.haloRing,
              {
                opacity: haloOp,
                transform: [{ scale: haloScale }],
              },
            ]}
          />

          {/* Counter-Clockwise Ring (Thin Outer) */}
          <Animated.View
            style={[
              s.orbitRing,
              s.ringOuter,
              {
                transform: [
                  {
                    rotate: spinCCW.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["360deg", "0deg"],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Clockwise Ring (Inner) */}
          <Animated.View
            style={[
              s.orbitRing,
              s.ringInner,
              {
                transform: [
                  {
                    rotate: spinCW.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={s.accentDot} />
          </Animated.View>

          {/* Main Logo Disc */}
          <View style={s.logoDisc}>
            <Image
              source={require("../assets/images/circlelogo.png")}
              style={s.splashLogo}
              resizeMode="contain"
            />
            {/* Shimmer Sweep */}
            <Animated.View
              style={[
                s.shimmer,
                { transform: [{ translateX: shineX }, { rotate: "30deg" }] },
              ]}
            />
          </View>
        </View>

        <View style={s.bootTexts}>
          <Text style={s.bootTitle}>SKELP!</Text>
          <View style={s.loadingRow}>
            <ActivityIndicator size="small" color="#2563EB" style={{ transform: [{ scale: 0.7 }] }} />
            <Text style={s.bootStatus}>Entering Arena…</Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    LuckiestGuy_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [connected, setConnected] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bootDone, setBootDone] = useState(false);

  const [currentBid, setCurrentBid] = useState(1500);
  const [lastBidder, setLastBidder] = useState("KingKohli");
  const [timer, setTimer] = useState(45);

  const contentOp = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (fontsLoaded && bootDone) {
      Animated.parallel([
        Animated.timing(contentOp, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(contentSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1)), useNativeDriver: true }),
      ]).start();
    }
  }, [fontsLoaded, bootDone, connected]);

  if (!fontsLoaded || !bootDone) {
    return <BootSplash insets={insets} ready={fontsLoaded} onDone={() => setBootDone(true)} />;
  }

  const handleAuth = () => setConnected(true);
  const placeBid = () => { setCurrentBid((prev) => prev + 100); setLastBidder(displayName || "You"); setTimer(60); };
  const disconnect = () => setConnected(false);

  if (connected) {
    return (
      <View style={[s.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Animated.View style={[s.flex1, { opacity: contentOp, transform: [{ translateY: contentSlide }] }]}>
          <View style={s.roomHeader}>
            <Pressable onPress={disconnect} style={s.backBtn}><Text style={s.backText}>LEAVE</Text></Pressable>
            <View style={s.roomInfo}>
              <Text style={s.roomTitle}>ARENA #402</Text>
              <View style={s.liveBadge}><View style={s.dot} /><Text style={s.liveText}>LIVE</Text></View>
            </View>
            <View style={s.userMini}><Text style={s.userInitial}>{displayName?.[0] || "U"}</Text></View>
          </View>
          <View style={s.mainArena}>
            <View style={s.itemCard}>
              <View style={s.itemLabel}><Text style={s.itemLabelText}>CURRENT ITEM</Text></View>
              <Text style={s.itemName}>VIRAT KOHLI</Text>
              <Text style={s.itemMeta}>BATSMAN • INDIA</Text>
              <div style={{height: 10}} />
              <View style={s.timerContainer}><Text style={s.timerLabel}>ENDING IN</Text><Text style={s.timerValue}>{timer}s</Text></View>
            </View>
            <View style={s.bidDisplay}>
              <Text style={s.bidTitle}>CURRENT BID</Text>
              <Text style={s.bidVal}>₹{currentBid.toLocaleString()}</Text>
              <View style={s.lastBidderBox}><Text style={s.lastBidderText}>LEADING: <Text style={s.boldBidder}>{lastBidder.toUpperCase()}</Text></Text></View>
            </View>
            <View style={s.arenaActions}>
              <Pressable onPress={placeBid} style={({ pressed }) => [s.bidBtn, pressed && s.btnPress]}><Text style={s.bidBtnText}>PLACE BID +₹100</Text></Pressable>
              <View style={s.quickBids}>
                {[500, 1000, 5000].map((v) => (
                  <Pressable key={v} style={s.quickBtn} onPress={() => { setCurrentBid((prev) => prev + v); setLastBidder(displayName || "You"); }}>
                    <Text style={s.quickText}>+₹{v / 1000}K</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <View style={s.roomFooter}><Text style={s.roomFooterText}>LOGGED IN AS {email.toUpperCase()}</Text></View>
        </Animated.View>
      </View>
    );
  }

  return <LoginScreen isLogin={isLogin} setIsLogin={setIsLogin} handleAuth={handleAuth} insets={insets} email={email} setEmail={setEmail} password={password} setPassword={setPassword} displayName={displayName} setDisplayName={setDisplayName} />;
}

function LoginScreen({ isLogin, setIsLogin, handleAuth, insets, email, setEmail, password, setPassword, displayName, setDisplayName }: any) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const logoScale = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const canSubmit = isLogin ? email.trim() && password.trim() : email.trim() && password.trim() && displayName.trim();

  return (
    <View style={[s.screen, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
      <KeyboardAvoidingView style={s.flex1} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.container}>
          <Animated.View style={[s.brand, { transform: [{ scale: logoScale }] }]}>
            <View style={s.logoCard}><Image source={require("../assets/images/circlelogo.png")} style={s.logoImg} resizeMode="contain" /></View>
            <Animated.Text style={[s.brandName, { transform: [{ scale: pulseAnim }] }]}>Skelp!</Animated.Text>
            <Text style={s.brandSub}>IPL AUCTION ARENA</Text>
          </Animated.View>

          <View style={s.card}>
            <View style={s.tabs}>
              <Pressable onPress={() => setIsLogin(true)} style={[s.tab, isLogin && s.tabOn]}><Text style={[s.tabText, isLogin && s.tabTextOn]}>Sign In</Text></Pressable>
              <Pressable onPress={() => setIsLogin(false)} style={[s.tab, !isLogin && s.tabOn]}><Text style={[s.tabText, !isLogin && s.tabTextOn]}>Sign Up</Text></Pressable>
            </View>

            <View style={s.form}>
              {!isLogin && (
                <View style={s.field}><Text style={s.label}>FULL NAME</Text><View style={[s.inputBox, focusedField === "name" && s.inputBoxOn]}>
                  <TextInput placeholder="Display Name" placeholderTextColor="#94A3B8" value={displayName} onChangeText={setDisplayName} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} style={s.input} />
                </View></View>
              )}
              <View style={s.field}><Text style={s.label}>EMAIL ADDRESS</Text><View style={[s.inputBox, focusedField === "email" && s.inputBoxOn]}>
                <TextInput placeholder="Email" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} style={s.input} />
              </View></View>
              <View style={s.field}>
                <View style={s.labelRow}><Text style={s.label}>PASSWORD</Text>{isLogin && <Pressable><Text style={s.forgotText}>Forgot?</Text></Pressable>}</View>
                <View style={[s.inputBox, focusedField === "pw" && s.inputBoxOn]}>
                  <TextInput placeholder="Password" placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} onFocus={() => setFocusedField("pw")} onBlur={() => setFocusedField(null)} style={s.input} />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}><Text style={s.toggleText}>{showPassword ? "HIDE" : "SHOW"}</Text></Pressable>
                </View>
              </View>
              <Pressable onPress={handleAuth} disabled={!canSubmit} style={({ pressed }) => [s.btn, !canSubmit && s.btnOff, pressed && canSubmit && s.btnPress]}>
                <Text style={s.btnText}>{isLogin ? "LOG IN" : "START BIDDING FOR FREE"}</Text>
              </Pressable>
            </View>

            <View style={s.divider}><View style={s.line} /><Text style={s.or}>OR CONTINUE WITH</Text><View style={s.line} /></View>
            <Pressable style={s.socialBtn}><Text style={s.socialLabel}>SIGN IN WITH GOOGLE</Text></Pressable>
            
            <View style={s.switchRow}>
              <Text style={s.switchText}>{isLogin ? "New here? " : "Already joined? "}</Text>
              <Pressable onPress={() => setIsLogin(!isLogin)}><Text style={s.switchLink}>{isLogin ? "Join now" : "Go to Sign In"}</Text></Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F1F5F9" },
  center: { justifyContent: "center", alignItems: "center" },
  flex1: { flex: 1 },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  brand: { alignItems: "center", marginBottom: 12 },
  logoCard: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF", padding: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  logoImg: { width: "100%", height: "100%", borderRadius: 22 },
  brandName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 38, color: "#2563EB", letterSpacing: 1 },
  brandSub: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#94A3B8", letterSpacing: 2, marginTop: -2 },
  card: { backgroundColor: "#FFF", borderRadius: 24, padding: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20, elevation: 5, borderWidth: 1, borderColor: "#F1F5F9" },
  tabs: { flexDirection: "row", backgroundColor: "#EFF6FF", borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabOn: { backgroundColor: "#FFF", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  tabText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#64748B" },
  tabTextOn: { color: "#2563EB" },
  form: { gap: 8 },
  field: {},
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#64748B", letterSpacing: 1.5, marginBottom: 4 },
  forgotText: { fontFamily: "Poppins_600SemiBold", fontSize: 11, color: "#2563EB" },
  inputBox: { backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center" },
  inputBoxOn: { borderColor: "#2563EB", backgroundColor: "#F0F9FF" },
  input: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#1E293B" },
  toggleText: { fontFamily: "Poppins_700Bold", fontSize: 11, color: "#3B82F6" },
  btn: { backgroundColor: "#2563EB", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 4, shadowColor: "#2563EB", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  btnOff: { opacity: 0.4 },
  btnPress: { transform: [{ translateY: 2 }] },
  btnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 15, color: "#FFF" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 12 },
  line: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  or: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#94A3B8", marginHorizontal: 10 },
  socialBtn: { backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  socialLabel: { fontFamily: "Poppins_700Bold", fontSize: 11, color: "#334155" },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 14 },
  switchText: { fontFamily: "Inter_500Medium", fontSize: 11, color: "#64748B" },
  switchLink: { fontFamily: "Poppins_700Bold", fontSize: 11, color: "#2563EB" },
  roomHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { padding: 8 },
  backText: { fontFamily: "Poppins_700Bold", fontSize: 12, color: "#EF4444" },
  roomInfo: { alignItems: "center" },
  roomTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 14, color: "#1E293B" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" },
  liveText: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#EF4444" },
  userMini: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  userInitial: { fontFamily: "LuckiestGuy_400Regular", fontSize: 16, color: "#FFF" },
  mainArena: { flex: 1, paddingHorizontal: 20, justifyContent: "space-evenly" },
  itemCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 22, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: "#F1F5F9" },
  itemLabel: { backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  itemLabelText: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#64748B" },
  itemName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 32, color: "#1E293B", textAlign: "center" },
  itemMeta: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#64748B", marginTop: 4 },
  timerContainer: { marginTop: 16, alignItems: "center" },
  timerLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#EF4444", letterSpacing: 1 },
  timerValue: { fontFamily: "LuckiestGuy_400Regular", fontSize: 42, color: "#1E293B" },
  bidDisplay: { alignItems: "center" },
  bidTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 12, color: "#64748B", letterSpacing: 1.5 },
  bidVal: { fontFamily: "LuckiestGuy_400Regular", fontSize: 56, color: "#2563EB" },
  lastBidderBox: { backgroundColor: "#F0F9FF", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, marginTop: 4 },
  lastBidderText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#3B82F6" },
  boldBidder: { fontFamily: "LuckiestGuy_400Regular", color: "#2563EB" },
  arenaActions: { gap: 10 },
  bidBtn: { backgroundColor: "#22C55E", paddingVertical: 18, borderRadius: 20, alignItems: "center", shadowColor: "#22C55E", shadowOpacity: 0.3, shadowRadius: 10 },
  bidBtnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 22, color: "#FFF" },
  quickBids: { flexDirection: "row", gap: 10 },
  quickBtn: { flex: 1, backgroundColor: "#FFF", borderWidth: 2, borderColor: "#E2E8F0", paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  quickText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 14, color: "#1E293B" },
  roomFooter: { alignItems: "center", paddingVertical: 10 },
  roomFooterText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#94A3B8", letterSpacing: 1 },
  
  // Premium Splash Styles
  bootWrap: { alignItems: "center", justifyContent: "center", gap: 20 },
  premiumFrame: { width: 140, height: 140, alignItems: "center", justifyContent: "center" },
  haloRing: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(37, 99, 235, 0.12)", borderBaselineColor: "rgba(37, 99, 235, 0.05)" },
  orbitRing: { position: "absolute", borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(37, 99, 235, 0.15)" },
  ringOuter: { width: 140, height: 140 },
  ringInner: { width: 120, height: 120, borderColor: "rgba(37, 99, 235, 0.3)", borderTopColor: "#2563EB", borderWidth: 2.5 },
  accentDot: { position: "absolute", top: -5, left: "50%", marginLeft: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: "#2563EB", shadowColor: "#2563EB", shadowOpacity: 0.6, shadowRadius: 8, elevation: 5 },
  logoDisc: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 12, overflow: "hidden" },
  splashLogo: { width: 68, height: 68 },
  shimmer: { position: "absolute", top: -100, left: 0, width: 40, height: 300, backgroundColor: "rgba(255,255,255,0.6)" },
  bootTexts: { alignItems: "center", gap: 6 },
  bootTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 26, color: "#1C2A4A", letterSpacing: 1.5 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  bootStatus: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#64748B", letterSpacing: 0.5 },
});
