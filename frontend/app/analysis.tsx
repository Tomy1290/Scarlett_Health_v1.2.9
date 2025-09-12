import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore, useLevel } from '../src/store/useStore';
import { LineChart } from 'react-native-gifted-charts';
import DateTimePicker from '@react-native-community/datetimepicker';
import { parse } from 'date-fns';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

export default function AnalysisScreen() {
  const router = useRouter();
  const state = useAppStore();
  const { level, xp } = useLevel();
  const colors = useThemeColors(state.theme);

  const weightArrAll = useMemo(() => Object.values(state.days)
    .filter((d) => typeof d.weight === 'number')
    .sort((a, b) => a.date.localeCompare(b.date)), [state.days]);

  const [range, setRange] = useState<'7'|'14'|'30'|'custom'>('14');
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const weightArr = useMemo(() => {
    if (range === 'custom' && from && to) {
      return weightArrAll.filter(d => {
        const dt = new Date(d.date);
        return +dt >= +new Date(from.getFullYear(), from.getMonth(), from.getDate()) && +dt <= +new Date(to.getFullYear(), to.getMonth(), to.getDate());
      });
    }
    const take = parseInt(range, 10);
    return weightArrAll.slice(-take);
  }, [weightArrAll, range, from, to]);

  const weightSeries = useMemo(() => weightArr.map((d) => ({ value: Number(d.weight) || 0, label: `${d.date.slice(5,7)}.${d.date.slice(8,10)}` })), [weightArr]);

  const screenW = Dimensions.get('window').width;
  const chartWidth = Math.max(screenW - 32, weightSeries.length * 36);

  const last14 = useMemo(() => weightArrAll.slice(-14), [weightArrAll]);

  const t = (key: string) => {
    const de: Record<string, string> = {
      analysis: 'Analyse', weight: 'Gewicht', ext_stats: 'Erweiterte Statistiken', ext_locked: 'Ab Level 10 verfügbar.', insights_title: 'Premium Insights', insights_locked: 'Ab Level 25 verfügbar.', help: 'Hilfe', too_few: 'Zu wenige Daten', scale: 'Skala', app: 'Scarletts Gesundheitstracking',
      range7: '7 Tage', range14: '14 Tage', range30: '30 Tage', custom: 'Eigener Zeitraum', from: 'Von', to: 'Bis'
    };
    const en: Record<string, string> = {
      analysis: 'Analysis', weight: 'Weight', ext_stats: 'Extended stats', ext_locked: 'Available from level 10.', insights_title: 'Premium insights', insights_locked: 'Available from level 25.', help: 'Help', too_few: 'Not enough data', scale: 'Scale', app: "Scarlett’s Health Tracking",
      range7: '7 days', range14: '14 days', range30: '30 days', custom: 'Custom', from: 'From', to: 'To'
    };
    return (state.language === 'de' ? de : en)[key] || key;
  };

  const appTitle = t('app');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 20 }]}> 
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={state.language==='de'?'Zurück':'Back'} style={{ padding: 8 }}>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='star' size={16} color={colors.primary} />
            <Text style={[styles.appTitle, { color: colors.text, marginHorizontal: 6 }]}>{appTitle}</Text>
            <Ionicons name='star' size={16} color={colors.primary} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6 }}>
            <Text style={{ color: colors.text }}>L{level}</Text>
            <Text style={{ color: colors.text }}>{xp} XP</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Gewicht */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t('weight')}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={() => setRange('7')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: range==='7'?colors.primary:'transparent' }]}><Text style={{ color: range==='7'?'#fff':colors.text }}>{t('range7')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setRange('14')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: range==='14'?colors.primary:'transparent' }]}><Text style={{ color: range==='14'?'#fff':colors.text }}>{t('range14')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setRange('30')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: range==='30'?colors.primary:'transparent' }]}><Text style={{ color: range==='30'?'#fff':colors.text }}>{t('range30')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setRange('custom')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: range==='custom'?colors.primary:'transparent' }]}><Text style={{ color: range==='custom'?'#fff':colors.text }}>{t('custom')}</Text></TouchableOpacity>
            </View>
          </View>

          {range==='custom' ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <TouchableOpacity onPress={() => setShowFrom(true)} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{t('from')}: {from?from.toLocaleDateString():"--"}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTo(true)} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{t('to')}: {to?to.toLocaleDateString():"--"}</Text></TouchableOpacity>
            </View>
          ) : null}

          {showFrom && (
            <DateTimePicker value={from || new Date()} mode='date' onChange={(e, d) => { setShowFrom(false); if (d) setFrom(d); }} />
          )}
          {showTo && (
            <DateTimePicker value={to || new Date()} mode='date' onChange={(e, d) => { setShowTo(false); if (d) setTo(d); }} />
          )}

          {weightSeries.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ width: chartWidth, height: 240, justifyContent: 'center' }}>
                <LineChart data={weightSeries} color={colors.primary} thickness={2} hideRules={false} showYAxisText yAxisTextStyle={{ color: colors.muted }} yAxisColor={colors.muted} xAxisColor={colors.muted} noOfSections={4} areaChart startFillColor={colors.primary} endFillColor={colors.primary} startOpacity={0.15} endOpacity={0.01} />
                {/* Labels row under chart */}
                <View style={{ flexDirection: 'row', flexWrap: 'nowrap', marginTop: 8 }}>
                  {weightSeries.map((pt, i) => (
                    <Text key={i} style={{ width: 36, color: colors.muted, textAlign: 'center' }}>{pt.label}</Text>
                  ))}
                </View>
              </View>
            </ScrollView>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('too_few')}</Text>
          )}
        </View>

        {/* L10 Extended Stats placeholder kept for compatibility */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>Erweiterte Statistiken</Text>
          {level >= 10 ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>• Weitere Kennzahlen folgen</Text>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>Ab Level 10 verfügbar.</Text>
          )}
        </View>

        {/* Premium Insights + last 14 weights */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>Premium Insights</Text>
          {level >= 25 ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>Insights folgen.</Text>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>Ab Level 25 verfügbar.</Text>
          )}
          {/* Last 14 weight entries with deltas */}
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 4 }}>{state.language==='de'?'Letzte 14 Einträge':'Last 14 entries'}</Text>
            {last14.length < 2 ? (
              <Text style={{ color: colors.muted }}>{state.language==='de'?'Zu wenige Daten':'Too few data'}</Text>
            ) : (
              last14.map((d, i) => {
                const dt = new Date(d.date);
                const label = `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}`;
                const prev = last14[i-1];
                const diff = i===0 ? 0 : ((Number(d.weight)||0) - (Number(prev?.weight)||0));
                const sign = diff === 0 ? '' : (diff > 0 ? `+${diff.toFixed(1)}kg` : `${diff.toFixed(1)}kg`);
                return (
                  <Text key={d.date} style={{ color: colors.muted }}>{label} {Number(d.weight).toFixed(1)}kg {i>0?`(${sign})`:''}</Text>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 12, fontWeight: '600' }, appTitle: { fontSize: 14, fontWeight: '800' }, card: { borderRadius: 12, padding: 12 }, badge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 } });