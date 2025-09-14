import React from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvAdapter, storage } from "../utils/storage";
import { toKey } from "../utils/date";
import { computeAchievements } from "../achievements";
import { predictNextStart, getFertileWindow } from "../utils/cycle";
import { ensureAndroidChannel, ensureNotificationPermissions, scheduleOneTime, cancelNotification } from "../utils/notifications";

export type Language = "de" | "en" | "pl";
export type ThemeName = "pink_default" | "pink_pastel" | "pink_vibrant" | "golden_pink";

export type DayLogEntry = { ts: number; action: string; value?: number | boolean | string; note?: string };

export type DayData = {
  date: string;
  pills: { morning: boolean; evening: boolean };
  drinks: { water: number; coffee: number; slimCoffee: boolean; gingerGarlicTea: boolean; waterCure: boolean; sport: boolean };
  weight?: number;
  weightTime?: number;
  xpToday?: Record<string, boolean>;
  activityLog?: DayLogEntry[];
};

export type Cycle = { start: string; end?: string };

export type Goal = { targetWeight: number; targetDate: string; startWeight: number; active: boolean };
export type Reminder = { id: string; type: string; time: string; enabled: boolean; label?: string };
export type ChatMessage = { id: string; sender: "user" | "bot"; text: string; createdAt: number };
export type SavedMessage = { id: string; title: string; category?: string; tags?: string[]; text: string; createdAt: number };

export type RewardsSeen = { golden?: boolean; extStats?: boolean; vip?: boolean; insights?: boolean; legend?: boolean };
export type XpLogEntry = { id: string; ts: number; amount: number; source: 'achievement'|'event'|'combo'|'other'; note?: string };

export type CycleLog = {
  mood?: number;
  energy?: number;
  pain?: number;
  sleep?: number;
  sex?: boolean;
  notes?: string;
  flow?: number;
  cramps?: boolean;
  headache?: boolean;
  nausea?: boolean;
  updatedAt?: number;
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
  notificationMeta: Record<string, { id: string; time?: string } | undefined>;
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
  lastChatLeaveAt?: number;

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
  updateSaved: (id: string, patch: Partial<SavedMessage>) => void;
  deleteSaved: (id: string) => void;

  setNotificationMeta: (remId: string, meta?: { id: string; time?: string }) => void;
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
  setLastChatLeaveAt: (ts: number) => void;

  startCycle: (dateKey: string) => void;
  endCycle: (dateKey: string) => void;

  setCycleLog: (dateKey: string, patch: Partial<CycleLog>) => void;
  clearCycleLog: (dateKey: string) => void;

  recalcAchievements: () => void;
  scheduleCycleNotifications: () => Promise<void>;
};

const defaultDay = (dateKey: string): DayData => ({
  date: dateKey,
  pills: { morning: false, evening: false },
  drinks: { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false },
  xpToday: {},
  activityLog: [],
});

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      days: {}, reminders: [], chat: [], saved: [], achievementsUnlocked: [], xp: 0, xpBonus: 0, language: "de", theme: "pink_default", appVersion: "1.2.4",
      currentDate: toKey(new Date()), notificationMeta: {}, hasSeededReminders: false, showOnboarding: true, eventHistory: {}, legendShown: false, rewardsSeen: {}, profileAlias: '', xpLog: [],
      aiInsightsEnabled: true, aiFeedback: {}, eventsEnabled: true, cycles: [], cycleLogs: {}, waterCupMl: 250, lastChatLeaveAt: 0,

      setLanguage: (lng) => { set({ language: lng }); get().recalcAchievements(); },
      setTheme: (t) => { const lvl = Math.floor(get().xp / 100) + 1; if (t === 'golden_pink' && lvl < 75) return; set({ theme: t }); get().recalcAchievements(); },
      goPrevDay: () => { const cur = new Date(get().currentDate); cur.setDate(cur.getDate() - 1); set({ currentDate: toKey(cur) }); },
      goNextDay: () => { const cur = new Date(get().currentDate); const next = new Date(cur); next.setDate(cur.getDate() + 1); if (toKey(next) > toKey(new Date())) return; set({ currentDate: toKey(next) }); },
      goToday: () => set({ currentDate: toKey(new Date()) }),
      ensureDay: (key) => { const days = get().days; if (!days[key]) set({ days: { ...days, [key]: defaultDay(key) } }); },

      togglePill: (key, time) => {
        const days = { ...get().days }; 
        const d = days[key] ?? defaultDay(key); 
        const before = d.pills[time]; 
        const now = !before; 
        d.pills = { ...d.pills, [time]: now } as any; 
        const xpFlags = { ...(d.xpToday || {}) }; 
        let xpDelta = 0; 
        const pillKey = `pills_${time}`; 
        if (now && !xpFlags[pillKey]) { xpDelta += 15; xpFlags[pillKey] = true; } 
        d.xpToday = xpFlags; 
        d.activityLog = [...(d.activityLog||[]), { ts: Date.now(), action: `pill_${time}`, value: now }]; 
        days[key] = d; 
        if (xpDelta !== 0) set({ days, xp: get().xp + xpDelta, xpLog: [...(get().xpLog||[]), { id: `xp:${Date.now()}`, ts: Date.now(), amount: xpDelta, source: 'other', note: `pills_${time}` }] }); 
        else set({ days }); 
        get().recalcAchievements();
      },

      setPillsBoth: (key) => {
        const days = { ...get().days };
        const d = days[key] ?? defaultDay(key);
        let xpDelta = 0;
        if (!d.pills.morning) { d.pills.morning = true; xpDelta += 10; d.activityLog = [...(d.activityLog||[]), { ts: Date.now(), action: 'pill_morning', value: true }]; }
        if (!d.pills.evening) { d.pills.evening = true; xpDelta += 10; d.activityLog = [...(d.activityLog||[]), { ts: Date.now(), action: 'pill_evening', value: true }]; }
        days[key] = d;
        set({ days, xp: get().xp + xpDelta, xpLog: xpDelta ? [...(get().xpLog||[]), { id: `xp:${Date.now()}`, ts: Date.now(), amount: xpDelta, source: 'other', note: 'pills_both' }] : get().xpLog });
        get().recalcAchievements();
      },

      incDrink: (key, type, delta) => {
        const days = { ...get().days };
        const d = days[key] ?? defaultDay(key);
        const oldVal = d.drinks[type] as number;
        const max = (type === 'water' || type === 'coffee') ? 18 : 999;
        const next = clamp(oldVal + delta, 0, max);
        d.drinks = { ...d.drinks, [type]: next } as any;
        d.activityLog = [...(d.activityLog||[]), { ts: Date.now(), action: `drink_${type}`, value: delta }];
        days[key] = d;

        let xpDelta = 0;
        if (type === 'water') { xpDelta += 10 * (next - oldVal); }
        else if (type === 'coffee') {
          if (next > oldVal) { for (let i = oldVal + 1; i <= next; i++) { if (i > 6) xpDelta -= 10; } }
          else if (next < oldVal) { for (let i = oldVal; i > next; i--) { if (i > 6) xpDelta += 10; } }
        }

        set({ days, xp: get().xp + xpDelta, xpLog: xpDelta ? [...(get().xpLog||[]), { id: `xp:${Date.now()}`, ts: Date.now(), amount: xpDelta, source: 'other', note: type }] : get().xpLog });
        get().recalcAchievements();
      },

      toggleFlag: (key, type) => {
        const days = { ...get().days };
        const d = days[key] ?? defaultDay(key);
        const before = d.drinks[type] as boolean;
        const now = !before;
        d.drinks = { ...d.drinks, [type]: now } as any;

        const xpFlags = { ...(d.xpToday || {}) };
        let xpDelta = 0;
        if (now && !xpFlags[type]) { xpDelta += 10; xpFlags[type] = true; }
        d.xpToday = xpFlags;
        d.activityLog = [...(d.activityLog||[]), { ts: Date.now(), action: `flag_${type}`, value: now }];
        days[key] = d;

        set({ days, xp: get().xp + xpDelta, xpLog: xpDelta ? [...(get().xpLog||[]), { id: `xp:${Date.now()}`, ts: Date.now(), amount: xpDelta, source: 'other', note: type }] : get().xpLog });
        get().recalcAchievements();

        // Notifications nur planen, nicht sofort feuern
        if (['sport', 'water', 'coffee'].includes(type) && now) {
          const notifTime = new Date();
          notifTime.setHours(20, 0, 0, 0); // Beispielzeit
          if (+notifTime > +new Date()) {
            scheduleOneTime(`${type.charAt(0).toUpperCase() + type.slice(1)} Reminder`, '', notifTime)
              .then(id => { if (id) get().setNotificationMeta(`flag_${type}`, { id, time: notifTime.toISOString() }); });
          }
        }
      },

      setWeight: (key, weight) => { const days = { ...get().days }; const d = days[key] ?? defaultDay(key); d.weight = weight; d.weightTime = Date.now(); d.activityLog = [...(d.activityLog||[]), { ts: Date.now(), action: 'weight_set', value: weight }]; days[key] = d; set({ days }); get().recalcAchievements(); },
      setGoal: (goal) => { set({ goal }); get().recalcAchievements(); },
      removeGoal: () => { set({ goal: undefined }); get().recalcAchievements(); },
      addReminder: (r) => { set({ reminders: [r, ...get().reminders] }); get().recalcAchievements(); },
      updateReminder: (id, patch) => set({ reminders: get().reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
      deleteReminder: (id) => { set({ reminders: get().reminders.filter((r) => r.id !== id) }); get().recalcAchievements(); },
      addChat: (m) => { const lvl = Math.floor(get().xp / 100) + 1; let msg = m; if (m.sender === 'user' && typeof m.text === 'string' && m.text.length > 120 && lvl < 50) { msg = { ...m, text: m.text.slice(0, 120) }; } set({ chat: [...get().chat, msg] }); get().recalcAchievements(); },
      addSaved: (s) => { set({ saved: [s, ...get().saved] }); get().recalcAchievements(); },
      updateSaved: (id, patch) => { set({ saved: (get().saved||[]).map(s => s.id === id ? { ...s, ...patch } : s) }); },
      deleteSaved: (id) => { set({ saved: get().saved.filter((s) => s.id !== id) }); get().recalcAchievements(); },

      setNotificationMeta: (remId, meta) => {
        const nMeta = { ...get().notificationMeta };
        if (!meta) delete nMeta[remId];
        else nMeta[remId] = meta;
        set({ notificationMeta: nMeta });
      },

      setHasSeededReminders: (v) => set({ hasSeededReminders: v }),
      setShowOnboarding: (v) => set({ showOnboarding: v }),
      completeEvent: (weekKey, entry) => {
        const existing = get().eventHistory[weekKey]; if (existing?.completed) return;
        let bonus = 0;
        try { const { EVENTS } = require('../gamification/events'); const evt = (EVENTS as any[]).find((e) => e.id === entry.id); if (evt) bonus = Math.round(entry.xp * (evt.bonusPercent || 0)); } catch {}
        const total = entry.xp + bonus;
        const log = [...(get().xpLog||[]), { id: `${weekKey}:${Date.now()}`, ts: Date.now(), amount: total, source: 'event', note: entry.id }];
        set({ eventHistory: { ...get().eventHistory, [weekKey]: { id: entry.id, completed: true, xp: total } }, xp: get().xp + total, xpLog: log });
      },

      setLegendShown: (v) => set({ legendShown: v }),
      setRewardSeen: (key, v) => set({ rewardsSeen: { ...(get().rewardsSeen||{}), [key]: v } }),
      setProfileAlias: (alias) => set({ profileAlias: alias }),
      setAiInsightsEnabled: (v) => set({ aiInsightsEnabled: v }),
      feedbackAI: (id, delta) => { const map = { ...(get().aiFeedback||{}) }; map[id] = (map[id]||0) + delta; set({ aiFeedback: map }); },
      setEventsEnabled: (v) => set({ eventsEnabled: v }),
      setWaterCupMl: (ml) => set({ waterCupMl: Math.max(0, Math.min(1000, Math.round(ml))) }),
      setLastChatLeaveAt: (ts) => set({ lastChatLeaveAt: ts }),
startCycle: async (dateKey) => {
        const cycles = [...get().cycles];
        const active = cycles.find(c => !c.end);
        if (active) return;
        cycles.push({ start: dateKey });
        set({ cycles });
        await get().scheduleCycleNotifications();
      },

      endCycle: async (dateKey) => {
        const cycles = [...get().cycles];
        const activeIdx = cycles.findIndex(c => !c.end);
        if (activeIdx === -1) return;
        cycles[activeIdx] = { ...cycles[activeIdx], end: dateKey };
        set({ cycles });
        await get().scheduleCycleNotifications();
      },

      setCycleLog: (dateKey, patch) => {
        const all = { ...(get().cycleLogs || {}) };
        const prev = all[dateKey] || {};
        const merged: any = { ...prev };

        if (typeof patch.mood === 'number') merged.mood = clamp(patch.mood, 1, 10);
        if (typeof patch.energy === 'number') merged.energy = clamp(patch.energy, 1, 10);
        if (typeof patch.pain === 'number') merged.pain = clamp(patch.pain, 1, 10);
        if (typeof patch.sleep === 'number') merged.sleep = clamp(patch.sleep, 1, 10);
        if (typeof patch.sex === 'boolean') merged.sex = patch.sex;
        if (typeof patch.notes === 'string') merged.notes = patch.notes;
        if (typeof patch.flow === 'number') merged.flow = Math.max(0, Math.min(10, patch.flow));
        if (typeof patch.cramps === 'boolean') merged.cramps = patch.cramps;
        if (typeof patch.headache === 'boolean') merged.headache = patch.headache;
        if (typeof patch.nausea === 'boolean') merged.nausea = patch.nausea;

        merged.updatedAt = Date.now();
        all[dateKey] = merged;
        set({ cycleLogs: all });
      },

      clearCycleLog: (dateKey) => {
        const all = { ...(get().cycleLogs || {}) };
        delete all[dateKey];
        set({ cycleLogs: all });
      },

      recalcAchievements: () => {
        const state = get();
        const base = computeAchievements({
          days: state.days,
          goal: state.goal,
          reminders: state.reminders,
          chat: state.chat,
          saved: state.saved,
          achievementsUnlocked: state.achievementsUnlocked,
          xp: state.xp,
          language: state.language,
          theme: state.theme
        });
        const prevSet = new Set(state.achievementsUnlocked);
        const newUnlocks = base.unlocked.filter(id => !prevSet.has(id));

        let xpDelta = 0;
        const comboBonus = newUnlocks.length >= 2 ? (newUnlocks.length - 1) * 50 : 0;

        if (newUnlocks.length > 0) {
          try {
            const { getAchievementConfigById } = require('../achievements');
            const sum = newUnlocks.reduce((acc: number, id: string) => {
              const cfg = getAchievementConfigById(id);
              return acc + (cfg?.xp || 0);
            }, 0);
            xpDelta += sum;
            if (sum > 0) {
              const addLog: XpLogEntry = { id: `ach:${Date.now()}`, ts: Date.now(), amount: sum, source: 'achievement', note: `${newUnlocks.length} unlocks` };
              set({ xpLog: [...(state.xpLog||[]), addLog] });
            }
          } catch {}
        }

        if (comboBonus > 0) {
          const addLog: XpLogEntry = { id: `combo:${Date.now()}`, ts: Date.now(), amount: comboBonus, source: 'combo', note: `${newUnlocks.length} unlocks combo` };
          set({ xpLog: [...(get().xpLog||[]), addLog] });
        }

        set({ achievementsUnlocked: base.unlocked, xp: state.xp + xpDelta + comboBonus });
      },

      scheduleCycleNotifications: async () => {
        try {
          await ensureNotificationPermissions();
          await ensureAndroidChannel();

          const keys = ['cycle_period_minus2','cycle_period_day0','cycle_fertile_minus2','cycle_fertile_day0'];
          for (const k of keys) {
            const meta = get().notificationMeta[k];
            if (meta?.id) await cancelNotification(meta.id);
          }

          const cycles = get().cycles;
          const next = predictNextStart(cycles);
          const fertile = getFertileWindow(cycles);

          if (next) {
            const day0 = new Date(next.getFullYear(), next.getMonth(), next.getDate(), 9, 0, 0);
            const minus2 = new Date(day0); minus2.setDate(day0.getDate() - 2);

            const title0 = get().language==='en' ? 'Period expected today' : (get().language==='pl'?'Okres spodziewany dziś':'Periode heute erwartet');
            const title2 = get().language==='en' ? 'Period in 2 days' : (get().language==='pl'?'Okres za 2 dni':'Periode in 2 Tagen erwartet');

            if (+minus2 > +new Date()) {
              const id2 = await scheduleOneTime(title2, '', minus2);
              if (id2) get().setNotificationMeta('cycle_period_minus2', { id: id2 });
            }
            if (+day0 > +new Date()) {
              const id0 = await scheduleOneTime(title0, '', day0);
              if (id0) get().setNotificationMeta('cycle_period_day0', { id: id0 });
            }
          }

          if (fertile) {
            const start = new Date(fertile.start.getFullYear(), fertile.start.getMonth(), fertile.start.getDate(), 9, 0, 0);
            const minus2f = new Date(start); minus2f.setDate(start.getDate() - 2);

            const title0f = get().language==='en' ? 'Fertile phase starts today' : (get().language==='pl'?'Płodna faza zaczyna się dziś':'Fruchtbare Phase ab heute');
            const title2f = get().language==='en' ? 'Fertile phase in 2 days' : (get().language==='pl'?'Płodna faza za 2 dni':'Fruchtbare Phase in 2 Tagen');

            if (+minus2f > +new Date()) {
              const id2f = await scheduleOneTime(title2f, '', minus2f);
              if (id2f) get().setNotificationMeta('cycle_fertile_minus2', { id: id2f });
            }
            if (+start > +new Date()) {
              const id0f = await scheduleOneTime(title0f, '', start);
              if (id0f) get().setNotificationMeta('cycle_fertile_day0', { id: id0f });
            }
          }
        } catch {}
      },
    }),
    { name: "scarlett-app-state", storage: createJSONStorage(() => mmkvAdapter), partialize: (s) => s, version: 20, onRehydrateStorage: () => (state) => {
      if (!state) return;
      const days = state.days || {} as any;
      for (const k of Object.keys(days)) {
        const d = days[k];
        if (!d.drinks) d.drinks = { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false } as any;
        if (typeof d.drinks.sport !== 'boolean') d.drinks.sport = false as any;
        if (!d.xpToday) d.xpToday = {};
        if (!Array.isArray(d.activityLog)) d.activityLog = [];
      }
      if (typeof (state as any).waterCupMl !== 'number') (state as any).waterCupMl = 250;
      if (typeof (state as any).lastChatLeaveAt !== 'number') (state as any).lastChatLeaveAt = 0;

      setTimeout(() => { try { (useAppStore.getState() as any).scheduleCycleNotifications(); } catch {} }, 200);
    } }
  )
);

try {
  (useAppStore as any).subscribe((s: any) => {
    try { storage.set('scarlett-backup', JSON.stringify(s)); } catch {}
  });
} catch {}

export function useLevel() {
  const xp = useAppStore((s) => s.xp);
  const level = Math.floor(xp / 100) + 1;
  return { level, xp };
}
