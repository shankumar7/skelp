import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { State } from "@/game/engine";
import { formatMoney } from "@/game/money";
import { Player, registerCustom } from "@/game/players";
import { Archive, deleteArchive } from "@/game/storage";
import { Squads } from "./Arena";
import { T, themed } from "./theme";
import { Backdrop, Card, Chip, Column, confirm, k, Rise, RoundButton, SectionTitle, TopBar, TeamBadge } from "./ui";

const when = (date: number) => {
  const d = new Date(date);
  return `${d.getDate()} ${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getMonth()]} ${d.getFullYear()}`;
};
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "TH" : ["TH", "ST", "ND", "RD"][n % 10] ?? "TH"}`;

/** Every auction finished on this phone, with its final table and full squads. */
export function History({ archive, insets, onBack, onChange }: { archive: Archive[]; insets: any; onBack: () => void; onChange: (a: Archive[]) => void }) {
  const [openDate, setOpenDate] = useState<number | null>(null);
  const item = archive.find((a) => a.date === openDate);
  if (item) return <Detail item={item} insets={insets} onBack={() => setOpenDate(null)} onDelete={() => confirm("DELETE THIS AUCTION?", "It will be removed from the history on this phone.", () => { setOpenDate(null); deleteArchive(item.date).then(onChange); }, "DELETE")} />;
  return (
    <View style={st.screen}>
      <Backdrop />
      <TopBar title="AUCTION HISTORY" sub={`${archive.length} SAVED ON THIS PHONE`} onBack={onBack} insets={insets} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Column>
          {archive.length === 0 && (
            <Card style={{ alignItems: "center", paddingVertical: 36 }}>
              <Ionicons name="time-outline" size={44} color={T.dim} />
              <Text style={[st.name, { marginTop: 12 }]}>NO AUCTIONS YET</Text>
              <Text style={[k.body, { textAlign: "center", marginTop: 6, color: T.muted }]}>Finish an auction and it will be kept here with every team&apos;s squad.</Text>
            </Card>
          )}
          {archive.map((a, i) => {
            const table = a.teams.slice().sort((x, y) => y.power - x.power || y.purse - x.purse);
            const rank = table.findIndex((t) => t.id === a.myId) + 1;
            const champ = table[0];
            return (
              <Rise key={a.date} delay={Math.min(i, 6) * 50}>
                <Pressable onPress={() => setOpenDate(a.date)} accessibilityLabel={`Open ${a.arena}`}>
                  <Card pad={18} style={{ marginBottom: 14 }}>
                    <View style={st.row}>
                      <View style={[st.medal, rank === 1 && { backgroundColor: T.goldSoft }]}>
                        <Ionicons name={rank === 1 ? "trophy" : rank ? "podium" : "tv"} size={20} color={rank === 1 ? T.goldText : T.primaryText} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={st.name} numberOfLines={1}>{a.arena.toUpperCase()}</Text>
                        <Text style={st.meta}>{when(a.date)} • {a.mode} • {a.teams.length} TEAMS • {a.sold} SOLD</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={T.dim} />
                    </View>
                    <View style={[st.row, { marginTop: 12, gap: 8, flexWrap: "wrap" }]}>
                      {rank > 0 ? <Chip text={`YOU FINISHED ${ordinal(rank)}`} color={rank === 1 ? T.goldText : T.primaryText} soft={rank === 1 ? T.goldSoft : T.primarySoft} /> : <Chip text="YOU WERE THE AUCTIONEER" color={T.primaryText} soft={T.primarySoft} />}
                      {champ && <Chip text={`WINNER ${champ.name.toUpperCase()}`} color={T.mintText} soft={T.mintSoft} icon="trophy" />}
                    </View>
                  </Card>
                </Pressable>
              </Rise>
            );
          })}
        </Column>
      </ScrollView>
    </View>
  );
}

function Detail({ item, insets, onBack, onDelete }: { item: Archive; insets: any; onBack: () => void; onDelete: () => void }) {
  registerCustom(item.custom as Player[]);
  const table = item.teams.slice().sort((x, y) => y.power - x.power || y.purse - x.purse);
  return (
    <View style={st.screen}>
      <Backdrop />
      <TopBar title={item.arena.toUpperCase()} sub={`${when(item.date)} • ${item.mode}`} onBack={onBack} insets={insets} right={<RoundButton icon="trash-outline" label="Delete this auction" color={T.coralText} onPress={onDelete} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Column>
          <SectionTitle title="FINAL TABLE" />
          <Card pad={18}>
            {table.map((t, i) => (
              <View key={t.id} style={[st.tableRow, i === table.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[st.rank, i === 0 && { color: T.goldText }]}>{i + 1}</Text>
                <View style={{ marginRight: 12 }}><TeamBadge team={t} size={34} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.team} numberOfLines={1}>{t.name.toUpperCase()}{t.id === item.myId ? " (YOU)" : ""}</Text>
                  <Text style={st.meta}>{t.squad.length} PLAYERS • {formatMoney(t.purse)} LEFT</Text>
                </View>
                <Text style={st.power}>{t.power} PWR</Text>
              </View>
            ))}
          </Card>
          <SectionTitle title="SQUADS" />
          <Squads state={{ teams: item.teams.map((t) => ({ ...t, connected: true, rtm: 0 })) } as unknown as State} myId={item.myId} />
        </Column>
      </ScrollView>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  row: { flexDirection: "row", alignItems: "center" },
  medal: { width: 46, height: 46, borderRadius: 16, backgroundColor: T.primarySoft, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: "Poppins_700Bold", fontSize: 15, color: T.ink },
  meta: { fontFamily: "Inter_700Bold", fontSize: 10, color: T.muted, letterSpacing: 0.4, marginTop: 1 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.line },
  rank: { fontFamily: "LuckiestGuy_400Regular", fontSize: 17, color: T.dim, width: 26 },
  dot: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  team: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: T.ink },
  power: { fontFamily: "Inter_800ExtraBold", fontSize: 11, color: T.primaryText },
}));
