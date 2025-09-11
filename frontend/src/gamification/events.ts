import { toKey } from "../utils/date";

export type WeeklyEvent = {
  id: string;
  titleDe: string; titleEn: string;
  descDe: string; descEn: string;
  kind:
    | { type: 'waterGoalDays'; days: number; minGlasses?: number }
    | { type: 'sportDays'; days: number }
    | { type: 'complianceDays'; days: number }
    | { type: 'gingerTeaCount'; count: number }
    | { type: 'coffeeUnderDays'; limit: number; days: number }
    | { type: 'weightLogs'; days: number }
    | { type: 'waterCureCount'; count: number }
    | { type: 'slimCoffeeCount'; count: number }
    | { type: 'weighBeforeHour'; count: number; hour: number }
    | { type: 'trackAfterHour'; count: number; hour: number };
  xp: number;
};

export function getWeekRange(date: Date) {
  // Sunday to Saturday
  const start = new Date(date);
  const day = start.getDay(); // 0=Sun
  start.setDate(start.getDate() - day);
  start.setHours(0,0,0,0);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(toKey(d));
  }
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end, dayKeys: days, weekKey: `${start.getFullYear()}-W${Math.floor((start.getTime() - new Date(start.getFullYear(),0,1).getTime())/ (7*24*3600*1000))}` };
}

export const events: WeeklyEvent[] = [
  { id: 'ev_water_5', titleDe: 'Wasser-Challenge', titleEn: 'Water challenge', descDe: 'An 5 Tagen 6+ Gläser Wasser.', descEn: 'Hit 6+ glasses on 5 days.', kind: { type: 'waterGoalDays', days: 5, minGlasses: 6 }, xp: 250 },
  { id: 'ev_sport_3', titleDe: 'Aktive Woche', titleEn: 'Active week', descDe: 'An 3 Tagen Sport.', descEn: 'Sport on 3 days.', kind: { type: 'sportDays', days: 3 }, xp: 220 },
  { id: 'ev_pills_5', titleDe: 'Pillen-Fokus', titleEn: 'Pill focus', descDe: 'An 5 Tagen beide Pillen.', descEn: 'Both pills on 5 days.', kind: { type: 'complianceDays', days: 5 }, xp: 260 },
  { id: 'ev_ginger_4', titleDe: 'Ingwer-Knoblauch-Woche', titleEn: 'Ginger-garlic week', descDe: '4x Ingwer-Knoblauch-Tee.', descEn: '4x ginger-garlic tea.', kind: { type: 'gingerTeaCount', count: 4 }, xp: 180 },
  { id: 'ev_coffee_3', titleDe: 'Kaffee in Maßen', titleEn: 'Coffee in moderation', descDe: '5 Tage unter 3 Kaffees.', descEn: 'Under 3 coffees on 5 days.', kind: { type: 'coffeeUnderDays', limit: 3, days: 5 }, xp: 240 },
  { id: 'ev_weight_4', titleDe: 'Wiege-Disziplin', titleEn: 'Weigh discipline', descDe: 'An 4 Tagen Gewicht eintragen.', descEn: 'Log weight on 4 days.', kind: { type: 'weightLogs', days: 4 }, xp: 200 },
  { id: 'ev_watercure_2', titleDe: 'Wasserkur-Boost', titleEn: 'Water cure boost', descDe: '2x Wasserkur.', descEn: '2x water cure.', kind: { type: 'waterCureCount', count: 2 }, xp: 160 },
  { id: 'ev_slimcoffee_3', titleDe: 'Abnehmkaffee-Woche', titleEn: 'Slim coffee week', descDe: '3x Abnehmkaffee.', descEn: '3x slim coffee.', kind: { type: 'slimCoffeeCount', count: 3 }, xp: 160 },
  { id: 'ev_early_3', titleDe: 'Frühstarter', titleEn: 'Early starter', descDe: '3x vor 8:00 wiegen.', descEn: 'Weigh before 8:00 three times.', kind: { type: 'weighBeforeHour', count: 3, hour: 8 }, xp: 190 },
  { id: 'ev_late_3', titleDe: 'Spät-Tracker', titleEn: 'Late tracker', descDe: '3x nach 22:00 tracken.', descEn: 'Track after 22:00 three times.', kind: { type: 'trackAfterHour', count: 3, hour: 22 }, xp: 190 },
  { id: 'ev_water_6', titleDe: 'Hydro-Profi', titleEn: 'Hydro pro', descDe: '6 Tage 6+ Gläser Wasser.', descEn: '6+ glasses on 6 days.', kind: { type: 'waterGoalDays', days: 6, minGlasses: 6 }, xp: 300 },
  { id: 'ev_sport_4', titleDe: 'Bewegung ++', titleEn: 'Move ++', descDe: '4 Tage Sport.', descEn: 'Sport on 4 days.', kind: { type: 'sportDays', days: 4 }, xp: 260 },
  { id: 'ev_pills_6', titleDe: 'Pillen-Streak', titleEn: 'Pill streak', descDe: '6 Tage beide Pillen.', descEn: 'Both pills on 6 days.', kind: { type: 'complianceDays', days: 6 }, xp: 300 },
  { id: 'ev_ginger_5', titleDe: 'Tee-Meister', titleEn: 'Tea master', descDe: '5x Ingwer-Knoblauch-Tee.', descEn: '5x ginger-garlic tea.', kind: { type: 'gingerTeaCount', count: 5 }, xp: 220 },
  { id: 'ev_weight_5', titleDe: 'Gewichts-Fokus', titleEn: 'Weight focus', descDe: '5 Tage Gewicht eintragen.', descEn: 'Log weight on 5 days.', kind: { type: 'weightLogs', days: 5 }, xp: 240 },
  { id: 'ev_watercure_3', titleDe: 'Wasserkur-Plus', titleEn: 'Water cure plus', descDe: '3x Wasserkur.', descEn: '3x water cure.', kind: { type: 'waterCureCount', count: 3 }, xp: 220 },
  { id: 'ev_coffee_2', titleDe: 'Low-Coffee', titleEn: 'Low coffee', descDe: '5 Tage ≤2 Kaffee.', descEn: '≤2 coffees on 5 days.', kind: { type: 'coffeeUnderDays', limit: 3, days: 5 }, xp: 260 },
  { id: 'ev_slimcoffee_2', titleDe: 'Slim-Boost', titleEn: 'Slim boost', descDe: '2x Abnehmkaffee.', descEn: '2x slim coffee.', kind: { type: 'slimCoffeeCount', count: 2 }, xp: 140 },
  { id: 'ev_early_4', titleDe: 'Frühauf Kurs', titleEn: 'On course early', descDe: '4x vor 8:00 wiegen.', descEn: 'Weigh before 8:00 four times.', kind: { type: 'weighBeforeHour', count: 4, hour: 8 }, xp: 240 },
  { id: 'ev_late_4', titleDe: 'Nachtaktive Woche', titleEn: 'Night-active week', descDe: '4x nach 22:00 tracken.', descEn: 'Track after 22:00 four times.', kind: { type: 'trackAfterHour', count: 4, hour: 22 }, xp: 240 },
  { id: 'ev_mix_perf_3', titleDe: 'Mix der Disziplin', titleEn: 'Discipline mix', descDe: '3 perfekte Tage.', descEn: '3 perfect days.', kind: { type: 'complianceDays', days: 3 }, xp: 200 },
  { id: 'ev_sport_5', titleDe: 'Sportlich 5', titleEn: 'Sporty 5', descDe: '5 Tage Sport.', descEn: 'Sport on 5 days.', kind: { type: 'sportDays', days: 5 }, xp: 320 },
  { id: 'ev_water_4', titleDe: 'Hydro-Fix', titleEn: 'Hydro fix', descDe: '4 Tage 6+ Gläser Wasser.', descEn: '4 days 6+ glasses.', kind: { type: 'waterGoalDays', days: 4, minGlasses: 6 }, xp: 180 },
  { id: 'ev_weight_6', titleDe: 'Konstanz beim Wiegen', titleEn: 'Weigh consistency', descDe: '6 Tage Gewicht eintragen.', descEn: 'Log weight on 6 days.', kind: { type: 'weightLogs', days: 6 }, xp: 320 },
  { id: 'ev_ginger_3', titleDe: 'Würzig fit', titleEn: 'Spicy fit', descDe: '3x Ingwer-Knoblauch-Tee.', descEn: '3x ginger-garlic tea.', kind: { type: 'gingerTeaCount', count: 3 }, xp: 160 },
  { id: 'ev_coffee_4', titleDe: 'Kaffee im Griff', titleEn: 'Coffee under control', descDe: '4 Tage ≤3 Kaffee.', descEn: '≤3 coffees on 4 days.', kind: { type: 'coffeeUnderDays', limit: 4, days: 4 }, xp: 180 },
];

export function computeEventProgress(weekDayKeys: string[], state: any, ev: WeeklyEvent) {
  const dayMap = state.days as Record<string, any>;
  const getDay = (k: string) => dayMap[k];
  let value = 0, target = 0;
  switch (ev.kind.type) {
    case 'waterGoalDays': {
      const min = ev.kind.minGlasses ?? 6;
      target = ev.kind.days;
      for (const k of weekDayKeys) { if ((getDay(k)?.drinks?.water ?? 0) >= min) value++; }
      break;
    }
    case 'sportDays': {
      target = ev.kind.days;
      for (const k of weekDayKeys) { if (getDay(k)?.drinks?.sport) value++; }
      break;
    }
    case 'complianceDays': {
      target = ev.kind.days;
      for (const k of weekDayKeys) { const d = getDay(k); if (d?.pills?.morning && d?.pills?.evening && (d?.drinks?.water ?? 0) >= 6 && typeof d?.weight === 'number') value++; }
      break;
    }
    case 'gingerTeaCount': {
      target = ev.kind.count; for (const k of weekDayKeys) { if (getDay(k)?.drinks?.gingerGarlicTea) value++; } break;
    }
    case 'coffeeUnderDays': {
      target = ev.kind.days; for (const k of weekDayKeys) { if ((getDay(k)?.drinks?.coffee ?? 0) <= ev.kind.limit) value++; } break;
    }
    case 'weightLogs': {
      target = ev.kind.days; for (const k of weekDayKeys) { if (typeof getDay(k)?.weight === 'number') value++; } break;
    }
    case 'waterCureCount': {
      target = ev.kind.count; for (const k of weekDayKeys) { if (getDay(k)?.drinks?.waterCure) value++; } break;
    }
    case 'slimCoffeeCount': {
      target = ev.kind.count; for (const k of weekDayKeys) { if (getDay(k)?.drinks?.slimCoffee) value++; } break;
    }
    case 'weighBeforeHour': {
      target = ev.kind.count; for (const k of weekDayKeys) { const t = getDay(k)?.weightTime; if (typeof t === 'number' && new Date(t).getHours() < ev.kind.hour) value++; } break;
    }
    case 'trackAfterHour': {
      target = ev.kind.count; for (const k of weekDayKeys) { const t = getDay(k)?.weightTime; if (typeof t === 'number' && new Date(t).getHours() >= ev.kind.hour) value++; } break;
    }
  }
  const percent = Math.min(100, Math.round((value / (target || 1)) * 100));
  const completed = value >= target;
  return { value, target, percent, completed };
}

export function getCurrentWeeklyEvent(date: Date) {
  const idx = Math.floor(date.getTime() / (7 * 24 * 3600 * 1000));
  const ev = events[idx % events.length];
  return ev;
}