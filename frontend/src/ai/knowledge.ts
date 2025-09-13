import { AppState } from '../store/useStore';

function t(lang: 'de'|'en'|'pl', de: string, en: string, pl?: string) { return lang==='en'?en:(lang==='pl'?(pl||en):de); }

export function answerCycle(state: AppState, q: string) {
  const lang = state.language as 'de'|'en'|'pl';
  const txt = t(lang,
    'Zyklus-Basics: Der Zyklus hat Phasen (Periode, Follikel, Ovulation, Luteal). In der App kannst du Start/Ende setzen und im Kalender Prognosen sehen. Fruchtbare Phase beginnt meist ein paar Tage vor dem Eisprung. Hinweise: Achte auf Symptome (Schmerz, Energie, Schlaf) und plane Entlastungstage.',
    'Cycle basics: Phases (period, follicular, ovulation, luteal). In the app you can set start/end and see predictions in the calendar. Fertile window starts some days before ovulation. Watch symptoms (pain, energy, sleep) and plan lighter days.',
    'Podstawy cyklu: Fazy (okres, pęcherzykowa, owulacja, lutealna). W aplikacji ustawiasz początek/koniec i widzisz prognozy. Okno płodne zaczyna się kilka dni przed owulacją. Obserwuj objawy i planuj lżejsze dni.'
  );
  return txt;
}

export function answerWeight(state: AppState, q: string) {
  const lang = state.language as 'de'|'en'|'pl';
  // simple tailored snippet
  const ws = Object.values(state.days||{}).filter((d:any)=>typeof d.weight==='number');
  let trendTxt = '';
  if (ws.length>=3) {
    const first = (ws[0] as any).weight as number; const last = (ws[ws.length-1] as any).weight as number; const trend = (last-first)/Math.max(1, ws.length-1);
    trendTxt = t(lang, `Aktueller Trend/Tag: ${trend>=0?'+':''}${trend.toFixed(2)} kg.`, `Current trend/day: ${trend>=0?'+':''}${trend.toFixed(2)} kg.`, `Trend/dzień: ${trend>=0?'+':''}${trend.toFixed(2)} kg.`);
  }
  const core = t(lang,
    'Gewicht: Beurteile Trends über mehrere Tage. Plateaus sind normal – kleine Anpassungen bei Wasser (35 ml/kg) und Bewegung helfen. Logge möglichst morgens zur besseren Vergleichbarkeit.',
    'Weight: Judge trends across days. Plateaus are normal – small tweaks in water (35 ml/kg) and activity help. Log in the morning for better comparability.',
    'Waga: Oceniaj trend w dniach. Plateau jest normalne – drobne zmiany w wodzie (35 ml/kg) i ruchu pomagają. Notuj najlepiej rano.'
  );
  return `${trendTxt} ${core}`.trim();
}

export function answerReminders(state: AppState) {
  const lang = state.language as 'de'|'en'|'pl';
  return t(lang,
    'Erinnerungen: Zeiten im Format HH:MM. Die App normalisiert Eingaben (z. B. 7 30, 0730, 7.30 → 07:30). Android nutzt einen Benachrichtigungskanal mit hoher Priorität.',
    'Reminders: Use HH:MM. The app normalizes inputs (e.g., 7 30, 0730, 7.30 → 07:30). Android uses a high-priority notification channel.',
    'Przypomnienia: HH:MM. Aplikacja normalizuje wpisy (np. 7 30, 0730, 7.30 → 07:30). Android używa kanału powiadomień o wysokim priorytecie.'
  );
}