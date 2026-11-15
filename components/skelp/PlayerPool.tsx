import { FlatList, Pressable, StyleSheet, Text, TextInput, View, BackHandler } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { formatMoney } from "@/game/money";
import { COUNTRY_LABEL, Player, PLAYERS, Role, ROLE_LABEL } from "@/game/players";
import { PlayerPhoto } from "./PlayerPhoto";
import { CLAY_HEADER, CLAY_SOFT, s } from "./ui";

const FILTERS = ["ALL", "BAT", "BOWL", "AR", "WK", "OVERSEAS"] as const;
type Filter = (typeof FILTERS)[number];
const SORTED = PLAYERS.slice().sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));

/** Scout the whole player pool before an auction: search, filter by role, see base price and rating. */
export function PlayerPool({ insets, onBack }: { insets: any; onBack: () => void }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);
  const q = query.trim().toLowerCase();
  const list = SORTED.filter((p) => (filter === "ALL" || (filter === "OVERSEAS" ? p.overseas : p.role === (filter as Role))) && (!q || p.name.toLowerCase().includes(q)));

  return (
    <View style={[s.screen, { backgroundColor: "#F1EADF" }]}>
      <View style={[s.roomHeader, { paddingTop: insets.top + 8, paddingBottom: 14 }, CLAY_HEADER]}>
        <Pressable onPress={onBack} style={s.arenaBackBtn} accessibilityLabel="Back"><Ionicons name="arrow-back" size={22} color="#2A2545" /></Pressable>
        <View style={s.arenaTitleBox}>
          <Text style={s.arenaCode}>PLAYER POOL</Text>
          <View style={s.arenaStatus}><Text style={[s.arenaLiveText, { color: "#A39DB5" }]}>{list.length} OF {PLAYERS.length} PLAYERS</Text></View>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <View style={[s.dashSearchBox, { paddingVertical: 4, marginTop: 14 }]}>
          <Ionicons name="search" size={20} color="#A39DB5" />
          <TextInput value={query} onChangeText={setQuery} placeholder="SEARCH A PLAYER..." placeholderTextColor="#A39DB5" autoCapitalize="none" autoCorrect={false} style={[s.dashSearchPlaceholder, { flex: 1, color: "#2A2545", paddingVertical: 10 }]} />
        </View>
        <View style={st.filters}>
          {FILTERS.map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[s.arenaTabBtn, st.filterBtn, filter === f && s.arenaTabBtnOn]}>
              <Text style={[s.arenaTabText, filter === f && s.arenaTabTextOn]}>{f}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: insets.bottom + 30 }}
        initialNumToRender={12}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<View style={s.arenaComingSoon}><Text style={s.arenaComingSoonText}>NO PLAYER MATCHES</Text></View>}
        renderItem={({ item }) => <Row p={item} />}
      />
    </View>
  );
}

function Row({ p }: { p: Player }) {
  return (
    <View style={s.arenaLogItem}>
      <PlayerPhoto player={p} size={44} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={st.name} numberOfLines={1}>{p.name}</Text>
        <Text style={s.arenaLogTime} numberOfLines={1}>{ROLE_LABEL[p.role]} • {COUNTRY_LABEL[p.country] ?? p.country}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={st.price} numberOfLines={1}>{formatMoney(p.base)}</Text>
        <View style={[st.rating, p.rating >= 90 && { backgroundColor: "#FFF1D6" }]}><Text style={[st.ratingText, p.rating >= 90 && { color: "#C97F08" }]}>RTG {p.rating}</Text></View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, marginBottom: 10 },
  filterBtn: { paddingHorizontal: 13, paddingVertical: 9, boxShadow: CLAY_SOFT },
  name: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#2A2545" },
  price: { fontFamily: "LuckiestGuy_400Regular", fontSize: 15, color: "#5B5FEF" },
  rating: { backgroundColor: "#EEEDFF", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, marginTop: 3 },
  ratingText: { fontFamily: "Inter_800ExtraBold", fontSize: 8, color: "#5B5FEF", letterSpacing: 1 },
});
