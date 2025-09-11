import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, TextInput, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, useLevel } from "../src/store/useStore";
import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';
import { getWeekRange, getCurrentWeeklyEvent, computeEventProgress } from "../src/gamification/events";
import { computeChains } from "../src/gamification/chains";
import { toKey } from "../src/utils/date";

function useThemeColors(theme: string) {
  if (theme === "pink_pastel") return { bg: "#fff0f5", card: "#ffe4ef", primary: "#d81b60", text: "#3a2f33", muted: "#8a6b75" };
  if (theme === "pink_vibrant") return { bg: "#1b0b12", card: "#2a0f1b", primary: "#ff2d87", text: "#ffffff", muted: "#e59ab8" };
  if (theme === "golden_pink") return { bg: "#fff8f0", card: "#ffe9c7", primary: "#dba514", text: "#2a1e22", muted: "#9b7d4e" };
  return { bg: "#fde7ef", card: "#ffd0e0", primary: "#e91e63", text: "#2a1e22", muted: "#7c5866" };
}

export default function Home() {
  const router = useRouter();
  const { theme, days, eventHistory, completeEvent, eventsEnabled, currentDate, ensureDay, language, togglePill, incDrink, toggleFlag, setWeight, goPrevDay, goNextDay, goToday } = useAppStore();
  const { level, xp } = useLevel();
  const colors = useThemeColors(theme);

  // Ensure the selected day exists
  useEffect(() => {
    ensureDay(currentDate);
  }, [currentDate]);

  const todayKey = toKey(new Date());
  const day = days[currentDate] || { pills: { morning: false, evening: false }, drinks: { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false } } as any;

  // Localized date label
  const dateLabel = React.useMemo(() => {
    try {
      const [y, m, d] = currentDate.split('-').map((n) => parseInt(n, 10));
      const dt = new Date(y, m - 1, d);
      const locale = language === 'en' ? 'en-GB' : 'de-DE';
      return dt.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' });
    } catch {
      return currentDate;
    }
  }, [currentDate, language]);

  // Weekly event computation
  const now = new Date();
  const { weekKey, dayKeys } = getWeekRange(now);
  const weeklyEvent = getCurrentWeeklyEvent(now);
  const evProg = computeEventProgress(dayKeys, { days }, weeklyEvent);
  const evCompleted = evProg.completed || !!eventHistory[weekKey]?.completed;

  const [detailVisible, setDetailVisible] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  // Weight modal state
  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState<string>(day?.weight ? String(day.weight) : "");
  useEffect(() => { setWeightInput(day?.weight ? String(day.weight) : ""); }, [currentDate, day?.weight]);

  useEffect(() => {
    if (!eventsEnabled) return;
    if (evProg.completed && !eventHistory[weekKey]?.completed) {
      completeEvent(weekKey, { id: weeklyEvent.id, xp: weeklyEvent.xp });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // simple confetti fade
      setCelebrate(true);
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
        setTimeout(() => Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setCelebrate(false)), 600);
      });
    }
  }, [evProg.completed, weekKey, eventsEnabled]);

  // Chains teaser (Top 1)
  const chains = useMemo(() => computeChains(useAppStore.getState()), [days]);
  const topChain = useMemo(() => chains
    .filter(c => c.completed < c.total)
    .sort((a,b) => b.nextPercent - a.nextPercent)[0], [chains]);

  const rewardList = [
    { lvl: 10, title: 'Erweiterte Statistiken' },
    { lvl: 25, title: 'Premium Insights' },
    { lvl: 50, title: 'VIP-Chat' },
    { lvl: 75, title: 'Golden Pink Theme' },
    { lvl: 100, title: 'Legendärer Status' },
  ];
  const nextReward = rewardList.find(r => level < r.lvl);

  const canGoNext = currentDate <= todayKey; // goNextDay itself blocks future

  const t = (de: string, en: string) => (language === 'en' ? en : de);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Top bar with app title and Level/XP */}
        <View style={[styles.card, { backgroundColor: colors.card, paddingVertical: 10 }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{t('Scarletts Gesundheitstracking', "Scarlett’s Health Tracking")}</Text>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings'); }} accessibilityLabel={t('Einstellungen', 'Settings')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="star" size={16} color={colors.primary} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>L{level} · {xp} XP</Text>
              <Ionicons name="settings" size={16} color={colors.text} style={{ marginLeft: 10 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date navigation */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity accessibilityLabel={t('Vortag', 'Previous day')} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goPrevDay(); }} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Heute', 'Today')} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goToday(); }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{dateLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Folgetag', 'Next day')} onPress={() => { if (canGoNext) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goNextDay(); } }} style={styles.iconBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pills */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="medkit" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('Tabletten', 'Pills')}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <TouchableOpacity accessibilityLabel={t('Morgens einnehmen', 'Morning pill')} onPress={() => { togglePill(currentDate, 'morning'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.toggle, { borderColor: colors.primary, backgroundColor: day.pills.morning ? colors.primary : 'transparent' }]}> 
              <Ionicons name="sunny" size={16} color={day.pills.morning ? '#fff' : colors.primary} />
              <Text style={{ color: day.pills.morning ? '#fff' : colors.text, marginLeft: 6 }}>{t('Morgens', 'Morning')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Abends einnehmen', 'Evening pill')} onPress={() => { togglePill(currentDate, 'evening'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.toggle, { borderColor: colors.primary, backgroundColor: day.pills.evening ? colors.primary : 'transparent' }]}> 
              <Ionicons name="moon" size={16} color={day.pills.evening ? '#fff' : colors.primary} />
              <Text style={{ color: day.pills.evening ? '#fff' : colors.text, marginLeft: 6 }}>{t('Abends', 'Evening')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Drinks &amp; Sport */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="water" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('Getränke &amp; Sport', 'Drinks &amp; Sport')}</Text>
          </View>
          {/* Water */}
          <View style={styles.rowBetween}> 
            <Text style={{ color: colors.text }}>{t('Wasser', 'Water')}</Text>
            <View style={styles.counterWrap}>
              <TouchableOpacity accessibilityLabel={t('Wasser verringern', 'Decrease water')} onPress={() => { incDrink(currentDate, 'water', -1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}>
                <Text style={{ color: colors.primary }}>-</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.text, minWidth: 28, textAlign: 'center' }}>{day.drinks.water}</Text>
              <TouchableOpacity accessibilityLabel={t('Wasser erhöhen', 'Increase water')} onPress={() => { incDrink(currentDate, 'water', +1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}>
                <Text style={{ color: colors.primary }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Coffee */}
          <View style={[styles.rowBetween, { marginTop: 8 }]}> 
            <Text style={{ color: colors.text }}>{t('Kaffee', 'Coffee')}</Text>
            <View style={styles.counterWrap}>
              <TouchableOpacity accessibilityLabel={t('Kaffee verringern', 'Decrease coffee')} onPress={() => { incDrink(currentDate, 'coffee', -1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}>
                <Text style={{ color: colors.primary }}>-</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.text, minWidth: 28, textAlign: 'center' }}>{day.drinks.coffee}</Text>
              <TouchableOpacity accessibilityLabel={t('Kaffee erhöhen', 'Increase coffee')} onPress={() => { incDrink(currentDate, 'coffee', +1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}>
                <Text style={{ color: colors.primary }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Toggles */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <TouchableOpacity accessibilityLabel={t('Schlank-Kaffee', 'Slim coffee')} onPress={() => { toggleFlag(currentDate, 'slimCoffee'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.slimCoffee ? colors.primary : 'transparent' }]}> 
              <Text style={{ color: day.drinks.slimCoffee ? '#fff' : colors.text }}>{t('Schlank-Kaffee', 'Slim coffee')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Ingwer-Knoblauch-Tee', 'Ginger &amp; garlic tea')} onPress={() => { toggleFlag(currentDate, 'gingerGarlicTea'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.gingerGarlicTea ? colors.primary : 'transparent' }]}> 
              <Text style={{ color: day.drinks.gingerGarlicTea ? '#fff' : colors.text }}>{t('Ingwer-Knoblauch-Tee', 'Ginger garlic tea')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Wasser-Kur', 'Water cure')} onPress={() => { toggleFlag(currentDate, 'waterCure'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.waterCure ? colors.primary : 'transparent' }]}> 
              <Text style={{ color: day.drinks.waterCure ? '#fff' : colors.text }}>{t('Wasser-Kur', 'Water cure')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Sport', 'Sport')} onPress={() => { toggleFlag(currentDate, 'sport'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.sport ? colors.primary : 'transparent' }]}> 
              <Text style={{ color: day.drinks.sport ? '#fff' : colors.text }}>{t('Sport', 'Sport')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weight */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="fitness" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('Gewicht', 'Weight')}</Text>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>
            {day?.weight ? `${day.weight.toFixed(1)} kg` : t('Kein Eintrag', 'No entry')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWeightModal(true); }}>
              <Ionicons name="create" size={16} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 6 }}>{t('Eintragen', 'Log weight')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/analysis'); }}>
              <Ionicons name="stats-chart" size={16} color={colors.primary} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{t('Analyse', 'Analysis')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Event-Karte */}
        {eventsEnabled ? (
          <TouchableOpacity onPress={() => setDetailVisible(true)} activeOpacity={0.8}>
            <View style={[styles.card, { backgroundColor: colors.card }]}> 
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{weeklyEvent.title(language)}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => router.push('/events')} accessibilityLabel={t('Archiv', 'Archive')} style={{ padding: 6 }}>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={{ color: colors.muted, marginTop: 4 }}>{weeklyEvent.description(language)}</Text>
              <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
                <View style={{ width: `${evProg.percent}%`, height: 8, backgroundColor: colors.primary }} />
              </View>
              <Text style={{ color: colors.muted, marginTop: 6 }}>{evProg.percent}% · +{weeklyEvent.xp} XP · Bonus {Math.round(weeklyEvent.bonusPercent*100)}% {evCompleted ? t('· Abgeschlossen', '· Completed') : ''}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Ketten-Teaser */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='link' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('Ketten', 'Chains')}</Text>
            </View>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/achievements'); }} accessibilityLabel={t('Zu Ketten', 'To chains')}>
              <Ionicons name='chevron-forward' size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          {topChain ? (
            <View style={{ marginTop: 6 }}>
              <Text style={{ color: colors.muted }}>{topChain.title} · {t('Schritt', 'Step')} {topChain.completed+1}/{topChain.total}</Text>
              <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                <View style={{ width: `${Math.round(topChain.nextPercent)}%`, height: 6, backgroundColor: colors.primary }} />
              </View>
              {topChain.nextTitle ? <Text style={{ color: colors.muted, marginTop: 4 }}>{t('Als Nächstes', 'Next')}: {topChain.nextTitle}</Text> : null}
            </View>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Alle Ketten abgeschlossen oder keine vorhanden.', 'All chains completed or none available.')}</Text>
          )}
        </View>

        {/* Belohnungen */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="gift" size={20} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('Belohnungen', 'Rewards')}</Text>
          </View>
          {nextReward ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Nächste Belohnung', 'Next reward')}: {nextReward.title} {t('ab Level', 'at level')} {nextReward.lvl}</Text>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Alle Belohnungen freigeschaltet! 🎉', 'All rewards unlocked! 🎉')}</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/achievements'); }}>
              <Ionicons name="trophy" size={16} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 6 }}>{t('Erfolge', 'Achievements')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/analysis'); }}>
              <Ionicons name="stats-chart" size={16} color={colors.primary} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{t('Analyse', 'Analysis')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Schnellzugriff */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{t('Schnellzugriff', 'Quick access')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
            <TouchableOpacity accessibilityLabel={t('Chat', 'Chat')} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/chat'); }} style={[styles.quick, { backgroundColor: colors.bg }]}>
              <Ionicons name="chatbubbles" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{t('Chat', 'Chat')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Gespeichert', 'Saved')} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/saved'); }} style={[styles.quick, { backgroundColor: colors.bg }]}>
              <Ionicons name="bookmark" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{t('Gespeichert', 'Saved')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Einstellungen', 'Settings')} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings'); }} style={[styles.quick, { backgroundColor: colors.bg }]}>
              <Ionicons name="settings" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{t('Einstellungen', 'Settings')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Bestenliste', 'Leaderboard')} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/leaderboard'); }} style={[styles.quick, { backgroundColor: colors.bg }]}>
              <Ionicons name="podium" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{t('Rangliste', 'Leaderboard')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Event detail modal */}
      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, width: '88%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{weeklyEvent.title(language)}</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Ionicons name='close' size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.muted, marginTop: 6 }}>{weeklyEvent.description(language)}</Text>
            <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
              <View style={{ width: `${evProg.percent}%`, height: 8, backgroundColor: colors.primary }} />
            </View>
            <Text style={{ color: colors.muted, marginTop: 6 }}>{evProg.percent}% · +{weeklyEvent.xp} XP · Bonus {Math.round(weeklyEvent.bonusPercent*100)}%</Text>
            <TouchableOpacity onPress={() => { setDetailVisible(false); router.push('/events'); }} style={{ alignSelf: 'flex-end', marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 }}>
              <Text style={{ color: '#fff' }}>{t('Archiv', 'Archive')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Weight modal */}
      <Modal visible={weightModal} transparent animationType="slide" onRequestClose={() => setWeightModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, width: '88%' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('Gewicht eintragen', 'Log weight')}</Text>
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Ionicons name="fitness" size={18} color={colors.primary} />
                  <TextInput
                    style={{ flex: 1, marginLeft: 8, color: colors.text }}
                    keyboardType="decimal-pad"
                    placeholder={t('z. B. 62,3', 'e.g. 62.3')}
                    placeholderTextColor={colors.muted}
                    value={weightInput}
                    onChangeText={setWeightInput}
                  />
                  <Text style={{ color: colors.muted }}>kg</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <TouchableOpacity onPress={() => setWeightModal(false)} style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]}>
                  <Text style={{ color: colors.text }}>{t('Abbrechen', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  const normalized = (weightInput || '').replace(',', '.');
                  const val = parseFloat(normalized);
                  if (!isNaN(val) && val > 0) {
                    setWeight(currentDate, val);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setWeightModal(false);
                  }
                }} style={[styles.cta, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#fff' }}>{t('Speichern', 'Save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Simple celebration overlay */}
      {celebrate ? (
        <Animated.View pointerEvents='none' style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: fade }}>
          <Text style={{ fontSize: 48 }}>🎉</Text>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  iconBtn: { padding: 6, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  counterWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, minWidth: 44, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  quick: { width: '47%', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
});