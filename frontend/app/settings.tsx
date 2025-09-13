import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useRouter } from "expo-router";
import { useAppStore } from "../src/store/useStore";
import { ensureAndroidChannel, ensureNotificationPermissions, scheduleDailyReminder, cancelNotification, testNotification, getScheduledNotifications } from "../src/utils/notifications";
import { parseHHMM } from "../src/utils/notifications";

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75', input: '#fff' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8', input: '#1f1520' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e', input: '#fff' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866', input: '#ffffff' };
}

function themeLabel(key: 'pink_default'|'pink_pastel'|'pink_vibrant'|'golden_pink', lang: 'de'|'en'|'pl') {
  const mapDe: Record<string,string> = { pink_default: 'Rosa – Standard', pink_pastel: 'Rosa – Pastell', pink_vibrant: 'Rosa – Kräftig', golden_pink: 'Goldenes Rosa' };
  const mapEn: Record<string,string> = { pink_default: 'Pink – Default', pink_pastel: 'Pink – Pastel', pink_vibrant: 'Pink – Vibrant', golden_pink: 'Golden Pink' };
  const mapPl: Record<string,string> = { pink_default: 'Różowy – domyślny', pink_pastel: 'Różowy – pastel', pink_vibrant: 'Różowy – intensywny', golden_pink: 'Złoty róż' };
  return (lang==='en'?mapEn:(lang==='pl'?mapPl:mapDe))[key] || key;
}

function reminderLabel(type: string, lang: 'de'|'en'|'pl', label?: string) {
  if (label) return label;
  const mapDe: Record<string,string> = { pills_morning: 'Tabletten morgens', pills_evening: 'Tabletten abends', weight: 'Gewicht', water: 'Wasser', sport: 'Sport', custom: 'Eigene Erinnerung' };
  const mapEn: Record<string,string> = { pills_morning: 'Pills morning', pills_evening: 'Pills evening', weight: 'Weight', water: 'Water', sport: 'Sport', custom: 'Custom reminder' };
  const mapPl: Record<string,string> = { pills_morning: 'Tabletki rano', pills_evening: 'Tabletki wieczorem', weight: 'Waga', water: 'Woda', sport: 'Sport', custom: 'Własne przypomnienie' };
  return (lang==='en'?mapEn:(lang==='pl'?mapPl:mapDe))[type] || type;
}

function formatTimeDigits(input: string) {
  const digits = (input || '').replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0,2)}:${digits.slice(2)}`;
}

export default function SettingsScreen() {
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);

  const appTitle = state.language==='en' ? "Scarlett’s Health Tracking" : (state.language==='pl'? 'Zdrowie Scarlett' : 'Scarletts Gesundheitstracking');
  const version = Constants?.expoConfig?.version || '—';

  const [customMode, setCustomMode] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [cupInput, setCupInput] = useState(String(state.waterCupMl || 250));
  const [timeInputs, setTimeInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const r of state.reminders) map[r.id] = r.time;
    setTimeInputs(map);
  }, [state.reminders]);

  async function seedDefaults() {
    await ensureNotificationPermissions();
    await ensureAndroidChannel();
    const defaults = [
      { id: 'pill_morning', type: 'pills_morning', title: state.language==='de'?'Tabletten morgens':(state.language==='pl'?'Tabletki rano':'Pills morning'), body: state.language==='de'?'Bitte Tabletten einnehmen.':(state.language==='pl'?'Proszę przyjąć tabletki.':'Please take your pills.'), time: '08:00' },
      { id: 'pill_evening', type: 'pills_evening', title: state.language==='de'?'Tabletten abends':(state.language==='pl'?'Tabletki wieczorem':'Pills evening'), body: state.language==='de'?'Bitte Tabletten einnehmen.':(state.language==='pl'?'Proszę przyjąć tabletki.':'Please take your pills.'), time: '20:00' },
      { id: 'weight_morning', type: 'weight', title: state.language==='de'?'Gewicht':(state.language==='pl'?'Waga':'Weight'), body: state.language==='de'?'Gewicht morgens eintragen.':(state.language==='pl'?'Zapisz wagę rano.':'Log weight in the morning.'), time: '07:00' },
      { id: 'water_daily', type: 'water', title: state.language==='de'?'Wasser':(state.language==='pl'?'Woda':'Water'), body: state.language==='de'?'Ein Glas Wasser trinken.':(state.language==='pl'?'Wypij szklankę wody.':'Have a glass of water.'), time: '10:00' },
      { id: 'sport_daily', type: 'sport', title: state.language==='de'?'Sport':(state.language==='pl'?'Sport':'Sport'), body: state.language==='de'?'Zeit für Sport.':(state.language==='pl'?'Czas na sport.':'Time for sport.'), time: '16:00' },
    ];
    for (const def of defaults) {
      const notifId = await scheduleDailyReminder(def.id, def.title, def.body, def.time, def.type === 'pills_morning' || def.type === 'pills_evening');
      state.addReminder({ id: def.id, type: def.type, time: def.time, enabled: true });
      state.setNotificationMeta(def.id, { id: notifId || '', time: def.time });
    }
    Alert.alert(state.language==='de'?'Erledigt':(state.language==='pl'?'Gotowe':'Done'), state.language==='de'?'Standard-Erinnerungen aktiviert.':(state.language==='pl'?'Domyślne przypomnienia włączone.':'Default reminders enabled.'));
  }

  async function toggleReminder(id: string, enabled: boolean) {
    const r = state.reminders.find(x=>x.id===id);
    if (!r) return;
    if (enabled) {
      await ensureNotificationPermissions();
      await ensureAndroidChannel();
      const title = reminderLabel(r.type, state.language as any, r.label);
      const notifId = await scheduleDailyReminder(id, title, state.language==='de'?'Zeit für eine Aktion':(state.language==='pl'?'Czas na działanie':'Time for an action'), timeInputs[id] || r.time, r.type === 'pills_morning' || r.type === 'pills_evening');
      state.updateReminder(id, { enabled: true, time: timeInputs[id] || r.time });
      state.setNotificationMeta(id, { id: notifId || '', time: timeInputs[id] || r.time });
    } else {
      const meta = state.notificationMeta[id];
      await cancelNotification(meta?.id);
      state.updateReminder(id, { enabled: false });
      state.setNotificationMeta(id, undefined);
    }
  }

  async function updateTime(id: string, time: string) {
    const ok = !!parseHHMM(time);
    if (!ok) { return; }
    const r = state.reminders.find(x=>x.id===id);
    if (!r) return;
    state.updateReminder(id, { time });
    const meta = state.notificationMeta[id];
    const title = reminderLabel(r.type, state.language as any, r.label);
    if (r.enabled) {
      await cancelNotification(meta?.id);
      await ensureNotificationPermissions();
      await ensureAndroidChannel();
      const newId = await scheduleDailyReminder(id, title, state.language==='de'?'Zeit für eine Aktion':(state.language==='pl'?'Czas na działanie':'Time for an action'), time, r.type === 'pills_morning' || r.type === 'pills_evening');
      state.setNotificationMeta(id, { id: newId || '', time });
    } else {
      state.setNotificationMeta(id, { id: meta?.id || '', time });
    }
  }

  async function exportData() {
    try {
      const data = useAppStore.getState();
      const keys = ['days','goal','reminders','chat','saved','achievementsUnlocked','xp','language','theme','eventHistory','legendShown','rewardsSeen','profileAlias','xpLog','aiInsightsEnabled','aiFeedback','eventsEnabled','cycles','cycleLogs','waterCupMl'];
      const snapshot: any = {}; for (const k of keys) (snapshot as any)[k] = (data as any)[k];
      const json = JSON.stringify(snapshot, null, 2);
      if (Platform.OS === 'android' && (FileSystem as any).StorageAccessFramework) {
        const saf = (FileSystem as any).StorageAccessFramework;
        const perm = await saf.requestDirectoryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Hinweis', 'Keine Ordnerberechtigung erteilt.'); return; }
        const fileUri = await saf.createFileAsync(perm.directoryUri, `scarlett-backup-${Date.now()}.json`, 'application/json');
        await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert('Export', 'Backup wurde gespeichert.');
      } else {
        const fileUri = FileSystem.cacheDirectory + `scarlett-backup-${Date.now()}.json`;
        await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export' });
      }
    } catch (e) { Alert.alert('Error', String(e)); }
  }

  async function importData() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const txt = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(txt);
      const keys = ['days','goal','reminders','chat','saved','achievementsUnlocked','xp','language','theme','eventHistory','legendShown','rewardsSeen','profileAlias','xpLog','aiInsightsEnabled','aiFeedback','eventsEnabled','cycles','cycleLogs','waterCupMl'];
      const patch: any = {}; for (const k of keys) if (k in parsed) patch[k] = parsed[k];
      useAppStore.setState(patch);
      useAppStore.getState().recalcAchievements();
      Alert.alert(state.language==='de'?'Import abgeschlossen':(state.language==='pl'?'Import zakończony':'Import finished'));
    } catch (e) { Alert.alert('Error', String(e)); }
  }

  const desiredOrder = ['pills_morning','pills_evening','weight','water','sport'];
  const sortedReminders = [...state.reminders].sort((a,b) => { const ai = desiredOrder.indexOf(a.type); const bi = desiredOrder.indexOf(b.type); const aIdx = ai < 0 ? 999 : ai; const bIdx = bi < 0 ? 999 : bi; return aIdx - bIdx; });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel='Zurück'>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='star' size={16} color={colors.primary} />
            <Text style={[styles.appTitle, { color: colors.text, marginHorizontal: 6 }]}>{appTitle}</Text>
            <Ionicons name='star' size={16} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.muted }]}>{state.language==='de'?'Einstellungen':(state.language==='pl'?'Ustawienia':'Settings')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Language */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>{state.language==='de'?'Sprache':(state.language==='pl'?'Język':'Language')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => state.setLanguage('de')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: state.language==='de'?colors.primary:'transparent' }]}><Text style={{ color: state.language==='de'?'#fff':colors.text }}>Deutsch</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => state.setLanguage('en')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: state.language==='en'?colors.primary:'transparent' }]}><Text style={{ color: state.language==='en'?'#fff':colors.text }}>English</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => state.setLanguage('pl')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: state.language==='pl'?colors.primary:'transparent' }]}><Text style={{ color: state.language==='pl'?'#fff':colors.text }}>Polski</Text></TouchableOpacity>
          </View>
        </View>

        {/* Theme */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'Theme':(state.language==='pl'?'Motyw':'Theme')}</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Wähle ein App-Theme. „Golden Pink“ ab Level 75.':(state.language==='pl'?'Wybierz motyw aplikacji. „Golden Pink” od poziomu 75.':'Choose an app theme. "Golden Pink" unlocks at level 75.')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {(['pink_default','pink_pastel','pink_vibrant','golden_pink'] as const).map((t) => (
              <TouchableOpacity key={t} onPress={() => state.setTheme(t)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: state.theme===t?colors.primary:'transparent' }]}>
                <Text style={{ color: state.theme===t?'#fff':colors.text }}>{themeLabel(t, state.language as any)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Drinks settings */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='water' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{state.language==='de'?'Trinken':(state.language==='pl'?'Napoje':'Drinks')}</Text>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Bechergröße für Wasser (ml). Fortschrittsbalken berechnet Tagesziel automatisch aus Gewicht (35 ml/kg) und +500 ml bei Sport.':(state.language==='pl'?'Rozmiar kubka wody (ml). Pasek postępu oblicza cel dzienny automatycznie z wagi (35 ml/kg) i +500 ml przy sporcie.':'Cup size for water (ml). Progress bar computes daily target automatically from weight (35 ml/kg) and +500 ml if sport.')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: colors.text, width: 160 }}>{state.language==='de'?'Bechergröße':(state.language==='pl'?'Rozmiar kubka':'Cup size')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TextInput keyboardType='number-pad' value={cupInput} onChangeText={setCupInput} onBlur={() => { const n = parseInt((cupInput||'').replace(/[^0-9]/g,'')||'0',10); const v = Math.max(0, Math.min(1000, isNaN(n)?0:n)); state.setWaterCupMl(v); setCupInput(String(v)); }} style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }} />
              <Text style={{ color: colors.muted, marginLeft: 8 }}>ml</Text>
            </View>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Bereich: 0–1000 ml.':(state.language==='pl'?'Zakres: 0–1000 ml.':'Range: 0–1000 ml.')}</Text>
        </View>

        {/* Reminders */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'Erinnerungen':(state.language==='pl'?'Przypomnienia':'Reminders')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={testNotification} style={[styles.badge, { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}>
                <Text style={{ color: '#fff' }}>{state.language==='de'?'Test':(state.language==='pl'?'Test':'Test')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={seedDefaults} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{state.language==='de'?'Standard anlegen':(state.language==='pl'?'Utwórz domyślne':'Seed defaults')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setCustomMode((v)=>!v)} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{state.language==='de'?'Eigene':(state.language==='pl'?'Własne':'Custom')}</Text></TouchableOpacity>
            </View>
          </View>
          {customMode ? (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput placeholder={state.language==='de'?'Label':(state.language==='pl'?'Etykieta':'Label')} placeholderTextColor={colors.muted} value={customLabel} onChangeText={setCustomLabel} style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }} />
                <TextInput placeholder='HH:MM' placeholderTextColor={colors.muted} value={customTime} onChangeText={(v)=>setCustomTime(formatTimeDigits(v))} style={{ width: 100, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <TouchableOpacity onPress={() => { setCustomMode(false); setCustomLabel(''); setCustomTime(''); }} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{state.language==='de'?'Abbrechen':(state.language==='pl'?'Anuluj':'Cancel')}</Text></TouchableOpacity>
                <TouchableOpacity onPress={async ()=>{ const currentCustom = state.reminders.filter(r => !!r.label).length; if (currentCustom >= 10) { Alert.alert(state.language==='de'?'Limit erreicht':(state.language==='pl'?'Limit osiągnięty':'Limit reached'), state.language==='de'?'Maximal 10 eigene Erinnerungen.':(state.language==='pl'?'Maks. 10 własnych przypomnień.':'Maximum 10 custom reminders.')); return; } if (!customLabel.trim() || !parseHHMM(customTime)) { Alert.alert(state.language==='de'?'Bitte alle Felder ausfüllen':(state.language==='pl'?'Proszę wypełnić wszystkie pola':'Please fill all fields')); return; } await ensureNotificationPermissions(); await ensureAndroidChannel(); const id = `custom_${Date.now()}`; const notifId = await scheduleDailyReminder(id, customLabel.trim(), 'Custom reminder', customTime, false); state.addReminder({ id, type: 'custom', label: customLabel.trim(), time: customTime, enabled: true }); state.setNotificationMeta(id, { id: notifId || '', time: customTime }); setCustomMode(false); setCustomLabel(''); setCustomTime(''); Alert.alert(state.language==='de'?'Gespeichert':(state.language==='pl'?'Zapisano':'Saved')); }} style={[styles.badge, { borderColor: colors.muted, backgroundColor: colors.primary }]}><Text style={{ color: '#fff' }}>{state.language==='de'?'Speichern':(state.language==='pl'?'Zapisz':'Save')}</Text></TouchableOpacity>
              </View>
            </View>
          ) : null}
          {sortedReminders.length === 0 ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Keine Erinnerungen angelegt.':(state.language==='pl'?'Brak przypomnień.':'No reminders yet.')}</Text>) : null}
          {sortedReminders.map((r) => (
            <View key={r.id} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{reminderLabel(r.type, state.language as any, r.label)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <TextInput value={timeInputs[r.id] ?? r.time} onChangeText={(v)=>setTimeInputs((m)=>({ ...m, [r.id]: formatTimeDigits(v) }))} onBlur={()=> updateTime(r.id, timeInputs[r.id] ?? r.time)} placeholder='HH:MM' placeholderTextColor={colors.muted} style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: colors.text, backgroundColor: colors.input }} />
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

        {/* Weekly events toggle */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='calendar' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{state.language==='de'?'Wöchentliche Events':(state.language==='pl'?'Wydarzenia tygodniowe':'Weekly events')}</Text>
            </View>
            <Switch value={state.eventsEnabled} onValueChange={(v)=>state.setEventsEnabled(v)} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} />
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Schalte saisonale/wöchentliche Events ein oder aus.':(state.language==='pl'?'Włącz/wyłącz sezonowe/tygodniowe wydarzenia.':'Enable/disable seasonal/weekly events.')}</Text>
        </View>

        {/* Premium Insights */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='sparkles' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{state.language==='de'?'Premium Insights':(state.language==='pl'?'Premium Insights':'Premium insights')}</Text>
            </View>
            <Switch value={state.aiInsightsEnabled} onValueChange={(v)=>state.setAiInsightsEnabled(v)} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} />
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Aktiviere KI-gestützte Tipps im Chat und in der Analyse.':(state.language==='pl'?'Włącz wskazówki AI w czacie i analizie.':'Enable AI-powered tips in chat and analysis.')}</Text>
        </View>

        {/* Data & Backup (Import/Export) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='folder' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{state.language==='de'?'Daten & Backup (Import/Export)':(state.language==='pl'?'Dane i kopia (Import/Eksport)':'Data & Backup (Import/Export)')}</Text>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Sichere oder stelle deine App-Daten wieder her.':(state.language==='pl'?'Zabezpiecz lub przywróć dane aplikacji.':'Backup or restore your app data.')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity onPress={exportData} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{state.language==='de'?'Daten exportieren':(state.language==='pl'?'Eksport danych':'Export data')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={importData} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{state.language==='de'?'Daten importieren':(state.language==='pl'?'Import danych':'Import data')}</Text></TouchableOpacity>
          </View>
        </View>

        {/* App info */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'App':(state.language==='pl'?'Aplikacja':'App')}</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Version':(state.language==='pl'?'Wersja':'Version')}: {version}</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>created by Gugi</Text>
        </View>
      </ScrollView>
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