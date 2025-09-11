import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';
import { getWeekRange } from '../src/gamification/events';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75', input: '#ffffff' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8', input: '#1f1520' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e', input: '#fff' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866', input: '#ffffff' };
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const state = useAppStore();
  const colors = useThemeColors(state.theme);
  const [alias, setAlias] = useState(state.profileAlias || '');

  const week = useMemo(() => getWeekRange(new Date()), []);
  const weeklyXp = useMemo(() => {
    const start = +week.start; const end = +week.end + 24*60*60*1000 - 1;
    return (state.xpLog||[]).filter(e => e.ts >= start && e.ts <= end).reduce((a,b)=>a+b.amount,0);
  }, [state.xpLog]);

  function saveAlias() {
    state.setProfileAlias(alias.trim() || '');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel='Zurück'>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Bestenliste</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>Profil</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>Alias</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <TextInput value={alias} onChangeText={setAlias} placeholder='Dein Name' placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.muted, backgroundColor: colors.input }]} />
            <TouchableOpacity onPress={saveAlias} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name='save' size={16} color={'#fff'} />
              <Text style={{ color: '#fff', marginLeft: 6 }}>Speichern</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>Meine Punkte</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>Diese Woche: {weeklyXp} XP</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>Gesamt: {state.xp} XP</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>Bestenliste</Text>
          <View style={{ marginTop: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{state.profileAlias || 'Du'}</Text>
              <Text style={{ color: colors.muted }}>{weeklyXp} XP (Woche) · {state.xp} XP (Gesamt)</Text>
            </View>
            <Text style={{ color: colors.muted, marginTop: 8 }}>Offline‑Modus: Nur eigene Werte. Online‑Sync kann später ergänzt werden.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700' },
  iconBtn: { padding: 8 },
  card: { borderRadius: 12, padding: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
});