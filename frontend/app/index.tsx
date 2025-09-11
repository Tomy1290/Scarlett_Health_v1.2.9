import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, useLevel } from "../src/store/useStore";
import { displayDate, toKey, parseGermanOrShort } from "../src/utils/date";
import { LineChart } from "react-native-gifted-charts";
import { useWindowDimensions } from "react-native";
import { computeAchievements } from "../src/achievements";
import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';
import { scheduleDailyReminder, cancelNotification, ensureNotificationPermissions } from "../src/utils/notifications";
import { getWeekRange, getCurrentWeeklyEvent, computeEventProgress } from "../src/gamification/events";

// ... existing helpers (useThemeColors, SectionCard) remain

export default function Home() {
  const router = useRouter();
  const {
    theme, language, currentDate, days, ensureDay, goPrevDay, goNextDay, goToday,
    togglePill, incDrink, toggleFlag, setWeight, goal, setGoal,
    reminders, addReminder, updateReminder, deleteReminder,
    chat, addChat, saved, addSaved, setLanguage, setTheme, appVersion,
    notificationMeta, setNotificationMeta, hasSeededReminders, setHasSeededReminders,
    showOnboarding, setShowOnboarding, eventHistory, completeEvent, legendShown, setLegendShown,
  } = useAppStore();
  const { level, xp } = useLevel();

  // Weekly event computation
  const now = new Date();
  const { weekKey, dayKeys } = getWeekRange(now);
  const weeklyEvent = getCurrentWeeklyEvent(now);
  const evProg = computeEventProgress(dayKeys, { days }, weeklyEvent);
  const evCompleted = evProg.completed || !!eventHistory[weekKey]?.completed;

  useEffect(() => {
    if (evProg.completed && !eventHistory[weekKey]?.completed) {
      completeEvent(weekKey, { id: weeklyEvent.id, xp: weeklyEvent.xp });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [evProg.completed, weekKey]);

  // Legend badge overlay at Level 100
  useEffect(() => {
    if (level >= 100 && !legendShown) {
      setLegendShown(true);
    }
  }, [level, legendShown]);

  // UI will include: Events card, Gated theme, Extended stats (Lv25), VIP chat (Lv50), Insights (Lv75)

  // Chat gating
  const chatMaxLen = level < 50 ? 120 : 10000;

  // Insights (offline, simple heuristics)
  function computeInsights() {
    // 1) Wochentage Wasser-Durchschnitt
    const weekdayWater = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
    Object.values(days).forEach((d) => {
      const dt = new Date(d.date);
      const w = dt.getDay();
      weekdayWater[w].sum += (d.drinks?.water ?? 0);
      weekdayWater[w].n += 1;
    });
    const avg = weekdayWater.map((x) => (x.n ? x.sum / x.n : 0));
    let minIdx = 0; for (let i=1;i<7;i++){ if (avg[i] < avg[minIdx]) minIdx = i; }
    const dayNamesDe = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    const dayNamesEn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const lowDay = language==='de'? dayNamesDe[minIdx] : dayNamesEn[minIdx];
    const tips: string[] = [];
    tips.push(language==='de'?`Am ${lowDay} trinkst du im Schnitt am wenigsten.`:`You drink the least on ${lowDay}.`);
    // 2) Gesundheits-Score einfach
    const today = days[toKey(new Date())];
    const scoreParts: number[] = [];
    if (today) {
      scoreParts.push(today.pills?.morning && today.pills?.evening ? 30 : 0);
      scoreParts.push((today.drinks?.water ?? 0) >= 6 ? 30 : Math.min(30, (today.drinks?.water ?? 0) * 5));
      scoreParts.push(typeof today.weight === 'number' ? 20 : 0);
      scoreParts.push(today.drinks?.sport ? 20 : 0);
    }
    const score = scoreParts.reduce((a,b)=>a+b,0);
    tips.push(language==='de'?`Heutiger Gesundheits-Score: ${score}/100.`:`Today health score: ${score}/100.`);
    return tips;
  }

  // In settings theme gating for Golden Pink
  function canUseGoldenPink() { return level >= 10; }

  // Extended stats gating (Lv25) we add additional text in Analysis modal when level>=25

  // ... rest of component UI below
}