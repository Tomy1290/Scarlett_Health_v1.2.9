import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

export default function SettingsScreen() {
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);

  const appTitle = state.language==='en' ? "Scarlett’s Health Tracking" : 'Scarletts Gesundheitstracking';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel='Zurück'>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{appTitle}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{state.language==='de'?'Einstellungen':'Settings'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        <View style={[styles.card, { backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
          <View>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'Insights aktiv':'Insights enabled'}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{state.language==='de'?'Offline‑Analysen und Tipps anzeigen.':'Show offline analyses and tips.'}</Text>
          </View>
          <Switch value={state.aiInsightsEnabled} onValueChange={state.setAiInsightsEnabled} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
          <View>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'Saisonevents aktiv':'Seasonal events enabled'}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{state.language==='de'?'Wöchentliche Event‑Challenges mit Bonus‑XP.':'Weekly event challenges with bonus XP.'}</Text>
          </View>
          <Switch value={state.eventsEnabled} onValueChange={state.setEventsEnabled} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appTitle: { fontSize: 14, fontWeight: '800' },
  title: { fontSize: 12, fontWeight: '600' },
  iconBtn: { padding: 8 },
  card: { borderRadius: 12, padding: 12 },
});