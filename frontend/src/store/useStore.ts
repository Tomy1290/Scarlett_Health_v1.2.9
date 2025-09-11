import React from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvAdapter } from "../utils/storage";
import { toKey } from "../utils/date";

export type Language = "de" | "en";
export type ThemeName = "pink_default" | "pink_pastel" | "pink_vibrant";

export type DayData = {
  date: string; // yyyy-MM-dd
  pills: { morning: boolean; evening: boolean };
  drinks: {
    water: number;
    coffee: number;
    slimCoffee: boolean;
    gingerGarlicTea: boolean;
    waterCure: boolean;
    sport: boolean;
  };
  weight?: number;
};

export type Goal = {
  targetWeight: number;
  targetDate: string; // yyyy-MM-dd
  startWeight: number;
  active: boolean;
};

export type Reminder = {
  id: string;
  type: string;
  time: string; // HH:MM 24h
  enabled: boolean;
};

export type ChatMessage = {
  id: string;
  sender: "user" | "bot";
  text: string;
  createdAt: number;
};

export type SavedMessage = {
  id: string;
  title: string;
  category?: string;
  tags?: string[];
  text: string;
  createdAt: number;
};

export type AchievementProgress = {
  id: string;
  title: string;
  description: string;
  percent: number; // 0-100
  xp: number;
  completed: boolean;
};

export type AppState = {
  days: Record<string, DayData>;
  goal?: Goal;
  reminders: Reminder[];
  chat: ChatMessage[];
  saved: SavedMessage[];
  achievementsUnlocked: string[];
  xp: number;
  language: Language;
  theme: ThemeName;
  appVersion: string;
  // UI state
  currentDate: string; // yyyy-MM-dd

  // Actions
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

  // Achievements
  recalcAchievements: () => void;
};

const defaultDay = (dateKey: string): DayData => ({
  date: dateKey,
  pills: { morning: false, evening: false },
  drinks: {
    water: 0,
    coffee: 0,
    slimCoffee: false,
    gingerGarlicTea: false,
    waterCure: false,
    sport: false,
  },
});

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      days: {},
      reminders: [],
      chat: [],
      saved: [],
      achievementsUnlocked: [],
      xp: 0,
      language: "de",
      theme: "pink_default",
      appVersion: "1.0.0",
      currentDate: toKey(new Date()),

      setLanguage: (lng) => set({ language: lng }),
      setTheme: (t) => set({ theme: t }),
      goPrevDay: () => {
        const cur = new Date(get().currentDate);
        const prev = new Date(cur);
        prev.setDate(cur.getDate() - 1);
        set({ currentDate: toKey(prev) });
      },
      goNextDay: () => {
        const cur = new Date(get().currentDate);
        const next = new Date(cur);
        next.setDate(cur.getDate() + 1);
        const todayKey = toKey(new Date());
        const nextKey = toKey(next);
        if (nextKey &gt; todayKey) return; // block future
        set({ currentDate: nextKey });
      },
      goToday: () => set({ currentDate: toKey(new Date()) }),
      ensureDay: (key: string) => {
        const days = get().days;
        if (!days[key]) {
          set({ days: { ...days, [key]: defaultDay(key) } });
        }
      },
      togglePill: (key, time) => {
        const days = { ...get().days };
        const d = days[key] ?? defaultDay(key);
        d.pills = { ...d.pills, [time]: !d.pills[time] } as any;
        days[key] = d;
        set({ days });
        get().recalcAchievements();
      },
      incDrink: (key, type, delta) => {
        const days = { ...get().days };
        const d = days[key] ?? defaultDay(key);
        const val = d.drinks[type] as number;
        const next = clamp(val + delta, 0, 999);
        d.drinks = { ...d.drinks, [type]: next } as any;
        days[key] = d;
        set({ days });
        get().recalcAchievements();
      },
      toggleFlag: (key, type) => {
        const days = { ...get().days };
        const d = days[key] ?? defaultDay(key);
        const cur = d.drinks[type] as boolean;
        d.drinks = { ...d.drinks, [type]: !cur } as any;
        days[key] = d;
        set({ days });
        get().recalcAchievements();
      },
      setWeight: (key, weight) => {
        const days = { ...get().days };
        const d = days[key] ?? defaultDay(key);
        d.weight = weight;
        days[key] = d;
        set({ days });
        get().recalcAchievements();
      },
      setGoal: (goal) => set({ goal }),
      removeGoal: () => set({ goal: undefined }),
      addReminder: (r) => set({ reminders: [r, ...get().reminders] }),
      updateReminder: (id, patch) =>
        set({
          reminders: get().reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }),
      deleteReminder: (id) => set({ reminders: get().reminders.filter((r) => r.id !== id) }),
      addChat: (m) => set({ chat: [...get().chat, m] }),
      addSaved: (s) => set({ saved: [s, ...get().saved] }),
      deleteSaved: (id) => set({ saved: get().saved.filter((s) => s.id !== id) }),

      recalcAchievements: () => {
        // lightweight inline engine; heavy logic in achievements module (lazy-import later if needed)
        // Simple examples + XP sum
        const state = get();
        const unlocked = new Set(state.achievementsUnlocked);
        let xp = 0;

        // Rules
        // 1) first_weight
        const anyWeight = Object.values(state.days).some((d) =&gt; d.weight != null);
        if (anyWeight) unlocked.add("first_weight");
        // 2) seven_days
        const daysWithWeight = Object.values(state.days).filter((d) =&gt; d.weight != null).length;
        if (daysWithWeight &gt;= 7) unlocked.add("seven_days");
        // 3) water_10
        const anyWater10 = Object.values(state.days).some((d) =&gt; (d.drinks?.water ?? 0) &gt;= 10);
        if (anyWater10) unlocked.add("water_10");
        // 4) sport streaks
        const dates = Object.keys(state.days).sort();
        let maxSportStreak = 0;
        let cur = 0;
        for (const k of dates) {
          const d = state.days[k];
          if (d?.drinks?.sport) {
            cur += 1;
            maxSportStreak = Math.max(maxSportStreak, cur);
          } else {
            cur = 0;
          }
        }
        if (maxSportStreak &gt;= 1) unlocked.add("sport_first");
        if (maxSportStreak &gt;= 3) unlocked.add("sport_3_days");
        if (maxSportStreak &gt;= 7) unlocked.add("sport_7_days");

        // XP assignment (example values)
        const xpMap: Record&lt;string, number&gt; = {
          first_weight: 100,
          seven_days: 200,
          water_10: 150,
          sport_first: 100,
          sport_3_days: 200,
          sport_7_days: 300,
        };
        for (const id of unlocked) xp += xpMap[id] ?? 0;
        const levelCapXP = 99 * 100; // level 100 max (level 1 at 0xp)
        xp = Math.min(xp, levelCapXP);

        set({ achievementsUnlocked: Array.from(unlocked), xp });
      },
    }),
    {
      name: "scarlett-app-state",
      storage: createJSONStorage(() =&gt; mmkvAdapter),
      partialize: (s) =&gt; s, // persist all
      version: 1,
      onRehydrateStorage: () =&gt; (state) =&gt; {
        // data normalization on startup
        if (!state) return;
        const days = state.days || {};
        for (const k of Object.keys(days)) {
          const d = days[k];
          // ensure sport flag exists
          if (!d.drinks) d.drinks = { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false } as any;
          if (typeof d.drinks.sport !== "boolean") d.drinks.sport = false as any;
        }
      },
    }
  )
);

export function useLevel() {
  const xp = useAppStore((s) =&gt; s.xp);
  const level = Math.min(100, Math.floor(xp / 100) + 1);
  return { level, xp };
}