import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppStore } from "../src/store/useStore";
import { computeAchievements, getAchievementConfigById } from "../src/achievements";
import { BadgeIcon } from "../src/components/BadgeIcon";
import { getWeekRange, getCurrentWeeklyEvent, computeEventProgress } from "../src/gamification/events";

function useThemeColors(theme: string) {
  if (theme === "pink_pastel") return { bg: "#fff0f5", card: "#ffe4ef", primary: "#d81b60", text: "#3a2f33", muted: "#8a6b75" };
  if (theme === "pink_vibrant") return { bg: "#1b0b12", card: "#2a0f1b", primary: "#ff2d87", text: "#ffffff", muted: "#e59ab8" };
  if (theme === "golden_pink") return { bg: "#fff8f0", card: "#ffe9c7", primary: "#dba514", text: "#2a1e22", muted: "#9b7d4e" };
  return { bg: "#fde7ef", card: "#ffd0e0", primary: "#e91e63", text: "#2a1e22", muted: "#7c5866" };
}

export default function AchievementsScreen() {
  const router = useRouter();
  const state = useAppStore();
  const colors = useThemeColors(state.theme);
  const [filter, setFilter] = useState<'all'|'progress'|'done'>('all');
  const [query, setQuery] = useState("");

  const { list } = useMemo(() => computeAchievements({
    days: state.days, goal: state.goal, reminders: state.reminders, chat: state.chat, saved: state.saved,
    achievementsUnlocked: state.achievementsUnlocked, xp: state.xp, language: state.language, theme: state.theme,
  }), [state.days, state.goal, state.reminders, state.chat, state.saved, state.achievementsUnlocked, state.xp, state.language, state.theme]);

  const filtered = useMemo(() => {
    let arr = list;
    if (filter === 'progress') arr = arr.filter(a => !a.completed && a.percent > 0);
    if (filter === 'done') arr = arr.filter(a => a.completed);
    if (query.trim()) arr = arr.filter(a => a.title.toLowerCase().includes(query.toLowerCase()));
    return arr.sort((a,b) => (a.completed === b.completed) ? (b.percent - a.percent) : (a.completed ? 1 : -1));
  }, [list, filter, query]);

  // Rewards & Events integration
  const { weekKey, dayKeys } = getWeekRange(new Date());
  const weeklyEvent = getCurrentWeeklyEvent(new Date());
  const evProg = computeEventProgress(dayKeys, { days: state.days }, weeklyEvent);

  const level = Math.floor(state.xp / 100) + 1;
  const rewards = [
    { id: 'golden', lvl: 10, title: 'Golden Pink Theme' },
    { id: 'ext', lvl: 25, title: 'Erweiterte Statistiken' },
    { id: 'vip', lvl: 50, title: 'VIP-Chat' },
    { id: 'ins', lvl: 75, title: 'Premium Insights' },
    { id: 'leg', lvl: 100, title: 'Legendärer Status' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Zurück">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Erfolge</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Rewards summary */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Belohnungen</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {rewards.map((r) => {
              const unlocked = level >= r.lvl;
              return (
                <View key={r.id} style={[styles.rewardPill, { borderColor: unlocked ? colors.primary : colors.muted, backgroundColor: unlocked ? colors.primary : 'transparent' }]}> 
                  <Ionicons name={unlocked ? 'lock-open' : 'lock-closed'} size={14} color={unlocked ? '#fff' : colors.muted} />
                  <Text style={{ color: unlocked ? '#fff' : colors.text, marginLeft: 6 }}>{r.title} (L{r.lvl})</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Weekly event */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 4 }}>{weeklyEvent.title(state.language)}</Text>
          <Text style={{ color: colors.muted }}>{weeklyEvent.description(state.language)}</Text>
          <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
            <View style={{ width: `${evProg.percent}%`, height: 8, backgroundColor: colors.primary }} />
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{evProg.percent}% · +{weeklyEvent.xp} XP · Bonus {Math.round(weeklyEvent.bonusPercent*100)}%</Text>
        </View>

        {/* Filters & search */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['all','progress','done'] as const).map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: filter===f ? colors.primary : 'transparent' }]}
              accessibilityLabel={`Filter ${f}`}>
              <Text style={{ color: filter===f ? '#fff' : colors.text }}>{f==='all'?'Alle':f==='progress'?'In Arbeit':'Erreicht'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput placeholder="Suchen…" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={[styles.input, { borderColor: colors.muted, color: colors.text }]} />

        {filtered.map((a) => {
          const cfg = getAchievementConfigById(a.id);
          return (
            <TouchableOpacity key={a.id} style={[styles.itemCard, { backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 12 }]} onPress={() => router.push(`/achievements/${a.id}`)}>
              <BadgeIcon size={48} percent={a.percent} color={colors.primary} bg={colors.bg} icon={cfg?.icon || 'trophy'} iconColor={colors.text} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{a.title}</Text>
                <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={2}>{a.description}</Text>
                <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                  <View style={{ width: `${a.percent}%`, height: 6, backgroundColor: colors.primary }} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Ionicons name={a.completed ? 'trophy' : 'medal'} size={18} color={a.completed ? colors.primary : colors.muted} />
                <Text style={{ color: colors.text }}>{a.xp} XP</Text>
              </View>
            </TouchableOpacity>
          );
        })}
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
  itemCard: { borderRadius: 12, padding: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  rewardPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
});