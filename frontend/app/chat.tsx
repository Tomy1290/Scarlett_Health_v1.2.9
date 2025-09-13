import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAppStore, useLevel } from '../src/store/useStore';
import { useFocusEffect } from '@react-navigation/native';
import { localGreeting, localReply } from '../src/ai/localChat';
import { searchRecipes, getRecipeDetail } from '../src/ai/recipes';
import type { Cuisine, Meal, Category } from '../src/data/recipes';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75', input: '#ffffff' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8', input: '#1f1520' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e', input: '#fff' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866', input: '#ffffff' };
}

function fmtTime(ts: number, lang: 'de'|'en'|'pl') {
  try { const loc = lang==='de'?'de-DE':(lang==='pl'?'pl-PL':'en-US'); return new Date(ts).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}
function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

const CUISINES: (Cuisine|'any')[] = ['any','de','pl','it','gr','tr','us'];
const MEALS: (Meal|'any')[] = ['any','breakfast','lunch','dinner'];
const CATS: (Category|'any')[] = ['any','fleisch','lowcarb','abnehmen','vegetarisch','kuchen','suesses'];

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

  const [showFilter, setShowFilter] = useState(false);
  const [selCuisine, setSelCuisine] = useState<Cuisine|'any'>('any');
  const [selMeal, setSelMeal] = useState<Meal|'any'>('any');
  const [selCat, setSelCat] = useState<Category|'any'>('any');
  const [kw, setKw] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);

  const maxVisible = level >= 50 ? 30 : 5;
  const allChat = state.chat || [];
  const visibleChat = useMemo(() => allChat.slice(Math.max(0, allChat.length - maxVisible)), [allChat, maxVisible]);

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50); }, [visibleChat.length, typingText]);

  async function typeOut(full: string) {
    setTyping(true); setTypingText(''); typingAbort.current.abort = false;
    for (let i = 0; i < full.length; i++) {
      if (typingAbort.current.abort) break;
      setTypingText(prev => prev + full[i]);
      const ch = full[i]; let delay = 25; if (ch==='.'||ch==='!'||ch==='?') delay = 120; else if (ch===','||ch===';'||ch===':') delay = 60; await sleep(delay);
    }
    setTyping(false);
    const finalText = typingAbort.current.abort ? '' : full; setTypingText(finalText); return finalText;
  }

  async function handleGreetingIfNeeded() {
    const now = Date.now(); const last = state.lastChatLeaveAt || 0; const allow = last === 0 || (now - last >= 5 * 60 * 1000);
    if (!allow) return; if (!state.aiInsightsEnabled) return;
    const reply = await localGreeting(state); if (!reply) return; const typed = await typeOut(reply);
    if (typed) { const bot = { id: String(Date.now()), sender: 'bot' as const, text: typed, createdAt: Date.now() }; state.addChat(bot); setTypingText(''); }
  }

  useFocusEffect(React.useCallback(() => { handleGreetingIfNeeded(); return () => { useAppStore.getState().setLastChatLeaveAt(Date.now()); typingAbort.current.abort = true; }; }, [state.aiInsightsEnabled, state.language, state.days, state.cycles]));

  async function send() {
    const t = text.trim(); if (!t) return;
    const msg = { id: String(Date.now()), sender: 'user' as const, text: t, createdAt: Date.now() };
    state.addChat(msg); setText(''); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const replyText = await localReply(state, t);
    typingAbort.current.abort = false; const typed = await typeOut(replyText);
    if (typed) { const bot = { id: String(Date.now()+1), sender: 'bot' as const, text: typed, createdAt: Date.now()+1 }; state.addChat(bot); setTypingText(''); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80); }
  }

  function saveTip(id: string, text: string) {
    if (saved[id]) return; const title = (text.slice(0, 30) + (text.length > 30 ? '…' : '')) || 'Gugi-Tipp';
    state.addSaved({ id: String(Date.now()), title: `Gugi: ${title}`, category: 'Chat', tags: ['Gugi','Tipp'], text, createdAt: Date.now() }); setSaved((s) => ({ ...s, [id]: true })); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const canSend = text.trim().length > 0; const appTitle = state.language==='en' ? "Scarlett’s Health Tracking" : (state.language==='pl'?'Zdrowie Scarlett':'Scarletts Gesundheitstracking');
  const lbl = (de: string, en: string, pl?: string) => (state.language==='en'?en:(state.language==='pl'?(pl||en):de));

  function runSearch() {
    const res = searchRecipes({ lang: state.language as any, cuisine: selCuisine, meal: selMeal, category: selCat, keywords: kw, limit: 20 }); setResults(res as any);
  }

  function shareResultsToChat() {
    if (!results.length) return; const lang = state.language as 'de'|'en'|'pl';
    const list = results.slice(0,5).map((r:any)=>`• ${r.title[lang]} – ${r.desc[lang]}`).join('\n');
    const text = lbl('Rezepte:', 'Recipes:', 'Przepisy:') + '\n' + list;
    const bot = { id: String(Date.now()), sender: 'bot' as const, text, createdAt: Date.now() }; state.addChat(bot);
    setShowFilter(false); setResults([]);
  }

  const detail = detailId ? getRecipeDetail(detailId) : null;

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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setShowFilter(true)} style={styles.iconBtn} accessibilityLabel='Rezepte filtern'>
            <Ionicons name='filter' size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/saved')} style={styles.iconBtn} accessibilityLabel='Gespeichert'>
            <Ionicons name='bookmark' size={20} color={colors.text} />
          </TouchableOpacity>
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

            {typing && typingText ? (
              <View style={[styles.msgRow, { justifyContent: 'flex-start' }]}> 
                <View style={{ maxWidth: '82%' }}>
                  <View style={[styles.msgBubble, { backgroundColor: colors.card, borderColor: colors.muted }]}> 
                    <Text style={{ color: colors.text }}>{typingText}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {visibleChat.length === 0 && !typing ? (
              <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 24 }}>{lbl('Keine Nachrichten','No messages yet','Brak wiadomości')}</Text>
            ) : null}
          </ScrollView>
        </View>

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.muted }]}> 
          <TextInput ref={inputRef} value={text} onChangeText={setText} placeholder={lbl('Schreibe eine Nachricht…','Type a message…','Napisz wiadomość…')} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.muted }]} multiline />
          <TouchableOpacity disabled={!canSend || typing} onPress={send} style={[styles.sendBtn, { backgroundColor: canSend && !typing ? colors.primary : colors.muted }]} accessibilityLabel={lbl('Senden','Send','Wyślij')}>
            <Ionicons name='send' size={18} color={'#fff'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent animationType='slide' onRequestClose={() => setShowFilter(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.muted }]}> 
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{lbl('Rezepte filtern','Filter recipes','Filtruj przepisy')}</Text>
                <TouchableOpacity onPress={() => setShowFilter(false)}>
                  <Ionicons name='close' size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <Text style={{ color: colors.muted, marginTop: 6 }}>{lbl('Wähle Küche, Kategorie, Mahlzeit oder nutze Suche.','Choose cuisine, category, meal or use search.','Wybierz kuchnię, kategorię, posiłek lub użyj wyszukiwania.')}</Text>

              <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
                <Text style={{ color: colors.text, marginTop: 8, fontWeight: '600' }}>{lbl('Küche','Cuisine','Kuchnia')}</Text>
                <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingVertical: 6 }} showsHorizontalScrollIndicator={false}>
                  {CUISINES.map(c => (
                    <TouchableOpacity key={c} onPress={() => setSelCuisine(c as any)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: selCuisine===c?colors.primary:'transparent' }]}> 
                      <Text style={{ color: selCuisine===c?'#fff':colors.text }}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={{ color: colors.text, marginTop: 8, fontWeight: '600' }}>{lbl('Kategorie','Category','Kategoria')}</Text>
                <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingVertical: 6 }} showsHorizontalScrollIndicator={false}>
                  {CATS.map(c => (
                    <TouchableOpacity key={c} onPress={() => setSelCat(c as any)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: selCat===c?colors.primary:'transparent' }]}> 
                      <Text style={{ color: selCat===c?'#fff':colors.text }}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={{ color: colors.text, marginTop: 8, fontWeight: '600' }}>{lbl('Mahlzeit','Meal','Posiłek')}</Text>
                <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingVertical: 6 }} showsHorizontalScrollIndicator={false}>
                  {MEALS.map(m => (
                    <TouchableOpacity key={m} onPress={() => setSelMeal(m as any)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: selMeal===m?colors.primary:'transparent' }]}> 
                      <Text style={{ color: selMeal===m?'#fff':colors.text }}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={{ color: colors.text, marginTop: 8, fontWeight: '600' }}>{lbl('Suche','Search','Szukaj')}</Text>
                <TextInput value={kw} onChangeText={setKw} placeholder={lbl('z. B. low carb, schnell','e.g., low carb, quick','np. low carb, szybko')} placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text }]} />

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => { setSelCuisine('any'); setSelMeal('any'); setSelCat('any'); setKw(''); setResults([]); }} style={[styles.badge, { borderColor: colors.muted }]}> 
                    <Text style={{ color: colors.text }}>{lbl('Zurücksetzen','Reset','Reset')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={runSearch} style={[styles.badge, { backgroundColor: colors.primary }]}> 
                    <Text style={{ color: '#fff' }}>{lbl('Suchen','Search','Szukaj')}</Text>
                  </TouchableOpacity>
                </View>

                {results.length>0 ? (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {results.map((r:any) => (
                      <View key={r.id} style={[styles.card, { backgroundColor: colors.card }]}> 
                        <Text style={{ color: colors.text, fontWeight: '700' }}>{r.title[state.language]}</Text>
                        <Text style={{ color: colors.muted, marginTop: 2 }}>{r.desc[state.language]}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                          <TouchableOpacity onPress={() => setDetailId(r.id)} style={[styles.badge, { borderColor: colors.muted }]}> 
                            <Text style={{ color: colors.text }}>{lbl('Details','Details','Szczegóły')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                      <TouchableOpacity onPress={shareResultsToChat} style={[styles.badge, { backgroundColor: colors.primary }]}> 
                        <Text style={{ color: '#fff' }}>{lbl('In Chat teilen','Share to chat','Udostępnij na czacie')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!detail} transparent animationType='slide' onRequestClose={() => setDetailId(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            {detail ? (
              <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.muted }]}> 
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{detail.title[state.language as 'de'|'en'|'pl']}</Text>
                  <TouchableOpacity onPress={() => setDetailId(null)}>
                    <Ionicons name='close' size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.muted, marginTop: 4 }}>{detail.desc[state.language as 'de'|'en'|'pl']}</Text>
                <Text style={{ color: colors.text, marginTop: 6 }}>{detail.durationMin} Min · {detail.kcal} kcal</Text>
                <Text style={{ color: colors.text, marginTop: 8, fontWeight: '600' }}>{lbl('Zutaten','Ingredients','Składniki')}</Text>
                {detail.ingredients[state.language as 'de'|'en'|'pl'].map((it,idx)=>(<Text key={idx} style={{ color: colors.muted }}>• {it}</Text>))}
                <Text style={{ color: colors.text, marginTop: 8, fontWeight: '600' }}>{lbl('Schritte','Steps','Kroki')}</Text>
                {detail.steps[state.language as 'de'|'en'|'pl'].map((it,idx)=>(<Text key={idx} style={{ color: colors.muted }}>{idx+1}. {it}</Text>))}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                  <TouchableOpacity onPress={() => { const lang = state.language as 'de'|'en'|'pl'; const txt = `${detail.title[lang]}\n${detail.desc[lang]}\n${lbl('Zutaten:','Ingredients:','Składniki:')} ${detail.ingredients[lang].join(', ')}\n${lbl('Schritte:','Steps:','Kroki:')} ${detail.steps[lang].join(' | ')}`; const bot = { id: String(Date.now()), sender: 'bot' as const, text: txt, createdAt: Date.now() }; state.addChat(bot); setDetailId(null); setShowFilter(false); }} style={[styles.badge, { backgroundColor: colors.primary }]}> 
                    <Text style={{ color: '#fff' }}>{lbl('In Chat teilen','Share to chat','Udostępnij na czacie')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, borderTopWidth: 1 },
  badge: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  card: { borderRadius: 12, padding: 12 },
});