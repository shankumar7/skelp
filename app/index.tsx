import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Animated,
  Easing,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

let socket: any;

export default function HomeScreen() {
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [connected, setConnected] = useState(false);
  const [bid, setBid] = useState(0);
  const [lastBidder, setLastBidder] = useState("");

  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createFloat = (val: Animated.Value, distance: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration: 4500,
            delay,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 4500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();

    createFloat(float1, 14, 0);
    createFloat(float2, 18, 400);
    createFloat(float3, 12, 800);
  }, [float1, float2, float3]);

  const connectToServer = () => {
    if (!ip) {
      alert("Please enter server IP");
      return;
    }

    socket = io(`http://${ip}:3000`);

    socket.on("connect", () => {
      console.log("Connected!");
      setConnected(true);
    });

    socket.on("bidUpdate", (data: any) => {
      setBid(data.amount);
      setLastBidder(data.player);
    });
  };

  const placeBid = () => {
    socket.emit("placeBid", name);
  };

  const canJoin = Boolean(ip.trim());
  const canBid = Boolean(socket && connected);

  // JOIN SCREEN (Skelp front page)
  if (!connected) {
    return (
      <SafeAreaView style={styles.screen}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bgBlob,
            styles.bgBlobTopLeft,
            {
              transform: [
                {
                  translateY: float1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -14],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bgBlob,
            styles.bgBlobRight,
            {
              transform: [
                {
                  translateY: float2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 18],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bgBlob,
            styles.bgBlobBottom,
            {
              transform: [
                {
                  translateY: float3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -12],
                  }),
                },
              ],
            },
          ]}
        />
        <KeyboardAvoidingView
          style={styles.center}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.card}>
            <View style={styles.cardGloss} pointerEvents="none" />

            <View style={styles.headerRow}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoLetter}>S</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.appName}>Skelp</Text>
                <Text style={styles.appTagline}>
                  Join your live IPL bidding room.
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>LIVE</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Display name</Text>
              <View style={styles.inputShell}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  placeholder="e.g. Rohit"
                  placeholderTextColor="#8D96A6"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Server IP</Text>
              <View style={styles.inputShell}>
                <Text style={styles.inputIcon}>🌐</Text>
                <TextInput
                  placeholder="e.g. 192.168.1.10"
                  placeholderTextColor="#8D96A6"
                  value={ip}
                  onChangeText={setIp}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={
                    Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
                  }
                  style={styles.input}
                />
              </View>
              <Text style={styles.hint}>Tip: use your laptop’s local IP on the same Wi‑Fi.</Text>
            </View>

            <Pressable
              onPress={connectToServer}
              disabled={!canJoin}
              style={({ pressed }) => [
                styles.primaryButton,
                !canJoin && styles.primaryButtonDisabled,
                pressed && canJoin && styles.primaryButtonPressed,
              ]}
            >
              <View style={styles.buttonGloss} pointerEvents="none" />
              <Text style={styles.primaryButtonText}>Enter auction</Text>
              <Text style={styles.primaryButtonSubtext}>
                {canJoin ? "Connect to Skelp server" : "Fill in details to continue"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // AUCTION SCREEN
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.cardGloss} pointerEvents="none" />

        <View style={styles.headerRow}>
          <View style={styles.badgeConnected}>
            <View style={styles.dot} />
            <Text style={styles.badgeConnectedText}>Connected</Text>
          </View>
          <Text style={styles.headerMeta}>Server: {ip}</Text>
        </View>

        <Text style={styles.subtitle}>Current bid</Text>
        <Text style={styles.bidAmount}>₹{bid}</Text>

        <View style={styles.pill}>
          <Text style={styles.pillText}>
            Last bid by: <Text style={styles.pillStrong}>{lastBidder || "—"}</Text>
          </Text>
        </View>

        <Pressable
          onPress={placeBid}
          disabled={!canBid}
          style={({ pressed }) => [
            styles.bidButton,
            !canBid && styles.primaryButtonDisabled,
            pressed && canBid && styles.primaryButtonPressed,
          ]}
        >
          <View style={styles.buttonGloss} pointerEvents="none" />
          <Text style={styles.primaryButtonText}>Bid +10</Text>
          <Text style={styles.primaryButtonSubtext}>Tap to raise the bid</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: "#dae4ff",
  },
  bgBlob: {
    position: "absolute",
    backgroundColor: "#f5f7ff",
    opacity: 0.7,
    borderRadius: 999,
  },
  bgBlobTopLeft: {
    width: 180,
    height: 180,
    top: -40,
    left: -40,
  },
  bgBlobRight: {
    width: 220,
    height: 220,
    top: 120,
    right: -80,
  },
  bgBlobBottom: {
    width: 200,
    height: 200,
    bottom: -80,
    left: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
  },
  logoCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#5B7CFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2741B5",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  logoLetter: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  appName: {
    fontSize: 30,
    fontWeight: "900",
    color: "#1C2A4A",
    letterSpacing: 0.4,
  },
  appTagline: {
    marginTop: 6,
    maxWidth: 260,
    fontSize: 13,
    lineHeight: 18,
    color: "#5C6B88",
    fontWeight: "600",
  },
  card: {
    borderRadius: 30,
    padding: 22,
    backgroundColor: "#edf1ff",
    borderWidth: 1,
    borderColor: "#ffffff",
    shadowColor: "#2b3a67",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
    overflow: "hidden",
  },
  cardGloss: {
    position: "absolute",
    top: -120,
    left: -80,
    width: 320,
    height: 220,
    borderRadius: 200,
    backgroundColor: "rgba(255,255,255,0.7)",
    transform: [{ rotate: "-18deg" }],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFE8EC",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "#B42318",
  },
  badgeConnected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E7F7EF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#24B47E",
  },
  badgeConnectedText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0E7A52",
  },
  headerMeta: {
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: "700",
    color: "#6E7A95",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1C2A4A",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 14,
    fontWeight: "600",
    color: "#55607A",
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5C6B88",
    marginBottom: 8,
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f6f7ff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#2b3a67",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  inputIcon: {
    fontSize: 14,
    opacity: 0.9,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    color: "#1C2A4A",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: "#6E7A95",
  },
  primaryButton: {
    marginTop: 10,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#5b7cff",
    shadowColor: "#2741b5",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  bidButton: {
    marginTop: 16,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#24b47e",
    shadowColor: "#0e7a52",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  buttonGloss: {
    position: "absolute",
    top: -22,
    left: 14,
    right: 14,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  primaryButtonPressed: {
    transform: [{ translateY: 1 }],
    shadowOpacity: 0.18,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  primaryButtonSubtext: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.86)",
  },
  bidAmount: {
    fontSize: 44,
    fontWeight: "900",
    color: "#1C2A4A",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 14,
  },
  pill: {
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F8FAFF",
    borderWidth: 1,
    borderColor: "rgba(28,42,74,0.10)",
    shadowColor: "#2B3A67",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#55607A",
  },
  pillStrong: {
    color: "#1C2A4A",
    fontWeight: "900",
  },
});
