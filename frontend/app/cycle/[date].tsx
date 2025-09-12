import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../../src/store/useStore';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75', input: '#ffffff' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8', input: '#1f1520' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e', input: '#fff' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866', input: '#ffffff' };
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export default function CycleDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);
  const log = state.cycleLogs[date || ''] || {};
  const lang = state.language;

  const setVal = (field: 'mood'|'energy'|'pain'|'sleep', delta: number) => {
    const cur = (log as any)[field] ?? 5;
    const next = clamp(cur + delta, 1, 10);
    state.setCycleLog(String(date), { [field]: next } as any);
  };

  const setFlow = (val: number) => state.setCycleLog(String(date), { flow: val as any });

  const bleedingLabels = lang==='de'?['Keine','Leicht','Mittel','Normal','Mehr','Heftig','Übertrieben','Extrem']:['None','Light','Medium','Normal','More','Severe','Excessive','Extreme'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel='Zurück'>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{lang==='en' ? "Scarlett’s Health Tracking" : 'Scarletts Gesundheitstracking'}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{lang==='de'?'Zyklus-Tag':'Cycle day'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text style={{ color: colors.muted }}>{date}</Text>

          {/* Scales */}
          {([
            { key: 'mood', icon: 'happy', de: 'Stimmung', en: 'Mood' },
            { key: 'energy', icon: 'flash', de: 'Energie', en: 'Energy' },
            { key: 'pain', icon: 'medkit', de: 'Schmerz', en: 'Pain' },
            { key: 'sleep', icon: 'moon', de: 'Schlaf', en: 'Sleep' },
          ] as const).map((cfg) => {
            const value = (log as any)[cfg.key] ?? 5;
            return (
              <View key={cfg.key} style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={cfg.icon as any} size={18} color={colors.primary} />
                    <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{lang==='de'?cfg.de:cfg.en}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <TouchableOpacity testID={`cycle-${cfg.key}-minus`} onPress={() => setVal(cfg.key, -1)} style={[styles.stepBtn, { borderColor: colors.primary }]}>
                    <Text style={{ color: colors.primary }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.text, fontWeight: '900', fontSize: 20 }}>{value}</Text>
                  <TouchableOpacity testID={`cycle-${cfg.key}-plus`} onPress={() => setVal(cfg.key, +1)} style={[styles.stepBtn, { borderColor: colors.primary }]}>
                    <Text style={{ color: colors.primary }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Bleeding intensity */}
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            <Text style={{ color: colors.text, fontWeight: '700' }}>{lang==='de'?'Blutung':'Bleeding'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {bleedingLabels.map((label, idx) => (
                <TouchableOpacity key={label} testID={`cycle-bleeding-${idx}`} onPress={() => setFlow(idx)} style={[styles.chip, { borderColor: colors.primary, backgroundColor: (log.flow ?? -1)===idx ? colors.primary : 'transparent' }]}> 
                  <Text style={{ color: (log.flow ?? -1)===idx ? '#fff' : colors.text }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Additional: Sex toggle */}
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            <Text style={{ color: colors.text, fontWeight: '700' }}>{lang==='de'?'Weitere Angaben':'Additional'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <TouchableOpacity testID='cycle-sex-toggle' onPress={() => state.setCycleLog(String(date), { sex: !log.sex })} style={[styles.chip, { borderColor: colors.primary, backgroundColor: log.sex ? colors.primary : 'transparent' }]}> 
                <Ionicons name='heart' size={14} color={log.sex ? '#fff' : colors.primary} />
                <Text style={{ color: log.sex ? '#fff' : colors.text, marginLeft: 6 }}>{lang==='de'?'Sex':'Sex'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            <Text style={{ color: colors.text, fontWeight: '700' }}>{lang==='de'?'Notizen':'Notes'}</Text>
            <TextInput testID='cycle-notes' style={{ marginTop: 8, minHeight: 100, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, padding: 10, color: colors.text, backgroundColor: colors.input }} placeholder={lang==='de'?'Notizen hier eingeben...':'Enter notes...'} placeholderTextColor={colors.muted} value={log.notes || ''} onChangeText={(v) => state.setCycleLog(String(date), { notes: v })} multiline />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, appTitle: { fontSize: 14, fontWeight: '800' }, title: { fontSize: 12, fontWeight: '600' }, card: { borderRadius: 12, padding: 12 }, chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 }, stepBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, borderWidth: 1, minWidth: 100, alignItems: 'center' } });