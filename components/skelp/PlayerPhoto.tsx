import { T, themed } from "@/components/skelp/theme";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PLAYER_IMAGES } from "@/game/playerImages";
import { Player } from "@/game/players";

const ROLE_ICON: Record<string, any> = { BAT: "baseball", BOWL: "tennisball", AR: "star", WK: "hand-left" };

/** Bundled, freely-licensed player photo — or an initials badge when no free photo exists. */
export function PlayerPhoto({ player, size, radius, light }: { player: Player; size: number; radius?: number; light?: boolean }) {
  const src = PLAYER_IMAGES[player.key];
  const r = radius ?? size / 2;
  if (src) return <Image source={src} style={{ width: size, height: size, borderRadius: r, backgroundColor: T.line }} resizeMode="cover" accessibilityLabel={player.name} />;
  const initials = player.name.split(/[\s-]+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <View style={[st.box, { width: size, height: size, borderRadius: r, backgroundColor: light ? "rgba(255,255,255,0.18)" : T.primarySoft }]}>
      <Text style={[st.initials, { fontSize: size * 0.36, color: light ? T.white : T.primaryText }]}>{initials}</Text>
      {size >= 56 && <Ionicons name={ROLE_ICON[player.role]} size={size * 0.16} color={light ? "rgba(255,255,255,0.7)" : "#A39DB5"} />}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: "LuckiestGuy_400Regular", letterSpacing: 1 },
}));
