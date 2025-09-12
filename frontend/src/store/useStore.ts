import React from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvAdapter } from "../utils/storage";
import { toKey } from "../utils/date";
import { computeAchievements } from "../achievements";

export type Language = "de" | "en";
export type ThemeName = "pink_default" | "pink_pastel" | "pink_vibrant" | "golden_pink";

export type DayData = {
  date: string;
  pills: { morning: boolean; evening: boolean };
  drinks: { water: number; coffee: number; slimCoffee: boolean; gingerGarlicTea: boolean; waterCure: boolean; sport: boolean };
  weight?: number;
  weightTime?: number;
  xpToday?: Record<string, boolean>;
};

export type Cycle = { start: string; end?: string };

export type Goal = { targetWeight: number; targetDate: string; startWeight: number; active: boolean };
export type Reminder = { id: string; type: string; time: string; enabled: boolean; label?: string };
export type ChatMessage = { id: string; sender: "user" | "bot"; text: string; createdAt: number };
export type SavedMessage = { id: string; title: string; category?: string; tags?: string[]; text: string; createdAt: number };

export type RewardsSeen = { golden?: boolean; extStats?: boolean; vip?: boolean; insights?: boolean; legend?: boolean };
export type XpLogEntry = { id: string; ts: number; amount: number; source: 'achievement'|'event'|'combo'|'other'; note?: string };

export type CycleLog = {
  mood?: number; // 1-10
  energy?: number; // 1-10
  pain?: number; // 1-10
  sleep?: number; // 1-10
  sex?: boolean;
  notes?: string;
  flow?: number; // 0..7 bleeding intensity
};

export type AppState = {
  days: Record<string, DayData>;
  goal?: Goal;
  reminders: Reminder[];
  chat: ChatMessage[];
  saved: SavedMessage[];
  achievementsUnlocked: string[];
  xp: number;
  xpBonus: number;
  language: Language;
  theme: ThemeName;
  appVersion: string;
  currentDate: string;
  notificationMeta: Record<string, { id: string; time: string } | undefined>;
  hasSeededReminders: boolean;
  showOnboarding: boolean;
  eventHistory: Record<string, { id: string; completed: boolean; xp: number } | undefined>;
  legendShown?: boolean;
  rewardsSeen?: RewardsSeen;
  profileAlias?: string;
  xpLog?: XpLogEntry[];
  aiInsightsEnabled: boolean;
  aiFeedback?: Record<string, number>;
  eventsEnabled: boolean;
  cycles: Cycle[];
  cycleLogs: Record<string, CycleLog>;
  waterCupMl: number;

  setLanguage: (lng: Language) => void;
  setTheme: (t: ThemeName) => void;
  goPrevDay: () => void;
  goNextDay: () => void;
  goToday: () => void;
  ensureDay: (key: string) => void;
  togglePill: (key: string, time: "morning" | "evening") => void;
  setPillsBoth: (key: string) => void;
  incDrink: (key: string, type: "water" | "coffee", delta: number) => void;
  toggleFlag: (key: string, type: "slimCoffee" | "gingerGarlicTea" | "waterCure" | "sport") => void;
  setWeight: (key: string, weight: number) => void;
  setGoal: (goal: Goal) => void;
  removeGoal: () => void;
  addReminder: (r: Reminder) => void;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  addChat: (m: ChatMessage) => void;
  addSaved: (s: SavedMessage) => void;
  deleteSaved: (id: string) => void;

  setNotificationMeta: (remId: string, meta?: { id: string; time: string }) => void;
  setHasSeededReminders: (v: boolean) => void;
  setShowOnboarding: (v: boolean) => void;
  completeEvent: (weekKey: string, entry: { id: string; xp: number }) => void;
  setLegendShown: (v: boolean) => void;
  setRewardSeen: (key: keyof RewardsSeen, v: boolean) => void;
  setProfileAlias: (alias: string) => void;
  setAiInsightsEnabled: (v: boolean) => void;
  feedbackAI: (id: string, delta: 1 | -1) => void;
  setEventsEnabled: (v: boolean) => void;
  setWaterCupMl: (ml: number) => void;

  startCycle: (dateKey: string) => void;
  endCycle: (dateKey: string) => void;

  setCycleLog: (dateKey: string, patch: Partial<CycleLog>) => void;

  recalcAchievements: () => void;
};

const defaultDay = (dateKey: string): DayData => ({ date: dateKey, pills: { morning: false, evening: false }, drinks: { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false }, xpToday: {} });
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      days: {}, reminders: [], chat: [], saved: [], achievementsUnlocked: [], xp: 0, xpBonus: 0, language: "de", theme: "pink_default", appVersion: "1.1.6",
      currentDate: toKey(new Date()), notificationMeta: {}, hasSeededReminders: false, showOnboarding: true, eventHistory: {}, legendShown: false, rewardsSeen: {}, profileAlias: '', xpLog: [],
      aiInsightsEnabled: true, aiFeedback: {}, eventsEnabled: true, cycles: [], cycleLogs: {}, waterCupMl: 250,

      setLanguage: (lng) => { set({ language: lng }); get().recalcAchievements(); },
      setTheme: (t) => { const lvl = Math.floor(get().xp / 100) + 1; if (t === 'golden_pink' && lvl < 75) { return; } set({ theme: t }); get().recalcAchievements(); },
      goPrevDay: () => { const cur = new Date(get().currentDate); const prev = new Date(cur); prev.setDate(cur.getDate() - 1); set({ currentDate: toKey(prev) }); },
      goNextDay: () => { const cur = new Date(get().currentDate); const next = new Date(cur); next.setDate(cur.getDate() + 1); const todayKey = toKey(new Date()); const nextKey = toKey(next); if (nextKey > todayKey) return; set({ currentDate: nextKey }); },
      goToday: () => set({ currentDate: toKey(new Date()) }),
      ensureDay: (key) => { const days = get().days; if (!days[key]) set({ days: { ...days, [key]: defaultDay(key) } }); },

      togglePill: (key, time) => { const days = { ...get().days }; const d = days[key] ?? defaultDay(key); const before = d.pills[time]; d.pills = { ...d.pills, [time]: !before } as any; days[key] = d; let xpDelta = 0; if (!before && d.pills[time]) xpDelta += 10; set({ days, xp: get().xp + xpDelta, xpLog: xpDelta ? [...(get().xpLog||[]), { id: `xp:${Date.now()}`, ts: Date.now(), amount: xpDelta, source: 'other', note: `pill_${time}` }] : get().xpLog }); get().recalcAchievements(); },
      setPillsBoth: (key) => { const days = { ...get().days }; const d = days[key] ?? defaultDay(key); let xpDelta = 0; if (!d.pills.morning) { d.pills.morning = true; xpDelta += 10; } if (!d.pills.evening) { d.pills.evening = true; xpDelta += 10; } days[key] = d; set({ days, xp: get().xp + xpDelta, xpLog: xpDelta ? [...(get().xpLog||[]), { id: `xp:${Date.now()}`, ts: Date.now(), amount: xpDelta, source: 'other', note: 'pills_both' }] : get().xpLog }); get().recalcAchievements(); },
      incDrink: (key, type, delta) => { const days = { ...get().days }; const d = days[key] ?? defaultDay(key); const oldVal = d.drinks[type] as number; const max = (type === 'water' || type === 'coffee') ? 18 : 999; const next = clamp(oldVal + delta, 0, max); d.drinks = { ...d.drinks, [type]: next } as any; days[key] = d; let xpDelta = 0; if (type === 'water') { xpDelta += 10 * (next - oldVal); } else if (type === 'coffee') { if (next > oldVal) { for (let i = oldVal + 1; i <= next; i++) { if (i > 6) xpDelta -= 10; } } else if (next < oldVal) { for (let i = oldVal; i > next; i--) { if (i > 6) xpDelta += 10; } } } if (xpDelta !== 0) set({ days, xp: get().xp + xpDelta, xpLog: [...(get().xpLog||[]), { id: `xp:${Date.now()}`, ts: Date.now(), amount: xpDelta, source: 'other', note: type }] }); else set({ days }); get().recalcAchievements(); },
      toggleFlag: (key, type) => { const days = { ...get().days }; const d = days[key] ?? defaultDay(key); const before = d.drinks[type] as boolean; const now = !before; d.drinks = { ...d.drinks, [type]: now } as any; const xpFlags = { ...(d.xpToday || {}) }; let xpDelta = 0; if (now && !xpFlags[type]) { xpDelta += 10; xpFlags[type] = true; } d.xpToday = xpFlags; days[key] = d; if (xpDelta !== 0) set({ days, xp: get().xp + xpDelta, xpLog: [...(get().xpLog||[]), { id: `xp:${Date.now()}`, ts: Date.now(), amount: xpDelta, source: 'other', note: type }] }); else set({ days }); get().recalcAchievements(); },
      setWeight: (key, weight) => { const days = { ...get().days }; const d = days[key] ?? defaultDay(key); d.weight = weight; d.weightTime = Date.now(); days[key] = d; set({ days }); get().recalcAchievements(); },
      setGoal: (goal) => { set({ goal }); get().recalcAchievements(); },
      removeGoal: () => { set({ goal: undefined }); get().recalcAchievements(); },
      addReminder: (r) => { set({ reminders: [r, ...get().reminders] }); get().recalcAchievements(); },
      updateReminder: (id, patch) => set({ reminders: get().reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
      deleteReminder: (id) => { set({ reminders: get().reminders.filter((r) => r.id !== id) }); get().recalcAchievements(); },
      addChat: (m) => { const lvl = Math.floor(get().xp / 100) + 1; let msg = m; if (m.sender === 'user' && lvl < 50 && typeof m.text === 'string' && m.text.length > 120) { msg = { ...m, text: m.text.slice(0, 120) }; } set({ chat: [...get().chat, msg] }); get().recalcAchievements(); },
      addSaved: (s) => { set({ saved: [s, ...get().saved] }); get().recalcAchievements(); },
      deleteSaved: (id) => { set({ saved: get().saved.filter((s) => s.id !== id) }); get().recalcAchievements(); },

      setNotificationMeta: (remId, meta) => set({ notificationMeta: { ...get().notificationMeta, [remId]: meta } }),
      setHasSeededReminders: (v) => set({ hasSeededReminders: v }),
      setShowOnboarding: (v) => set({ showOnboarding: v }),
      completeEvent: (weekKey, entry) => { const existing = get().eventHistory[weekKey]; if (existing?.completed) return; let bonus = 0; try { const { EVENTS } = require('../gamification/events'); const evt = (EVENTS as any[]).find((e) => e.id === entry.id); if (evt) bonus = Math.round(entry.xp * (evt.bonusPercent || 0)); } catch {} const total = entry.xp + bonus; const log = [...(get().xpLog||[]), { id: `${weekKey}:${Date.now()}`, ts: Date.now(), amount: total, source: 'event', note: entry.id }]; set({ eventHistory: { ...get().eventHistory, [weekKey]: { id: entry.id, completed: true, xp: total } }, xp: get().xp + total, xpLog: log }); },
      setLegendShown: (v) => set({ legendShown: v }),
      setRewardSeen: (key, v) => set({ rewardsSeen: { ...(get().rewardsSeen||{}), [key]: v } }),
      setProfileAlias: (alias) => set({ profileAlias: alias }),
      setAiInsightsEnabled: (v) => set({ aiInsightsEnabled: v }),
      feedbackAI: (id, delta) => { const map = { ...(get().aiFeedback||{}) }; map[id] = (map[id]||0) + delta; set({ aiFeedback: map }); },
      setEventsEnabled: (v) => set({ eventsEnabled: v }),
      setWaterCupMl: (ml) => set({ waterCupMl: Math.max(50, Math.min(1000, Math.round(ml))) }),

      startCycle: (dateKey) => { const cycles = [...get().cycles]; const active = cycles.find(c => !c.end); if (active) return; cycles.push({ start: dateKey }); set({ cycles }); },
      endCycle: (dateKey) => { const cycles = [...get().cycles]; const activeIdx = cycles.findIndex(c => !c.end); if (activeIdx === -1) return; cycles[activeIdx] = { ...cycles[activeIdx], end: dateKey }; set({ cycles }); },

      setCycleLog: (dateKey, patch) => { const all = { ...(get().cycleLogs || {}) }; const prev = all[dateKey] || {}; const merged: CycleLog = { ...prev }; if (typeof patch.mood === 'number') merged.mood = clamp(patch.mood, 1, 10); if (typeof patch.energy === 'number') merged.energy = clamp(patch.energy, 1, 10); if (typeof patch.pain === 'number') merged.pain = clamp(patch.pain, 1, 10); if (typeof patch.sleep === 'number') merged.sleep = clamp(patch.sleep, 1, 10); if (typeof patch.sex === 'boolean') merged.sex = patch.sex; if (typeof patch.notes === 'string') merged.notes = patch.notes; if (typeof patch.flow === 'number') merged.flow = Math.max(0, Math.min(7, patch.flow)); all[dateKey] = merged; set({ cycleLogs: all }); },

      recalcAchievements: () => { const state = get(); const base = computeAchievements({ days: state.days, goal: state.goal, reminders: state.reminders, chat: state.chat, saved: state.saved, achievementsUnlocked: state.achievementsUnlocked, xp: state.xp, language: state.language, theme: state.theme }); const prevSet = new Set(state.achievementsUnlocked); const newUnlocks = base.unlocked.filter((id) => !prevSet.has(id)); let xpDelta = 0; const comboBonus = newUnlocks.length >= 2 ? (newUnlocks.length - 1) * 50 : 0; if (newUnlocks.length > 0) { try { const { getAchievementConfigById } = require('../achievements'); const sum = newUnlocks.reduce((acc: number, id: string) => { const cfg = getAchievementConfigById(id); return acc + (cfg?.xp || 0); }, 0); xpDelta += sum; if (sum > 0) { const addLog = { id: `ach:${Date.now()}`, ts: Date.now(), amount: sum, source: 'achievement', note: `${newUnlocks.length} unlocks` } as XpLogEntry; set({ xpLog: [...(state.xpLog||[]), addLog] }); } } catch {} } if (comboBonus > 0) { const addLog = { id: `combo:${Date.now()}`, ts: Date.now(), amount: comboBonus, source: 'combo', note: `${newUnlocks.length} unlocks combo` } as XpLogEntry; set({ xpLog: [...(get().xpLog||[]), addLog] }); } set({ achievementsUnlocked: base.unlocked, xp: state.xp + xpDelta + comboBonus }); },
    }),
    { name: "scarlett-app-state", storage: createJSONStorage(() => mmkvAdapter), partialize: (s) => s, version: 15, onRehydrateStorage: () => (state) => { if (!state) return; const days = state.days || {}; for (const k of Object.keys(days)) { const d = days[k]; if (!d.drinks) d.drinks = { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false } as any; if (typeof d.drinks.sport !== 'boolean') d.drinks.sport = false as any; if (!d.xpToday) d.xpToday = {}; } if (typeof (state as any).waterCupMl !== 'number') (state as any).waterCupMl = 250; } }
  )
);

export function useLevel() { const xp = useAppStore((s) => s.xp); const level = Math.floor(xp / 100) + 1; return { level, xp }; }

export function getAverageCycleLengthDays(cycles: Cycle[]): number { const starts = cycles.filter(c => c.start).map(c => c.start).sort(); if (starts.length < 2) return 28; const diffs: number[] = []; for (let i = 1; i < starts.length; i++) { const a = new Date(starts[i-1]); const b = new Date(starts[i]); const diff = Math.round((+b - +a)/(24*60*60*1000)); if (diff > 0) diffs.push(diff); } if (diffs.length === 0) return 28; const last3 = diffs.slice(-3); const avg = Math.round(last3.reduce((a,b)=>a+b,0)/last3.length); return avg || 28; }