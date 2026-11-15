import { ScrollView, Text, View } from "react-native";
import { AnimatedPressable, FormBackground, s } from "./ui";

/** Shown instead of closing the app when something unexpected breaks. */
export function CrashScreen({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={[s.screen, s.center, { paddingHorizontal: 28 }]}>
      <FormBackground />
      <View style={s.authGreetingBox}>
        <Text style={s.authGreetingTitle}>SORRY ABOUT THAT</Text>
        <Text style={[s.authGreetingName, { fontSize: 28 }]}>SOMETHING BROKE</Text>
      </View>
      <Text style={[s.aboutDevBioHero, { marginBottom: 16 }]}>Your profile and stats are safe on this phone. Tap below to go back in.</Text>
      <ScrollView style={{ maxHeight: 120, alignSelf: "stretch", marginBottom: 24 }}>
        <Text selectable style={{ fontFamily: "monospace", fontSize: 11, color: "#7A748F", textAlign: "center" }}>{String(error?.message ?? error).slice(0, 400)}</Text>
      </ScrollView>
      <AnimatedPressable style={[s.premiumSubmitBtn, { paddingHorizontal: 40 }]} onPress={retry}>
        <Text style={s.premiumSubmitBtnText}>TRY AGAIN</Text>
      </AnimatedPressable>
    </View>
  );
}
