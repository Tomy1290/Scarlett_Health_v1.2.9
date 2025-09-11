import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore, getAverageCycleLengthDays } from '../src/store/useStore';

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

  const avgLen = getAverageCycleLengthDays(state.cycles);
  const starts = [...state.cycles].map(c => c.start).filter(Boolean).sort();
  const lastStart = starts.slice(-1)[0];
  const expectedNext = lastStart ? (() => { const dt = new Date(lastStart); dt.setDate(dt.getDate() + avgLen); return dt; })() : null;

  // build set of cycle dates
  const inCycle = new Set<string>();
  for (const c of state.cycles) {
    const s = new Date(c.start);
    const end = c.end ? new Date(c.end) : new Date(s.getFullYear(), s.getMonth(), s.getDate() + avgLen);
    let cur = new Date(s);
    while (+cur <= +end) { inCycle.add(dateKey(cur)); cur.setDate(cur.getDate()+1); }
  }

  const lang = state.language;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{lang==='en' ? "Scarlett’s Health Tracking" : 'Scarletts Gesundheitstracking'}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{lang==='de'?'Zyklus':'Cycle'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{lang==='de'?'Analyse':'Analysis'}</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>Ø {lang==='de'?'Zykluslänge':'cycle length'}: {avgLen} {lang==='de'?'Tage':'days'}</Text>
          {expectedNext ? (
            <Text style={{ color: colors.muted, marginTop: 2 }}>{lang==='de'?'Nächster Zyklus erwartet am':'Next cycle expected on'} {expectedNext.toLocaleDateString()}</Text>
          ) : null}
          <Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Historie':'History'}: {state.cycles.length} {lang==='de'?'Einträge':'entries'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => setCursor(new Date(year, month-1, 1))}>
              <Ionicons name='chevron-back' size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{new Date(year, month, 1).toLocaleDateString(lang==='de'?'de-DE':'en-US', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={() => setCursor(new Date(year, month+1, 1))}>
              <Ionicons name='chevron-forward' size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          {/* Weekday header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {['Mo','Di','Mi','Do','Fr','Sa','So'].map((d, i) => (
              <Text key={i} style={{ color: colors.muted, width: `${100/7}%`, textAlign: 'center' }}>{lang==='de'?d:['Mo','Tu','We','Th','Fr','Sa','Su'][i]}</Text>
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
                  {blanks.map((_, i) => (<View key={`b${i}`} style={{ width: `${100/7}%`, height: 40 }} />))}
                  {monthDays.map((d, i) => {
                    const key = dateKey(d);
                    const selected = inCycle.has(key);
                    return (
                      <View key={i} style={{ width: `${100/7}%`, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: selected ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: selected ? '#fff' : colors.text }}>{d.getDate()}</Text>
                        </View>
                      </View>
                    );
                  })}
                </>
              );
            })()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, appTitle: { fontSize: 14, fontWeight: '800' }, title: { fontSize: 12, fontWeight: '600' }, card: { borderRadius: 12, padding: 12 } });