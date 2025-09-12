import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, useLevel } from "../src/store/useStore";
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

function getLatestWeightKg(days: Record<string, any>): number | undefined {
  const arr = Object.values(days).filter((d: any) => typeof d.weight === 'number' && d.date).sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
  const w = arr.length ? Number(arr[arr.length - 1].weight) : undefined;
  return isNaN(w as any) ? undefined : (w as number);
}

function computeDailyWaterTargetMl(weightKg?: number, didSport?: boolean): number {
  // 35 ml pro kg Körpergewicht; +500 ml bei Sport
  const base = weightKg ? Math.round(weightKg * 35) : 2000;
  const sportExtra = didSport ? 500 : 0;
  return base + sportExtra; // ml
}

export default function Home() {
  const router = useRouter();
  const state = useAppStore();
  const { theme, days, eventHistory, currentDate, ensureDay, language, togglePill, incDrink, toggleFlag, setWeight } = state as any;
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

  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState<string>(day?.weight ? String(day.weight) : "");
  useEffect(() => { setWeightInput(day?.weight ? String(day.weight) : ""); }, [currentDate, day?.weight]);

  const [help, setHelp] = useState<{[k:string]: boolean}>({});
  const toggleHelp = (k: string) => setHelp((h) => ({ ...h, [k]: !h[k] }));

  const chains = useMemo(() => computeChains(useAppStore.getState()), [days]);
  const topChain = useMemo(() => chains.filter(c => c.completed < c.total).sort((a,b) => b.nextPercent - a.nextPercent)[0], [chains]);

  const t = (de: string, en: string) => (language === 'en' ? en : de);

  // Hydration progress
  const weightKg = getLatestWeightKg(days);
  const goalMl = computeDailyWaterTargetMl(weightKg, !!day.drinks.sport);
  // intake includes water cure +1000 ml if toggle set
  const intakeMl = ((state.waterCupMl || 250) * (day.drinks.water || 0)) + (day.drinks.waterCure ? 1000 : 0);
  const percent = Math.max(0, Math.min(100, Math.round((intakeMl / Math.max(1, goalMl)) * 100)));

  // Helpers: render cups for a row (max 9)
  const renderCups = (count: number, type: 'water'|'coffee') => (
    <View style={{ flexDirection: 'row', flex: 1, flexWrap: 'nowrap', justifyContent: 'center' }}>
      {Array.from({ length: Math.min(count, 9) }).map((_, i) => (
        <View key={`${type}-icon-${i}`} style={{ width: `${100/9}%`, alignItems: 'center', paddingVertical: 2 }}>
          <Ionicons name={type==='coffee' ? 'cafe' : 'water'} size={16} color={colors.primary} />
        </View>
      ))}
    </View>
  );

  // Row: - | cups | +
  const RowControls = ({ onMinus, onPlus }: { onMinus: () => void; onPlus: () => void }) => (
    <>
      <TouchableOpacity onPress={onMinus} style={[styles.counterBtn, { borderColor: colors.primary }]} accessibilityLabel={t('Verringern', 'Decrease')}>
        <Ionicons name='remove' size={18} color={colors.primary} />
      </TouchableOpacity>
      <View style={{ width: 8 }} />
      {/* cups in middle rendered by caller */}
      <View style={{ width: 8 }} />
      <TouchableOpacity onPress={onPlus} style={[styles.counterBtn, { borderColor: colors.primary }]} accessibilityLabel={t('Erhöhen', 'Increase')}>
        <Ionicons name='add' size={18} color={colors.primary} />
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.card }]}> 
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="star" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, marginHorizontal: 8 }}>{t('Scarletts Gesundheitstracking', "Scarlett’s Health Tracking")}</Text>
              <Ionicons name="star" size={18} color={colors.primary} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '70%', alignSelf: 'center', marginTop: 8 }}>
              <Text style={{ color: colors.text }}>{t('Level', 'Level')} {level}</Text>
              <Text style={{ color: colors.text }}>{xp} XP</Text>
            </View>
          </View>
        </View>

        {/* Date navigation */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); state.goPrevDay(); }} style={styles.iconBtn} accessibilityLabel={t('Vortag', 'Previous day')}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); state.goToday(); }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{dateLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { const canGoNext = currentDate <= toKey(new Date()); if (canGoNext) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); state.goNextDay(); } }} style={styles.iconBtn} accessibilityLabel={t('Folgetag', 'Next day')}>
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
            <TouchableOpacity onPress={() => toggleHelp('pills')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.pills ? <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Markiere morgens/abends, wenn du deine Tabletten genommen hast.', 'Toggle morning/evening when you took your pills.')}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <TouchableOpacity onPress={() => { togglePill(currentDate, 'morning'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.toggle, { borderColor: colors.primary, backgroundColor: day.pills.morning ? colors.primary : 'transparent' }]} accessibilityLabel={t('Morgens einnehmen', 'Morning pill')}>
              <Ionicons name="sunny" size={18} color={day.pills.morning ? '#fff' : colors.primary} />
              <Text style={{ color: day.pills.morning ? '#fff' : colors.text, marginLeft: 6 }}>{t('Morgens', 'Morning')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { togglePill(currentDate, 'evening'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.toggle, { borderColor: colors.primary, backgroundColor: day.pills.evening ? colors.primary : 'transparent' }]} accessibilityLabel={t('Abends einnehmen', 'Evening pill')}>
              <Ionicons name="moon" size={18} color={day.pills.evening ? '#fff' : colors.primary} />
              <Text style={{ color: day.pills.evening ? '#fff' : colors.text, marginLeft: 6 }}>{t('Abends', 'Evening')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Drinks & Sport */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="wine" size={20} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('Getränke & Sport', 'Drinks & Sport')}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleHelp('drinks')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.drinks ? <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Bechergröße in Einstellungen. Balken zeigt Ziel (35 ml/kg + 0,5 L bei Sport). Wasserkur zählt +1,0 L zur Aufnahme.', 'Set cup size in Settings. Bar shows goal (35 ml/kg + 0.5 L if sport). Water cure adds +1.0 L to intake.')}</Text> : null}

          {/* Hydration progress */}
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.muted }}>{Math.round(intakeMl/10)/100} L</Text>
              <Text style={{ color: colors.muted }}>{Math.round(goalMl/10)/100} L · {percent}%</Text>
            </View>
            <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
              <View style={{ width: `${percent}%`, height: 8, backgroundColor: colors.primary }} />
            </View>
            {day.drinks.waterCure ? (
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Ionicons name='water' size={14} color={'#fff'} />
                  <Text style={{ color: '#fff', marginLeft: 6 }}>{t('Wasserkur +1,0 L', 'Water cure +1.0 L')}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* WATER 3x3 layout: two rows with - | cups | + */}
          <View style={{ marginTop: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{t('Wasser', 'Water')} · {state.waterCupMl} ml</Text>
            </View>
            {/* Row 1 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <RowControls onMinus={() => { incDrink(currentDate, 'water', -1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} onPlus={() => { incDrink(currentDate, 'water', +1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
              {renderCups(Math.min(day.drinks.water, 9), 'water')}
            </View>
            {/* Row 2 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <RowControls onMinus={() => { incDrink(currentDate, 'water', -1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} onPlus={() => { incDrink(currentDate, 'water', +1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
              {renderCups(Math.max(0, Math.min(day.drinks.water - 9, 9)), 'water')}
            </View>
          </View>

          {/* COFFEE */}
          <View style={{ marginTop: 14 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{t('Kaffee', 'Coffee')}</Text>
            </View>
            {/* Row 1 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <RowControls onMinus={() => { incDrink(currentDate, 'coffee', -1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} onPlus={() => { incDrink(currentDate, 'coffee', +1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
              {renderCups(Math.min(day.drinks.coffee, 9), 'coffee')}
            </View>
            {/* Row 2 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <RowControls onMinus={() => { incDrink(currentDate, 'coffee', -1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} onPlus={() => { incDrink(currentDate, 'coffee', +1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
              {renderCups(Math.max(0, Math.min(day.drinks.coffee - 9, 9)), 'coffee')}
            </View>
          </View>

          {/* Toggles */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <TouchableOpacity onPress={() => { toggleFlag(currentDate, 'slimCoffee'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.slimCoffee ? colors.primary : 'transparent' }]} accessibilityLabel={t('Schlankkaffee', 'Slim coffee')}>
              <Text style={{ color: day.drinks.slimCoffee ? '#fff' : colors.text }}>{t('Schlankkaffee', 'Slim coffee')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { toggleFlag(currentDate, 'gingerGarlicTea'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.gingerGarlicTea ? colors.primary : 'transparent' }]} accessibilityLabel={t('Ingwer-Knoblauch-Tee', 'Ginger & garlic tea')}>
              <Text style={{ color: day.drinks.gingerGarlicTea ? '#fff' : colors.text }}>{t('Ingwer-Knoblauch-Tee', 'Ginger garlic tea')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { toggleFlag(currentDate, 'waterCure'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.waterCure ? colors.primary : 'transparent' }]} accessibilityLabel={t('Wasserkur', 'Water cure')}>
              <Text style={{ color: day.drinks.waterCure ? '#fff' : colors.text }}>{t('Wasserkur', 'Water cure')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { toggleFlag(currentDate, 'sport'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.sport ? colors.primary : 'transparent' }]} accessibilityLabel={t('Sport', 'Sport')}>
              <Text style={{ color: day.drinks.sport ? '#fff' : colors.text }}>{t('Sport', 'Sport')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weight */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="fitness" size={20} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('Gewicht', 'Weight')}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleHelp('weight')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.weight ? <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Trage dein aktuelles Gewicht ein oder öffne die Analyse für Verläufe.', 'Log your current weight or open analysis for trends.')}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]} onPress={() => setWeightModal(true)}>
              <Ionicons name='fitness' size={16} color={colors.text} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{t('Eintragen', 'Log')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() => router.push('/analysis')}>
              <Ionicons name='stats-chart' size={16} color={'#fff'} />
              <Text style={{ color: '#fff', marginLeft: 6 }}>{t('Analyse', 'Analysis')}</Text>
            </TouchableOpacity>
          </View>
          {typeof day.weight === 'number' ? <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Heute', 'Today')}: {day.weight} kg</Text> : null}
        </View>

        {/* Cycle */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='water' size={20} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{language==='de'?'Zyklus':'Cycle'}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleHelp('cycle')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.cycle ? <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Starte/Beende deinen Zyklus. Über den Kalender erhältst du Übersicht und Prognosen.', 'Start/end your cycle. Open the calendar for overview and predictions.')}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {state.cycles.find((c: any) => !c.end) ? (
              <TouchableOpacity onPress={() => { state.endCycle(currentDate); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={[styles.cta, { backgroundColor: colors.primary }]}>
                <Ionicons name='stop' size={16} color={'#fff'} />
                <Text style={{ color: '#fff', marginLeft: 6 }}>{language==='de'?'Zyklus Ende':'End cycle'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => { state.startCycle(currentDate); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={[styles.cta, { backgroundColor: colors.primary }]}>
                <Ionicons name='play' size={16} color={'#fff'} />
                <Text style={{ color: '#fff', marginLeft: 6 }}>{language==='de'?'Zyklus Beginn':'Start cycle'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.push('/cycle')} style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]}>
              <Ionicons name='calendar' size={16} color={colors.primary} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{t('Kalender', 'Calendar')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chains */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='link' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{language==='de'?'Ketten':'Chains'}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleHelp('chains')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.chains ? <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Ketten zeigen dir Fortschritte in Meilensteinen. Öffne Erfolge für Details.', 'Chains show progress towards milestones. Open achievements for details.')}</Text> : null}
          {topChain ? (
            <View style={{ marginTop: 6 }}>
              <Text style={{ color: colors.muted }}>{topChain.title}</Text>
              <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                <View style={{ width: `${Math.round(topChain.nextPercent)}%`, height: 6, backgroundColor: colors.primary }} />
              </View>
              {topChain.nextTitle ? <Text style={{ color: colors.muted, marginTop: 4 }}>{t('Als Nächstes', 'Next')}: {topChain.nextTitle}</Text> : null}
            </View>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Alle Ketten abgeschlossen oder keine vorhanden.', 'All chains completed or none available.')}</Text>
          )}
        </View>

        {/* Rewards */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="gift" size={20} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{language==='de'?'Belohnungen':'Rewards'}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleHelp('rewards')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.rewards ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Sammle XP, um Belohnungen freizuschalten. Sieh dir Erfolge und Rangliste an.', 'Earn XP to unlock rewards. Check achievements and leaderboard.')}</Text>
          ) : null}
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

        {/* Quick access under Rewards */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{language==='de'?'Schnellzugriff':'Quick access'}</Text>
            <TouchableOpacity onPress={() => toggleHelp('quick')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.quick ? <Text style={{ color: colors.muted, marginTop: 6 }}>{t('Schneller Zugriff auf wichtige Bereiche.', 'Quick access to key sections.')}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/chat'); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel='Chat'>
              <Ionicons name="chatbubbles" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{language==='de'?'Chat':'Chat'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings'); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel='Einstellungen'>
              <Ionicons name="settings" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{language==='de'?'Einstellungen':'Settings'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/saved'); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel='Gespeichert'>
              <Ionicons name="bookmark" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{language==='de'?'Gespeichert':'Saved'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Weight modal */}
      <Modal visible={weightModal} transparent animationType="slide" onRequestClose={() => setWeightModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, width: '88%' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('Gewicht eintragen', 'Log weight')}</Text>
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Ionicons name="fitness" size={18} color={colors.primary} />
                  <TextInput style={{ flex: 1, marginLeft: 8, color: colors.text }} keyboardType="decimal-pad" placeholder={t('z. B. 62,3', 'e.g. 62.3')} placeholderTextColor={colors.muted} value={weightInput} onChangeText={setWeightInput} />
                  <Text style={{ color: colors.muted }}>kg</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <TouchableOpacity onPress={() => setWeightModal(false)} style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]}>
                  <Text style={{ color: colors.text }}>{t('Abbrechen', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { const normalized = (weightInput || '').replace(',', '.'); const val = parseFloat(normalized); if (!isNaN(val) && val > 0) { setWeight(currentDate, val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setWeightModal(false); } }} style={[styles.cta, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#fff' }}>{t('Speichern', 'Save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  counterBtn: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8, borderWidth: 1, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  quick: { width: '47%', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
});