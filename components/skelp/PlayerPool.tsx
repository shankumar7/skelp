import { T, themed } from "@/components/skelp/theme";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, BackHandler } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { formatMoney } from "@/game/money";
import { COUNTRY_LABEL, Player, PLAYERS, Role, ROLE_LABEL } from "@/game/players";
import { PlayerPhoto } from "./PlayerPhoto";
import { toggleStar, useStars } from "@/game/stars";
import { s } from "./ui";

const FILTERS = ["ALL", "★", "BAT", "BOWL", "AR", "WK", "OVERSEAS"] as const;
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
  const stars = useStars();
  const q = query.trim().toLowerCase();
  const list = SORTED.filter((p) => (filter === "ALL" || (filter === "★" ? stars.has(p.id) : filter === "OVERSEAS" ? p.overseas : p.role === (filter as Role))) && (!q || p.name.toLowerCase().includes(q)));

  return (
    <View style={[s.screen, { backgroundColor: T.sand }]}>
      <View style={[s.roomHeader, { paddingTop: insets.top + 8, paddingBottom: 14 }, T.clayHeader]}>
        <Pressable onPress={onBack} style={s.arenaBackBtn} accessibilityLabel="Back"><Ionicons name="arrow-back" size={22} color={T.ink} /></Pressable>
        <View style={s.arenaTitleBox}>
          <Text style={s.arenaCode}>PLAYER POOL</Text>
          <View style={s.arenaStatus}><Text style={[s.arenaLiveText, { color: T.dim }]}>{list.length} OF {PLAYERS.length} PLAYERS</Text></View>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <View style={[s.dashSearchBox, { paddingVertical: 4, marginTop: 14 }]}>
          <Ionicons name="search" size={20} color={T.dim} />
          <TextInput value={query} onChangeText={setQuery} placeholder="SEARCH A PLAYER..." placeholderTextColor={T.dim} autoCapitalize="none" autoCorrect={false} style={[s.dashSearchPlaceholder, { flex: 1, color: T.ink, paddingVertical: 10 }]} />
        </View>
        <View style={st.filters}>
          {FILTERS.map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[s.arenaTabBtn, st.filterBtn, filter === f && s.arenaTabBtnOn]}>
              <Text style={[s.arenaTabText, filter === f && s.arenaTabTextOn]}>{f === "★" ? `★ ${stars.size}` : f}</Text>
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
        ListHeaderComponent={<Text style={st.hint}>TAP A STAR TO SHORTLIST A PLAYER — SKELP! TELLS YOU WHEN THEY COME UP FOR AUCTION</Text>}
        ListEmptyComponent={<View style={s.arenaComingSoon}><Text style={[s.arenaComingSoonText, { textAlign: "center" }]}>{filter === "★" ? "YOUR SHORTLIST IS EMPTY" : "NO PLAYER MATCHES"}</Text></View>}
        extraData={stars}
        renderItem={({ item }) => <Row p={item} starred={stars.has(item.id)} />}
      />
    </View>
  );
}

function Row({ p, starred }: { p: Player; starred: boolean }) {
  return (
    <View style={s.arenaLogItem}>
      <Pressable onPress={() => toggleStar(p.id)} hitSlop={10} style={{ marginRight: 10 }} accessibilityLabel={`${starred ? "Remove" : "Add"} ${p.name} ${starred ? "from" : "to"} shortlist`}>
        <Ionicons name={starred ? "star" : "star-outline"} size={22} color={starred ? T.gold : T.dim} />
      </Pressable>
      <PlayerPhoto player={p} size={44} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={st.name} numberOfLines={1}>{p.name}</Text>
        <Text style={s.arenaLogTime} numberOfLines={1}>{ROLE_LABEL[p.role]} • {COUNTRY_LABEL[p.country] ?? p.country}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={st.price} numberOfLines={1}>{formatMoney(p.base)}</Text>
        <View style={[st.rating, p.rating >= 90 && { backgroundColor: T.goldSoft }]}><Text style={[st.ratingText, p.rating >= 90 && { color: T.goldText }]}>RTG {p.rating}</Text></View>
      </View>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  hint: { fontFamily: "Inter_800ExtraBold", fontSize: 8.5, color: T.muted, letterSpacing: 0.8, textAlign: "center", marginBottom: 10, lineHeight: 13 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, marginBottom: 10 },
  filterBtn: { paddingHorizontal: 13, paddingVertical: 9, boxShadow: T.claySoft },
  name: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: T.ink },
  price: { fontFamily: "LuckiestGuy_400Regular", fontSize: 15, color: T.primaryText },
  rating: { backgroundColor: T.primarySoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, marginTop: 3 },
  ratingText: { fontFamily: "Inter_800ExtraBold", fontSize: 8, color: T.primaryText, letterSpacing: 1 },
}));
