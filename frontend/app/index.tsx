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

/* Rest des Codes unverändert, nur der Sync-Effect angepasst */

export default function Home() {
  const router = useRouter();
  const {
    theme, language, currentDate, days, ensureDay, goPrevDay, goNextDay, goToday,
    togglePill, incDrink, toggleFlag, setWeight, goal, setGoal,
    reminders, addReminder, updateReminder, deleteReminder,
    chat, addChat, saved, addSaved, setLanguage, setTheme, appVersion,
    notificationMeta, setNotificationMeta, hasSeededReminders, setHasSeededReminders,
    showOnboarding, setShowOnboarding,
  } = useAppStore();

  // ... (oberer Code bleibt gleich)

  useEffect(() => {
    (async () => {
      for (const r of reminders) {
        const key = r.id;
        const meta = notificationMeta[key];
        if (r.enabled) {
          if (!meta || meta.time !== r.time) {
            if (meta?.id) { await cancelNotification(meta.id); }
            const notifId = await scheduleDailyReminder(key, 'Erinnerung', `${r.type} – ${r.time}`, r.time);
            setNotificationMeta(key, notifId ? { id: notifId, time: r.time } : undefined);
          }
        } else {
          if (meta?.id) { await cancelNotification(meta.id); setNotificationMeta(key, undefined); }
        }
      }
    })();
  }, [reminders]);

  // ... (Rest UI unverändert)
}