import { Linking, StyleSheet, Text, View } from "react-native";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Ionicons } from "@expo/vector-icons";
import { load, skipUpdate } from "@/game/storage";
import { APP_VERSION, canSelfUpdate, checkForUpdate, downloadAndInstall, Update } from "@/game/updater";
import { T, themed } from "./theme";
import { BigButton, Card, Chip, IconBadge, k, Sheet, SoftButton } from "./ui";

export type UpdateStatus = "idle" | "checking" | "current" | "available" | "offline";
interface Shared { status: UpdateStatus; update: Update | null; skipped?: string }
// one automatic check per app launch, shared by every screen (an immutable snapshot, replaced on change)
let shared: Shared = { status: "idle", update: null };
const watchers = new Set<() => void>();
const publish = (next: Shared) => { shared = next; watchers.forEach((w) => w()); };
const subscribe = (w: () => void) => { watchers.add(w); return () => { watchers.delete(w); }; };
const snapshot = () => shared;

export async function runUpdateCheck() {
  if (shared.status === "checking") return;
  publish({ ...shared, status: "checking" });
  const skipped = (await load()).skippedUpdate;
  const res = await checkForUpdate();
  publish(res.ok ? { status: res.update ? "available" : "current", update: res.update, skipped } : { status: "offline", update: null, skipped });
}
function dismissUpdate() {
  if (!shared.update) return;
  skipUpdate(shared.update.version);
  publish({ ...shared, skipped: shared.update.version });
}

/** Follows the shared update state; `auto` runs the launch check once. */
export function useUpdate(auto = false) {
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => { if (auto && snapshot().status === "idle") runUpdateCheck(); }, [auto]);
  return { status: state.status, update: state.update, check: runUpdateCheck, dismiss: dismissUpdate, hidden: !!state.update && state.skipped === state.update.version };
}

const mb = (bytes: number) => (bytes > 0 ? `${Math.round(bytes / 1048576)} MB` : "");

/** What's new, then download with progress and hand over to Android's installer. */
export function UpdateSheet({ update, visible, onClose }: { update: Update; visible: boolean; onClose: () => void }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [handedOver, setHandedOver] = useState(false);
  const start = async () => {
    setError(""); setHandedOver(false); setProgress(0);
    const res = await downloadAndInstall(update, setProgress);
    setProgress(null);
    if (res.ok) setHandedOver(true);
    else setError(res.error);
  };
  const busy = progress !== null;
  return (
    <Sheet visible={visible} onClose={busy ? () => {} : onClose} title={`SKELP! ${update.version}`}>
      <View style={[st.row, { marginBottom: 14 }]}>
        <Chip text={`YOU HAVE ${APP_VERSION.replace(/\.0$/, "")}`} color={T.muted} soft={T.sand} />
        <Ionicons name="arrow-forward" size={14} color={T.dim} style={{ marginHorizontal: 8 }} />
        <Chip text={`NEW ${update.version}`} color={T.mintText} soft={T.mintSoft} />
        {update.size > 0 && <Text style={[st.small, { marginLeft: 10 }]}>{mb(update.size)}</Text>}
      </View>
      <Text style={k.label}>WHAT&apos;S NEW</Text>
      <Card pad={16} style={{ marginBottom: 16 }}><Text style={k.body}>{update.notes || "Improvements and fixes."}</Text></Card>
      {busy ? (
        <View>
          <View style={st.track}><View style={[st.fill, { width: `${Math.round((progress ?? 0) * 100)}%` }]} /></View>
          <Text style={[st.small, { textAlign: "center", marginTop: 10 }]}>DOWNLOADING… {Math.round((progress ?? 0) * 100)}%</Text>
        </View>
      ) : canSelfUpdate ? (
        <>
          <BigButton title={handedOver ? "OPEN INSTALLER AGAIN" : "DOWNLOAD & INSTALL"} icon="download" tone="mint" onPress={start} />
          <Text style={[st.small, { textAlign: "center", marginTop: 12, lineHeight: 16 }]}>
            {handedOver ? "Android is asking to install the update. If it asks, allow Skelp! to install apps, then tap Install. Your profile and stats are kept." : "The update downloads over the internet, then Android asks you to confirm the install. Your profile and stats are kept."}
          </Text>
        </>
      ) : (
        <BigButton title="OPEN DOWNLOAD PAGE" icon="open-outline" onPress={() => Linking.openURL(update.page).catch(() => {})} />
      )}
      {!!error && <Text style={[st.small, { color: T.coralText, textAlign: "center", marginTop: 12 }]}>{error}</Text>}
      {!!error && <SoftButton title="DOWNLOAD IN THE BROWSER INSTEAD" icon="open-outline" style={{ marginTop: 12 }} onPress={() => Linking.openURL(update.url).catch(() => {})} />}
    </Sheet>
  );
}

/** Dashboard strip shown when a newer version exists. */
export function UpdateBanner() {
  const { update, status, dismiss, hidden } = useUpdate(true);
  const [open, setOpen] = useState(false);
  if (status !== "available" || !update || hidden) return null;
  return (
    <Card pad={14} style={{ marginTop: 18, borderColor: T.mint, borderWidth: 1.5 }}>
      <View style={st.row}>
        <IconBadge name="arrow-up-circle" color={T.mint} size={42} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={st.title}>UPDATE AVAILABLE</Text>
          <Text style={st.small}>Skelp! {update.version} is ready to install</Text>
        </View>
      </View>
      <View style={[st.row, { gap: 10, marginTop: 12 }]}>
        <SoftButton title="LATER" style={{ flex: 1 }} onPress={dismiss} />
        <BigButton title="SEE WHAT'S NEW" small tone="mint" style={{ flex: 2 }} onPress={() => setOpen(true)} />
      </View>
      <UpdateSheet update={update} visible={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

/** About screen: current version, with a button to check now. */
export function UpdateCard() {
  const { update, status, check } = useUpdate(false);
  const [open, setOpen] = useState(false);
  const line = status === "checking" ? "Checking for updates…" : status === "available" && update ? `Version ${update.version} is available` : status === "current" ? "You have the latest version" : status === "offline" ? "Could not check — are you online?" : "Check whether a newer version is out";
  return (
    <Card>
      <View style={st.row}>
        <IconBadge name={status === "available" ? "arrow-up-circle" : status === "current" ? "checkmark-circle" : "cloud-download"} color={status === "available" || status === "current" ? T.mint : T.primary} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={st.title}>APP UPDATES</Text>
          <Text style={st.small}>{line}</Text>
        </View>
      </View>
      {status === "available" && update ? (
        <BigButton title={`UPDATE TO ${update.version}`} small tone="mint" icon="download" style={{ marginTop: 14 }} onPress={() => setOpen(true)} />
      ) : (
        <SoftButton title={status === "checking" ? "CHECKING…" : "CHECK FOR UPDATES"} icon="refresh" color={T.primaryText} disabled={status === "checking"} style={{ marginTop: 14 }} onPress={check} />
      )}
      {update && <UpdateSheet update={update} visible={open} onClose={() => setOpen(false)} />}
    </Card>
  );
}

const st = themed(() => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  title: { fontFamily: "Inter_800ExtraBold", fontSize: 13, color: T.ink, letterSpacing: 1 },
  small: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: T.muted, marginTop: 2 },
  track: { height: 22, borderRadius: 11, backgroundColor: T.sand, overflow: "hidden", boxShadow: T.clayPocket },
  fill: { height: "100%", borderRadius: 11, backgroundColor: T.mint, boxShadow: "inset 0px -4px 6px rgba(10, 110, 85, 0.35), inset 0px 4px 6px rgba(255, 255, 255, 0.4)" },
}));
