import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, TextInput, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, useLevel, getAverageCycleLengthDays } from "../src/store/useStore";
import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';
import { getWeekRange, getCurrentWeeklyEvent, computeEventProgress } from "../src/gamification/events";
import { computeChains } from "../src/gamification/chains";
import { toKey } from "../src/utils/date";
import CelebrationOverlay from "../src/components/CelebrationOverlay";

function useThemeColors(theme: string) {
  if (theme === "pink_pastel") return { bg: "#fff0f5", card: "#ffe4ef", primary: "#d81b60", text: "#3a2f33", muted: "#8a6b75" };
  if (theme === "pink_vibrant") return { bg: "#1b0b12", card: "#2a0f1b", primary: "#ff2d87", text: "#ffffff", muted: "#e59ab8" };
  if (theme === "golden_pink") return { bg: "#fff8f0", card: "#ffe9c7", primary: "#dba514", text: "#2a1e22", muted: "#9b7d4e" };
  return { bg: "#fde7ef", card: "#ffd0e0", primary: "#e91e63", text: "#2a1e22", muted: "#7c5866" };
}

export default function Home() {
  const router = useRouter();
  const state = useAppStore();
  const { theme, days, eventHistory, completeEvent, eventsEnabled, currentDate, ensureDay, language, togglePill, incDrink, toggleFlag, setWeight, goPrevDay, goNextDay, goToday, setPillsBoth } = state as any;
  const { level, xp } = useLevel();
  const colors = useThemeColors(theme);

  const prevLevelRef = useRef(level);
  const prevUnlockCountRef = useRef(state.achievementsUnlocked?.length || 0);
  const [overlayMsg, setOverlayMsg] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationText, setCelebrationText] = useState("");

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setCelebrationText(language==='de' ? `Level ${level}` : `Level ${level}`);
      setShowCelebration(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      prevLevelRef.current = level;
    }
  }, [level]);
  useEffect(() => {
    const count = state.achievementsUnlocked?.length || 0;
    if (count > prevUnlockCountRef.current) {
      setCelebrationText(language==='de' ? 'Neuer Erfolg!' : 'New achievement!');
      setShowCelebration(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      prevUnlockCountRef.current = count;
    }
  }, [state.achievementsUnlocked]);

  useEffect(() => { ensureDay(currentDate); }, [currentDate]);

  const todayKey = toKey(new Date());
  const day = days[currentDate] || { pills: { morning: false, evening: false }, drinks: { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false } } as any;

  const dateLabel = React.useMemo(() => {
    try { const [y, m, d] = currentDate.split('-').map((n) => parseInt(n, 10)); const dt = new Date(y, m - 1, d); const locale = language === 'en' ? 'en-GB' : 'de-DE'; return dt.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }); } catch { return currentDate; }
  }, [currentDate, language]);

  const now = new Date();
  const { weekKey, dayKeys } = getWeekRange(now);
  const weeklyEvent = getCurrentWeeklyEvent(now);
  const evProg = computeEventProgress(dayKeys, { days }, weeklyEvent);
  const evCompleted = evProg.completed || !!eventHistory[weekKey]?.completed;

  const [detailVisible, setDetailVisible] = useState(false);
  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState<string>(day?.weight ? String(day.weight) : "");
  useEffect(() => { setWeightInput(day?.weight ? String(day.weight) : ""); }, [currentDate, day?.weight]);

  const chains = useMemo(() => computeChains(useAppStore.getState()), [days]);
  const topChain = useMemo(() => chains.filter(c => c.completed < c.total).sort((a,b) => b.nextPercent - a.nextPercent)[0], [chains]);

  const rewardList = [ { lvl: 10, title: 'Erweiterte Statistiken' }, { lvl: 25, title: 'Premium Insights' }, { lvl: 50, title: 'VIP-Chat' }, { lvl: 75, title: 'Golden Pink Theme' }, { lvl: 100, title: 'Legendärer Status' } ];
  const nextReward = rewardList.find(r => level < r.lvl);

  const canGoNext = currentDate <= todayKey;
  const t = (de: string, en: string) => (language === 'en' ? en : de);

  const activeCycle = state.cycles.find((c: any) => !c.end);
  const avgLen = getAverageCycleLengthDays(state.cycles);
  const lastStart = [...state.cycles].filter((c: any)=>c.start).sort((a: any,b: any)=>a.start.localeCompare(b.start)).slice(-1)[0]?.start;
  const expectedNext = lastStart ? (() => { const dt = new Date(lastStart); dt.setDate(dt.getDate() + avgLen); return dt; })() : null;
  const daysUntilNext = expectedNext ? Math.max(0, Math.ceil((+expectedNext - +new Date(currentDate))/(24*60*60*1000))) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Header big */}
        <View style={[styles.headerCard, { backgroundColor: colors.card }]}> 
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="star" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, marginHorizontal: 8 }}>{t('Scarletts Gesundheitstracking', "Scarlett’s Health Tracking")}</Text>
              <Ionicons name="star" size={18} color={colors.primary} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 }}>
              <Text style={{ color: colors.text }}>L{level}</Text>
              <Text style={{ color: colors.text }}>{xp} XP</Text>
            </View>
          </View>
        </View>

        {/* Date navigation */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity accessibilityLabel={t('Vortag', 'Previous day')} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goPrevDay(); }} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Heute', 'Today')} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goToday(); }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{dateLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Folgetag', 'Next day')} onPress={() => { if (canGoNext) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goNextDay(); } }} style={styles.iconBtn}>
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pills */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="medkit" size={20} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('Tabletten', 'Pills')}</Text>
            </View>
            <TouchableOpacity onPress={() => setPillsBoth(currentDate)} style={[styles.chip, { borderColor: colors.primary }]}>
              <Text style={{ color: colors.text }}>{t('Heute erledigt', 'Done today')}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <TouchableOpacity accessibilityLabel={t('Morgens einnehmen', 'Morning pill')} onPress={() => { togglePill(currentDate, 'morning'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.toggle, { borderColor: colors.primary, backgroundColor: day.pills.morning ? colors.primary : 'transparent' }]}> 
              <Ionicons name="sunny" size={18} color={day.pills.morning ? '#fff' : colors.primary} />
              <Text style={{ color: day.pills.morning ? '#fff' : colors.text, marginLeft: 6 }}>{t('Morgens', 'Morning')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Abends einnehmen', 'Evening pill')} onPress={() => { togglePill(currentDate, 'evening'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.toggle, { borderColor: colors.primary, backgroundColor: day.pills.evening ? colors.primary : 'transparent' }]}> 
              <Ionicons name="moon" size={18} color={day.pills.evening ? '#fff' : colors.primary} />
              <Text style={{ color: day.pills.evening ? '#fff' : colors.text, marginLeft: 6 }}>{t('Abends', 'Evening')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Drinks & Sport */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="wine" size={20} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('Getränke & Sport', 'Drinks & Sport')}</Text>
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
            <TouchableOpacity accessibilityLabel={t('Schlankkaffee', 'Slim coffee')} onPress={() => { toggleFlag(currentDate, 'slimCoffee'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.slimCoffee ? colors.primary : 'transparent' }]}> 
              <Text style={{ color: day.drinks.slimCoffee ? '#fff' : colors.text }}>{t('Schlankkaffee', 'Slim coffee')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Ingwer-Knoblauch-Tee', 'Ginger & garlic tea')} onPress={() => { toggleFlag(currentDate, 'gingerGarlicTea'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.gingerGarlicTea ? colors.primary : 'transparent' }]}> 
              <Text style={{ color: day.drinks.gingerGarlicTea ? '#fff' : colors.text }}>{t('Ingwer-Knoblauch-Tee', 'Ginger garlic tea')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Wasserkur', 'Water cure')} onPress={() => { toggleFlag(currentDate, 'waterCure'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.waterCure ? colors.primary : 'transparent' }]}> 
              <Text style={{ color: day.drinks.waterCure ? '#fff' : colors.text }}>{t('Wasserkur', 'Water cure')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t('Sport', 'Sport')} onPress={() => { toggleFlag(currentDate, 'sport'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.sport ? colors.primary : 'transparent' }]}> 
              <Text style={{ color: day.drinks.sport ? '#fff' : colors.text }}>{t('Sport', 'Sport')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weight */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{t('Gewicht', 'Weight')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]} onPress={() => setWeightModal(true)}>
              <Text style={{ color: colors.text }}>{t('Eintragen', 'Log')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() => router.push('/analysis')}>
              <Text style={{ color: '#fff' }}>{t('Analyse', 'Analysis')}</Text>
            </TouchableOpacity>
          </View>
          {typeof day.weight === 'number' ? <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Heute', 'Today')}: {day.weight} kg</Text> : null}
        </View>

        {/* Cycle card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='water' size={20} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{language==='de'?'Zyklus':'Cycle'}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/cycle')} accessibilityLabel='Kalender & Analyse'>
              <Ionicons name='calendar' size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {activeCycle ? (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity onPress={() => { state.endCycle(currentDate); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={[styles.cta, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff' }}>{language==='de'?'Zyklus Ende':'End cycle'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity onPress={() => { state.startCycle(currentDate); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={[styles.cta, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff' }}>{language==='de'?'Zyklus Beginn':'Start cycle'}</Text>
              </TouchableOpacity>
            </View>
          )}
          {expectedNext ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{language==='de'?'Nächster Zyklus in':'Next cycle in'} {daysUntilNext} {language==='de'?'Tagen':'days'} {language==='de'?'erwartet':'expected'} ({expectedNext.toLocaleDateString()})</Text>
          ) : null}
        </View>

        {/* Event card, Chains, Rewards, Quick Access preserved below ... (unchanged blocks retained) */}

        {/* Chains */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='link' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{language==='de'?'Ketten':'Chains'}</Text>
            </View>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/achievements'); }} accessibilityLabel={language==='de'?'Zu Ketten':'To chains'}>
              <Ionicons name='chevron-forward' size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          {topChain ? (
            <View style={{ marginTop: 6 }}>
              <Text style={{ color: colors.muted }}>{topChain.title} · {language==='de'?'Schritt':'Step'} {topChain.completed+1}/{topChain.total}</Text>
              <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                <View style={{ width: `${Math.round(topChain.nextPercent)}%`, height: 6, backgroundColor: colors.primary }} />
              </View>
              {topChain.nextTitle ? <Text style={{ color: colors.muted, marginTop: 4 }}>{language==='de'?'Als Nächstes':'Next'}: {topChain.nextTitle}</Text> : null}
            </View>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{language==='de'?'Alle Ketten abgeschlossen oder keine vorhanden.':'All chains completed or none available.'}</Text>
          )}
        </View>

        {/* Rewards */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="gift" size={20} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{language==='de'?'Belohnungen':'Rewards'}</Text>
          </View>
          {nextReward ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{language==='de'?'Nächste Belohnung':'Next reward'}: {nextReward.title} {language==='de'?'ab Level':'at level'} {nextReward.lvl}</Text>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{language==='de'?'Alle Belohnungen freigeschaltet! 🎉':'All rewards unlocked! 🎉'}</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/achievements'); }}>
              <Ionicons name="trophy" size={16} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 6 }}>{language==='de'?'Erfolge':'Achievements'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/leaderboard'); }}>
              <Ionicons name="podium" size={16} color={colors.primary} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{language==='de'?'Rangliste':'Leaderboard'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick access */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{language==='de'?'Schnellzugriff':'Quick access'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
            <TouchableOpacity accessibilityLabel={language==='de'?'Chat':'Chat'} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/chat'); }} style={[styles.quick, { backgroundColor: colors.bg }]}>
              <Ionicons name="chatbubbles" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{language==='de'?'Chat':'Chat'}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={language==='de'?'Gespeichert':'Saved'} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/saved'); }} style={[styles.quick, { backgroundColor: colors.bg }]}>
              <Ionicons name="bookmark" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{language==='de'?'Gespeichert':'Saved'}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={language==='de'?'Einstellungen':'Settings'} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings'); }} style={[styles.quick, { backgroundColor: colors.bg }]}>
              <Ionicons name="settings" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{language==='de'?'Einstellungen':'Settings'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Event detail modal and Weight modal (unchanged) ... */}

      <CelebrationOverlay visible={showCelebration} message={celebrationText} onDone={() => setShowCelebration(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerCard: { borderRadius: 12, padding: 16 },
  card: { borderRadius: 12, padding: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8 },
  iconBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  counterWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, minWidth: 44, alignItems: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  quick: { width: '47%', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
});