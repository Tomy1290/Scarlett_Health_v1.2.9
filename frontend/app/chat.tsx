import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAppStore, useLevel } from '../src/store/useStore';
import { computeAIv1 } from '../src/ai/insights';
import { buildCompactSummary } from '../src/ai/summary';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch, getBackendBaseUrl } from '../src/utils/api';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75', input: '#ffffff' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8', input: '#1f1520' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e', input: '#fff' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866', input: '#ffffff' };
}

function fmtTime(ts: number, lang: 'de'|'en'|'pl') {
  try {
    const loc = lang==='de'?'de-DE':(lang==='pl'?'pl-PL':'en-US');
    return new Date(ts).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function generateOfflineReply(state: ReturnType<typeof useAppStore.getState>, userText: string) {
  const lang = state.language;
  const lower = userText.toLowerCase();
  const t = (de: string, en: string, pl?: string) => (lang==='en'?en:(lang==='pl'?(pl||en):de));
  if (lower.includes('wasser') || lower.includes('water')) {
    const avg = (() => {
      const days = Object.values(state.days);
      const count = days.length || 1;
      const sum = days.reduce((a,d)=>a+(d.drinks?.water||0),0);
      return (sum/count).toFixed(1);
    })();
    return t(`Trinkziel Tipp: Ø Wasser aktuell ${avg}/Tag. Versuche über den Tag verteilt 6+ Einheiten zu erreichen.`, `Hydration tip: Current avg water is ${avg}/day. Try to reach 6+ units spread across the day.`, `Wskazówka: średnie spożycie wody ${avg}/dzień. Celuj w 6+ porcji dziennie.`);
  }
  if (lower.includes('kaffee') || lower.includes('coffee')) {
    return t('Kaffee-Kontrolle: Ersetze eine Tasse durch Wasser oder Tee, um Koffein zu reduzieren.', 'Coffee control: Swap one cup for water or tea to reduce caffeine.', 'Zamień jedną kawę na wodę lub herbatę, aby zmniejszyć kofeinę.');
  }
  if (lower.includes('gewicht') || lower.includes('weight') || lower.includes('waga')) {
    return t('Gewichts-Tipp: Beurteile Trends über mehrere Tage. Tägliche Schwankungen sind normal.', 'Weight tip: Assess multi-day trends. Daily fluctuations are normal.', 'Wskazówka: oceniaj trend wagi na przestrzeni dni – wahania dzienne są normalne.');
  }
  if (lower.includes('pille') || lower.includes('pills') || lower.includes('med')) {
    return t('Pillen-Routine: Verknüpfe die Einnahme mit festen Ritualen (z. B. nach dem Zähneputzen).', 'Pill routine: Tie intake to fixed rituals (e.g., after brushing teeth).', 'Rutyna tabletek: powiąż przyjmowanie z rytuałami (np. po myciu zębów).');
  }
  if (lower.includes('sport') || lower.includes('workout') || lower.includes('exercise')) {
    return t('Sport-Streak: Starte mit 10–15 Minuten und erhöhe schrittweise – Kontinuität gewinnt.', 'Workout streak: Start with 10–15 minutes and ramp up – consistency wins.', 'Zacznij od 10–15 min i zwiększaj stopniowo – liczy się regularność.');
  }
  return t('Verstanden. Erzähl mir mehr – was ist dein Ziel diese Woche?', 'Got it. Tell me more – what’s your goal this week?', 'Rozumiem. Jaki cel na ten tydzień?');
}

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

export default function ChatScreen() {
  const router = useRouter();
  const state = useAppStore();
  const { level } = useLevel();
  const colors = useThemeColors(state.theme);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const [typing, setTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const typingAbort = useRef<{abort: boolean}>({ abort: false });
  const [loading, setLoading] = useState(false);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);

  const maxVisible = level >= 50 ? 30 : 5;
  const allChat = state.chat || [];
  const visibleChat = useMemo(() => {
    return allChat.slice(Math.max(0, allChat.length - maxVisible));
  }, [allChat, maxVisible]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [visibleChat.length, typingText]);

  async function typeOut(full: string) {
    setTyping(true); setTypingText(''); typingAbort.current.abort = false;
    for (let i = 0; i < full.length; i++) {
      if (typingAbort.current.abort) break;
      setTypingText(prev => prev + full[i]);
      const ch = full[i];
      let delay = 25;
      if (ch === '.' || ch === '!' || ch === '?') delay = 120;
      else if (ch === ',' || ch === ';' || ch === ':') delay = 60;
      await sleep(delay);
    }
    setTyping(false);
    const finalText = typingAbort.current.abort ? '' : full;
    setTypingText(finalText);
    return finalText;
  }

  async function callLLM(payload: any): Promise<string> {
    try {
      const res = await apiFetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setAiOnline(res.ok);
      if (!res.ok) throw new Error('LLM HTTP ' + res.status);
      const json = await res.json();
      return (json.text || '').toString();
    } catch (e) {
      setAiOnline(false);
      return '';
    }
  }

  async function pingAI() {
    try {
      const res = await apiFetch('/', { method: 'GET' });
      setAiOnline(res.ok);
    } catch { setAiOnline(false); }
  }

  async function handleGreetingIfNeeded() {
    const now = Date.now();
    const last = state.lastChatLeaveAt || 0;
    const allow = last === 0 || (now - last >= 5 * 60 * 1000);
    // Always ping to show status badge
    pingAI();
    if (!allow) return;
    if (!state.aiInsightsEnabled) return;
    setLoading(true);
    const summary = buildCompactSummary({ days: state.days, cycles: state.cycles, language: state.language });
    const text = await callLLM({ mode: 'greeting', language: state.language, model: 'gpt-4o-mini', summary });
    setLoading(false);
    const reply = text && text.trim().length > 0 ? text : (computeAIv1({ days: state.days, language: state.language, aiFeedback: state.aiFeedback, aiInsightsEnabled: state.aiInsightsEnabled })[0]?.text || '');
    if (!reply) return;
    const typed = await typeOut(reply);
    if (typed) {
      const bot = { id: String(Date.now()), sender: 'bot' as const, text: typed, createdAt: Date.now() };
      state.addChat(bot);
      setTypingText('');
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      handleGreetingIfNeeded();
      return () => {
        useAppStore.getState().setLastChatLeaveAt(Date.now());
        typingAbort.current.abort = true;
      };
    }, [state.aiInsightsEnabled, state.language, state.days, state.cycles])
  );

  async function send() {
    const t = text.trim(); if (!t) return;
    const msg = { id: String(Date.now()), sender: 'user' as const, text: t, createdAt: Date.now() };
    state.addChat(msg); setText(''); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let replyText = '';
    if (state.aiInsightsEnabled) {
      setLoading(true);
      const summary = buildCompactSummary({ days: state.days, cycles: state.cycles, language: state.language });
      const hist = (state.chat || []).slice(-10).map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
      const res = await callLLM({ mode: 'chat', language: state.language, model: 'gpt-4o-mini', summary, messages: hist.concat([{ role: 'user', content: t }]) });
      setLoading(false);
      replyText = (res || '').trim();
    }
    if (!replyText) {
      const ai = computeAIv1({ days: state.days, language: state.language, aiFeedback: state.aiFeedback, aiInsightsEnabled: state.aiInsightsEnabled });
      replyText = ai[0]?.text || generateOfflineReply(state, t);
    }
    typingAbort.current.abort = false;
    const typed = await typeOut(replyText);
    if (typed) {
      const bot = { id: String(Date.now()+1), sender: 'bot' as const, text: typed, createdAt: Date.now()+1 };
      state.addChat(bot);
      setTypingText('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  function saveTip(id: string, text: string) {
    if (saved[id]) return;
    const title = (text.slice(0, 30) + (text.length > 30 ? '…' : '')) || 'Gugi-Tipp';
    state.addSaved({ id: String(Date.now()), title: `Gugi: ${title}`, category: 'Chat', tags: ['Gugi','Tipp'], text, createdAt: Date.now() });
    setSaved((s) => ({ ...s, [id]: true }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const canSend = text.trim().length > 0;
  const appTitle = state.language==='en' ? "Scarlett’s Health Tracking" : (state.language==='pl'?'Zdrowie Scarlett':'Scarletts Gesundheitstracking');
  const backendBase = getBackendBaseUrl();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={state.language==='de'?'Zurück':'Back'}>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{appTitle}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>Gugi</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/saved')} style={styles.iconBtn} accessibilityLabel='Gespeichert'>
          <Ionicons name='bookmark' size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* AI status badge */}
      <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={aiOnline ? 'cloud-outline' : 'cloud-offline-outline'} size={14} color={aiOnline ? '#2bb673' : colors.muted} />
          <Text style={{ color: aiOnline ? '#2bb673' : colors.muted, fontSize: 12 }}>
            {aiOnline===null ? '—' : (aiOnline ? 'KI online' : 'KI offline – lokale Tipps aktiv')}
          </Text>
          {backendBase ? (
            <Text style={{ color: colors.muted, fontSize: 12 }}>· {backendBase}</Text>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 8 }} showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {visibleChat.map((m) => (
              <View key={m.id} style={[styles.msgRow, { justifyContent: m.sender==='user' ? 'flex-end' : 'flex-start' }]}> 
                <View style={{ maxWidth: '82%' }}>
                  <View style={[styles.msgBubble, { backgroundColor: m.sender==='user' ? colors.primary : colors.card, borderColor: colors.muted }]}> 
                    <Text style={{ color: m.sender==='user' ? '#fff' : colors.text }}>{m.text}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: m.sender==='user' ? 'flex-end' : 'flex-start', marginTop: 4 }}>
                    {m.sender==='bot' ? (
                      <TouchableOpacity onPress={() => saveTip(m.id, m.text)} accessibilityLabel='Tipp speichern' style={{ paddingHorizontal: 4, paddingVertical: 2, marginRight: 6 }}>
                        <Ionicons name={saved[m.id] ? 'bookmark' : 'bookmark-outline'} size={14} color={saved[m.id] ? colors.primary : colors.muted} />
                      </TouchableOpacity>
                    ) : null}
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{fmtTime(m.createdAt, state.language)}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Typing bubble */}
            {typing && typingText ? (
              <View style={[styles.msgRow, { justifyContent: 'flex-start' }]}> 
                <View style={{ maxWidth: '82%' }}>
                  <View style={[styles.msgBubble, { backgroundColor: colors.card, borderColor: colors.muted }]}> 
                    <Text style={{ color: colors.text }}>{typingText}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {loading && !typing ? (
              <View style={{ alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 8 }}>
                <ActivityIndicator size='small' color={colors.primary} />
              </View>
            ) : null}

            {visibleChat.length === 0 && !typing ? (
              <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 24 }}>{state.language==='de'?'Keine Nachrichten':'No messages yet'}</Text>
            ) : null}
          </ScrollView>
        </View>

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.muted }]}> 
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder={state.language==='de'?'Schreibe eine Nachricht…':(state.language==='pl'?'Napisz wiadomość…':'Type a message…')}
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.muted }]}
            multiline
          />
          <TouchableOpacity disabled={!canSend || typing} onPress={send} style={[styles.sendBtn, { backgroundColor: canSend && !typing ? colors.primary : colors.muted }]} accessibilityLabel={state.language==='de'?'Senden':'Send'}>
            <Ionicons name='send' size={18} color={'#fff'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appTitle: { fontSize: 14, fontWeight: '800' },
  title: { fontSize: 12, fontWeight: '600' },
  iconBtn: { padding: 8 },
  msgRow: { flexDirection: 'row' },
  msgBubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 0 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
  sendBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
});