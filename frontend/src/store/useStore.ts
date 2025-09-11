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
};

export type Goal = { targetWeight: number; targetDate: string; startWeight: number; active: boolean };
export type Reminder = { id: string; type: string; time: string; enabled: boolean };
export type ChatMessage = { id: string; sender: "user" | "bot"; text: string; createdAt: number };
export type SavedMessage = { id: string; title: string; category?: string; tags?: string[]; text: string; createdAt: number };

export type RewardsSeen = { golden?: boolean; extStats?: boolean; vip?: boolean; insights?: boolean; legend?: boolean };

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

  setLanguage: (lng: Language) => void;
  setTheme: (t: ThemeName) => void;
  goPrevDay: () => void;
  goNextDay: () => void;
  goToday: () => void;
  ensureDay: (key: string) => void;
  togglePill: (key: string, time: "morning" | "evening") => void;
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

  recalcAchievements: () => void;
};

const defaultDay = (dateKey: string): DayData => ({ date: dateKey, pills: { morning: false, evening: false }, drinks: { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false } });
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      days: {}, reminders: [], chat: [], saved: [], achievementsUnlocked: [], xp: 0, xpBonus: 0, language: "de", theme: "pink_default", appVersion: "1.0.0",
      currentDate: toKey(new Date()), notificationMeta: {}, hasSeededReminders: false, showOnboarding: true, eventHistory: {}, legendShown: false, rewardsSeen: {},

      setLanguage: (lng) => { set({ language: lng }); get().recalcAchievements(); },
      setTheme: (t) => {
        // Gate Golden Pink theme to Level >= 10
        const lvl = Math.floor(get().xp / 100) + 1;
        if (t === 'golden_pink' && lvl < 10) {
          // ignore attempt to set locked theme
          return;
        }
        set({ theme: t });
        get().recalcAchievements();
      },
      goPrevDay: () => { const cur = new Date(get().currentDate); const prev = new Date(cur); prev.setDate(cur.getDate() - 1); set({ currentDate: toKey(prev) }); },
      goNextDay: () => { const cur = new Date(get().currentDate); const next = new Date(cur); next.setDate(cur.getDate() + 1); const todayKey = toKey(new Date()); const nextKey = toKey(next); if (nextKey > todayKey) return; set({ currentDate: nextKey }); },
      goToday: () => set({ currentDate: toKey(new Date()) }),
      ensureDay: (key) => { const days = get().days; if (!days[key]) set({ days: { ...days, [key]: defaultDay(key) } }); },
      togglePill: (key, time) => { const days = { ...get().days }; const d = days[key] ?? defaultDay(key); d.pills = { ...d.pills, [time]: !d.pills[time] } as any; days[key] = d; set({ days }); get().recalcAchievements(); },
      incDrink: (key, type, delta) => { const days = { ...get().days }; const d = days[key] ?? defaultDay(key); const val = d.drinks[type] as number; const next = clamp(val + delta, 0, 999); d.drinks = { ...d.drinks, [type]: next } as any; days[key] = d; set({ days }); get().recalcAchievements(); },
      toggleFlag: (key, type) => { const days = { ...get().days }; const d = days[key] ?? defaultDay(key); const cur = d.drinks[type] as boolean; d.drinks = { ...d.drinks, [type]: !cur } as any; days[key] = d; set({ days }); get().recalcAchievements(); },
      setWeight: (key, weight) => { const days = { ...get().days }; const d = days[key] ?? defaultDay(key); d.weight = weight; d.weightTime = Date.now(); days[key] = d; set({ days }); get().recalcAchievements(); },
      setGoal: (goal) => { set({ goal }); get().recalcAchievements(); },
      removeGoal: () => { set({ goal: undefined }); get().recalcAchievements(); },
      addReminder: (r) => { set({ reminders: [r, ...get().reminders] }); get().recalcAchievements(); },
      updateReminder: (id, patch) => set({ reminders: get().reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
      deleteReminder: (id) => { set({ reminders: get().reminders.filter((r) => r.id !== id) }); get().recalcAchievements(); },
      addChat: (m) => {
        // VIP-Chat Gating: L<50 => max 120 Zeichen für User-Nachrichten
        const lvl = Math.floor(get().xp / 100) + 1;
        let msg = m;
        if (m.sender === 'user' && lvl < 50 && typeof m.text === 'string' && m.text.length > 120) {
          msg = { ...m, text: m.text.slice(0, 120) };
        }
        set({ chat: [...get().chat, msg] });
        get().recalcAchievements();
      },
      addSaved: (s) => { set({ saved: [s, ...get().saved] }); get().recalcAchievements(); },
      deleteSaved: (id) => { set({ saved: get().saved.filter((s) => s.id !== id) }); get().recalcAchievements(); },

      setNotificationMeta: (remId, meta) => set({ notificationMeta: { ...get().notificationMeta, [remId]: meta } }),
      setHasSeededReminders: (v) => set({ hasSeededReminders: v }),
      setShowOnboarding: (v) => set({ showOnboarding: v }),
      completeEvent: (weekKey, entry) => {
        const existing = get().eventHistory[weekKey];
        if (existing?.completed) return;
        // Apply event bonus percent if we can find it from the id
        let bonus = 0;
        try {
          const { EVENTS } = require('../gamification/events');
          const evt = (EVENTS as any[]).find((e) => e.id === entry.id);
          if (evt) bonus = Math.round(entry.xp * (evt.bonusPercent || 0));
        } catch {}
        const total = entry.xp + bonus;
        const xpBonus = get().xpBonus + total;
        set({ eventHistory: { ...get().eventHistory, [weekKey]: { id: entry.id, completed: true, xp: total } }, xpBonus, xp: get().xp + total });
      },
      setLegendShown: (v) => set({ legendShown: v }),
      setRewardSeen: (key, v) => set({ rewardsSeen: { ...(get().rewardsSeen||{}), [key]: v } }),

      recalcAchievements: () => {
        const state = get();
        const base = computeAchievements({ days: state.days, goal: state.goal, reminders: state.reminders, chat: state.chat, saved: state.saved, achievementsUnlocked: state.achievementsUnlocked, xp: state.xp, language: state.language, theme: state.theme });
        const prevSet = new Set(state.achievementsUnlocked);
        const newUnlocks = base.unlocked.filter((id) => !prevSet.has(id));
        let xpBonus = state.xpBonus;
        if (newUnlocks.length >= 2) xpBonus += (newUnlocks.length - 1) * 50; // combo bonus
        set({ achievementsUnlocked: base.unlocked, xpBonus, xp: base.xp + xpBonus });
      },
    }),
    { name: "scarlett-app-state", storage: createJSONStorage(() => mmkvAdapter), partialize: (s) => s, version: 8, onRehydrateStorage: () => (state) => {
      if (!state) return; const days = state.days || {}; for (const k of Object.keys(days)) { const d = days[k]; if (!d.drinks) d.drinks = { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false } as any; if (typeof d.drinks.sport !== 'boolean') d.drinks.sport = false as any; }
    } }
  )
);

export function useLevel() { const xp = useAppStore((s) => s.xp); const level = Math.floor(xp / 100) + 1; return { level, xp }; }