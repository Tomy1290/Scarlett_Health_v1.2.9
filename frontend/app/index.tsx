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
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationText, setCelebrationText] = useState("");

  useEffect(() => { if (level > prevLevelRef.current) { setCelebrationText(language==='de' ? `Level ${level}` : `Level ${level}`); setShowCelebration(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); prevLevelRef.current = level; } }, [level]);
  useEffect(() => { const count = state.achievementsUnlocked?.length || 0; if (count > prevUnlockCountRef.current) { setCelebrationText(language==='de' ? 'Neuer Erfolg!' : 'New achievement!'); setShowCelebration(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); prevUnlockCountRef.current = count; } }, [state.achievementsUnlocked]);

  useEffect(() => { ensureDay(currentDate); }, [currentDate]);

  const todayKey = toKey(new Date());
  const day = days[currentDate] || { pills: { morning: false, evening: false }, drinks: { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false } } as any;

  const dateLabel = React.useMemo(() => { try { const [y, m, d] = currentDate.split('-').map((n) => parseInt(n, 10)); const dt = new Date(y, m - 1, d); const locale = language === 'en' ? 'en-GB' : 'de-DE'; return dt.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }); } catch { return currentDate; } }, [currentDate, language]);

  const now = new Date();
  const { weekKey, dayKeys } = getWeekRange(now);
  const weeklyEvent = getCurrentWeeklyEvent(now);
  const evProg = computeEventProgress(dayKeys, { days }, weeklyEvent);
  const evCompleted = evProg.completed || !!eventHistory[weekKey]?.completed;

  const [detailVisible, setDetailVisible] = useState(false);
  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState<string>(day?.weight ? String(day.weight) : "");
  useEffect(() => { setWeightInput(day?.weight ? String(day.weight) : ""); }, [currentDate, day?.weight]);

  const [help, setHelp] = useState<{[k:string]: boolean}>({});
  const toggleHelp = (k: string) => setHelp((h) => ({ ...h, [k]: !h[k] }));

  const chains = useMemo(() => computeChains(useAppStore.getState()), [days]);
  const topChain = useMemo(() => chains.filter(c => c.completed &lt; c.total).sort((a,b) =&gt; b.nextPercent - a.nextPercent)[0], [chains]);

  const rewardList = [ { lvl: 10, title: 'Erweiterte Statistiken' }, { lvl: 25, title: 'Premium Insights' }, { lvl: 50, title: 'VIP-Chat' }, { lvl: 75, title: 'Golden Pink Theme' }, { lvl: 100, title: 'Legendärer Status' } ];
  const nextReward = rewardList.find(r =&gt; level &lt; r.lvl);

  const canGoNext = currentDate &lt;= todayKey;
  const t = (de: string, en: string) =&gt; (language === 'en' ? en : de);

  const activeCycle = state.cycles.find((c: any) =&gt; !c.end);
  const avgLen = getAverageCycleLengthDays(state.cycles);
  const lastStart = [...state.cycles].filter((c: any)=&gt;c.start).sort((a: any,b: any)=&gt;a.start.localeCompare(b.start)).slice(-1)[0]?.start;
  const expectedNext = lastStart ? (() =&gt; { const dt = new Date(lastStart); dt.setDate(dt.getDate() + avgLen); return dt; })() : null;
  const daysUntilNext = expectedNext ? Math.max(0, Math.ceil((+expectedNext - +new Date(currentDate))/(24*60*60*1000))) : null;

  // Helpers for 3x3 layout cups
  const renderCupRow = (count: number, type: 'water'|'coffee') =&gt; (
    &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}&gt;
      &lt;View style={{ width: 44, alignItems: 'center' }} /&gt;
      &lt;View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}&gt;
        {Array.from({ length: Math.min(count, 10) }).map((_, i) =&gt; (
          &lt;View key={`${type}-icon-${i}`} style={{ width: `${100/10}%`, alignItems: 'center', paddingVertical: 2 }}&gt;
            &lt;Ionicons name={type==='coffee' ? 'cafe' : 'water'} size={16} color={colors.primary} /&gt;
          &lt;/View&gt;
        ))}
      &lt;/View&gt;
      &lt;View style={{ width: 44, alignItems: 'center' }} /&gt;
    &lt;/View&gt;
  );

  return (
    &lt;SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}&gt;
      &lt;ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}&gt;
        {/* Header big */}
        &lt;View style={[styles.headerCard, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ alignItems: 'center' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name="star" size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, marginHorizontal: 8 }}&gt;{t('Scarletts Gesundheitstracking', "Scarlett’s Health Tracking")}&lt;/Text&gt;
              &lt;Ionicons name="star" size={18} color={colors.primary} /&gt;
            &lt;/View&gt;
            &lt;View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '70%', alignSelf: 'center', marginTop: 8 }}&gt;
              &lt;Text style={{ color: colors.text }}&gt;{t('Level', 'Level')} {level}&lt;/Text&gt;
              &lt;Text style={{ color: colors.text }}&gt;{xp} XP&lt;/Text&gt;
            &lt;/View&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Date navigation */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;TouchableOpacity accessibilityLabel={t('Vortag', 'Previous day')} onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goPrevDay(); }} style={styles.iconBtn}&gt;
              &lt;Ionicons name="chevron-back" size={22} color={colors.text} /&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity accessibilityLabel={t('Heute', 'Today')} onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goToday(); }}&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700' }}&gt;{dateLabel}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity accessibilityLabel={t('Folgetag', 'Next day')} onPress={() =&gt; { if (canGoNext) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goNextDay(); } }} style={styles.iconBtn}&gt;
              &lt;Ionicons name="chevron-forward" size={22} color={colors.text} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Pills */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name="medkit" size={20} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('Tabletten', 'Pills')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('pills')}&gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.pills ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('Markiere morgens/abends, wenn du deine Tabletten genommen hast.', 'Toggle morning/evening when you took your pills.')}&lt;/Text&gt; : null}
          &lt;View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}&gt;
            &lt;TouchableOpacity accessibilityLabel={t('Morgens einnehmen', 'Morning pill')} onPress={() =&gt; { togglePill(currentDate, 'morning'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.toggle, { borderColor: colors.primary, backgroundColor: day.pills.morning ? colors.primary : 'transparent' }]}&gt; 
              &lt;Ionicons name="sunny" size={18} color={day.pills.morning ? '#fff' : colors.primary} /&gt;
              &lt;Text style={{ color: day.pills.morning ? '#fff' : colors.text, marginLeft: 6 }}&gt;{t('Morgens', 'Morning')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity accessibilityLabel={t('Abends einnehmen', 'Evening pill')} onPress={() =&gt; { togglePill(currentDate, 'evening'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.toggle, { borderColor: colors.primary, backgroundColor: day.pills.evening ? colors.primary : 'transparent' }]}&gt; 
              &lt;Ionicons name="moon" size={18} color={day.pills.evening ? '#fff' : colors.primary} /&gt;
              &lt;Text style={{ color: day.pills.evening ? '#fff' : colors.text, marginLeft: 6 }}&gt;{t('Abends', 'Evening')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Drinks & Sport */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name="wine" size={20} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('Getränke &amp; Sport', 'Drinks &amp; Sport')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('drinks')}&gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.drinks ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('Wasser vergibt XP pro Glas. Kaffee ab Tasse 7 gibt Minuspunkte. Toggles (Sport, Kur, etc.) nur einmal täglich XP.', 'Water gives XP per glass. Coffee after cup 6 reduces XP. Toggles (sport, cure, etc.) give XP only once per day.')}&lt;/Text&gt; : null}

          {/* WATER 3x3 layout */}
          &lt;View style={{ marginTop: 10 }}&gt;
            &lt;View style={{ alignItems: 'center' }}&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '600' }}&gt;{t('Wasser', 'Water')}&lt;/Text&gt;
            &lt;/View&gt;
            {/* Row 2 with - | cups(0..10) | + */}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}&gt;
              &lt;TouchableOpacity accessibilityLabel={t('Wasser verringern', 'Decrease water')} onPress={() =&gt; { incDrink(currentDate, 'water', -1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}&gt;
                &lt;Ionicons name='remove' size={18} color={colors.primary} /&gt;
              &lt;/TouchableOpacity&gt;
              &lt;View style={{ flex: 1, marginHorizontal: 8 }}&gt;
                {renderCupRow(Math.min(day.drinks.water, 10), 'water')}
              &lt;/View&gt;
              &lt;TouchableOpacity accessibilityLabel={t('Wasser erhöhen', 'Increase water')} onPress={() =&gt; { incDrink(currentDate, 'water', +1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}&gt;
                &lt;Ionicons name='add' size={18} color={colors.primary} /&gt;
              &lt;/TouchableOpacity&gt;
            &lt;/View&gt;
            {/* Row 3 with - | cups(10..20) | + */}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}&gt;
              &lt;TouchableOpacity accessibilityLabel={t('Wasser verringern', 'Decrease water')} onPress={() =&gt; { incDrink(currentDate, 'water', -1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}&gt;
                &lt;Ionicons name='remove' size={18} color={colors.primary} /&gt;
              &lt;/TouchableOpacity&gt;
              &lt;View style={{ flex: 1, marginHorizontal: 8 }}&gt;
                {renderCupRow(Math.max(0, Math.min(day.drinks.water - 10, 10)), 'water')}
              &lt;/View&gt;
              &lt;TouchableOpacity accessibilityLabel={t('Wasser erhöhen', 'Increase water')} onPress={() =&gt; { incDrink(currentDate, 'water', +1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}&gt;
                &lt;Ionicons name='add' size={18} color={colors.primary} /&gt;
              &lt;/TouchableOpacity&gt;
            &lt;/View&gt;
          &lt;/View&gt;

          {/* COFFEE 3x3 layout */}
          &lt;View style={{ marginTop: 14 }}&gt;
            &lt;View style={{ alignItems: 'center' }}&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '600' }}&gt;{t('Kaffee', 'Coffee')}&lt;/Text&gt;
            &lt;/View&gt;
            {/* Row 2 */}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}&gt;
              &lt;TouchableOpacity accessibilityLabel={t('Kaffee verringern', 'Decrease coffee')} onPress={() =&gt; { incDrink(currentDate, 'coffee', -1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}&gt;
                &lt;Ionicons name='remove' size={18} color={colors.primary} /&gt;
              &lt;/TouchableOpacity&gt;
              &lt;View style={{ flex: 1, marginHorizontal: 8 }}&gt;
                {renderCupRow(Math.min(day.drinks.coffee, 10), 'coffee')}
              &lt;/View&gt;
              &lt;TouchableOpacity accessibilityLabel={t('Kaffee erhöhen', 'Increase coffee')} onPress={() =&gt; { incDrink(currentDate, 'coffee', +1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}&gt;
                &lt;Ionicons name='add' size={18} color={colors.primary} /&gt;
              &lt;/TouchableOpacity&gt;
            &lt;/View&gt;
            {/* Row 3 */}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}&gt;
              &lt;TouchableOpacity accessibilityLabel={t('Kaffee verringern', 'Decrease coffee')} onPress={() =&gt; { incDrink(currentDate, 'coffee', -1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}&gt;
                &lt;Ionicons name='remove' size={18} color={colors.primary} /&gt;
              &lt;/TouchableOpacity&gt;
              &lt;View style={{ flex: 1, marginHorizontal: 8 }}&gt;
                {renderCupRow(Math.max(0, Math.min(day.drinks.coffee - 10, 10)), 'coffee')}
              &lt;/View&gt;
              &lt;TouchableOpacity accessibilityLabel={t('Kaffee erhöhen', 'Increase coffee')} onPress={() =&gt; { incDrink(currentDate, 'coffee', +1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtn, { borderColor: colors.primary }]}&gt;
                &lt;Ionicons name='add' size={18} color={colors.primary} /&gt;
              &lt;/TouchableOpacity&gt;
            &lt;/View&gt;
          &lt;/View&gt;

          {/* Toggles */}
          &lt;View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}&gt;
            &lt;TouchableOpacity accessibilityLabel={t('Schlankkaffee', 'Slim coffee')} onPress={() =&gt; { toggleFlag(currentDate, 'slimCoffee'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.slimCoffee ? colors.primary : 'transparent' }]}&gt; 
              &lt;Text style={{ color: day.drinks.slimCoffee ? '#fff' : colors.text }}&gt;{t('Schlankkaffee', 'Slim coffee')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity accessibilityLabel={t('Ingwer-Knoblauch-Tee', 'Ginger &amp; garlic tea')} onPress={() =&gt; { toggleFlag(currentDate, 'gingerGarlicTea'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.gingerGarlicTea ? colors.primary : 'transparent' }]}&gt; 
              &lt;Text style={{ color: day.drinks.gingerGarlicTea ? '#fff' : colors.text }}&gt;{t('Ingwer-Knoblauch-Tee', 'Ginger garlic tea')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity accessibilityLabel={t('Wasserkur', 'Water cure')} onPress={() =&gt; { toggleFlag(currentDate, 'waterCure'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.waterCure ? colors.primary : 'transparent' }]}&gt; 
              &lt;Text style={{ color: day.drinks.waterCure ? '#fff' : colors.text }}&gt;{t('Wasserkur', 'Water cure')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity accessibilityLabel={t('Sport', 'Sport')} onPress={() =&gt; { toggleFlag(currentDate, 'sport'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.sport ? colors.primary : 'transparent' }]}&gt; 
              &lt;Text style={{ color: day.drinks.sport ? '#fff' : colors.text }}&gt;{t('Sport', 'Sport')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Weight */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name="fitness" size={20} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('Gewicht', 'Weight')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('weight')}&gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.weight ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('Trage dein aktuelles Gewicht ein oder öffne die Analyse für Verläufe.', 'Log your current weight or open analysis for trends.')}&lt;/Text&gt; : null}
          &lt;View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}&gt;
            &lt;TouchableOpacity style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]} onPress={() =&gt; setWeightModal(true)}&gt;
              &lt;Ionicons name='fitness' size={16} color={colors.text} /&gt;
              &lt;Text style={{ color: colors.text, marginLeft: 6 }}&gt;{t('Eintragen', 'Log')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() =&gt; router.push('/analysis')}&gt;
              &lt;Ionicons name='stats-chart' size={16} color={'#fff'} /&gt;
              &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{t('Analyse', 'Analysis')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {typeof day.weight === 'number' ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('Heute', 'Today')}: {day.weight} kg&lt;/Text&gt; : null}
        &lt;/View&gt;

        {/* Cycle card */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name='water' size={20} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{language==='de'?'Zyklus':'Cycle'}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('cycle')}&gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.cycle ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('Starte/Beende deinen Zyklus. Über den Kalender erhältst du Übersicht und Prognosen.', 'Start/end your cycle. Open the calendar for overview and predictions.')}&lt;/Text&gt; : null}
          &lt;View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}&gt;
            {activeCycle ? (
              &lt;TouchableOpacity onPress={() =&gt; { state.endCycle(currentDate); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={[styles.cta, { backgroundColor: colors.primary }]}&gt;
                &lt;Ionicons name='stop' size={16} color={'#fff'} /&gt;
                &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{language==='de'?'Zyklus Ende':'End cycle'}&lt;/Text&gt;
              &lt;/TouchableOpacity&gt;
            ) : (
              &lt;TouchableOpacity onPress={() =&gt; { state.startCycle(currentDate); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={[styles.cta, { backgroundColor: colors.primary }]}&gt;
                &lt;Ionicons name='play' size={16} color={'#fff'} /&gt;
                &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{language==='de'?'Zyklus Beginn':'Start cycle'}&lt;/Text&gt;
              &lt;/TouchableOpacity&gt;
            )}
            &lt;TouchableOpacity onPress={() =&gt; router.push('/cycle')} style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]}&gt;
              &lt;Ionicons name='calendar' size={16} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, marginLeft: 6 }}&gt;{t('Kalender', 'Calendar')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {expectedNext ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('Nächster Zyklus in', 'Next cycle in')} {daysUntilNext} {t('Tagen', 'days')} {t('erwartet', 'expected')} ({expectedNext.toLocaleDateString()})&lt;/Text&gt;) : null}
        &lt;/View&gt;

        {/* Chains */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name='link' size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{language==='de'?'Ketten':'Chains'}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('chains')}&gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.chains ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('Ketten zeigen dir Fortschritte in Meilensteinen. Öffne Erfolge für Details.', 'Chains show progress towards milestones. Open achievements for details.')}&lt;/Text&gt; : null}
          {topChain ? (
            &lt;View style={{ marginTop: 6 }}&gt;
              &lt;Text style={{ color: colors.muted }}&gt;{topChain.title} · {t('Schritt', 'Step')} {topChain.completed+1}/{topChain.total}&lt;/Text&gt;
              &lt;View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}&gt;
                &lt;View style={{ width: `${Math.round(topChain.nextPercent)}%`, height: 6, backgroundColor: colors.primary }} /&gt;
              &lt;/View&gt;
              {topChain.nextTitle ? &lt;Text style={{ color: colors.muted, marginTop: 4 }}&gt;{t('Als Nächstes', 'Next')}: {topChain.nextTitle}&lt;/Text&gt; : null}
            &lt;/View&gt;
          ) : (
            &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('Alle Ketten abgeschlossen oder keine vorhanden.', 'All chains completed or none available.')}&lt;/Text&gt;
          )}
        &lt;/View&gt;

        {/* Rewards */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name="gift" size={20} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{language==='de'?'Belohnungen':'Rewards'}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('rewards')}&gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.rewards ? (
            &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('Sammle XP, um Belohnungen freizuschalten. Sieh dir Erfolge und Rangliste an.', 'Earn XP to unlock rewards. Check achievements and leaderboard.')}&lt;/Text&gt;
          ) : null}
          &lt;View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}&gt;
            &lt;TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/achievements'); }}&gt;
              &lt;Ionicons name="trophy" size={16} color="#fff" /&gt;
              &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{language==='de'?'Erfolge':'Achievements'}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]} onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/leaderboard'); }}&gt;
              &lt;Ionicons name="podium" size={16} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, marginLeft: 6 }}&gt;{language==='de'?'Rangliste':'Leaderboard'}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Quick access */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;Text style={{ color: colors.text, fontWeight: '700' }}&gt;{language==='de'?'Schnellzugriff':'Quick access'}&lt;/Text&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('quick')}&gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.quick ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('Schneller Zugriff auf wichtige Bereiche.', 'Quick access to key sections.')}&lt;/Text&gt; : null}
          &lt;View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}&gt;
            &lt;TouchableOpacity accessibilityLabel={language==='de'?'Chat':'Chat'} onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/chat'); }} style={[styles.quick, { backgroundColor: colors.bg }]}&gt;
              &lt;Ionicons name="chatbubbles" size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, marginTop: 6 }}&gt;{language==='de'?'Chat':'Chat'}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity accessibilityLabel={language==='de'?'Einstellungen':'Settings'} onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings'); }} style={[styles.quick, { backgroundColor: colors.bg }]}&gt;
              &lt;Ionicons name="settings" size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, marginTop: 6 }}&gt;{language==='de'?'Einstellungen':'Settings'}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity accessibilityLabel={language==='de'?'Gespeichert':'Saved'} onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/saved'); }} style={[styles.quick, { backgroundColor: colors.bg }]}&gt;
              &lt;Ionicons name="bookmark" size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, marginTop: 6 }}&gt;{language==='de'?'Gespeichert':'Saved'}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;
      &lt;/ScrollView&gt;

      {/* Weight modal */}
      &lt;Modal visible={weightModal} transparent animationType="slide" onRequestClose={() =&gt; setWeightModal(false)}&gt;
        &lt;KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}&gt;
          &lt;View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}&gt;
            &lt;View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, width: '88%' }}&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700' }}&gt;{t('Gewicht eintragen', 'Log weight')}&lt;/Text&gt;
              &lt;View style={{ marginTop: 12 }}&gt;
                &lt;View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}&gt;
                  &lt;Ionicons name="fitness" size={18} color={colors.primary} /&gt;
                  &lt;TextInput style={{ flex: 1, marginLeft: 8, color: colors.text }} keyboardType="decimal-pad" placeholder={t('z. B. 62,3', 'e.g. 62.3')} placeholderTextColor={colors.muted} value={weightInput} onChangeText={setWeightInput} /&gt;
                  &lt;Text style={{ color: colors.muted }}&gt;kg&lt;/Text&gt;
                &lt;/View&gt;
              &lt;/View&gt;
              &lt;View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}&gt;
                &lt;TouchableOpacity onPress={() =&gt; setWeightModal(false)} style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]}&gt;
                  &lt;Text style={{ color: colors.text }}&gt;{t('Abbrechen', 'Cancel')}&lt;/Text&gt;
                &lt;/TouchableOpacity&gt;
                &lt;TouchableOpacity onPress={() =&gt; { const normalized = (weightInput || '').replace(',', '.'); const val = parseFloat(normalized); if (!isNaN(val) &amp;&amp; val &gt; 0) { setWeight(currentDate, val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setWeightModal(false); } }} style={[styles.cta, { backgroundColor: colors.primary }]}&gt;
                  &lt;Text style={{ color: '#fff' }}&gt;{t('Speichern', 'Save')}&lt;/Text&gt;
                &lt;/TouchableOpacity&gt;
              &lt;/View&gt;
            &lt;/View&gt;
          &lt;/View&gt;
        &lt;/KeyboardAvoidingView&gt;
      &lt;/Modal&gt;

      &lt;CelebrationOverlay visible={showCelebration} message={celebrationText} onDone={() =&gt; setShowCelebration(false)} /&gt;
    &lt;/SafeAreaView&gt;
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
  counterBtn: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8, borderWidth: 1, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  quick: { width: '47%', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
});