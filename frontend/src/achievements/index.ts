import { format } from "date-fns";

export type DayData = {
  date: string;
  pills: { morning: boolean; evening: boolean };
  drinks: { water: number; coffee: number; slimCoffee: boolean; gingerGarlicTea: boolean; waterCure: boolean; sport: boolean };
  weight?: number;
};
export type Goal = { targetWeight: number; targetDate: string; startWeight: number; active: boolean };
export type Reminder = { id: string; type: string; time: string; enabled: boolean };
export type ChatMessage = { id: string; sender: "user" | "bot"; text: string; createdAt: number };
export type SavedMessage = { id: string; title: string; text: string; createdAt: number };

export type AchState = {
  days: Record<string, DayData>;
  goal?: Goal;
  reminders: Reminder[];
  chat: ChatMessage[];
  saved: SavedMessage[];
  achievementsUnlocked: string[];
  xp: number;
  language: "de" | "en";
  theme?: string;
};

export type AchievementConfig = {
  id: string;
  xp: number;
  progress: (s: AchState) => number;
  title: (lng: "de" | "en") => string;
  description: (lng: "de" | "en") => string;
};

function countWeightDays(s: AchState) {
  return Object.values(s.days).filter((d) => typeof d.weight === "number").length;
}
function hasAnyWeight(s: AchState) { return countWeightDays(s) > 0; }
function anyWaterAtLeast(s: AchState, n: number) {
  return Object.values(s.days).some((d) => (d.drinks?.water ?? 0) >= n);
}
function totalWaterInLast(s: AchState, days: number) {
  const keys = Object.keys(s.days).sort();
  const last = keys.slice(-days);
  return last.reduce((acc, k) => acc + (s.days[k]?.drinks?.water ?? 0), 0);
}
function monthWater(s: AchState) { return totalWaterInLast(s, 30); }
function countDays(predicate: (d: DayData) => boolean, s: AchState) { return Object.values(s.days).filter(predicate).length; }
function longestSportStreak(s: AchState) {
  const keys = Object.keys(s.days).sort();
  let max = 0, cur = 0;
  for (const k of keys) {
    if (s.days[k]?.drinks?.sport) { cur++; max = Math.max(max, cur); } else cur = 0;
  }
  return max;
}
function daysWithSport(s: AchState) { return countDays((d) => !!d.drinks?.sport, s); }
function daysWithCoffeeAtMost(s: AchState, n: number) { return countDays((d) => (d.drinks?.coffee ?? 0) <= n, s); }
function pillsComplianceDays(s: AchState) { return countDays((d) => d.pills?.morning && d.pills?.evening, s); }
function pillMorningDays(s: AchState) { return countDays((d) => d.pills?.morning, s); }
function pillEveningDays(s: AchState) { return countDays((d) => d.pills?.evening, s); }
function daysWithSlimCoffee(s: AchState) { return countDays((d) => !!d.drinks?.slimCoffee, s); }
function daysWithGingerTea(s: AchState) { return countDays((d) => !!d.drinks?.gingerGarlicTea, s); }
function daysWithWaterCure(s: AchState) { return countDays((d) => !!d.drinks?.waterCure, s); }
function entriesOneDay(s: AchState) {
  return Object.values(s.days).some((d) => (d.pills?.morning || d.pills?.evening) && ((d.drinks?.water ?? 0) > 0 || (d.drinks?.coffee ?? 0) > 0) && typeof d.weight === 'number');
}
function lastNDaysKeys(s: AchState, n: number) { const keys = Object.keys(s.days).sort(); return keys.slice(-n); }
function weightDaysInLast7(s: AchState) { return lastNDaysKeys(s, 7).filter((k) => typeof s.days[k]?.weight === 'number').length; }
function sportDaysInLast7(s: AchState) { return lastNDaysKeys(s, 7).filter((k) => !!s.days[k]?.drinks?.sport).length; }
function coffeeZeroDays(s: AchState) { return countDays((d) => (d.drinks?.coffee ?? 0) === 0, s); }
function waterGoalDays(s: AchState, min: number) { return countDays((d) => (d.drinks?.water ?? 0) >= min, s); }
function weightDeltaOverall(s: AchState) {
  const arr = Object.values(s.days).filter((d) => typeof d.weight === 'number').sort((a,b) => a.date.localeCompare(b.date));
  if (arr.length < 2) return 0;
  return (arr[arr.length - 1].weight! - arr[0].weight!);
}
function goalProgressPercent(s: AchState) {
  if (!s.goal || typeof s.goal.targetWeight !== 'number') return 0;
  const latest = Object.values(s.days).filter((d) => typeof d.weight === 'number').sort((a,b) => a.date.localeCompare(b.date)).pop();
  if (!latest) return 0;
  const start = s.goal.startWeight;
  const target = s.goal.targetWeight;
  const total = Math.abs(start - target);
  const done = Math.abs((latest.weight ?? start) - start);
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}
function daysWithinTarget(s: AchState, toleranceKg = 0.5) {
  if (!s.goal) return 0;
  return countDays((d) => typeof d.weight === 'number' && Math.abs((d.weight ?? 0) - s.goal!.targetWeight) <= toleranceKg, s);
}
function userMessagesCount(s: AchState) { return s.chat.filter(m => m.sender === 'user').length; }
function savedCount(s: AchState) { return (s.saved?.length ?? 0); }

const A: AchievementConfig[] = [
  // Onboarding/basic
  { id: 'first_weight', xp: 100, progress: (s) => hasAnyWeight(s) ? 100 : 0,
    title: (l) => l==='de'?'Erstes Gewicht':'First weight', description: (l)=> l==='de'?'Speichere dein erstes Gewicht.':'Save your first weight.' },
  { id: 'first_goal', xp: 120, progress: (s) => s.goal ? 100 : 0,
    title: (l)=> l==='de'?'Erstes Ziel':'First goal', description: (l)=> l==='de'?'Lege ein Gewichts-Ziel fest.':'Set your first weight goal.' },
  { id: 'first_reminder', xp: 80, progress: (s) => s.reminders.length>0?100:0,
    title: (l)=> l==='de'?'Erste Erinnerung':'First reminder', description:(l)=> l==='de'?'Lege eine Erinnerung an.':'Create your first reminder.'},
  { id: 'first_chat', xp: 60, progress: (s) => s.chat.some(m=>m.sender==='user')?100:0,
    title: (l)=> l==='de'?'Erste Nachricht':'First message', description:(l)=> l==='de'?'Sende eine Chat-Nachricht.':'Send your first chat message.'},
  { id: 'first_pill_morning', xp: 80, progress: (s) => Object.values(s.days).some(d=>d.pills?.morning)?100:0,
    title: (l)=> l==='de'?'Erste Morgen-Pille':'First morning pill', description:(l)=> l==='de'?'Markiere eine Morgen-Tablette.':'Mark a morning pill.'},
  { id: 'first_pill_evening', xp: 80, progress: (s) => Object.values(s.days).some(d=>d.pills?.evening)?100:0,
    title: (l)=> l==='de'?'Erste Abend-Pille':'First evening pill', description:(l)=> l==='de'?'Markiere eine Abend-Tablette.':'Mark an evening pill.'},
  { id: 'sport_first', xp: 100, progress: (s) => daysWithSport(s) > 0 ? 100 : 0,
    title: (l)=> l==='de'?'Erster Sporttag':'First sport day', description:(l)=> l==='de'?'Aktiviere Sport an einem Tag.':'Mark sport on a day.'},

  // Gewichtstage – langfristig
  { id: 'weight_3_days', xp: 120, progress: (s) => Math.min(100, Math.round((countWeightDays(s)/3)*100)), title: (l)=> l==='de'?'Gewicht 3 Tage':'Weight 3 days', description:(l)=> l==='de'?'Gewicht an 3 Tagen erfassen.':'Log weight on 3 days.'},
  { id: 'weight_7_days', xp: 180, progress: (s) => Math.min(100, Math.round((countWeightDays(s)/7)*100)), title: (l)=> l==='de'?'Gewicht 7 Tage':'Weight 7 days', description:(l)=> l==='de'?'Gewicht an 7 Tagen erfassen.':'Log weight on 7 days.'},
  { id: 'weight_14_days', xp: 220, progress: (s) => Math.min(100, Math.round((countWeightDays(s)/14)*100)), title: (l)=> l==='de'?'Gewicht 14 Tage':'Weight 14 days', description:(l)=> l==='de'?'Gewicht an 14 Tagen erfassen.':'Log weight on 14 days.'},
  { id: 'weight_30_days', xp: 300, progress: (s) => Math.min(100, Math.round((countWeightDays(s)/30)*100)), title: (l)=> l==='de'?'Gewicht 30 Tage':'Weight 30 days', description:(l)=> l==='de'?'Gewicht an 30 Tagen erfassen.':'Log weight on 30 days.'},
  { id: 'weight_60_days', xp: 380, progress: (s) => Math.min(100, Math.round((countWeightDays(s)/60)*100)), title: (l)=> l==='de'?'Gewicht 60 Tage':'Weight 60 days', description:(l)=> l==='de'?'Gewicht an 60 Tagen erfassen.':'Log weight on 60 days.'},
  { id: 'weight_100_days', xp: 500, progress: (s) => Math.min(100, Math.round((countWeightDays(s)/100)*100)), title: (l)=> l==='de'?'Gewicht 100 Tage':'Weight 100 days', description:(l)=> l==='de'?'Gewicht an 100 Tagen erfassen.':'Log weight on 100 days.'},
  { id: 'weight_180_days', xp: 700, progress: (s) => Math.min(100, Math.round((countWeightDays(s)/180)*100)), title: (l)=> l==='de'?'Gewicht 180 Tage':'Weight 180 days', description:(l)=> l==='de'?'Gewicht an 180 Tagen erfassen.':'Log weight on 180 days.'},

  // Wasserziele & Volumen
  { id: 'water_6_once', xp: 80, progress: (s) => anyWaterAtLeast(s,6)?100:0, title: (l)=> l==='de'?'6x Wasser/Tag':'6x water/day', description:(l)=> l==='de'?'Mind. 6 Gläser Wasser an einem Tag.':'At least 6 glasses in one day.'},
  { id: 'water_8_once', xp: 120, progress: (s) => anyWaterAtLeast(s,8)?100:0, title: (l)=> l==='de'?'8x Wasser/Tag':'8x water/day', description:(l)=> l==='de'?'Mind. 8 Gläser Wasser an einem Tag.':'At least 8 glasses in one day.'},
  { id: 'water_10_once', xp: 150, progress: (s) => anyWaterAtLeast(s,10)?100:0, title: (l)=> l==='de'?'10x Wasser/Tag':'10x water/day', description:(l)=> l==='de'?'Mind. 10 Gläser Wasser an einem Tag.':'At least 10 glasses in one day.'},
  { id: 'water_12_once', xp: 180, progress: (s) => anyWaterAtLeast(s,12)?100:0, title: (l)=> l==='de'?'12x Wasser/Tag':'12x water/day', description:(l)=> l==='de'?'Mind. 12 Gläser Wasser an einem Tag.':'At least 12 glasses in one day.'},
  { id: 'water_week_30', xp: 160, progress: (s) => Math.min(100, Math.round((totalWaterInLast(s,7)/30)*100)), title: (l)=> l==='de'?'Wasser 30/Woche':'Water 30/week', description:(l)=> l==='de'?'30 Gläser Wasser in 7 Tagen.':'30 glasses in 7 days.'},
  { id: 'water_month_150', xp: 260, progress: (s) => Math.min(100, Math.round((monthWater(s)/150)*100)), title: (l)=> l==='de'?'Wasser 150/Monat':'Water 150/month', description:(l)=> l==='de'?'150 Gläser Wasser in 30 Tagen.':'150 glasses in 30 days.'},
  { id: 'water_month_200', xp: 320, progress: (s) => Math.min(100, Math.round((monthWater(s)/200)*100)), title: (l)=> l==='de'?'Wasser 200/Monat':'Water 200/month', description:(l)=> l==='de'?'200 Gläser Wasser in 30 Tagen.':'200 glasses in 30 days.'},
  { id: 'water_month_250', xp: 380, progress: (s) => Math.min(100, Math.round((monthWater(s)/250)*100)), title: (l)=> l==='de'?'Wasser 250/Monat':'Water 250/month', description:(l)=> l==='de'?'250 Gläser Wasser in 30 Tagen.':'250 glasses in 30 days.'},
  { id: 'water_month_300', xp: 480, progress: (s) => Math.min(100, Math.round((monthWater(s)/300)*100)), title: (l)=> l==='de'?'Wasser 300/Monat':'Water 300/month', description:(l)=> l==='de'?'300 Gläser Wasser in 30 Tagen.':'300 glasses in 30 days.'},

  // Kaffee/Drinks
  { id: 'coffee_low_5_days', xp: 140, progress: (s) => Math.min(100, Math.round((daysWithCoffeeAtMost(s,2)/5)*100)), title: (l)=> l==='de'?'Kaffee in Maßen (5T)':'Coffee in moderation (5d)', description:(l)=> l==='de'?'Max. 2 Kaffee an 5 Tagen.':'Max 2 coffees on 5 days.'},
  { id: 'coffee_low_30_days', xp: 360, progress: (s) => Math.min(100, Math.round((daysWithCoffeeAtMost(s,1)/30)*100)), title: (l)=> l==='de'?'Kaffee 0–1 (30T)':'Coffee 0–1 (30d)', description:(l)=> l==='de'?'Max. 1 Kaffee an 30 Tagen.':'Max 1 coffee on 30 days.'},
  { id: 'slimCoffee_7_days', xp: 140, progress: (s) => Math.min(100, Math.round((daysWithSlimCoffee(s)/7)*100)), title: (l)=> l==='de'?'Abnehmkaffee 7T':'Slim coffee 7d', description:(l)=> l==='de'?'Abnehmkaffee an 7 Tagen.':'Slim coffee on 7 days.'},
  { id: 'gingerTea_7_days', xp: 140, progress: (s) => Math.min(100, Math.round((daysWithGingerTea(s)/7)*100)), title: (l)=> l==='de'?'Ingwer-Knoblauch 7T':'Ginger-garlic 7d', description:(l)=> l==='de'?'Ingwer-Knoblauch-Tee an 7 Tagen.':'Ginger-garlic tea on 7 days.'},
  { id: 'waterCure_5_days', xp: 120, progress: (s) => Math.min(100, Math.round((daysWithWaterCure(s)/5)*100)), title: (l)=> l==='de'?'Wasserkur 5T':'Water cure 5d', description:(l)=> l==='de'?'Wasserkur an 5 Tagen.':'Water cure on 5 days.'},

  // Sport – Streaks und Gesamttage
  { id: 'sport_3_days', xp: 200, progress: (s) => Math.min(100, Math.round((longestSportStreak(s)/3)*100)), title: (l)=> l==='de'?'Sport-Streak 3':'Sport streak 3', description:(l)=> l==='de'?'3 Tage in Folge Sport.':'3 days sport in a row.'},
  { id: 'sport_7_days', xp: 300, progress: (s) => Math.min(100, Math.round((longestSportStreak(s)/7)*100)), title: (l)=> l==='de'?'Sport-Streak 7':'Sport streak 7', description:(l)=> l==='de'?'7 Tage in Folge Sport.':'7 days sport in a row.'},
  { id: 'sport_12_days', xp: 360, progress: (s) => Math.min(100, Math.round((longestSportStreak(s)/12)*100)), title: (l)=> l==='de'?'Sport-Streak 12':'Sport streak 12', description:(l)=> l==='de'?'12 Tage in Folge Sport.':'12 days sport in a row.'},
  { id: 'sport_21_days', xp: 480, progress: (s) => Math.min(100, Math.round((longestSportStreak(s)/21)*100)), title: (l)=> l==='de'?'Sport-Streak 21':'Sport streak 21', description:(l)=> l==='de'?'21 Tage in Folge Sport.':'21 days sport in a row.'},
  { id: 'sport_30_days', xp: 600, progress: (s) => Math.min(100, Math.round((longestSportStreak(s)/30)*100)), title: (l)=> l==='de'?'Sport-Streak 30':'Sport streak 30', description:(l)=> l==='de'?'30 Tage in Folge Sport.':'30 days sport in a row.'},
  { id: 'sport_30_any', xp: 240, progress: (s) => Math.min(100, Math.round((daysWithSport(s)/30)*100)), title: (l)=> l==='de'?'Sport 30 Tage':'Sport 30 days', description:(l)=> l==='de'?'An 30 Tagen Sport.':'Sport on 30 days.'},
  { id: 'sport_60_any', xp: 420, progress: (s) => Math.min(100, Math.round((daysWithSport(s)/60)*100)), title: (l)=> l==='de'?'Sport 60 Tage':'Sport 60 days', description:(l)=> l==='de'?'An 60 Tagen Sport.':'Sport on 60 days.'},
  { id: 'sport_120_any', xp: 700, progress: (s) => Math.min(100, Math.round((daysWithSport(s)/120)*100)), title: (l)=> l==='de'?'Sport 120 Tage':'Sport 120 days', description:(l)=> l==='de'?'An 120 Tagen Sport.':'Sport on 120 days.'},

  // Pillen-Compliance
  { id: 'pills_7_days', xp: 220, progress: (s) => Math.min(100, Math.round((pillsComplianceDays(s)/7)*100)), title: (l)=> l==='de'?'Pillen-Compliance 7':'Pill compliance 7', description:(l)=> l==='de'?'Beide Pillen an 7 Tagen.':'Both pills on 7 days.'},
  { id: 'pills_30_days', xp: 380, progress: (s) => Math.min(100, Math.round((pillsComplianceDays(s)/30)*100)), title: (l)=> l==='de'?'Pillen-Compliance 30':'Pill compliance 30', description:(l)=> l==='de'?'Beide Pillen an 30 Tagen.':'Both pills on 30 days.'},
  { id: 'pills_60_days', xp: 520, progress: (s) => Math.min(100, Math.round((pillsComplianceDays(s)/60)*100)), title: (l)=> l==='de'?'Pillen-Compliance 60':'Pill compliance 60', description:(l)=> l==='de'?'Beide Pillen an 60 Tagen.':'Both pills on 60 days.'},
  { id: 'pills_morning_14', xp: 220, progress: (s) => Math.min(100, Math.round((pillMorningDays(s)/14)*100)), title: (l)=> l==='de'?'Morgens 14 Tage':'Morning 14 days', description:(l)=> l==='de'?'Morgens an 14 Tagen.':'Morning pills 14 days.'},
  { id: 'pills_evening_14', xp: 220, progress: (s) => Math.min(100, Math.round((pillEveningDays(s)/14)*100)), title: (l)=> l==='de'?'Abends 14 Tage':'Evening 14 days', description:(l)=> l==='de'?'Abends an 14 Tagen.':'Evening pills 14 days.'},

  // Ziele & Gewichtsverlauf
  { id: 'goal_50_percent', xp: 280, progress: (s) => goalProgressPercent(s) >= 50 ? 100 : Math.min(100, goalProgressPercent(s)*2), title: (l)=> l==='de'?'Ziel halb erreicht':'Goal halfway', description:(l)=> l==='de'?'50% Ziel-Fortschritt.':'Reach 50% of your goal.'},
  { id: 'goal_reached', xp: 500, progress: (s) => {
      if (!s.goal) return 0;
      const latest = Object.values(s.days).filter((d)=>typeof d.weight==='number').sort((a,b)=>a.date.localeCompare(b.date)).pop();
      if (!latest) return 0;
      if (s.goal.startWeight > s.goal.targetWeight) {
        const p = ((s.goal.startWeight - (latest.weight ?? s.goal.startWeight)) / (s.goal.startWeight - s.goal.targetWeight)) * 100;
        return Math.min(100, Math.max(0, Math.round(p)));
      } else {
        const p = (((latest.weight ?? s.goal.startWeight) - s.goal.startWeight) / (s.goal.targetWeight - s.goal.startWeight)) * 100;
        return Math.min(100, Math.max(0, Math.round(p)));
      }
    }, title: (l)=> l==='de'?'Ziel erreicht':'Goal reached', description:(l)=> l==='de'?'Erreiche dein Zielgewicht.':'Reach your target weight.'},
  { id: 'goal_close_14', xp: 320, progress: (s) => Math.min(100, Math.round((daysWithinTarget(s,0.5)/14)*100)), title: (l)=> l==='de'?'Zielnähe 14T':'Near target 14d', description:(l)=> l==='de'?'An 14 Tagen innerhalb ±0,5 kg vom Ziel.':'Within ±0.5 kg of target on 14 days.'},
  { id: 'weight_loss_1kg', xp: 220, progress: (s) => { const delta = weightDeltaOverall(s); if (delta < -1) return 100; if (delta >= 0) return 0; return Math.min(100, Math.round((Math.abs(delta)/1)*100)); }, title: (l)=> l==='de'?'−1 kg erreicht':'−1 kg reached', description:(l)=> l==='de'?'Mind. 1 kg Gewichtsabnahme (Trend).':'At least 1 kg down overall.'},

  // Aktivität/Woche
  { id: 'all_entries_one_day', xp: 160, progress: (s) => entriesOneDay(s) ? 100 : 0, title: (l)=> l==='de'?'Ein kompletter Tag':'A complete day', description:(l)=> l==='de'?'Pillen+Getränke+Gewicht an einem Tag.':'Pills+drinks+weight in one day.'},
  { id: 'week_active_5_days', xp: 200, progress: (s) => Math.min(100, Math.round((weightDaysInLast7(s)/5)*100)), title: (l)=> l==='de'?'Aktiv 5/7':'Active 5/7', description:(l)=> l==='de'?'Gewicht an 5 von 7 Tagen.':'Weight on 5 of last 7 days.'},
  { id: 'sport_week_3', xp: 180, progress: (s) => Math.min(100, Math.round((sportDaysInLast7(s)/3)*100)), title: (l)=> l==='de'?'Sport 3/7':'Sport 3/7', description:(l)=> l==='de'?'Sport an 3 von 7 Tagen.':'Sport on 3 of last 7 days.'},
  { id: 'coffee_0_day_3', xp: 140, progress: (s) => Math.min(100, Math.round((coffeeZeroDays(s)/3)*100)), title: (l)=> l==='de'?'Kaffee-frei (3 Tage)':'Coffee-free (3 days)', description:(l)=> l==='de'?'Null Kaffee an 3 Tagen.':'Zero coffee on 3 days.'},
  { id: 'water_days_7', xp: 180, progress: (s) => Math.min(100, Math.round((waterGoalDays(s,6)/7)*100)), title: (l)=> l==='de'?'Wasserziel 7T':'Water goal 7d', description:(l)=> l==='de'?'An 7 Tagen 6+ Gläser Wasser.':'6+ glasses on 7 days.'},

  // Interaktion & Langzeitmotivation
  { id: 'chat_10', xp: 120, progress: (s) => Math.min(100, Math.round((userMessagesCount(s)/10)*100)), title: (l)=> l==='de'?'Chat 10 Nachrichten':'Chat 10 messages', description:(l)=> l==='de'?'Sende 10 Nachrichten.':'Send 10 messages.'},
  { id: 'chat_50', xp: 300, progress: (s) => Math.min(100, Math.round((userMessagesCount(s)/50)*100)), title: (l)=> l==='de'?'Chat 50 Nachrichten':'Chat 50 messages', description:(l)=> l==='de'?'Sende 50 Nachrichten.':'Send 50 messages.'},
  { id: 'saved_5', xp: 140, progress: (s) => Math.min(100, Math.round(((savedCount(s))/5)*100)), title: (l)=> l==='de'?'5 Tipps gespeichert':'5 tips saved', description:(l)=> l==='de'?'Speichere 5 Antworten.':'Save 5 responses.'},
  { id: 'saved_20', xp: 300, progress: (s) => Math.min(100, Math.round(((savedCount(s))/20)*100)), title: (l)=> l==='de'?'20 Tipps gespeichert':'20 tips saved', description:(l)=> l==='de'?'Speichere 20 Antworten.':'Save 20 responses.'},
  { id: 'language_switch', xp: 60, progress: (s) => s.language === 'en' ? 100 : 0, title: (l)=> l==='de'?'Englisch ausprobiert':'Tried English', description:(l)=> l==='de'?'Wechsle einmal auf Englisch.':'Try switching to English.'},
  { id: 'theme_switch', xp: 60, progress: (s) => (s.theme && s.theme !== 'pink_default') ? 100 : 0, title: (l)=> l==='de'?'Theme gewechselt':'Theme switched', description:(l)=> l==='de'?'Wechsle das App-Theme.':'Switch the app theme.'},
];

export type AchievementProgress = { id: string; title: string; description: string; percent: number; xp: number; completed: boolean };

export function computeAchievements(state: AchState) {
  const list: AchievementProgress[] = A.map((cfg) => {
    const percent = Math.min(100, Math.max(0, Math.round(cfg.progress(state))));
    const completed = percent >= 100;
    return {
      id: cfg.id,
      title: cfg.title(state.language),
      description: cfg.description(state.language),
      percent,
      xp: cfg.xp,
      completed,
    };
  });
  const unlockedIds = new Set<string>(state.achievementsUnlocked);
  let xp = 0;
  for (const ach of list) { if (ach.completed) unlockedIds.add(ach.id); }
  for (const id of unlockedIds) { const found = A.find((x) => x.id === id); if (found) xp += found.xp; }
  // XP ohne Cap – endloses Leveln möglich
  return { list, unlocked: Array.from(unlockedIds), xp };
}