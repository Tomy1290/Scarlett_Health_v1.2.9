import { AppState } from '../store/useStore';

function t(lang: 'de'|'en'|'pl', de: string, en: string, pl?: string) { return lang==='en'?en:(lang==='pl'?(pl||en):de); }

export function answerCycle(state: AppState, q?: string) {
  const lang = state.language as 'de'|'en'|'pl';
  const txt = t(lang,
    'Zyklus – Überblick: Periode (Blutung), Follikelphase (Aufbau), Ovulation (Eisprung, fruchtbares Fenster), Lutealphase (Regeneration). In der App: Zyklusstart/‑ende setzen, Kalender zeigt Prognosen und fertile Tage. Beobachte Energie, Schlaf und Schmerzen – plane entlastende Tage (Wärme, Ruhe, sanfte Bewegung).',
    'Cycle – overview: Period (bleeding), follicular (build-up), ovulation (fertile window), luteal (regeneration). In the app: set start/end, calendar shows predictions and fertile days. Watch energy, sleep, pain – plan lighter days (warmth, rest, gentle movement).',
    'Cykl – przegląd: Okres (krwawienie), faza pęcherzykowa, owulacja (okno płodne), lutealna. W aplikacji: ustaw start/koniec, kalendarz pokazuje prognozy i dni płodne. Obserwuj energię, sen, ból – zaplanuj lżejsze dni (ciepło, odpoczynek, lekki ruch).'
  );
  return txt;
}

export function cycleFertileWindow(state: AppState) {
  const lang = state.language as 'de'|'en'|'pl';
  return t(lang,
    'Fruchtbares Fenster: startet meist 3–5 Tage vor dem Eisprung und endet ca. am Eisprungtag. Stress, Schlafmangel und Erkrankungen können den Zeitpunkt verschieben. Nutze den Kalender für eine vorsichtige Schätzung – reale Zyklen schwanken.',
    'Fertile window: typically begins 3–5 days before ovulation and ends around ovulation day. Stress, poor sleep, illness can shift timing. Use the calendar as a cautious estimate – real cycles vary.',
    'Okno płodne: zwykle zaczyna się 3–5 dni przed owulacją i kończy w dniu owulacji. Stres, sen, choroba mogą zmieniać termin. Kalendarz daje ostrożne oszacowanie – cykle się różnią.'
  );
}

export function cyclePainManagement(state: AppState) {
  const lang = state.language as 'de'|'en'|'pl';
  return t(lang,
    'Umgang mit Schmerzen/Krämpfen: Wärme (Wärmflasche, warmes Bad), ruhige Bewegung/Dehnen, ausreichend trinken und leicht verdauliche Kost. Achte auf Ruhephasen. Bei starken Beschwerden medizinischen Rat einholen.',
    'Managing pain/cramps: warmth (hot water bottle, warm bath), gentle movement/stretching, hydration and light foods. Add rest periods. Seek medical advice if severe.',
    'Radzenie sobie z bólem/skurczami: ciepło (termofor, ciepła kąpiel), łagodny ruch/rozciąganie, nawodnienie i lekkostrawna dieta. Planuj odpoczynek. Przy silnych dolegliwościach skonsultuj lekarza.'
  );
}

export function cycleEnergySleep(state: AppState) {
  const lang = state.language as 'de'|'en'|'pl';
  return t(lang,
    'Energie & Schlaf über den Zyklus: Viele erleben mehr Energie in der Follikelphase und leichte Tiefs rund um Periode/Lutealphase. Unterstütze dich mit Rhythmus (feste Schlafzeiten), Tageslicht am Morgen und abends weniger Bildschirmzeit.',
    'Energy & sleep over cycle: Many feel more energy in follicular phase and dips around period/luteal. Support with rhythm (consistent sleep), morning daylight, and less screens at night.',
    'Energia i sen w cyklu: Często więcej energii w fazie pęcherzykowej i spadki w okresie/lutealnej. Pomagają rytm snu, światło poranne i mniej ekranów wieczorem.'
  );
}

export function answerWeight(state: AppState, q?: string) {
  const lang = state.language as 'de'|'en'|'pl';
  const ws = Object.values(state.days||{}).filter((d:any)=>typeof d.weight==='number');
  let trendTxt = '';
  if (ws.length>=3) {
    const first = (ws[0] as any).weight as number; const last = (ws[ws.length-1] as any).weight as number; const trend = (last-first)/Math.max(1, ws.length-1);
    trendTxt = t(lang, `Trend/Tag: ${trend>=0?'+':''}${trend.toFixed(2)} kg.`, `Trend/day: ${trend>=0?'+':''}${trend.toFixed(2)} kg.`, `Trend/dzień: ${trend>=0?'+':''}${trend.toFixed(2)} kg.`);
  }
  const core = t(lang,
    'Bewerte Gewicht über mehrere Tage/Wochen. Plateaus sind normal – kleine Hebel: Wasser (35 ml/kg), Bewegung, Schlaf, salzarme Kost abends. Morgens wiegen erhöht Vergleichbarkeit.',
    'Assess weight across days/weeks. Plateaus are normal – small levers: water (35 ml/kg), activity, sleep, lower salt at night. Morning weighing improves comparability.',
    'Oceniaj wagę w dniach/tygodniach. Plateau to norma – dźwignie: woda (35 ml/kg), ruch, sen, mniej soli wieczorem. Ważenie rano ułatwia porównanie.'
  );
  return `${trendTxt} ${core}`.trim();
}

export function weightPlateauStrategies(state: AppState) {
  const lang = state.language as 'de'|'en'|'pl';
  return t(lang,
    'Plateau‑Strategien: +0,5–1,0 L Wasser/Tag (angepasst), kurze Alltagswege zu Fuß, 10–15 Min. Aktivität, Abend-Snack salzarm, gleichmäßige Mahlzeiten. Keine Crash‑Diäten.',
    'Plateau strategies: +0.5–1.0 L water/day (adjusted), short walks, 10–15 min activity, low‑salt evening snack, regular meals. Avoid crash diets.',
    'Strategie na plateau: +0,5–1,0 L wody/dzień (dopasuj), krótkie spacery, 10–15 min aktywności, mało soli wieczorem, regularne posiłki. Unikaj drastycznych diet.'
  );
}

export function hydrationWeightRelation(state: AppState) {
  const lang = state.language as 'de'|'en'|'pl';
  return t(lang,
    'Hydration & Gewicht: Zu wenig Trinken fördert Wasserhaushalts‑Schwankungen und Hungergefühl. Richtwert: 35 ml/kg/Tag, +500 ml bei Sport. Morgendlicher „Start‑Schluck“ hilft.',
    'Hydration & weight: Low intake increases water balance swings and hunger. Guide: 35 ml/kg/day, +500 ml with exercise. A morning “start sip” helps.',
    'Nawodnienie & waga: Za mało picia = wahania wody i głód. Wskazówka: 35 ml/kg/dzień, +500 ml przy sporcie. Poranny „łyk startowy” pomaga.'
  );
}

export function weightSleepImpact(state: AppState) {
  const lang = state.language as 'de'|'en'|'pl';
  return t(lang,
    'Schlaf & Gewicht: Wenig Schlaf stört Appetit‑Hormone. Ziel: Konsistente Schlafzeiten, Tageslicht am Morgen, abends weniger Screens, Koffein früher drosseln.',
    'Sleep & weight: Short sleep disrupts appetite hormones. Aim for consistent sleep, morning daylight, fewer screens at night, earlier caffeine cut‑off.',
    'Sen & waga: Mało snu zaburza hormony apetytu. Cel: stałe pory snu, światło rano, mniej ekranów wieczorem, ogranicz kofeinę wcześniej.'
  );
}

export function answerReminders(state: AppState) {
  const lang = state.language as 'de'|'en'|'pl';
  return t(lang,
    'Erinnerungen: Zeiten im Format HH:MM. Die App normalisiert Eingaben (z. B. 7 30, 0730, 7.30 → 07:30). Android‑Kanal: hohe Priorität, Vibration. Plane Uhrzeiten, die zu deiner Routine passen.',
    'Reminders: Use HH:MM. The app normalizes inputs (e.g., 7 30, 0730, 7.30 → 07:30). Android channel: high priority, vibration. Choose times that fit your routine.',
    'Przypomnienia: HH:MM. Aplikacja normalizuje wpisy (np. 7 30, 0730, 7.30 → 07:30). Kanał Android: wysoki priorytet, wibracje. Planuj godziny do rutyny.'
  );
}

export function answerKnowledge(state: AppState, q: string) {
  const s = q.toLowerCase();
  
  // Spezifische Zyklus-Fragen
  if (/(fruchtbar|fertile|eisprung|ovul)/i.test(q)) {
    return cycleFertileWindow(state);
  }
  if (/(schmerz|kramp|cramp|kopfschmerz|übelsch|nausea)/i.test(q)) {
    return cyclePainManagement(state);
  }
  if (/(energie|energy|schlaf|sleep|müde|tired)/i.test(q)) {
    return cycleEnergySleep(state);
  }
  if (/(pms|periode|period|menstruation|blut)/i.test(q)) {
    return answerCycle(state);
  }
  
  // Allgemeine Zyklus-Fragen - nur Basis-Info
  if (/(zyklus|cycle)/i.test(q)) {
    return answerCycle(state);
  }
  
  // Spezifische Gewichts-Fragen
  if (/(plateau|stagnation|stillstand)/i.test(q)) {
    return weightPlateauStrategies(state);
  }
  if (/(wasser|hydration|trinken|dehydr)/i.test(q)) {
    return hydrationWeightRelation(state);
  }
  if (/(abnehmen|lose.*weight|diät)/i.test(q)) {
    return [answerWeight(state), weightPlateauStrategies(state)].join('\n\n');
  }
  
  // Allgemeine Gewichts-Fragen
  if (/(gewicht|weight|waga|masa)/i.test(q)) {
    return answerWeight(state);
  }
  
  if (/(erinnerung|reminder|benachrichtigung)/i.test(q)) {
    return answerReminders(state);
  }
  
  return '';
}

export function answerTopic(state: AppState, topic: 'cycle'|'weight'|'sleep'|'hydration'|'reminders') {
  if (topic==='cycle') return [answerCycle(state), cycleFertileWindow(state), cyclePainManagement(state), cycleEnergySleep(state)].join('\n');
  if (topic==='weight') return [answerWeight(state), weightPlateauStrategies(state), hydrationWeightRelation(state), weightSleepImpact(state)].join('\n');
  if (topic==='sleep') return weightSleepImpact(state);
  if (topic==='hydration') return hydrationWeightRelation(state);
  return answerReminders(state);
}