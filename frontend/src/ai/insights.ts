import { AppState, DayData } from "../store/useStore";
import { toKey } from "../utils/date";

export type AIItem = { id: string; text: string; category: 'water'|'pill'|'weight'|'sport'|'coffee'|'habit'; score: number };

function avg(xs: number[]) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }
function median(xs: number[]) { if (!xs.length) return 0; const s=[...xs].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s[m]; }

export function computeAIv1(state: Pick<AppState,'days'|'language'|'aiFeedback'|'aiInsightsEnabled'>): AIItem[] {
  const { days, language, aiFeedback } = state as any;
  const lng = language as 'de'|'en';
  const items: AIItem[] = [];
  const values = Object.values(days||{}).sort((a:DayData,b:DayData)=>a.date.localeCompare(b.date));

  // 1) Weekday water pattern
  const weekday = Array.from({length:7},()=>({sum:0,n:0}));
  for (const d of values) { const w=new Date(d.date).getDay(); weekday[w].sum+=(d.drinks?.water??0); weekday[w].n+=1; }
  const wAvg = weekday.map(x=>x.n?x.sum/x.n:0);
  let lowW = 0; for(let i=1;i<7;i++){ if (wAvg[i] < wAvg[lowW]) lowW = i; }
  const dayDe=['So','Mo','Di','Mi','Do','Fr','Sa'];
  const dayEn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (wAvg.some(x=>x>0)) {
    items.push({ id:'water_low_day', category:'water', score: 0.8, text: lng==='de'?`Am ${dayDe[lowW]} trinkst du im Schnitt am wenigsten – plane hier eine Extraschluck‑Erinnerung.`:`You drink the least on ${dayEn[lowW]} – add an extra sip reminder.`, });
  }

  // 2) Weight trend + plateau
  const ws = values.filter(d=>typeof d.weight==='number');
  if (ws.length>=3) {
    const first = ws[0].weight!; const last = ws[ws.length-1].weight!; const trend = (last-first)/Math.max(1, ws.length-1);
    items.push({ id:'weight_trend', category:'weight', score: 0.7, text: lng==='de'?`Gewichtstrend/Tag: ${trend>=0?'+':''}${trend.toFixed(2)} kg – bewerte über mehrere Tage.`:`Weight trend/day: ${trend>=0?'+':''}${trend.toFixed(2)} kg – assess over multiple days.` });
    const last7 = ws.slice(-7).map(d=>d.weight!);
    if (last7.length>=5) {
      const range = Math.max(...last7)-Math.min(...last7);
      if (range < 0.6) items.push({ id:'plateau', category:'weight', score: 0.85, text: lng==='de'?`Plateau in den letzten Tagen: Kleine Anpassung bei Wasser/Sport kann helfen.`:`Plateau detected: small tweaks to water/sport may help.` });
    }
    const slope3 = trend*3; const slope7 = trend*7;
    items.push({ id:'forecast_3', category:'weight', score: 0.6, text: lng==='de'?`Prognose (3T): ${ (last+slope3).toFixed(1)} kg`:`Forecast (3d): ${ (last+slope3).toFixed(1)} kg` });
    items.push({ id:'forecast_7', category:'weight', score: 0.55, text: lng==='de'?`Prognose (7T): ${ (last+slope7).toFixed(1)} kg`:`Forecast (7d): ${ (last+slope7).toFixed(1)} kg` });
  }

  // 3) Water outliers (last 14)
  const last14 = values.slice(-14).map(d=>d.drinks?.water??0);
  if (last14.length>=5) {
    const med = median(last14);
    const highs = last14.filter(x=>x>med*1.5).length; const lows = last14.filter(x=>x<med*0.5).length;
    if (highs>0) items.push({ id:'water_outlier_high', category:'water', score:0.5, text: lng==='de'?`Mehrere sehr hohe Trinktage (>~${(med*1.5).toFixed(1)}). Achte auf Balance.`:`Several very high water days (>~${(med*1.5).toFixed(1)}). Aim for balance.` });
    if (lows>0) items.push({ id:'water_outlier_low', category:'water', score:0.5, text: lng==='de'?`Mehrere sehr niedrige Trinktage (<~${(med*0.5).toFixed(1)}). Erhöhe schrittweise.`:`Several very low water days (<~${(med*0.5).toFixed(1)}). Increase gradually.` });
  }

  // 4) Pill adherence (last 7)
  const last7 = values.slice(-7);
  const pillDays = last7.filter(d=>d.pills?.morning && d.pills?.evening).length;
  if (last7.length) {
    const ratio = pillDays/last7.length;
    items.push({ id:'pill_adherence', category:'pill', score: 0.65, text: lng==='de'?`Pillen‑Adhärenz (7T): ${(ratio*100|0)}%. Koppel Einnahme an Routine.`:`Pill adherence (7d): ${(ratio*100|0)}%. Tie intake to routines.` });
  }

  // 5) Night vs early tracking balance
  const early = values.filter(d=>typeof d.weightTime==='number' && new Date(d.weightTime!).getHours()<8).length;
  const late = values.filter(d=>typeof d.weightTime==='number' && new Date(d.weightTime!).getHours()>=22).length;
  if (late>early) items.push({ id:'time_window', category:'habit', score: 0.45, text: lng==='de'?`Späte Einträge überwiegen – morgens sind Werte vergleichbarer.`:`More late entries – mornings are more comparable.` });

  // Apply feedback weights
  const boosted = items.map(it => {
    const f = (aiFeedback?.[it.id]||0);
    return { ...it, score: it.score + Math.max(-0.3, Math.min(0.3, f*0.05)) };
  });

  // Sort and uniq by id
  const seen = new Set<string>();
  const out: AIItem[] = [];
  for (const it of boosted.sort((a,b)=>b.score-a.score)) { if (!seen.has(it.id)) { seen.add(it.id); out.push(it); } }
  return out;
}