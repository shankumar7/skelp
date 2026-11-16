import { T, themed } from "@/components/skelp/theme";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FormBackground, s } from "./ui";

/** Browsers get a plain notice: QR scanning is part of the Android app. */
export function QrScanner({ insets, onClose }: { insets: any; onClose: () => void; onScanned: (link: { host: string | null; port: number }) => void }) {
  return (
    <View style={[s.screen, { backgroundColor: T.bgAlt }]}>
      <FormBackground />
      <View style={{ position: "absolute", top: insets.top + 12, left: 20, zIndex: 5 }}>
        <Pressable onPress={onClose} style={s.clayBack} accessibilityLabel="Close scanner"><Ionicons name="close" size={24} color={T.ink} /></Pressable>
      </View>
      <View style={[s.center, { flex: 1, paddingHorizontal: 32 }]}>
        <View style={s.authGreetingBox}>
          <Text style={s.authGreetingTitle}>SCAN TO JOIN</Text>
          <Text style={[s.authGreetingName, { fontSize: 28 }]}>CAMERA NEEDED</Text>
        </View>
        <Text style={s.aboutDevBioHero}>QR scanning works in the Android app.</Text>
      </View>
    </View>
  );
}
