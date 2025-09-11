import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAppStore, useLevel } from '../src/store/useStore';
import { computeAIv1 } from '../src/ai/insights';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75', input: '#ffffff' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8', input: '#1f1520' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e', input: '#fff' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866', input: '#ffffff' };
}

function fmtTime(ts: number, lang: 'de'|'en') {
  try { return new Date(ts).toLocaleTimeString(lang==='de'?'de-DE':'en-US', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

export default function ChatScreen() {
  const router = useRouter();
  const state = useAppStore();
  const { level } = useLevel();
  const colors = useThemeColors(state.theme);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const maxVisible = level >= 50 ? 30 : 5;
  const allChat = state.chat || [];
  const visibleChat = useMemo(() => {
    return allChat.slice(Math.max(0, allChat.length - maxVisible));
  }, [allChat, maxVisible]);

  useEffect(() => {
    // Smooth scroll to bottom when content changes
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [visibleChat.length]);

  function send() {
    const t = text.trim(); if (!t) return;
    const msg = { id: String(Date.now()), sender: 'user' as const, text: t, createdAt: Date.now() };
    state.addChat(msg); setText(''); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // AI v1 suggestion as reply (if enabled)
    const ai = state.aiInsightsEnabled ? computeAIv1({ days: state.days, language: state.language, aiFeedback: state.aiFeedback, aiInsightsEnabled: state.aiInsightsEnabled }) : [];
    const replyText = ai[0]?.text || (state.language==='de' ? 'Bleib dran – kleine Schritte zählen.' : 'Keep going – small steps add up.');
    const bot = { id: String(Date.now()+1), sender: 'bot' as const, text: replyText, createdAt: Date.now()+1 };
    state.addChat(bot);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  function saveTip(id: string, text: string) {
    if (saved[id]) return;
    const title = (text.slice(0, 30) + (text.length > 30 ? '…' : '')) || 'Gugi-Tipp';
    state.addSaved({ id: String(Date.now()), title: `Gugi: ${title}`, category: 'Chat', tags: ['Gugi','Tipp'], text, createdAt: Date.now() });
    setSaved((s) => ({ ...s, [id]: true }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const canSend = text.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={state.language==='de'?'Zurück':'Back'}>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]}>Gugi</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            {level >= 50 ? (
              <View style={[styles.vipPill, { borderColor: colors.primary, backgroundColor: colors.primary }]}> 
                <Ionicons name='star' size={12} color={'#fff'} />
                <Text style={{ color: '#fff', marginLeft: 6, fontSize: 12 }}>VIP</Text>
              </View>
            ) : (
              <View style={[styles.vipPill, { borderColor: colors.muted, backgroundColor: 'transparent' }]}> 
                <Ionicons name='lock-closed' size={12} color={colors.muted} />
                <Text style={{ color: colors.muted, marginLeft: 6, fontSize: 12 }}>VIP (L50)</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.iconBtn} accessibilityLabel='Einstellungen'>
          <Ionicons name='settings' size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 8 }} showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {level < 50 ? (
              <Text style={{ color: colors.muted, textAlign: 'center', marginBottom: 8 }}>Nur die letzten 5 Nachrichten sichtbar. Mit VIP (L50) siehst du 30.</Text>
            ) : null}
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
            {visibleChat.length === 0 ? (
              <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 24 }}>{state.language==='de'?'Keine Nachrichten':'No messages yet'}</Text>
            ) : null}
          </ScrollView>
        </View>

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.muted }]}> 
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder={state.language==='de'?'Schreibe eine Nachricht…':'Type a message…'}
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.muted }]}
            multiline
          />
          <TouchableOpacity disabled={!canSend} onPress={send} style={[styles.sendBtn, { backgroundColor: canSend ? colors.primary : colors.muted }]} accessibilityLabel={state.language==='de'?'Senden':'Send'}>
            <Ionicons name='send' size={18} color={'#fff'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700' },
  iconBtn: { padding: 8 },
  vipPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  msgRow: { flexDirection: 'row' },
  msgBubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 0 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
  sendBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
});