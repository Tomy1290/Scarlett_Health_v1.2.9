import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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

  const [showExtHelp, setShowExtHelp] = useState(false);
  const [showInsightsHelp, setShowInsightsHelp] = useState(false);
  const [showWeightHelp, setShowWeightHelp] = useState(false);
  const [showWeightScale, setShowWeightScale] = useState(false);

  const weightArr = useMemo(() => Object.values(state.days)
    .filter((d) => typeof d.weight === 'number')
    .sort((a, b) => a.date.localeCompare(b.date)), [state.days]);

  const weightSeries = useMemo(() => weightArr.map((d, i) => ({ value: d.weight as number, label: i % 5 === 0 ? d.date.slice(5) : '' })), [weightArr]);

  const yMinMax = useMemo(() => {
    if (weightArr.length < 2) return undefined;
    const vals = weightArr.map(d => d.weight as number);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }
    else { const pad = (max - min) * 0.1; min -= pad; max += pad; }
    return { min, max };
  }, [weightArr]);

  const ext = useMemo(() => computeExtendedStats(state.days), [state.days]);
  const ai = useMemo(() => computeAIv1({ days: state.days, language: state.language, aiFeedback: state.aiFeedback, aiInsightsEnabled: state.aiInsightsEnabled }), [state.days, state.language, state.aiFeedback, state.aiInsightsEnabled]);

  const t = (key: string) => {
    const de: Record<string, string> = {
      analysis: 'Analyse', weight: 'Gewicht', ext_stats: 'Erweiterte Statistiken', ext_locked: 'Ab Level 10 verfügbar.', insights_title: 'Premium Insights', insights_locked: 'Ab Level 75 verfügbar.', help: 'Hilfe', too_few: 'Zu wenige Daten', scale: 'Skala',
      w_hint1: 'Wiege dich möglichst täglich zur gleichen Zeit (z. B. morgens).', w_hint2: 'Nutze dieselbe Waage, barfuß, auf festem Untergrund.', w_hint3: 'Tagesrauschen ist normal – bewerte Trends über mehrere Tage.',
      ext_hint1: 'Ø Wasser 7/30T: Durchschnittliche Anzahl an Wassereinheiten pro Tag (Ziel ≥ 6).', ext_hint2: 'Gewichts-Trend/Tag: Negativ = Abnahme, Positiv = Zunahme (kg/Tag).', ext_hint3: 'Compliance: Anteil der Tage mit Morgen- UND Abendpille.', ext_hint4: 'Perfekter Tag: Pillen (mo+ab), Wasserziel erreicht (≥6), Gewicht eingetragen.',
      ins_hint1: 'AI v1 nutzt Trends, Ausreißer, Prognosen und Routinen – alles offline.', ins_hint2: 'Bewerte Tipps (Daumen hoch/runter) – so lernt die Priorisierung.', ins_hint3: 'Datenschutz: Keine Cloud, nur lokale Berechnung.',
      ai_disabled: 'Insights sind in den Einstellungen deaktiviert.',
    };
    const en: Record<string, string> = {
      analysis: 'Analysis', weight: 'Weight', ext_stats: 'Extended stats', ext_locked: 'Available from level 10.', insights_title: 'Premium insights', insights_locked: 'Available from level 75.', help: 'Help', too_few: 'Not enough data', scale: 'Scale',
      w_hint1: 'Weigh at the same time daily (e.g., mornings).', w_hint2: 'Use the same scale, barefoot, on hard floor.', w_hint3: 'Daily noise is normal – assess multi-day trends.',
      ext_hint1: 'Avg water 7/30d: Average water units per day (goal ≥ 6).', ext_hint2: 'Weight trend/day: Negative = loss, Positive = gain (kg/day).', ext_hint3: 'Compliance: Share of days with both morning AND evening pill.', ext_hint4: 'Perfect day: Pills (am+pm), water goal (≥6), weight logged.',
      ins_hint1: 'AI v1 uses trends, outliers, forecasts and routines – all offline.', ins_hint2: 'Rate tips (thumbs up/down) to personalize priority.', ins_hint3: 'Privacy: No cloud, all local.',
      ai_disabled: 'Insights are disabled in settings.',
    };
    return (state.language === 'de' ? de : en)[key] || key;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Ionicons name='chevron-back' size={24} color={colors.text} onPress={() => router.back()} accessibilityLabel={state.language==='de'?'Zurück':'Back'} />
        <Text style={[styles.title, { color: colors.text }]}>{t('analysis')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Gewichtslinie */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t('weight')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => setShowWeightScale(v=>!v)} accessibilityLabel={t('scale')} style={{ padding: 6 }}>
                <Ionicons name='grid' size={18} color={showWeightScale ? colors.primary : colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowWeightHelp(v=>!v)} accessibilityLabel={t('help')} style={{ padding: 6 }}>
                <Ionicons name={showWeightHelp ? 'information-circle' : 'information-circle-outline'} size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>
          {weightSeries.length > 1 ? (
            <LineChart
              data={weightSeries}
              color={colors.primary}
              thickness={2}
              hideRules={!showWeightScale}
              showYAxisText={showWeightScale}
              yAxisTextStyle={{ color: colors.muted }}
              yAxisColor={colors.muted}
              xAxisColor={colors.muted}
              noOfSections={showWeightScale ? 4 : 0}
              areaChart
              startFillColor={colors.primary}
              endFillColor={colors.primary}
              startOpacity={0.15}
              endOpacity={0.01}
              yAxisOffset={yMinMax ? yMinMax.min : undefined}
              yAxisMaxValue={yMinMax ? yMinMax.max : undefined}
            />
          ) : (
            <Text style={{ color: colors.muted }}>{t('too_few')}</Text>
          )}
          {showWeightHelp ? (
            <View style={{ gap: 4, marginTop: 8 }}>
              <Text style={{ color: colors.muted }}>• {t('w_hint1')}</Text>
              <Text style={{ color: colors.muted }}>• {t('w_hint2')}</Text>
              <Text style={{ color: colors.muted }}>• {t('w_hint3')}</Text>
            </View>
          ) : null}
        </View>

        {/* L10 Erweiterte Statistiken */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t('ext_stats')}</Text>
            <TouchableOpacity onPress={() => setShowExtHelp(v => !v)} accessibilityLabel={t('help')} style={{ padding: 6 }}>
              <Ionicons name={showExtHelp ? 'information-circle' : 'information-circle-outline'} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {showExtHelp ? (
            <View style={{ gap: 4, marginTop: 6 }}>
              <Text style={{ color: colors.muted }}>• Ø Wasser 7/30T: {ext.waterAvg7.toFixed(1)} / {ext.waterAvg30.toFixed(1)}</Text>
              <Text style={{ color: colors.muted }}>• Gewichts-Trend/Tag: {ext.weightTrendPerDay.toFixed(2)} kg</Text>
              <Text style={{ color: colors.muted }}>• Compliance: {(ext.complianceRate*100).toFixed(0)}%</Text>
              <Text style={{ color: colors.muted }}>• Perfekt‑Streak: {ext.bestPerfectStreak}</Text>
            </View>
          ) : null}
          {level >= 10 ? null : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('ext_locked')}</Text>
          )}
        </View>

        {/* L75 Premium Insights (AI v1) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t('insights_title')}</Text>
            <TouchableOpacity onPress={() => setShowInsightsHelp(v => !v)} accessibilityLabel={t('help')} style={{ padding: 6 }}>
              <Ionicons name={showInsightsHelp ? 'information-circle' : 'information-circle-outline'} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {showInsightsHelp ? (
            <View style={{ gap: 4, marginTop: 6 }}>
              <Text style={{ color: colors.muted }}>• {t('ins_hint1')}</Text>
              <Text style={{ color: colors.muted }}>• {t('ins_hint2')}</Text>
              <Text style={{ color: colors.muted }}>• {t('ins_hint3')}</Text>
            </View>
          ) : null}
          {level >= 75 ? (
            state.aiInsightsEnabled ? (
              ai.length ? ai.slice(0,5).map((item, i) => (
                <View key={item.id+String(i)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: i===0?8:4 }}>
                  <Ionicons name='sparkles' size={16} color={colors.muted} />
                  <Text style={{ color: colors.text, flex: 1 }}>{item.text}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity onPress={() => state.feedbackAI(item.id, +1)} accessibilityLabel='Gefällt mir'>
                      <Ionicons name='thumbs-up' size={16} color={colors.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => state.feedbackAI(item.id, -1)} accessibilityLabel='Gefällt mir nicht'>
                      <Ionicons name='thumbs-down' size={16} color={colors.muted} />
                    </TouchableOpacity>
                  </View>
                </View>
              )) : <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Noch keine Insights.':'No insights yet.'}</Text>
            ) : (
              <Text style={{ color: colors.muted, marginTop: 6 }}>{t('ai_disabled')}</Text>
            )
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Ab Level 75 verfügbar.':'Available from level 75.'}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 16, fontWeight: '700' }, card: { borderRadius: 12, padding: 12 }, });