import { View, StyleSheet, Pressable, Animated, Easing, Dimensions, Alert, Platform } from "react-native";
import { useEffect, useRef } from "react";

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
export function PartialGrid({ color = "#2563EB", opacity = 0.1 }) {
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
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]}>
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
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F7F9FC" }]}>
      <View style={[s.formLightBlob, { top: -50, right: -50, backgroundColor: "rgba(37, 99, 235, 0.05)" }]} />
      <View style={[s.formLightBlob, { bottom: "20%", left: -100, backgroundColor: "rgba(34, 197, 94, 0.04)" }]} />
      <View style={s.center}><Animated.View style={[s.formRing, { opacity: ringsOp, transform: [{ scale: ringsScale }] }]} /><Animated.View style={[s.formRing, { opacity: Animated.multiply(ringsOp, 0.5), transform: [{ scale: Animated.multiply(ringsScale, 1.4) }] }]} /></View>
      <PartialGrid color="#94A3B8" opacity={0.05} />
    </View>
  );
}

// --- ANIMATED PRESSABLE ---
export const AnimatedPressable = ({ children, onPress, style, disabled }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => { if (!disabled) Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start(); };
  const onPressOut = () => { if (!disabled) Animated.spring(scale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }).start(); };
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

export const s = StyleSheet.create({
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
  avatarSub: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#94A3B8", letterSpacing: 2, marginTop: 4, textAlign: 'center' },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
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
