import { BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { parseJoinLink } from "@/game/net/session";
import { AnimatedPressable, FormBackground, s } from "./ui";

/** Point the camera at the host's QR code to join their arena. */
export function QrScanner({ insets, onClose, onScanned }: { insets: any; onClose: () => void; onScanned: (link: { host: string | null; port: number }) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { onClose(); return true; });
    return () => sub.remove();
  }, [onClose]);
  useEffect(() => { if (permission && !permission.granted && permission.canAskAgain) requestPermission(); }, [permission?.granted, permission?.canAskAgain]);

  const granted = !!permission?.granted && Platform.OS !== "web";
  return (
    <View style={[s.screen, { backgroundColor: granted ? "#000" : "#FAF5EC" }]}>
      {granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => {
            if (handled.current) return;
            const link = parseJoinLink(data);
            if (!link) return; // some other QR code — keep looking
            handled.current = true;
            onScanned(link);
          }}
        />
      ) : (
        <FormBackground />
      )}

      <View style={[st.top, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onClose} style={s.clayBack} accessibilityLabel="Close scanner"><Ionicons name="close" size={24} color="#2A2545" /></Pressable>
      </View>

      {granted ? (
        <View style={st.center} pointerEvents="none">
          <View style={st.frame} />
          <View style={st.hintPill}><Text style={st.hintText}>POINT AT THE HOST&apos;S QR CODE</Text></View>
        </View>
      ) : (
        <View style={[st.center, { paddingHorizontal: 32 }]}>
          <View style={s.authGreetingBox}>
            <Text style={s.authGreetingTitle}>SCAN TO JOIN</Text>
            <Text style={[s.authGreetingName, { fontSize: 28 }]}>CAMERA NEEDED</Text>
          </View>
          <Text style={[s.aboutDevBioHero, { marginBottom: 24 }]}>
            {Platform.OS === "web" ? "QR scanning works in the Android app." : "Skelp! uses the camera only to read the host's QR code. Nothing is recorded or saved."}
          </Text>
          {Platform.OS !== "web" && (
            <AnimatedPressable style={[s.premiumSubmitBtn, { paddingHorizontal: 32 }]} onPress={() => (permission?.canAskAgain === false ? Linking.openSettings() : requestPermission())}>
              <Text style={s.premiumSubmitBtnText}>{permission?.canAskAgain === false ? "OPEN SETTINGS" : "ALLOW CAMERA"}</Text>
            </AnimatedPressable>
          )}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 20, zIndex: 5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: { width: 240, height: 240, borderRadius: 36, borderWidth: 5, borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.06)" },
  hintPill: { marginTop: 24, backgroundColor: "#5B5FEF", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18 },
  hintText: { fontFamily: "Inter_800ExtraBold", fontSize: 11, color: "#FFF", letterSpacing: 2 },
});
