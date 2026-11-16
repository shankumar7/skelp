import { T, themed } from "@/components/skelp/theme";
import { View, Text, StyleSheet, Pressable, Animated, Easing, Dimensions, Alert, Platform, Modal, ScrollView, useWindowDimensions, KeyboardAvoidingView } from "react-native";
import { ReactNode, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
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
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
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
    <View style={[StyleSheet.absoluteFill, { backgroundColor: T.bg }]}>
      <LinearGradient colors={T.gradBg} style={StyleSheet.absoluteFill} />
      <Animated.View style={[s.bgBlob, s.bgBlob1, { transform: blob1Pos.getTranslateTransform() }]} />
      <Animated.View style={[s.bgBlob, s.bgBlob2, { transform: blob2Pos.getTranslateTransform() }]} />
      <Animated.View style={[s.bgBlob, s.bgBlob3, { transform: blob3Pos.getTranslateTransform() }]} />
      <PartialGrid opacity={0.06} />
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
    <View style={[StyleSheet.absoluteFill, { backgroundColor: T.bgAlt }]}>
      <LinearGradient colors={T.gradBg} style={StyleSheet.absoluteFill} />
      <View style={[s.formLightBlob, { top: -50, right: -50, backgroundColor: "rgba(91, 95, 239, 0.05)" }]} />
      <View style={[s.formLightBlob, { bottom: "20%", left: -100, backgroundColor: "rgba(46, 196, 160, 0.04)" }]} />
      <View style={s.center}><Animated.View style={[s.formRing, { opacity: ringsOp, transform: [{ scale: ringsScale }] }]} /><Animated.View style={[s.formRing, { opacity: Animated.multiply(ringsOp, 0.5), transform: [{ scale: Animated.multiply(ringsScale, 1.4) }] }]} /></View>
      <PartialGrid color={T.dim} opacity={0.04} />
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

// ---------------------------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------------------------
/** Screen size that follows rotation; `wide` is a tablet or a phone on its side. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, wide: width >= 760, landscape: width > height };
}
/** Keeps content in a comfortable, centred column on tablets and in landscape. */
export function Column({ children, max = 620, style }: { children: ReactNode; max?: number; style?: any }) {
  return <View style={[{ width: "100%", maxWidth: max, alignSelf: "center" }, style]}>{children}</View>;
}

/** Soft gradient wash with three glows: the calm backdrop behind every main screen. */
export function Backdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={T.gradBg} style={StyleSheet.absoluteFill} />
      <View style={[k.glow, { top: -120, right: -110, backgroundColor: T.glowA }]} />
      <View style={[k.glow, { top: "38%", left: -190, backgroundColor: T.glowB }]} />
      <View style={[k.glow, { bottom: -170, right: -130, backgroundColor: T.glowC }]} />
    </View>
  );
}

/** Rises and fades in when it mounts; `delay` staggers a list. */
export function Rise({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: any }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 520, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, delay]);
  return <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------------------------
export function Card({ children, style, pad = 20 }: { children: ReactNode; style?: any; pad?: number }) {
  return <View style={[k.card, { padding: pad }, style]}>{children}</View>;
}
export function SectionTitle({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: any }) {
  return (
    <View style={[k.section, style]}>
      <Text style={k.sectionText}>{title}</Text>
      {action && <Pressable onPress={onAction} hitSlop={12}><Text style={k.sectionAction}>{action}</Text></Pressable>}
    </View>
  );
}
/** A round clay icon in a solid colour. */
export function IconBadge({ name, color, size = 44 }: { name: any; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.36, backgroundColor: color, alignItems: "center", justifyContent: "center", boxShadow: `0px 8px 14px ${color}55, inset 0px -5px 8px rgba(0, 0, 0, 0.18), inset 0px 5px 8px rgba(255, 255, 255, 0.45)` }}>
      <Ionicons name={name} size={size * 0.46} color="#FFF" />
    </View>
  );
}
/** Small rounded label. */
export function Chip({ text, color, soft, icon }: { text: string; color: string; soft?: string; icon?: any }) {
  return (
    <View style={[k.chip, { backgroundColor: soft ?? color + "22" }]}>
      {icon && <Ionicons name={icon} size={10} color={color} style={{ marginRight: 4 }} />}
      <Text style={[k.chipText, { color }]}>{text}</Text>
    </View>
  );
}
/** A row of choices inside a clay pocket; the chosen one is raised. */
export function Segmented<V extends string | number>({ options, value, onChange, disabled, labels }: { options: readonly V[]; value: V; onChange: (v: V) => void; disabled?: boolean; labels?: Record<string, string> }) {
  return (
    <View style={[k.segment, disabled && { opacity: 0.75 }]}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable key={String(o)} disabled={disabled} onPress={() => { play("tap", 0.4); onChange(o); }} style={[k.segmentItem, on && k.segmentOn]} accessibilityState={{ selected: on }}>
            <Text style={[k.segmentText, on && k.segmentTextOn]} numberOfLines={1}>{labels?.[String(o)] ?? String(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
/** The main call-to-action: a gradient clay button. */
export function BigButton({ title, onPress, disabled, tone = "primary", icon, style, small }: { title: string; onPress?: () => void; disabled?: boolean; tone?: "primary" | "mint" | "gold"; icon?: any; style?: any; small?: boolean }) {
  const colors = disabled ? T.gradOff : tone === "mint" ? T.gradMint : tone === "gold" ? T.gradGold : T.gradPrimary;
  return (
    <View style={style}>
    <AnimatedPressable onPress={onPress} disabled={disabled} style={[k.big, { boxShadow: disabled ? "none" : tone === "mint" ? T.clayMint : T.clayPrimary }, small && { height: 50, borderRadius: 18 }]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[k.bigFill, small && { borderRadius: 18 }]}>
        {icon && <Ionicons name={icon} size={small ? 16 : 20} color="#FFF" style={{ marginRight: 10 }} />}
        <Text style={[k.bigText, small && { fontSize: 15, letterSpacing: 1 }]} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
      </LinearGradient>
    </AnimatedPressable>
    </View>
  );
}
/** Secondary button: a quiet clay pill. */
export function SoftButton({ title, onPress, icon, color, style, disabled }: { title: string; onPress?: () => void; icon?: any; color?: string; style?: any; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [k.soft, pressed && { transform: [{ scale: 0.97 }] }, disabled && { opacity: 0.45 }, style]}>
      {icon && <Ionicons name={icon} size={16} color={color ?? T.sub} style={{ marginRight: 8 }} />}
      <Text style={[k.softText, color ? { color } : null, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{title}</Text>
    </Pressable>
  );
}
/** Round icon button used in headers. */
export function RoundButton({ icon, onPress, label, color, active }: { icon: any; onPress?: () => void; label: string; color?: string; active?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityLabel={label} style={({ pressed }) => [k.round, active && { backgroundColor: T.primarySoft }, pressed && { transform: [{ scale: 0.94 }] }]}>
      <Ionicons name={icon} size={20} color={color ?? (active ? T.primaryText : T.sub)} />
    </Pressable>
  );
}
/** Header with a back button for the secondary screens. */
export function TopBar({ title, sub, onBack, insets, right }: { title: string; sub?: string; onBack: () => void; insets: any; right?: ReactNode }) {
  return (
    <View style={[k.topBar, T.clayHeader, { paddingTop: insets.top + 10 }]}>
      <RoundButton icon="arrow-back" onPress={onBack} label="Back" color={T.ink} />
      <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
        <Text style={k.topTitle} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={k.topSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right ?? <View style={{ width: 44 }} />}
    </View>
  );
}
/** Bottom sheet for short forms and pickers. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: T.scrim }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
          <View style={k.sheet}>
            <View style={k.sheetGrip} />
            <View style={[s.row, { justifyContent: "space-between", marginBottom: 14 }]}>
              <Text style={k.sheetTitle}>{title}</Text>
              <RoundButton icon="close" onPress={onClose} label="Close" />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 28 }}>{children}</ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
/** One line in a settings-style list. */
export function ListRow({ icon, color, title, sub, onPress, right, last }: { icon: any; color: string; title: string; sub?: string; onPress?: () => void; right?: ReactNode; last?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [k.listRow, last && { borderBottomWidth: 0 }, pressed && { opacity: 0.7 }]}>
      <IconBadge name={icon} color={color} size={38} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={k.listTitle} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={k.listSub} numberOfLines={4}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={T.dim} /> : null)}
    </Pressable>
  );
}

export const k = themed(() => StyleSheet.create({
  glow: { position: "absolute", width: 420, height: 420, borderRadius: 210 },
  card: { backgroundColor: T.card, borderRadius: 28, boxShadow: T.clayCard, borderWidth: 1, borderColor: T.cardEdge },
  section: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 28, marginBottom: 14, paddingHorizontal: 4 },
  sectionText: { fontFamily: "Inter_800ExtraBold", fontSize: 12, color: T.muted, letterSpacing: 1.6 },
  sectionAction: { fontFamily: "Inter_800ExtraBold", fontSize: 11, color: T.primaryText, letterSpacing: 0.8 },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, alignSelf: "flex-start" },
  chipText: { fontFamily: "Inter_800ExtraBold", fontSize: 9, letterSpacing: 0.9 },
  segment: { flexDirection: "row", backgroundColor: T.sand, borderRadius: 18, padding: 4, boxShadow: T.clayPocket },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  segmentOn: { backgroundColor: T.card, boxShadow: T.claySoft },
  segmentText: { fontFamily: "Inter_800ExtraBold", fontSize: 11, color: T.muted, letterSpacing: 0.8 },
  segmentTextOn: { color: T.primaryText },
  big: { height: 60, borderRadius: 22 },
  bigFill: { flex: 1, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, boxShadow: "inset 0px -8px 12px rgba(0, 0, 0, 0.16), inset 0px 8px 12px rgba(255, 255, 255, 0.34)" },
  bigText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 20, color: "#FFF", letterSpacing: 1.6 },
  soft: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 46, paddingHorizontal: 10, borderRadius: 16, backgroundColor: T.card, boxShadow: T.claySoft, borderWidth: 1, borderColor: T.cardEdge },
  softText: { fontFamily: "Inter_800ExtraBold", fontSize: 11, color: T.sub, letterSpacing: 0.8 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.card, alignItems: "center", justifyContent: "center", boxShadow: T.claySoft, borderWidth: 1, borderColor: T.cardEdge },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 14 },
  topTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 20, color: T.ink, letterSpacing: 1 },
  topSub: { fontFamily: "Inter_700Bold", fontSize: 10, color: T.muted, letterSpacing: 1, marginTop: 1 },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 10, maxHeight: "88%", width: "100%", maxWidth: 620, alignSelf: "center", boxShadow: "0px -10px 30px rgba(0, 0, 0, 0.18)" },
  sheetGrip: { width: 44, height: 5, borderRadius: 3, backgroundColor: T.lineStrong, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 22, color: T.ink, letterSpacing: 1 },
  listRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: T.line },
  listTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: T.ink },
  listSub: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: T.muted, marginTop: 1, lineHeight: 15 },
  label: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.muted, letterSpacing: 1.4, marginBottom: 8 },
  body: { fontFamily: "Inter_500Medium", fontSize: 14, color: T.ink2, lineHeight: 22 },
  input: { backgroundColor: T.card, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 13, fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.ink, boxShadow: T.clayPocket, borderWidth: 1, borderColor: T.line },
}));

export const s = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bgAlt, overflow: "hidden" },
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
  authGreetingTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: T.dim, letterSpacing: 4 },
  authGreetingName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 36, color: T.primaryText, textAlign: "center", marginTop: 4, textTransform: "uppercase" },
  clayProgressContainer: { width: "80%", alignItems: "center" },
  clayProgressPocket: { width: "100%", height: 32, backgroundColor: T.line, borderRadius: 16, borderBottomWidth: 3, borderBottomColor: T.cardEdge, overflow: "hidden", boxShadow: T.clayPocket },
  clayProgressBar: { height: "100%", backgroundColor: T.primary, borderRadius: 16, borderBottomWidth: 5, borderBottomColor: "rgba(63, 66, 200, 0.4)", borderTopWidth: 1.5, borderTopColor: "rgba(255,255,255,0.3)", boxShadow: T.clayPrimary },
  clayPercentText: { fontFamily: "Poppins_800ExtraBold", fontSize: 13, color: T.primaryText, marginTop: 12 },
  authStatusWrapper: { position: "absolute", bottom: 60 },
  authStatusTextUnified: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: T.dim, letterSpacing: 3, textTransform: "uppercase" },
  fullWidthTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  clayBack: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, borderBottomWidth: 3, borderBottomColor: T.line, boxShadow: T.claySoft },
  clayBackText: { fontSize: 22, color: T.ink, fontFamily: "Poppins_600SemiBold" },
  clayLogoMini: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.card, padding: 8, shadowColor: "#5B5FEF", shadowOpacity: 0.1, shadowRadius: 15, borderBottomWidth: 3, borderBottomColor: T.primarySoft, boxShadow: T.claySoft },
  logoImg: { width: "100%", height: "100%" },
  fullWidthContent: { width: "100%" },
  expansiveTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 60, color: T.primaryText, letterSpacing: 1.5 },
  expansiveTitleSmaller: { fontSize: 48 },
  expansiveSub: { fontFamily: "Inter_700Bold", fontSize: 13, color: T.dim, marginTop: -6, marginBottom: 20, letterSpacing: 0.5 },
  clayForm: { gap: 14 }, clayField: { gap: 6 },
  clayLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.dim, letterSpacing: 2, marginLeft: 2 },
  premiumClayInput: { backgroundColor: T.card, borderRadius: 22, paddingHorizontal: 22, paddingVertical: 2, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 12, borderBottomWidth: 4, borderBottomColor: T.line, borderTopWidth: 1, borderTopColor: T.bg, boxShadow: T.clayPocket },
  premiumClayInputOn: { borderBottomColor: T.primarySoft, backgroundColor: T.primarySoft },
  clayInputInner: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.ink, paddingVertical: 12 },
  clayToggleText: { fontFamily: "Poppins_800ExtraBold", fontSize: 10, color: T.primaryText, letterSpacing: 0.5 },
  premiumSubmitBtn: { backgroundColor: T.primary, paddingVertical: 16, borderRadius: 24, alignItems: "center", shadowColor: "#5B5FEF", shadowOpacity: 0.35, shadowRadius: 15, borderBottomWidth: 6, borderBottomColor: "#3F42C8", borderTopWidth: 1.5, borderTopColor: "rgba(255,255,255,0.3)", boxShadow: T.clayPrimary },
  btnOff: { opacity: 0.4 }, premiumSubmitBtnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 20, color: T.white, letterSpacing: 2 },
  clayDivider: { flexDirection: "row", alignItems: "center", marginVertical: 12 },
  clayLine: { flex: 1, height: 1.5, backgroundColor: T.line, borderRadius: 1 },
  clayOr: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.lineStrong, marginHorizontal: 14, textTransform: "uppercase", letterSpacing: 1.5 },
  premiumGoogleBtn: { backgroundColor: T.card, borderRadius: 22, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 5, borderBottomWidth: 4, borderBottomColor: T.line, borderTopWidth: 1, borderTopColor: T.cardEdge },
  googleRealLogo: { width: 22, height: 22, marginRight: 14 },
  clayGoogleText: { fontFamily: "Poppins_700Bold", fontSize: 13, color: T.ink2, letterSpacing: 0.5 },
  claySwitchBox: { marginTop: 20, paddingBottom: 10, alignItems: "center" },
  claySwitchText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: T.muted },
  claySwitchLink: { color: T.primaryText, fontFamily: "Inter_800ExtraBold", textDecorationLine: "underline" },
  premiumClayBtn: { backgroundColor: T.primary, borderRadius: 32, paddingVertical: 20, paddingHorizontal: 32, marginBottom: 12, shadowColor: "#5B5FEF", shadowOpacity: 0.4, shadowRadius: 15, borderBottomWidth: 6, borderBottomColor: "rgba(63, 66, 200, 0.8)", borderTopWidth: 2, borderTopColor: "rgba(255,255,255,0.2)", alignItems: "center", boxShadow: T.clayPrimary },
  premiumClayBtnSec: { backgroundColor: T.card, borderRadius: 32, paddingVertical: 20, paddingHorizontal: 32, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, borderBottomWidth: 6, borderBottomColor: T.line, borderTopWidth: 1, borderTopColor: T.cardEdge, alignItems: "center", boxShadow: T.clayCard },
  clayBtnContent: { width: "100%", alignItems: "center" },
  clayBtnTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 20, color: T.white, letterSpacing: 1.5 },
  clayBtnSecondaryTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 18, color: T.ink2, letterSpacing: 1.2, width: "100%", textAlign: "center" },
  clayBtnGuest: { padding: 12, alignItems: "center" },
  clayBtnGuestText: { fontFamily: "Poppins_700Bold", fontSize: 12, color: T.dim, textDecorationLine: "underline" },
  claySplashLogo: { width: 130, height: 130, borderRadius: 65, backgroundColor: T.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 25, borderBottomWidth: 10, borderBottomColor: T.bg, borderTopWidth: 1.5, borderTopColor: T.cardEdge, boxShadow: T.clayCard },
  clayLogoBox: { width: 190, height: 190, borderRadius: 95, backgroundColor: T.card, alignItems: "center", justifyContent: "center", shadowColor: "#5B5FEF", shadowOpacity: 0.15, shadowRadius: 35, marginBottom: 24, borderBottomWidth: 12, borderBottomColor: T.primarySoft, borderRightWidth: 4, borderRightColor: T.primarySoft, overflow: "hidden", boxShadow: T.clayCard },
  auraContainer: { width: 300, height: 300, alignItems: "center", justifyContent: "center" },
  auraRing: { position: "absolute", width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: "rgba(91, 95, 239, 0.2)" },
  impactRing: { position: "absolute", width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: T.primary },
  splashHeroLogo: { width: 100, height: 100 },
  splashStatusBox: { position: "absolute", bottom: 80, alignItems: "center", width: "100%" },
  splashBrandName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 32, color: T.ink, letterSpacing: 2, textAlign: "center", width: "100%" },
  splashTagline: { fontFamily: "Inter_700Bold", fontSize: 10, color: T.dim, letterSpacing: 4, marginTop: 4, textAlign: "center", width: "100%" },
  miniLoader: { marginTop: 24 },
  welcomeMain: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%" },
  welcomeLogo: { width: 140, height: 140 },
  glintBar: { position: "absolute", width: 50, height: "150%", backgroundColor: "rgba(255,255,255,0.6)", transform: [{ rotate: "25deg" }] },
  welcomeTitleWrapper: { alignItems: "center", width: "100%" },
  welcomeTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 72, color: T.primaryText, letterSpacing: 2, textAlign: "center" },
  welcomeWelcome: { fontFamily: "Inter_700Bold", fontSize: 14, color: T.dim, letterSpacing: 6, marginTop: -8, textAlign: "center" },
  welcomeActions: { paddingHorizontal: 24, paddingBottom: 10, width: "100%" },
  roomHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { padding: 8 }, backText: { fontFamily: "Poppins_700Bold", fontSize: 12, color: "#FF6B6B" },
  roomInfo: { alignItems: "center" }, roomTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 14, color: T.ink },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, backgroundColor: "#FFE5E5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF6B6B" }, liveText: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: "#FF6B6B" },
  clayMiniUser: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.primary, alignItems: "center", justifyContent: "center", borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.1)", shadowColor: "#5B5FEF", shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  userInitial: { fontFamily: "LuckiestGuy_400Regular", fontSize: 18, color: T.white },
  mainArena: { flex: 1, paddingHorizontal: 20, justifyContent: "space-evenly" },
  itemCard: { backgroundColor: T.card, borderRadius: 32, padding: 22, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, borderBottomWidth: 8, borderBottomColor: T.line, boxShadow: T.clayCard },
  itemLabel: { backgroundColor: T.sand, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  itemLabelText: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.muted },
  itemName: { fontFamily: "LuckiestGuy_400Regular", fontSize: 32, color: T.ink, textAlign: "center" },
  itemMeta: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: T.muted, marginTop: 4 },
  timerContainer: { marginTop: 16, alignItems: "center" },
  timerLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: "#FF6B6B", letterSpacing: 1 },
  timerValue: { fontFamily: "LuckiestGuy_400Regular", fontSize: 42, color: T.ink },
  bidDisplay: { alignItems: "center" },
  bidTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 12, color: T.muted, letterSpacing: 1.5 },
  bidVal: { fontFamily: "LuckiestGuy_400Regular", fontSize: 64, color: T.primaryText },
  clayBidBtn: { backgroundColor: "#2EC4A0", paddingVertical: 20, borderRadius: 28, alignItems: "center", shadowColor: "#2EC4A0", shadowOpacity: 0.4, shadowRadius: 15, elevation: 12, borderBottomWidth: 8, borderBottomColor: "rgba(0,0,0,0.15)" },
  clayBidBtnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 24, color: T.white },

  // --- REDESIGNED ABOUT PAGE STYLES ---
  aboutScreen: { flex: 1, backgroundColor: T.primary },
  aboutSpreadCircle: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: T.bg, zIndex: 0 },
  aboutHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 15, zIndex: 10, backgroundColor: 'transparent' },
  aboutHeaderBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, boxShadow: T.claySoft },
  aboutHeaderTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: T.ink, letterSpacing: 4 },
  aboutScrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  aboutHero: { alignItems: "center", marginBottom: 30 },
  aboutLogoRing: { width: 140, height: 140, borderRadius: 70, backgroundColor: T.card, alignItems: "center", justifyContent: "center", shadowColor: "#5B5FEF", shadowOpacity: 0.1, shadowRadius: 20, borderBottomWidth: 10, borderBottomColor: T.line, boxShadow: T.clayCard },
  aboutLogoFull: { width: 90, height: 90 },
  aboutHeroTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 64, color: T.primaryText, marginTop: 20, letterSpacing: 4 },
  aboutStatusRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  aboutStatusPill: { backgroundColor: "rgba(46, 196, 160, 0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  aboutStatusText: { fontFamily: "Inter_800ExtraBold", fontSize: 9, color: T.mintText, letterSpacing: 1.5 },
  aboutInfoCard: { backgroundColor: T.card, borderRadius: 32, padding: 28, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 20, marginBottom: 20, boxShadow: T.clayCard },
  aboutInfoHeadline: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: T.dim, letterSpacing: 2, marginBottom: 12 },
  aboutInfoBody: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: T.ink2, lineHeight: 26 },
  aboutDevCard: { backgroundColor: T.card, borderRadius: 32, padding: 30, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 20, alignItems: "center", width: '100%', boxShadow: T.clayCard },
  aboutDevLabel: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.dim, letterSpacing: 4, marginBottom: 12 },
  aboutDevNameHero: { fontFamily: "LuckiestGuy_400Regular", fontSize: 36, color: T.ink, letterSpacing: 1.5, textAlign: 'center', marginBottom: 20, width: '100%' },
  aboutSocialRowSingle: { flexDirection: "row", gap: 10, marginBottom: 24, justifyContent: 'center' },
  aboutSocialIconHero: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.bg, alignItems: "center", justifyContent: "center", borderBottomWidth: 3, borderBottomColor: T.line, boxShadow: T.claySoft },
  aboutDevBioHero: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: T.muted, textAlign: "center", lineHeight: 20 },
  aboutPrimaryBtn: { backgroundColor: T.primary, paddingVertical: 20, borderRadius: 28, alignItems: "center", shadowColor: "#5B5FEF", shadowOpacity: 0.35, shadowRadius: 15, elevation: 12, borderBottomWidth: 8, borderBottomColor: "#3F42C8" },
  aboutPrimaryBtnText: { fontFamily: "LuckiestGuy_400Regular", fontSize: 24, color: T.white, letterSpacing: 2 },
  avatarHeader: { alignItems: "center", marginBottom: 40 },
  avatarTitle: { fontFamily: "LuckiestGuy_400Regular", fontSize: 32, color: T.primaryText, letterSpacing: 2 },
  avatarSub: { fontFamily: "Inter_800ExtraBold", fontSize: 10, color: T.dim, letterSpacing: 2, marginTop: 4, textAlign: 'center' },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  avatarItem: { width: "18%", marginBottom: 15, alignItems: 'center' },
  avatarIconCircle: { width: "100%", aspectRatio: 1, borderRadius: 20, borderBottomWidth: 3, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, boxShadow: T.claySoft },
  avatarMiniTag: { fontFamily: 'Inter_800ExtraBold', fontSize: 6, marginTop: 4, letterSpacing: 0.5 },
  avatarItemOn: { transform: [{ scale: 1.1 }] },
  avatarFooter: { marginTop: 'auto', marginBottom: 40, width: '100%' },
  dashHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20, backgroundColor: T.card, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, zIndex: 5, boxShadow: "0px 8px 18px rgba(42, 37, 69, 0.09), inset 0px -6px 10px rgba(42, 37, 69, 0.05)" },
  dashGreeting: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: T.dim, letterSpacing: 2 },
  dashName: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 22, color: T.ink },
  dashUserCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: T.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.primarySoft, boxShadow: T.claySoft },
  dashLogout: { width: 44, height: 44, borderRadius: 14, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', boxShadow: T.claySoft },
  dashSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 16, padding: 14, marginTop: 20, borderWidth: 1, borderColor: T.line, gap: 12, boxShadow: T.clayPocket },
  dashSearchPlaceholder: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: T.dim },
  dashJoinHero: { borderRadius: 24, marginTop: 20, boxShadow: "0px 12px 22px rgba(91, 95, 239, 0.38)" },
  dashJoinGradient: { borderRadius: 24, boxShadow: "inset 0px -8px 12px rgba(40, 40, 150, 0.40), inset 0px 8px 12px rgba(255, 255, 255, 0.35)", padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dashJoinTitle: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 24, color: T.white, letterSpacing: 1 },
  dashJoinSub: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: T.onPrimaryDim, letterSpacing: 2, marginTop: 4 },
  dashJoinArrow: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  dashSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 },
  dashSectionTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: T.dim, letterSpacing: 2, textTransform: 'uppercase' },
  dashViewAll: { fontFamily: 'Inter_700Bold', fontSize: 12, color: T.primaryText },
  dashAucCard: { width: 200, backgroundColor: T.card, borderRadius: 24, padding: 20, marginRight: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderBottomWidth: 4, borderBottomColor: T.line, boxShadow: T.clayCard },
  dashAucBadge: { backgroundColor: T.mintSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 16 },
  dashAucBadgeText: { fontFamily: 'Inter_800ExtraBold', fontSize: 8, color: T.mintText, letterSpacing: 1 },
  dashAucTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: T.ink, lineHeight: 20 },
  dashAucMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 4 },
  dashAucStat: { fontFamily: 'Inter_700Bold', fontSize: 11, color: T.muted },
  dashAucDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: T.lineStrong, marginHorizontal: 4 },
  dashStatsRow: { flexDirection: 'row', gap: 12 },
  dashStatBox: { flex: 1, backgroundColor: T.card, borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, borderBottomWidth: 3, borderBottomColor: T.bg, boxShadow: T.clayCard },
  dashStatVal: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 24, color: T.primaryText },
  dashStatLab: { fontFamily: 'Inter_800ExtraBold', fontSize: 8, color: T.dim, letterSpacing: 1, marginTop: 4 },
  dashLeaderboard: { backgroundColor: T.card, borderRadius: 28, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 20, boxShadow: T.clayCard },
  dashLeaderItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.line },
  dashRank: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 16, color: T.dim, width: 24 },
  dashLeaderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dashLeaderName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.ink },
  dashPoints: { fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: T.primaryText },
  dashCreateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 24, padding: 10, paddingLeft: 10, borderBottomWidth: 4, borderBottomColor: T.line, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, boxShadow: T.clayCard },
  dashCreateIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center', boxShadow: T.clayPrimary },
  dashCreateText: { fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: T.ink, marginLeft: 16, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  arenaBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.sand, alignItems: 'center', justifyContent: 'center', boxShadow: T.claySoft },
  arenaTitleBox: { alignItems: 'center' },
  arenaCode: { fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: T.ink, letterSpacing: 2 },
  arenaStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  arenaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2EC4A0' },
  arenaLiveText: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#2EC4A0', letterSpacing: 1 },
  arenaUserBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.2)', boxShadow: T.clayPrimary },
  arenaPlayerSection: { paddingHorizontal: 20, marginTop: 10 },
  arenaPlayerCard: { borderRadius: 32, padding: 30, shadowColor: '#5B5FEF', shadowOpacity: 0.15, shadowRadius: 20, overflow: 'hidden', boxShadow: T.clayPrimary },
  arenaPlayerImagePlaceholder: { position: 'absolute', right: -20, bottom: -20, opacity: 0.3 },
  arenaPlayerInfo: { marginTop: 40 },
  arenaCategoryBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 16 },
  arenaCategoryText: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: T.white },
  arenaPlayerName: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 42, color: T.white, letterSpacing: 2 },
  arenaPlayerMeta: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: T.white, marginTop: 4, opacity: 0.8 },
  arenaTimerBox: { position: 'absolute', right: 20, top: 40, alignItems: 'center' },
  arenaTimerLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: '#FFD6D6', letterSpacing: 1 },
  arenaTimerVal: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 32, color: T.white },
  arenaStatsRow: { flexDirection: 'row', backgroundColor: T.card, marginHorizontal: 20, marginTop: 20, borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, boxShadow: T.clayCard },
  arenaStatItem: { flex: 1, alignItems: 'center' },
  arenaStatLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: T.dim, letterSpacing: 1, marginBottom: 4 },
  arenaStatPrice: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 24, color: T.primaryText },
  arenaStatOwner: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: T.ink },
  arenaStatDivider: { width: 1, height: '60%', backgroundColor: T.sand },
  arenaLogHeader: { flexDirection: 'row', paddingHorizontal: 24, marginTop: 30, gap: 12 },
  arenaTabBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: T.card, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, boxShadow: T.claySoft },
  arenaTabBtnOn: { backgroundColor: T.primary, boxShadow: T.clayPrimary },
  arenaTabText: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: T.dim, letterSpacing: 1 },
  arenaTabTextOn: { color: T.white },
  arenaLogContainer: { paddingHorizontal: 24, marginTop: 20 },
  arenaLogItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.card, padding: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, marginBottom: 8, boxShadow: T.claySoft },
  arenaLogDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  arenaLogUser: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.ink },
  arenaLogPrice: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 16, color: T.primaryText, flex: 1, textAlign: 'right', marginRight: 15 },
  arenaLogTime: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: T.dim },
  arenaComingSoon: { padding: 40, alignItems: 'center' },
  arenaComingSoonText: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: T.dim, letterSpacing: 2 },
  arenaActionWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, borderTopWidth: 1 },
  arenaBidOptions: { flexDirection: 'row', gap: 12, marginBottom: 15, marginTop: 15 },
  arenaQuickBid: { flex: 1, backgroundColor: T.sand, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: T.line, boxShadow: T.claySoft },
  arenaQuickBidText: { fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: T.sub },
  arenaMainBid: { height: 64, borderRadius: 20, overflow: 'hidden', shadowColor: '#2EC4A0', shadowOpacity: 0.3, shadowRadius: 15, marginBottom: 10, boxShadow: T.clayMint },
  arenaBidGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 20, boxShadow: "inset 0px -8px 12px rgba(10, 110, 85, 0.40), inset 0px 8px 12px rgba(255, 255, 255, 0.40)" },
  arenaBidBtnText: { fontFamily: 'LuckiestGuy_400Regular', fontSize: 22, color: T.white, letterSpacing: 2 },
}));
