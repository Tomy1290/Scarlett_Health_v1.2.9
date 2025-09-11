import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppStore } from "../src/store/useStore";
import { computeAchievements } from "../src/achievements";

function useThemeColors(theme: string) {
  if (theme === "pink_pastel") return { bg: "#fff0f5", card: "#ffe4ef", primary: "#d81b60", text: "#3a2f33", muted: "#8a6b75" };
  if (theme === "pink_vibrant") return { bg: "#1b0b12", card: "#2a0f1b", primary: "#ff2d87", text: "#ffffff", muted: "#e59ab8" };
  return { bg: "#fde7ef", card: "#ffd0e0", primary: "#e91e63", text: "#2a1e22", muted: "#7c5866" };
}

export default function AchievementsScreen() {
  const router = useRouter();
  const state = useAppStore();
  const colors = useThemeColors(state.theme);
  const [filter, setFilter] = useState<'all'|'progress'|'done'>('all');
  const [query, setQuery] = useState("");

  const { list } = useMemo(() => computeAchievements({
    days: state.days,
    goal: state.goal,
    reminders: state.reminders,
    chat: state.chat,
    saved: state.saved,
    achievementsUnlocked: state.achievementsUnlocked,
    xp: state.xp,
    language: state.language,
    theme: state.theme,
  }), [state.days, state.goal, state.reminders, state.chat, state.saved, state.achievementsUnlocked, state.xp, state.language, state.theme]);

  const filtered = useMemo(() => {
    let arr = list;
    if (filter === 'progress') arr = arr.filter(a => !a.completed && a.percent > 0);
    if (filter === 'done') arr = arr.filter(a => a.completed);
    if (query.trim()) arr = arr.filter(a => a.title.toLowerCase().includes(query.toLowerCase()));
    return arr.sort((a,b) => (a.completed === b.completed) ? (b.percent - a.percent) : (a.completed ? 1 : -1));
  }, [list, filter, query]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Erfolge</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {(['all','progress','done'] as const).map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: filter===f ? colors.primary : 'transparent' }]}>
              <Text style={{ color: filter===f ? '#fff' : colors.text }}>{f==='all'?'Alle':f==='progress'?'In Arbeit':'Erreicht'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ marginBottom: 8 }}>
          <TextInput
            placeholder="Suchen…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={[styles.input, { borderColor: colors.muted, color: colors.text }]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {filtered.map((a) => (
          <View key={a.id} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{a.title}</Text>
                <Text style={{ color: colors.muted, marginTop: 4 }}>{a.description}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={a.completed ? 'trophy' : 'medal'} size={18} color={a.completed ? colors.primary : colors.muted} />
                  <Text style={{ color: colors.text }}>{a.xp} XP</Text>
                </View>
              </View>
            </View>
            <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
              <View style={{ width: `${a.percent}%`, height: 8, backgroundColor: colors.primary }} />
            </View>
          </View>
        ))}
        {filtered.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 32 }}>Keine Ergebnisse</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700' },
  iconBtn: { padding: 8 },
  badge: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  card: { borderRadius: 12, padding: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
});