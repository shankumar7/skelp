import { ActivityIndicator, BackHandler, Text, View } from "react-native";
import { useEffect, useRef } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { spent, squadPower, standings } from "@/game/engine";
import { ClientSession, Session } from "@/game/net/session";
import { HistoryItem } from "@/game/storage";
import { useSession } from "@/game/useSession";
import { Arena } from "./Arena";
import { Lobby } from "./Lobby";
import { Results } from "./Results";
import { AnimatedPressable, confirm, FormBackground, s } from "./ui";

/** Routes one arena session through its phases: connecting → lobby → auction → results. */
export function ArenaFlow({ session, insets, onExit, onFinished }: { session: Session; insets: any; onExit: () => void; onFinished: (item: HistoryItem) => void }) {
  // keep the screen on during an auction — the host phone must stay awake to run the arena
  useEffect(() => {
    activateKeepAwakeAsync("skelp-arena").catch(() => {});
    return () => { deactivateKeepAwake("skelp-arena").catch(() => {}); };
  }, []);
  const snapshot = useSession(session);
  const { state, status } = snapshot;
  const recorded = useRef(false);
  const phase = state?.phase;

  const leaveNow = () => { session.leave(); onExit(); };
  const askLeave = () => {
    if (phase === "done" || status === "closed" || !state) return leaveNow();
    const msg = session.isHost ? (session.lan ? "You are the host — leaving closes the arena for everyone." : "Your practice auction will be lost.") : phase === "auction" ? "The auction continues without you. You can rejoin while it is running." : "You will leave the lobby.";
    confirm("LEAVE ARENA?", msg, leaveNow, "LEAVE");
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { askLeave(); return true; });
    return () => sub.remove();
  });

  useEffect(() => {
    if (phase !== "done" || !state || recorded.current) return;
    const table = standings(state);
    const rank = table.findIndex((t) => t.id === session.myId) + 1;
    const me = table[rank - 1];
    if (!me) return;
    recorded.current = true;
    onFinished({ date: Date.now(), arena: state.arena, rank, teams: table.length, power: squadPower(me), spent: spent(me), players: me.squad.length });
  }, [phase]);

  if (state && phase === "done") return <Results state={state} myId={session.myId} insets={insets} onExit={leaveNow} />;

  if (status === "closed" || !state) {
    const error = status === "closed" ? ((session as ClientSession).error ?? "The arena was closed.") : null;
    return (
      <View style={[s.screen, s.center, { paddingHorizontal: 32 }]}>
        <FormBackground />
        <View style={s.authGreetingBox}>
          <Text style={s.authGreetingTitle}>{error ? "ARENA CLOSED" : "CONNECTING"}</Text>
          <Text style={[s.authGreetingName, { fontSize: 28 }]}>{error ? "OUT OF THE ARENA" : "FINDING THE HOST…"}</Text>
        </View>
        {error ? <Text style={[s.aboutDevBioHero, { marginBottom: 24 }]}>{error}</Text> : <ActivityIndicator size="large" color="#2563EB" style={{ marginBottom: 24 }} />}
        <AnimatedPressable style={[s.premiumSubmitBtn, { paddingHorizontal: 32 }]} onPress={leaveNow}><Text style={s.premiumSubmitBtnText}>{error ? "BACK TO DASHBOARD" : "CANCEL"}</Text></AnimatedPressable>
      </View>
    );
  }
  if (phase === "lobby") return <Lobby session={session} state={state} insets={insets} onExit={askLeave} />;
  return <Arena session={session} snapshot={snapshot} insets={insets} onExit={askLeave} />;
}
