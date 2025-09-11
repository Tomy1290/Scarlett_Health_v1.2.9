import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';
import { getWeekRange, getCurrentWeeklyEvent } from '../src/gamification/events';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

export default function EventsScreen() {
  const router = useRouter();
  const state = useAppStore();
  const colors = useThemeColors(state.theme);

  // Create last 12 weeks list
  const weeks = useMemo(() => {
    const arr: { key: string; start: Date; end: Date }[] = [];
    let base = new Date();
    for (let i=0;i<12;i++) {
      const { weekKey, start, end } = getWeekRange(base);
      arr.push({ key: weekKey, start, end });
      base = new Date(start.getFullYear(), start.getMonth(), start.getDate()-1); // go to previous week
    }
    return arr;
  }, []);

  const appTitle = state.language==='en' ? "Scarlett’s Health Tracking" : 'Scarletts Gesundheitstracking';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel='Zurück'>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{appTitle}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{state.language==='de'?'Events':'Events'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {weeks.map((w) => {
          const evt = getCurrentWeeklyEvent(w.start);
          const hist = state.eventHistory[w.key];
          return (
            <View key={w.key} style={[styles.card, { backgroundColor: colors.card }]}> 
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{evt.title(state.language)}</Text>
                {hist?.completed ? <Ionicons name='checkmark-circle' size={18} color={'#2bb673'} /> : <Ionicons name='time' size={18} color={colors.muted} />}
              </View>
              <Text style={{ color: colors.muted, marginTop: 4 }}>{evt.description(state.language)}</Text>
              <Text style={{ color: colors.muted, marginTop: 6 }}>{w.start.toLocaleDateString()} – {w.end.toLocaleDateString()}</Text>
              <Text style={{ color: colors.muted, marginTop: 2 }}>{hist?.completed ? `+${hist.xp} XP` : (state.language==='de'?'Nicht abgeschlossen':'Not completed')}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, appTitle: { fontSize: 14, fontWeight: '800' }, title: { fontSize: 12, fontWeight: '600' }, iconBtn: { padding: 8 }, card: { borderRadius: 12, padding: 12 } });