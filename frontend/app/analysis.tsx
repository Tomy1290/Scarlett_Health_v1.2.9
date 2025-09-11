import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore, useLevel } from '../src/store/useStore';
import { LineChart } from 'react-native-gifted-charts';
import { computeExtendedStats } from '../src/analytics/stats';
import { computeAIv1 } from '../src/ai/insights';

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

  const weightArr = useMemo(() => Object.values(state.days)
    .filter((d) => typeof d.weight === 'number')
    .sort((a, b) => a.date.localeCompare(b.date)), [state.days]);

  const weightSeries = useMemo(() => weightArr.map((d, i) => ({ value: Number(d.weight) || 0, label: i % 5 === 0 ? d.date.slice(5) : '' })), [weightArr]);

  const screenW = Dimensions.get('window').width;
  const chartWidth = Math.max(screenW - 32, weightSeries.length * 28);

  const ext = useMemo(() => computeExtendedStats(state.days), [state.days]);
  const ai = useMemo(() => computeAIv1({ days: state.days, language: state.language, aiFeedback: state.aiFeedback, aiInsightsEnabled: state.aiInsightsEnabled }), [state.days, state.language, state.aiFeedback, state.aiInsightsEnabled]);

  const t = (key: string) => {
    const de: Record<string, string> = {
      analysis: 'Analyse', weight: 'Gewicht', ext_stats: 'Erweiterte Statistiken', ext_locked: 'Ab Level 10 verfügbar.', insights_title: 'Premium Insights', insights_locked: 'Ab Level 25 verfügbar.', help: 'Hilfe', too_few: 'Zu wenige Daten', scale: 'Skala',
      ai_disabled: 'Insights sind in den Einstellungen deaktiviert.', app: 'Scarletts Gesundheitstracking',
    };
    const en: Record<string, string> = {
      analysis: 'Analysis', weight: 'Weight', ext_stats: 'Extended stats', ext_locked: 'Available from level 10.', insights_title: 'Premium insights', insights_locked: 'Available from level 25.', help: 'Help', too_few: 'Not enough data', scale: 'Scale',
      ai_disabled: 'Insights are disabled in settings.', app: "Scarlett’s Health Tracking",
    };
    return (state.language === 'de' ? de : en)[key] || key;
  };

  const appTitle = t('app');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={state.language==='de'?'Zurück':'Back'} style={{ padding: 8 }}>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{appTitle}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{t('analysis')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Gewichtslinie */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>{t('weight')}</Text>
          {weightSeries.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ width: chartWidth, height: 220, justifyContent: 'center' }}>
                <LineChart
                  data={weightSeries}
                  color={colors.primary}
                  thickness={2}
                  hideRules={false}
                  showYAxisText
                  yAxisTextStyle={{ color: colors.muted }}
                  yAxisColor={colors.muted}
                  xAxisColor={colors.muted}
                  noOfSections={4}
                  areaChart
                  startFillColor={colors.primary}
                  endFillColor={colors.primary}
                  startOpacity={0.15}
                  endOpacity={0.01}
                />
              </View>
            </ScrollView>
          ) : (
            <Text style={{ color: colors.muted }}>{t('too_few')}</Text>
          )}
        </View>

        {/* L10 Erweiterte Statistiken – dauerhaft sichtbar ab Unlock */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{t('ext_stats')}</Text>
          {level >= 10 ? (
            <View style={{ gap: 4, marginTop: 6 }}>
              <Text style={{ color: colors.muted }}>• Ø Wasser 7/30T: {Number(ext.waterAvg7 || 0).toFixed(1)} / {Number(ext.waterAvg30 || 0).toFixed(1)}</Text>
              <Text style={{ color: colors.muted }}>• {state.language==='de'?'Gewichts-Trend/Tag':'Weight trend/day'}: {Number(ext.weightTrendPerDay || 0).toFixed(2)} kg</Text>
              <Text style={{ color: colors.muted }}>• Compliance: {Number((ext.complianceRate || 0)*100).toFixed(0)}%</Text>
              <Text style={{ color: colors.muted }}>• {state.language==='de'?'Perfekt‑Streak':'Perfect streak'}: {ext.bestPerfectStreak || 0}</Text>
            </View>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('ext_locked')}</Text>
          )}
        </View>

        {/* L25 Premium Insights (AI v1) – dauerhaft sichtbar ab Unlock */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{t('insights_title')}</Text>
          {level >= 25 ? (
            state.aiInsightsEnabled ? (
              ai.length ? ai.slice(0,5).map((item, i) => (
                <View key={item.id+String(i)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: i===0?8:4 }}>
                  <Ionicons name='sparkles' size={16} color={colors.muted} />
                  <Text style={{ color: colors.text, flex: 1 }}>{item.text}</Text>
                </View>
              )) : <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Noch keine Insights.':'No insights yet.'}</Text>
            ) : (
              <Text style={{ color: colors.muted, marginTop: 6 }}>{t('ai_disabled')}</Text>
            )
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('insights_locked')}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 12, fontWeight: '600' }, appTitle: { fontSize: 14, fontWeight: '800' }, card: { borderRadius: 12, padding: 12 }, });