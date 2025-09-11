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

/* UI unchanged above */

// In reminders modal, add two quick-add buttons for sport & ginger tea
// Find the section where we add new reminder (after inputs) and append quick presets.