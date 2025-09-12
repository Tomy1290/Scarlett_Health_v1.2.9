import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';
import { ensureAndroidChannel, ensureNotificationPermissions, scheduleDailyReminder, cancelNotification, parseHHMM } from '../src/utils/notifications';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75', input: '#ffffff' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8', input: '#1f1520' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e', input: '#fff' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866', input: '#ffffff' };
}

function themeLabel(key: 'pink_default'|'pink_pastel'|'pink_vibrant'|'golden_pink', lang: 'de'|'en') {
  const mapDe: Record<string,string> = { pink_default: 'Rosa – Standard', pink_pastel: 'Rosa – Pastell', pink_vibrant: 'Rosa – Kräftig', golden_pink: 'Goldenes Rosa' };
  const mapEn: Record<string,string> = { pink_default: 'Pink – Default', pink_pastel: 'Pink – Pastel', pink_vibrant: 'Pink – Vibrant', golden_pink: 'Golden Pink' };
  return (lang==='en'?mapEn:mapDe)[key] || key;
}

function reminderLabel(type: string, lang: 'de'|'en', label?: string) {
  if (label) return label;
  const mapDe: Record<string,string> = { pills_morning: 'Tabletten morgens', pills_evening: 'Tabletten abends', weight: 'Gewicht', water: 'Wasser', sport: 'Sport' };
  const mapEn: Record<string,string> = { pills_morning: 'Pills morning', pills_evening: 'Pills evening', weight: 'Weight', water: 'Water', sport: 'Sport' };
  return (lang==='en'?mapEn:mapDe)[type] || type;
}

export default function SettingsScreen() {
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);

  const appTitle = state.language==='en' ? "Scarlett’s Health Tracking" : 'Scarletts Gesundheitstracking';
  const version = Constants?.expoConfig?.version || '—';

  const [customMode, setCustomMode] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customTime, setCustomTime] = useState('');

  async function seedDefaults() {
    await ensureNotificationPermissions();
    await ensureAndroidChannel();
    const defaults = [
      { id: 'pill_morning', type: 'pills_morning', title: state.language==='de'?'Tabletten morgens':'Pills morning', body: state.language==='de'?'Bitte Tabletten einnehmen.':'Please take your pills.', time: '08:00' },
      { id: 'pill_evening', type: 'pills_evening', title: state.language==='de'?'Tabletten abends':'Pills evening', body: state.language==='de'?'Bitte Tabletten einnehmen.':'Please take your pills.', time: '20:00' },
      { id: 'weight_morning', type: 'weight', title: state.language==='de'?'Gewicht':'Weight', body: state.language==='de'?'Gewicht morgens eintragen.':'Log weight in the morning.', time: '07:00' },
      { id: 'water_daily', type: 'water', title: state.language==='de'?'Wasser':'Water', body: state.language==='de'?'Ein Glas Wasser trinken.':'Have a glass of water.', time: '10:00' },
      { id: 'sport_daily', type: 'sport', title: state.language==='de'?'Sport':'Sport', body: state.language==='de'?'Zeit für Sport.':'Time for sport.', time: '16:00' },
    ];
    for (const def of defaults) {
      const notifId = await scheduleDailyReminder(def.id, def.title, def.body, def.time);
      state.addReminder({ id: def.id, type: def.type, time: def.time, enabled: true });
      state.setNotificationMeta(def.id, { id: notifId || '', time: def.time });
    }
    Alert.alert(state.language==='de'?'Erledigt':'Done', state.language==='de'?'Standard-Erinnerungen aktiviert.':'Default reminders enabled.');
  }

  async function toggleReminder(id: string, enabled: boolean) {
    const r = state.reminders.find(x=>x.id===id);
    if (!r) return;
    if (enabled) {
      await ensureNotificationPermissions();
      await ensureAndroidChannel();
      const title = reminderLabel(r.type, state.language, r.label);
      const notifId = await scheduleDailyReminder(id, title, 'Zeit für eine Aktion', r.time);
      state.updateReminder(id, { enabled: true });
      state.setNotificationMeta(id, { id: notifId || '', time: r.time });
    } else {
      const meta = state.notificationMeta[id];
      await cancelNotification(meta?.id);
      state.updateReminder(id, { enabled: false });
      state.setNotificationMeta(id, undefined);
    }
  }

  async function updateTime(id: string, time: string) {
    const ok = !!parseHHMM(time);
    if (!ok) { Alert.alert(state.language==='de'?'Ungültige Zeit':'Invalid time', state.language==='de'?'Bitte HH:MM eingeben.':'Please enter HH:MM.'); return; }
    const r = state.reminders.find(x=>x.id===id);
    if (!r) return;
    state.updateReminder(id, { time });
    const meta = state.notificationMeta[id];
    const title = reminderLabel(r.type, state.language, r.label);
    if (r.enabled) {
      await cancelNotification(meta?.id);
      await ensureNotificationPermissions();
      await ensureAndroidChannel();
      const newId = await scheduleDailyReminder(id, title, 'Zeit für eine Aktion', time);
      state.setNotificationMeta(id, { id: newId || '', time });
    } else {
      state.setNotificationMeta(id, { id: meta?.id || '', time });
    }
  }

  async function addCustomReminder() {
    const currentCustom = state.reminders.filter(r => !!r.label).length;
    if (currentCustom >= 10) { Alert.alert(state.language==='de'?'Limit erreicht':'Limit reached', state.language==='de'?'Maximal 10 eigene Erinnerungen.':'Maximum 10 custom reminders.'); return; }
    if (!customLabel.trim() || !parseHHMM(customTime)) { Alert.alert(state.language==='de'?'Bitte alle Felder ausfüllen':'Please fill all fields'); return; }
    await ensureNotificationPermissions();
    await ensureAndroidChannel();
    const id = `custom_${Date.now()}`;
    const notifId = await scheduleDailyReminder(id, customLabel.trim(), 'Custom reminder', customTime);
    state.addReminder({ id, type: 'custom', label: customLabel.trim(), time: customTime, enabled: true });
    state.setNotificationMeta(id, { id: notifId || '', time: customTime });
    setCustomMode(false); setCustomLabel(''); setCustomTime('');
    Alert.alert(state.language==='de'?'Gespeichert':'Saved');
  }

  async function exportData() {
    try {
      const data = useAppStore.getState();
      const keys = ['days','goal','reminders','chat','saved','achievementsUnlocked','xp','language','theme','eventHistory','legendShown','rewardsSeen','profileAlias','xpLog','aiInsightsEnabled','aiFeedback','eventsEnabled','cycles'];
      const snapshot: any = {}; for (const k of keys) (snapshot as any)[k] = (data as any)[k];
      const json = JSON.stringify(snapshot);
      const fileUri = FileSystem.cacheDirectory + `scarlett-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export' });
    } catch (e) { Alert.alert('Error', String(e)); }
  }

  async function importData() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const txt = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(txt);
      const keys = ['days','goal','reminders','chat','saved','achievementsUnlocked','xp','language','theme','eventHistory','legendShown','rewardsSeen','profileAlias','xpLog','aiInsightsEnabled','aiFeedback','eventsEnabled','cycles'];
      const patch: any = {}; for (const k of keys) if (k in parsed) patch[k] = parsed[k];
      useAppStore.setState(patch);
      useAppStore.getState().recalcAchievements();
      Alert.alert(state.language==='de'?'Import abgeschlossen':'Import finished');
    } catch (e) { Alert.alert('Error', String(e)); }
  }

  const desiredOrder = ['pills_morning','pills_evening','weight','water','sport'];
  const sortedReminders = [...state.reminders].sort((a,b) => {
  const ai = desiredOrder.indexOf(a.type); const bi = desiredOrder.indexOf(b.type);
  const aIdx = ai < 0 ? 999 : ai; const bIdx = bi < 0 ? 999 : bi;
  return aIdx - bIdx;
});

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 20 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel='Zurück'>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='star' size={16} color={colors.primary} />
            <Text style={[styles.appTitle, { color: colors.text, marginHorizontal: 6 }]}>{appTitle}</Text>
            <Ionicons name='star' size={16} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.muted }]}>{state.language==='de'?'Einstellungen':'Settings'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {/* Language */}
          <View style={[styles.card, { backgroundColor: colors.card }]}> 
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>{state.language==='de'?'Sprache':'Language'}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => state.setLanguage('de')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: state.language==='de'?colors.primary:'transparent' }]}><Text style={{ color: state.language==='de'?'#fff':colors.text }}>Deutsch</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => state.setLanguage('en')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: state.language==='en'?colors.primary:'transparent' }]}><Text style={{ color: state.language==='en'?'#fff':colors.text }}>English</Text></TouchableOpacity>
            </View>
          </View>

          {/* Theme */}
          <View style={[styles.card, { backgroundColor: colors.card }]}> 
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>{state.language==='de'?'Design':'Theme'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['pink_default','pink_pastel','pink_vibrant','golden_pink'] as const).map((t) => (
                <TouchableOpacity key={t} onPress={() => state.setTheme(t)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: state.theme===t?colors.primary:'transparent' }]}><Text style={{ color: state.theme===t?'#fff':colors.text }}>{themeLabel(t, state.language)}</Text></TouchableOpacity>
              ))}
              <Text style={{ color: colors.muted, marginTop: 4 }}>{state.language==='de'?'Hinweis: Goldenes Rosa ab Level 75.':'Note: Golden pink at level 75.'}</Text>
            </View>
          </View>

          {/* Reminders */}
          <View style={[styles.card, { backgroundColor: colors.card }]}> 
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'Erinnerungen':'Reminders'}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={seedDefaults} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{state.language==='de'?'Standard anlegen':'Seed defaults'}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setCustomMode((v)=>!v)} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{state.language==='de'?'Eigene':'Custom'}</Text></TouchableOpacity>
              </View>
            </View>
            {customMode ? (
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput placeholder={state.language==='de'?'Label':'Label'} placeholderTextColor={colors.muted} value={customLabel} onChangeText={setCustomLabel} style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }} />
                  <TextInput placeholder='HH:MM' placeholderTextColor={colors.muted} value={customTime} onChangeText={setCustomTime} style={{ width: 100, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => { setCustomMode(false); setCustomLabel(''); setCustomTime(''); }} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{state.language==='de'?'Abbrechen':'Cancel'}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={addCustomReminder} style={[styles.badge, { borderColor: colors.muted, backgroundColor: colors.primary }]}><Text style={{ color: '#fff' }}>{state.language==='de'?'Speichern':'Save'}</Text></TouchableOpacity>
                </View>
              </View>
            ) : null}
            {sortedReminders.length === 0 ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Keine Erinnerungen angelegt.':'No reminders yet.'}</Text>) : null}
            {sortedReminders.map((r) => (
              <View key={r.id} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{reminderLabel(r.type, state.language, r.label)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <TextInput value={r.time} onChangeText={(v)=>updateTime(r.id, v)} placeholder='HH:MM' placeholderTextColor={colors.muted} style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: colors.text, backgroundColor: colors.input }} />
                    <View style={{ width: 8 }} />
                    <Switch value={r.enabled} onValueChange={(v)=>toggleReminder(r.id, v)} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} />
                  </View>
                </View>
                <TouchableOpacity onPress={async ()=>{ await toggleReminder(r.id, false); state.deleteReminder(r.id); }} style={{ padding: 8 }}>
                  <Ionicons name='trash' size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Feature toggles */}
          <View style={[styles.card, { backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
            <View>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'Insights aktiv':'Insights enabled'}</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>{state.language==='de'?'Offline‑Analysen und Tipps anzeigen.':'Show offline analyses and tips.'}</Text>
            </View>
            <Switch value={state.aiInsightsEnabled} onValueChange={state.setAiInsightsEnabled} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
            <View>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'Wöchentliche Events aktiv':'Weekly events enabled'}</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>{state.language==='de'?'Wöchentliche Event‑Challenges mit Bonus‑XP.':'Weekly event challenges with bonus XP.'}</Text>
            </View>
            <Switch value={state.eventsEnabled} onValueChange={state.setEventsEnabled} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} />
          </View>

          {/* App info / Import/Export */}
          <View style={[styles.card, { backgroundColor: colors.card }]}> 
            <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'App':'App'}</Text>
            <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Version':'Version'}: {version}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={exportData} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{state.language==='de'?'Daten exportieren':'Export data'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={importData} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{state.language==='de'?'Daten importieren':'Import data'}</Text></TouchableOpacity>
            </View>
            <Text style={{ color: colors.muted, marginTop: 2 }}>created by Gugi</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appTitle: { fontSize: 18, fontWeight: '800' },
  title: { fontSize: 14, fontWeight: '600' },
  iconBtn: { padding: 8 },
  card: { borderRadius: 12, padding: 12 },
  badge: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});