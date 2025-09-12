import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';
import { markersForMonth } from '../src/utils/cycle';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const days: Date[] = [];
  let d = new Date(first);
  while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
}

function dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

export default function CycleScreen() {
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);
  const { period, upcomingPeriod, fertile, ovulation, expected, avgCycleLen, avgPeriodLen, expectedNext } = useMemo(() => markersForMonth(year, month, state.cycles), [year, month, state.cycles]);

  const lang = state.language;

  // entries markers from cycleLogs
  const hasLog = new Set<string>();
  for (const k of Object.keys(state.cycleLogs||{})) {
    const v = state.cycleLogs[k];
    if (!v) continue;
    if (typeof v.mood==='number' || typeof v.energy==='number' || typeof v.pain==='number' || typeof v.sleep==='number' || typeof v.flow==='number' || typeof v.sex==='boolean' || (v.notes && v.notes.trim().length>0)) {
      hasLog.add(k);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel='Zurück'>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{lang==='en' ? "Scarlett’s Health Tracking" : 'Scarletts Gesundheitstracking'}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{lang==='de'?'Zyklus':'Cycle'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Analysis header */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{lang==='de'?'Analyse':'Analysis'}</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>Ø {lang==='de'?'Zykluslänge':'cycle length'}: {avgCycleLen} {lang==='de'?'Tage':'days'}</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>Ø {lang==='de'?'Periodenlänge':'period length'}: {avgPeriodLen} {lang==='de'?'Tage':'days'}</Text>
          {expectedNext ? (<Text style={{ color: colors.muted, marginTop: 2 }}>{lang==='de'?'Nächster Zyklus erwartet am':'Next cycle expected on'} {expectedNext.toLocaleDateString()}</Text>) : null}
        </View>

        {/* Calendar */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => setCursor(new Date(year, month-1, 1))} accessibilityLabel='Vorheriger Monat'>
              <Ionicons name='chevron-back' size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{new Date(year, month, 1).toLocaleDateString(lang==='de'?'de-DE':'en-US', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={() => setCursor(new Date(year, month+1, 1))} accessibilityLabel='Nächster Monat'>
              <Ionicons name='chevron-forward' size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          {/* Weekday header (Mon start) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {[lang==='de'?['Mo','Di','Mi','Do','Fr','Sa','So']:['Mo','Tu','We','Th','Fr','Sa','Su']].flat().map((d, i) => (
              <Text key={i} style={{ color: colors.muted, width: `${100/7}%`, textAlign: 'center' }}>{d}</Text>
            ))}
          </View>
          {/* Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {(() => {
              const first = new Date(year, month, 1);
              const pad = (first.getDay() + 6) % 7; // Monday first
              const blanks = Array.from({ length: pad });
              return (
                <>
                  {blanks.map((_, i) => (<View key={`b${i}`} style={{ width: `${100/7}%`, height: 44 }} />))}
                  {monthDays.map((d, i) => {
                    const key = dateKey(d);
                    const isPeriod = period.has(key);
                    const isUpcoming = upcomingPeriod.has(key);
                    const isFertile = fertile.has(key);
                    const isOv = ovulation.has(key);
                    const isExpected = expected.has(key);
                    const has = hasLog.has(key);
                    return (
                      <TouchableOpacity key={i} style={{ width: `${100/7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => router.push(`/cycle/${key}`)} accessibilityLabel={`Tag ${key}`} testID={`cycle-day-${key}`}>
                        <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: isPeriod ? colors.primary : (isUpcoming ? `${colors.primary}33` : (isFertile ? `${colors.primary}22` : 'transparent')),
                          borderWidth: isExpected ? 2 : (isFertile ? 1 : 0), borderColor: isExpected ? colors.primary : (isFertile ? colors.primary : 'transparent') }}>
                          <Text style={{ color: (isPeriod ? '#fff' : colors.text) }}>{d.getDate()}</Text>
                          {isOv ? <View style={{ position: 'absolute', right: 2, top: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: isPeriod ? '#fff' : colors.primary }} /> : null}
                          {has ? <View style={{ position: 'absolute', bottom: 3, width: 18, height: 2, backgroundColor: isPeriod ? '#fff' : colors.primary, borderRadius: 1 }} /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              );
            })()}
          </View>
          {/* Legend */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{lang==='de'?'Periode':'Period'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: `${colors.primary}33" }} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{lang==='de'?'Periode (bevorstehend)':'Period (upcoming)'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: colors.primary }} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{lang==='de'?'Fruchtbar':'Fertile'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary }} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{lang==='de'?'Erwarteter Start':'Expected start'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 2, backgroundColor: colors.primary, marginRight: 6 }} />
              <Text style={{ color: colors.text }}>{lang==='de'?'Eintrag vorhanden':'Has entry'}</Text>
            </View>
          </View>
        </View>

        {/* History – last 12 cycles (kept) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{lang==='de'?'Historie (12 Zyklen)':'History (12 cycles)'}</Text>
          {state.cycles.length === 0 ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Keine Einträge.':'No entries.'}</Text>
          ) : (
            [...state.cycles].slice(-12).map((c, idx) => {
              const s = new Date(c.start); const e = c.end ? new Date(c.end) : undefined;
              const len = e ? Math.max(1, Math.round((+e - +s)/(24*60*60*1000))+1) : undefined;
              return (
                <Text key={c.start+String(idx)} style={{ color: colors.muted, marginTop: idx===0?6:2 }}>
                  {s.toLocaleDateString()} {e ? `– ${e.toLocaleDateString()} (${len} ${lang==='de'?'Tage':'days'})` : `– ${lang==='de'?'laufend':'ongoing'}`}
                </Text>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, appTitle: { fontSize: 14, fontWeight: '800' }, title: { fontSize: 12, fontWeight: '600' }, card: { borderRadius: 12, padding: 12 } });