import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore, useLevel } from '../src/store/useStore';
import { LineChart } from 'react-native-gifted-charts';
import { computeExtendedStats, computePremiumInsights } from '../src/analytics/stats';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

export default function AnalysisScreen() {
  const router = useRouter();
  const state = useAppStore();
  const { level } = useLevel();
  const colors = useThemeColors(state.theme);

  const weightSeries = useMemo(() => {
    const arr = Object.values(state.days)
      .filter((d) => typeof d.weight === 'number')
      .sort((a, b) => a.date.localeCompare(b.date));
    return arr.map((d, i) => ({ value: d.weight as number, label: i % 5 === 0 ? d.date.slice(5) : '' }));
  }, [state.days]);

  const ext = useMemo(() => computeExtendedStats(state.days), [state.days]);
  const insights = useMemo(() => computePremiumInsights(state.days, state.language), [state.days, state.language]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Ionicons name='chevron-back' size={24} color={colors.text} onPress={() => router.back()} />
        <Text style={[styles.title, { color: colors.text }]}>Analyse</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Gewichtslinie */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Gewicht</Text>
          {weightSeries.length > 1 ? (
            <LineChart
              data={weightSeries}
              color={colors.primary}
              thickness={2}
              hideRules
              areaChart
              startFillColor={colors.primary}
              endFillColor={colors.primary}
              startOpacity={0.15}
              endOpacity={0.01}
            />
          ) : (
            <Text style={{ color: colors.muted }}>Zu wenige Daten</Text>
          )}
        </View>

        {/* L25 Erweiterte Statistiken */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Erweiterte Statistiken</Text>
          {level >= 25 ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.muted }}>Ø Wasser 7T: {ext.waterAvg7.toFixed(1)}</Text>
              <Text style={{ color: colors.muted }}>Ø Wasser 30T: {ext.waterAvg30.toFixed(1)}</Text>
              <Text style={{ color: colors.muted }}>Gewichts-Trend/Tag: {ext.weightTrendPerDay.toFixed(2)} kg</Text>
              <Text style={{ color: colors.muted }}>Compliance: {(ext.complianceRate*100).toFixed(0)}%</Text>
              <Text style={{ color: colors.muted }}>Bester Perfekt-Streak: {ext.bestPerfectStreak} Tage</Text>
            </View>
          ) : (
            <Text style={{ color: colors.muted }}>Ab Level 25 verfügbar.</Text>
          )}
        </View>

        {/* L75 Premium Insights */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Premium Insights</Text>
          {level >= 75 ? (
            insights.length ? insights.slice(0, 5).map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Ionicons name='bulb' size={16} color={colors.muted} />
                <Text style={{ color: colors.text, flex: 1 }}>{t}</Text>
              </View>
            )) : <Text style={{ color: colors.muted }}>Noch keine Insights.</Text>
          ) : (
            <Text style={{ color: colors.muted }}>Ab Level 75 verfügbar.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700' },
  card: { borderRadius: 12, padding: 12 },
});