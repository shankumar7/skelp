import { View, StyleSheet, Pressable, Animated, Easing, Dimensions, Alert, Platform } from "react-native";
import { useEffect, useRef } from "react";
import { play } from "@/game/sound";

export const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

/** Cross-platform yes/no prompt (Alert has no buttons on web). */
export function confirm(title: string, message: string, onYes: () => void, yes = "YES") {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [{ text: "CANCEL", style: "cancel" }, { text: yes, style: "destructive", onPress: onYes }]);
}
export function notify(title: string, message: string) {
  if (Platform.OS === "web") { if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`); return; }
  Alert.alert(title, message);
}

// --- PARTIAL GRID ---
export function PartialGrid({ color = "#5B5FEF", opacity = 0.1 }) {
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
export function EnhancedBackground() {
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
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FBF7F0" }]}>
      <Animated.View style={[s.bgBlob, s.bgBlob1, { transform: blob1Pos.getTranslateTransform() }]} />
      <Animated.View style={[s.bgBlob, s.bgBlob2, { transform: blob2Pos.getTranslateTransform() }]} />
      <Animated.View style={[s.bgBlob, s.bgBlob3, { transform: blob3Pos.getTranslateTransform() }]} />
      <PartialGrid />
    </View>
  );
}

// --- FORM BACKGROUND ---
export function FormBackground() {
  const ringsScale = useRef(new Animated.Value(0.8)).current;
  const ringsOp = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.parallel([Animated.timing(ringsScale, { toValue: 1.2, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.sequence([Animated.timing(ringsOp, { toValue: 0.8, duration: 3000, useNativeDriver: true }), Animated.timing(ringsOp, { toValue: 0.3, duration: 3000, useNativeDriver: true })])])).start();
  }, []);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FAF5EC" }]}>
      <View style={[s.formLightBlob, { top: -50, right: -50, backgroundColor: "rgba(91, 95, 239, 0.05)" }]} />
      <View style={[s.formLightBlob, { bottom: "20%", left: -100, backgroundColor: "rgba(46, 196, 160, 0.04)" }]} />
      <View style={s.center}><Animated.View style={[s.formRing, { opacity: ringsOp, transform: [{ scale: ringsScale }] }]} /><Animated.View style={[s.formRing, { opacity: Animated.multiply(ringsOp, 0.5), transform: [{ scale: Animated.multiply(ringsScale, 1.4) }] }]} /></View>
      <PartialGrid color="#A39DB5" opacity={0.05} />
    </View>
  );
}

// --- ANIMATED PRESSABLE ---
export const AnimatedPressable = ({ children, onPress, style, disabled }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => { if (!disabled) { play("tap", 0.5); Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start(); } };
  const onPressOut = () => { if (!disabled) Animated.spring(scale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }).start(); };
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

// ---- claymorphism: a soft drop shadow plus inner light (top) and inner shade (bottom) ----
export const CLAY_CARD = "0px 10px 22px rgba(42, 37, 69, 0.10), inset 0px -7px 12px rgba(42, 37, 69, 0.07), inset 0px 7px 12px rgba(255, 255, 255, 0.95)";
export const CLAY_SOFT = "0px 5px 12px rgba(42, 37, 69, 0.08), inset 0px -4px 7px rgba(42, 37, 69, 0.06), inset 0px 4px 7px rgba(255, 255, 255, 0.95)";
export const CLAY_POCKET = "inset 0px 5px 9px rgba(42, 37, 69, 0.13), inset 0px -4px 7px rgba(255, 255, 255, 0.95)";
export const CLAY_PRIMARY = "0px 12px 22px rgba(91, 95, 239, 0.38), inset 0px -8px 12px rgba(40, 40, 150, 0.40), inset 0px 8px 12px rgba(255, 255, 255, 0.38)";
export const CLAY_MINT = "0px 12px 22px rgba(46, 196, 160, 0.38), inset 0px -8px 12px rgba(10, 110, 85, 0.40), inset 0px 8px 12px rgba(255, 255, 255, 0.40)";
/** Rounded, floating top bar used by the in-game screens. */
export const CLAY_HEADER = { backgroundColor: "#FFF", borderBottomLeftRadius: 28, borderBottomRightRadius: 28, zIndex: 5, boxShadow: "0px 8px 18px rgba(42, 37, 69, 0.09), inset 0px -6px 10px rgba(42, 37, 69, 0.05)" } as const;

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAF5EC", overflow: "hidden" },
  center: { justifyContent: "center", alignItems: "center" },
  flex1: { flex: 1 },
  bgBlob: { position: "absolute", borderRadius: 999 },
  bgBlob1: { width: 300, height: 300, backgroundColor: "rgba(91, 95, 239, 0.08)" },
  bgBlob2: { width: 400, height: 400, backgroundColor: "rgba(91, 95, 239, 0.1)" },
  bgBlob3: { width: 250, height: 250, backgroundColor: "rgba(255, 178, 56, 0.06)" },
  gridLineV: { position: "absolute", width: 1.2 },
  gridLineH: { position: "absolute", height: 1.2 },
  formLightBlob: { position: "absolute", width: 400, height: 400, borderRadius: 200 },
  formRing: { position: "absolute", width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: "rgba(91, 95, 239, 0.1)" },
  authGreetingBox: { alignItems: "center", marginBottom: 30 },
  authGreetingTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: "#A39DB5", letterSpacing: 4 },
  authGreetingName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 36, color: "#5B5FEF", textAlign: "center", marginTop: 4, textTransform: "uppercase" },
  clayProgressContainer: { width: "80%", alignItems: "center" },
  clayProgressPocket: { width: "100%", height: 32, backgroundColor: "#E6DCCC", borderRadius: 16, borderBottomWidth: 3, borderBottomColor: "#FFF", overflow: "hidden", boxShadow: CLAY_POCKET },
  clayProgressBar: { height: "100%", backgroundColor: "#5B5FEF", borderRadius: 16, borderBottomWidth: 5, borderBottomColor: "rgba(63, 66, 200, 0.4)", borderTopWidth: 1.5, borderTopColor: "rgba(255,255,255,0.3)", boxShadow: CLAY_PRIMARY },
  clayPercentText: { fontFamily: "Poppins_800ExtraBold", fontSize: 13, color: "#5B5FEF", marginTop: 12 },
  authStatusWrapper: { position: "absolute", bottom: 60 },
  authStatusTextUnified: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: "#A39DB5", letterSpacing: 3, textTransform: "uppercase" },
  fullWidthTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  clayBack: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, borderBottomWidth: 3, borderBottomColor: "#E6DCCC", boxShadow: CLAY_SOFT },
  clayBackText: { fontSize: 22, color: "#2A2545", fontFamily: "Poppins_600SemiBold" },
  clayLogoMini: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF", padding: 8, shadowColor: "#5B5FEF", shadowOpacity: 0.1, shadowRadius: 15, borderBottomWidth: 3, borderBottomColor: "#DDDCFF", boxShadow: CLAY_SOFT },
  logoImg: { width: "100%", height: "100%" },
  fullWidthContent: { width: "100%" },
  expansiveTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 60, color: "#5B5FEF", letterSpacing: 1.5 },
  expansiveTitleSmaller: { fontSize: 48 },
  expansiveSub: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#A39DB5", marginTop: -6, marginBottom: 20, letterSpacing: 0.5 },
  clayForm: { gap: 14 }, clayField: { gap: 6 },
  clayLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#A39DB5", letterSpacing: 2, marginLeft: 2 },
  premiumClayInput: { backgroundColor: "#FFF", borderRadius: 22, paddingHorizontal: 22, paddingVertical: 2, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 12, borderBottomWidth: 4, borderBottomColor: "#F1EADF", borderTopWidth: 1, borderTopColor: "#FBF7F0", boxShadow: CLAY_POCKET },
  premiumClayInputOn: { borderBottomColor: "#E3E1FF", backgroundColor: "#F7F5FF" },
  clayInputInner: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#2A2545", paddingVertical: 12 },
  clayToggleText: { fontFamily: "Poppins_800ExtraBold", fontSize: 10, color: "#5B5FEF", letterSpacing: 0.5 },
  premiumSubmitBtn: { backgroundColor: "#5B5FEF", paddingVertical: 16, borderRadius: 24, alignItems: "center", shadowColor: "#5B5FEF", shadowOpacity: 0.35, shadowRadius: 15, borderBottomWidth: 6, borderBottomColor: "#3F42C8", borderTopWidth: 1.5, borderTopColor: "rgba(255,255,255,0.3)", boxShadow: CLAY_PRIMARY },
  btnOff: { opacity: 0.4 }, premiumSubmitBtnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 20, color: "#FFF", letterSpacing: 2 },
  clayDivider: { flexDirection: "row", alignItems: "center", marginVertical: 12 },
  clayLine: { flex: 1, height: 1.5, backgroundColor: "#E6DCCC", borderRadius: 1 },
  clayOr: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#CFC5B6", marginHorizontal: 14, textTransform: "uppercase", letterSpacing: 1.5 },
  premiumGoogleBtn: { backgroundColor: "#FFF", borderRadius: 22, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 5, borderBottomWidth: 4, borderBottomColor: "#F1EADF", borderTopWidth: 1, borderTopColor: "#FFF" },
  googleRealLogo: { width: 22, height: 22, marginRight: 14 },
  clayGoogleText: { fontFamily: "Poppins_700Bold", fontSize: 13, color: "#3B3560", letterSpacing: 0.5 },
  claySwitchBox: { marginTop: 20, paddingBottom: 10, alignItems: "center" },
  claySwitchText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#7A748F" },
  claySwitchLink: { color: "#5B5FEF", fontFamily: "Inter_800ExtraBold", textDecorationLine: "underline" },
  premiumClayBtn: { backgroundColor: "#5B5FEF", borderRadius: 32, paddingVertical: 20, paddingHorizontal: 32, marginBottom: 12, shadowColor: "#5B5FEF", shadowOpacity: 0.4, shadowRadius: 15, borderBottomWidth: 6, borderBottomColor: "rgba(63, 66, 200, 0.8)", borderTopWidth: 2, borderTopColor: "rgba(255,255,255,0.2)", alignItems: "center", boxShadow: CLAY_PRIMARY },
  premiumClayBtnSec: { backgroundColor: "#FFF", borderRadius: 32, paddingVertical: 20, paddingHorizontal: 32, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, borderBottomWidth: 6, borderBottomColor: "#F1EADF", borderTopWidth: 1, borderTopColor: "#FFF", alignItems: "center", boxShadow: CLAY_CARD },
  clayBtnContent: { width: "100%", alignItems: "center" },
  clayBtnTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 20, color: "#FFF", letterSpacing: 1.5 },
  clayBtnSecondaryTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 18, color: "#3B3560", letterSpacing: 1.2, width: "100%", textAlign: "center" },
  clayBtnGuest: { padding: 12, alignItems: "center" },
  clayBtnGuestText: { fontFamily: "Poppins_700Bold", fontSize: 12, color: "#A39DB5", textDecorationLine: "underline" },
  claySplashLogo: { width: 130, height: 130, borderRadius: 65, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 25, borderBottomWidth: 10, borderBottomColor: "#FBF7F0", borderTopWidth: 1.5, borderTopColor: "#FFF", boxShadow: CLAY_CARD },
  clayLogoBox: { width: 190, height: 190, borderRadius: 95, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#5B5FEF", shadowOpacity: 0.15, shadowRadius: 35, marginBottom: 24, borderBottomWidth: 12, borderBottomColor: "#F1EFFF", borderRightWidth: 4, borderRightColor: "#F6F4FF", overflow: "hidden", boxShadow: CLAY_CARD },
  auraContainer: { width: 300, height: 300, alignItems: "center", justifyContent: "center" },
  auraRing: { position: "absolute", width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: "rgba(91, 95, 239, 0.2)" },
  impactRing: { position: "absolute", width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#5B5FEF" },
  splashHeroLogo: { width: 100, height: 100 },
  splashStatusBox: { position: "absolute", bottom: 80, alignItems: "center", width: "100%" },
  splashBrandName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 32, color: "#2A2545", letterSpacing: 2, textAlign: "center", width: "100%" },
  splashTagline: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#A39DB5", letterSpacing: 4, marginTop: 4, textAlign: "center", width: "100%" },
  miniLoader: { marginTop: 24 },
  welcomeMain: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%" },
  welcomeLogo: { width: 140, height: 140 },
  glintBar: { position: "absolute", width: 50, height: "150%", backgroundColor: "rgba(255,255,255,0.6)", transform: [{ rotate: "25deg" }] },
  welcomeTitleWrapper: { alignItems: "center", width: "100%" },
  welcomeTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 72, color: "#5B5FEF", letterSpacing: 2, textAlign: "center" },
  welcomeWelcome: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#A39DB5", letterSpacing: 6, marginTop: -8, textAlign: "center" },
  welcomeActions: { paddingHorizontal: 24, paddingBottom: 10, width: "100%" },
  roomHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { padding: 8 }, backText: { fontFamily: "Poppins_700Bold", fontSize: 12, color: "#FF6B6B" },
  roomInfo: { alignItems: "center" }, roomTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 14, color: "#2A2545" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, backgroundColor: "#FFE5E5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF6B6B" }, liveText: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#FF6B6B" },
  clayMiniUser: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#5B5FEF", alignItems: "center", justifyContent: "center", borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.1)", shadowColor: "#5B5FEF", shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  userInitial: { fontFamily: "LuckiestGuy_400Regular", fontSize: 18, color: "#FFF" },
  mainArena: { flex: 1, paddingHorizontal: 20, justifyContent: "space-evenly" },
  itemCard: { backgroundColor: "#FFF", borderRadius: 32, padding: 22, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, borderBottomWidth: 8, borderBottomColor: "#F1EADF", boxShadow: CLAY_CARD },
  itemLabel: { backgroundColor: "#F1EADF", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  itemLabelText: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#7A748F" },
  itemName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 32, color: "#2A2545", textAlign: "center" },
  itemMeta: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#7A748F", marginTop: 4 },
  timerContainer: { marginTop: 16, alignItems: "center" },
  timerLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#FF6B6B", letterSpacing: 1 },
  timerValue: { fontFamily: "LuckiestGuy_400Regular", fontSize: 42, color: "#2A2545" },
  bidDisplay: { alignItems: "center" },
  bidTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 12, color: "#7A748F", letterSpacing: 1.5 },
  bidVal: { fontFamily: "LuckiestGuy_400Regular", fontSize: 64, color: "#5B5FEF" },
  clayBidBtn: { backgroundColor: "#2EC4A0", paddingVertical: 20, borderRadius: 28, alignItems: "center", shadowColor: "#2EC4A0", shadowOpacity: 0.4, shadowRadius: 15, elevation: 12, borderBottomWidth: 8, borderBottomColor: "rgba(0,0,0,0.15)" },
  clayBidBtnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 24, color: "#FFF" },

  // --- REDESIGNED ABOUT PAGE STYLES ---
  aboutScreen: { flex: 1, backgroundColor: "#5B5FEF" },
  aboutSpreadCircle: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "#FBF7F0", zIndex: 0 },
  aboutHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 15, zIndex: 10, backgroundColor: 'transparent' },
  aboutHeaderBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, boxShadow: CLAY_SOFT },
  aboutHeaderTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: "#2A2545", letterSpacing: 4 },
  aboutScrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  aboutHero: { alignItems: "center", marginBottom: 30 },
  aboutLogoRing: { width: 140, height: 140, borderRadius: 70, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#5B5FEF", shadowOpacity: 0.1, shadowRadius: 20, borderBottomWidth: 10, borderBottomColor: "#F1EADF", boxShadow: CLAY_CARD },
  aboutLogoFull: { width: 90, height: 90 },
  aboutHeroTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 64, color: "#5B5FEF", marginTop: 20, letterSpacing: 4 },
  aboutStatusRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  aboutStatusPill: { backgroundColor: "rgba(46, 196, 160, 0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  aboutStatusText: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#14806A", letterSpacing: 1.5 },
  aboutInfoCard: { backgroundColor: "#FFF", borderRadius: 32, padding: 28, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 20, marginBottom: 20, boxShadow: CLAY_CARD },
  aboutInfoHeadline: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: "#A39DB5", letterSpacing: 2, marginBottom: 12 },
  aboutInfoBody: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#3B3560", lineHeight: 26 },
  aboutDevCard: { backgroundColor: "#FFF", borderRadius: 32, padding: 30, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 20, alignItems: "center", width: '100%', boxShadow: CLAY_CARD },
  aboutDevLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#A39DB5", letterSpacing: 4, marginBottom: 12 },
  aboutDevNameHero: { fontFamily: "LuckiestGuy_400Regular", fontSize: 36, color: "#2A2545", letterSpacing: 1.5, textAlign: 'center', marginBottom: 20, width: '100%' },
  aboutSocialRowSingle: { flexDirection: "row", gap: 10, marginBottom: 24, justifyContent: 'center' },
  aboutSocialIconHero: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FBF7F0", alignItems: "center", justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "#E6DCCC", boxShadow: CLAY_SOFT },
  aboutDevBioHero: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#7A748F", textAlign: "center", lineHeight: 20 },
  aboutPrimaryBtn: { backgroundColor: "#5B5FEF", paddingVertical: 20, borderRadius: 28, alignItems: "center", shadowColor: "#5B5FEF", shadowOpacity: 0.35, shadowRadius: 15, elevation: 12, borderBottomWidth: 8, borderBottomColor: "#3F42C8" },
  aboutPrimaryBtnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 24, color: "#FFF", letterSpacing: 2 },
  avatarHeader: { alignItems: "center", marginBottom: 40 },
  avatarTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 32, color: "#5B5FEF", letterSpacing: 2 },
  avatarSub: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#A39DB5", letterSpacing: 2, marginTop: 4, textAlign: 'center' },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  avatarItem: { width: "18%", marginBottom: 15, alignItems: 'center' },
  avatarIconCircle: { width: "100%", aspectRatio: 1, borderRadius: 20, borderBottomWidth: 3, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, boxShadow: CLAY_SOFT },
  avatarMiniTag: { fontFamily: 'Inter_800ExtraBold', fontSize: 6, marginTop: 4, letterSpacing: 0.5 },
  avatarItemOn: { transform: [{ scale: 1.1 }] },
  avatarFooter: { marginTop: 'auto', marginBottom: 40, width: '100%' },
  dashHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20, backgroundColor: '#FFF', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, zIndex: 5, boxShadow: "0px 8px 18px rgba(42, 37, 69, 0.09), inset 0px -6px 10px rgba(42, 37, 69, 0.05)" },
  dashGreeting: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#A39DB5', letterSpacing: 2 },
  dashName: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 22, color: '#2A2545' },
  dashUserCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#EEEDFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#DDDCFF', boxShadow: CLAY_SOFT },
  dashLogout: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FBF7F0', alignItems: 'center', justifyContent: 'center', boxShadow: CLAY_SOFT },
  dashSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginTop: 20, borderWidth: 1, borderColor: '#E6DCCC', gap: 12, boxShadow: CLAY_POCKET },
  dashSearchPlaceholder: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#A39DB5' },
  dashJoinHero: { borderRadius: 24, marginTop: 20, boxShadow: "0px 12px 22px rgba(91, 95, 239, 0.38)" },
  dashJoinGradient: { borderRadius: 24, boxShadow: "inset 0px -8px 12px rgba(40, 40, 150, 0.40), inset 0px 8px 12px rgba(255, 255, 255, 0.35)", padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dashJoinTitle: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 24, color: '#FFF', letterSpacing: 1 },
  dashJoinSub: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#D3D1FF', letterSpacing: 2, marginTop: 4 },
  dashJoinArrow: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  dashSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 },
  dashSectionTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: '#A39DB5', letterSpacing: 2, textTransform: 'uppercase' },
  dashViewAll: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#5B5FEF' },
  dashAucCard: { width: 200, backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginRight: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderBottomWidth: 4, borderBottomColor: '#F1EADF', boxShadow: CLAY_CARD },
  dashAucBadge: { backgroundColor: '#D9F7EE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 16 },
  dashAucBadgeText: { fontFamily: 'Inter_800ExtraBold', fontSize: 8, color: '#0F6B57', letterSpacing: 1 },
  dashAucTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#2A2545', lineHeight: 20 },
  dashAucMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 4 },
  dashAucStat: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#7A748F' },
  dashAucDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CFC5B6', marginHorizontal: 4 },
  dashStatsRow: { flexDirection: 'row', gap: 12 },
  dashStatBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, borderBottomWidth: 3, borderBottomColor: '#FBF7F0', boxShadow: CLAY_CARD },
  dashStatVal: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 24, color: '#5B5FEF' },
  dashStatLab: { fontFamily: 'Inter_800ExtraBold', fontSize: 8, color: '#A39DB5', letterSpacing: 1, marginTop: 4 },
  dashLeaderboard: { backgroundColor: '#FFF', borderRadius: 28, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 20, boxShadow: CLAY_CARD },
  dashLeaderItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1EADF' },
  dashRank: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 16, color: '#A39DB5', width: 24 },
  dashLeaderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEEDFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dashLeaderName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#2A2545' },
  dashPoints: { fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: '#5B5FEF' },
  dashCreateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, padding: 10, paddingLeft: 10, borderBottomWidth: 4, borderBottomColor: '#F1EADF', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, boxShadow: CLAY_CARD },
  dashCreateIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#5B5FEF', alignItems: 'center', justifyContent: 'center', boxShadow: CLAY_PRIMARY },
  dashCreateText: { fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: '#2A2545', marginLeft: 16, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  arenaBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1EADF', alignItems: 'center', justifyContent: 'center', boxShadow: CLAY_SOFT },
  arenaTitleBox: { alignItems: 'center' },
  arenaCode: { fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: '#2A2545', letterSpacing: 2 },
  arenaStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  arenaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2EC4A0' },
  arenaLiveText: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#2EC4A0', letterSpacing: 1 },
  arenaUserBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#5B5FEF', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.2)', boxShadow: CLAY_PRIMARY },
  arenaPlayerSection: { paddingHorizontal: 20, marginTop: 10 },
  arenaPlayerCard: { borderRadius: 32, padding: 30, shadowColor: '#5B5FEF', shadowOpacity: 0.15, shadowRadius: 20, overflow: 'hidden', boxShadow: CLAY_PRIMARY },
  arenaPlayerImagePlaceholder: { position: 'absolute', right: -20, bottom: -20, opacity: 0.3 },
  arenaPlayerInfo: { marginTop: 40 },
  arenaCategoryBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 16 },
  arenaCategoryText: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#FFF' },
  arenaPlayerName: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 42, color: '#FFF', letterSpacing: 2 },
  arenaPlayerMeta: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFF', marginTop: 4, opacity: 0.8 },
  arenaTimerBox: { position: 'absolute', right: 20, top: 40, alignItems: 'center' },
  arenaTimerLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#FFD6D6', letterSpacing: 1 },
  arenaTimerVal: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 32, color: '#FFF' },
  arenaStatsRow: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 20, marginTop: 20, borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, boxShadow: CLAY_CARD },
  arenaStatItem: { flex: 1, alignItems: 'center' },
  arenaStatLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#A39DB5', letterSpacing: 1, marginBottom: 4 },
  arenaStatPrice: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 24, color: '#5B5FEF' },
  arenaStatOwner: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#2A2545' },
  arenaStatDivider: { width: 1, height: '60%', backgroundColor: '#F1EADF' },
  arenaLogHeader: { flexDirection: 'row', paddingHorizontal: 24, marginTop: 30, gap: 12 },
  arenaTabBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, boxShadow: CLAY_SOFT },
  arenaTabBtnOn: { backgroundColor: '#5B5FEF', boxShadow: CLAY_PRIMARY },
  arenaTabText: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: '#A39DB5', letterSpacing: 1 },
  arenaTabTextOn: { color: '#FFF' },
  arenaLogContainer: { paddingHorizontal: 24, marginTop: 20 },
  arenaLogItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, marginBottom: 8, boxShadow: CLAY_SOFT },
  arenaLogDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  arenaLogUser: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#2A2545' },
  arenaLogPrice: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 16, color: '#5B5FEF', flex: 1, textAlign: 'right', marginRight: 15 },
  arenaLogTime: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#A39DB5' },
  arenaComingSoon: { padding: 40, alignItems: 'center' },
  arenaComingSoonText: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: '#A39DB5', letterSpacing: 2 },
  arenaActionWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, borderTopWidth: 1 },
  arenaBidOptions: { flexDirection: 'row', gap: 12, marginBottom: 15, marginTop: 15 },
  arenaQuickBid: { flex: 1, backgroundColor: '#F1EADF', height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: '#E6DCCC', boxShadow: CLAY_SOFT },
  arenaQuickBidText: { fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: '#5A5478' },
  arenaMainBid: { height: 64, borderRadius: 20, overflow: 'hidden', shadowColor: '#2EC4A0', shadowOpacity: 0.3, shadowRadius: 15, marginBottom: 10, boxShadow: CLAY_MINT },
  arenaBidGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 20, boxShadow: "inset 0px -8px 12px rgba(10, 110, 85, 0.40), inset 0px 8px 12px rgba(255, 255, 255, 0.40)" },
  arenaBidBtnText: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 22, color: '#FFF', letterSpacing: 2 },
});
