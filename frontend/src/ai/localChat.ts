import { AppState } from '../store/useStore';
import { computeAIv1 } from './insights';
import { searchRecipes, pickDailySuggestions } from './recipes';

function t(lang: 'de'|'en'|'pl', de: string, en: string, pl?: string) {
  return lang==='en' ? en : (lang==='pl' ? (pl||en) : de);
}

export async function localGreeting(state: AppState) {
  const lang = state.language as 'de'|'en'|'pl';
  const tips = computeAIv1({ days: state.days, language: state.language, aiFeedback: state.aiFeedback, aiInsightsEnabled: state.aiInsightsEnabled });
  const tip = tips[0]?.text || t(lang,'Trink heute morgens ein Glas Wasser mehr.','Add one extra glass of water in the morning.','Dodaj rano jedną szklankę wody.');
  const picks = pickDailySuggestions(lang).slice(0,2);
  const rec = picks.map(p => `• ${p.title[lang]} (${p.durationMin} Min)`).join('\n');
  const txt = t(lang,
    `Tipp: ${tip}\nHinweis: Schau dir diese Rezepte an:\n${rec}`,
    `Tip: ${tip}\nNote: Check these recipes:\n${rec}`,
    `Wskazówka: ${tip}\nUwaga: Sprawdź te przepisy:\n${rec}`
  );
  return txt;
}

export async function localReply(state: AppState, userText: string) {
  const lang = state.language as 'de'|'en'|'pl';
  const q = userText.toLowerCase();
  // intent: recipes
  if (/(rezept|recipe|przepis|kochen|cook)/.test(q)) {
    const results = searchRecipes({ lang, keywords: userText, limit: 5 });
    if (results.length === 0) {
      const picks = pickDailySuggestions(lang).slice(0,3);
      const list = picks.map(p => `• ${p.title[lang]} – ${p.desc[lang]}`).join('\n');
      return t(lang, `Keine passenden Rezepte gefunden. Vorschläge:\n${list}`, `No matching recipes. Suggestions:\n${list}`, `Brak pasujących przepisów. Propozycje:\n${list}`);
    }
    const list = results.map(r => `• ${r.title[lang]} – ${r.desc[lang]}`).join('\n');
    return t(lang, `Hier sind Rezepte für dich:\n${list}`, `Here are recipes for you:\n${list}`, `Oto przepisy dla ciebie:\n${list}`);
  }
  // intent: tips/analysis
  if (/(analyse|analysis|analiza|trink|wasser|water|kaffee|coffee|gewicht|weight|pille|pills|sport)/.test(q)) {
    const tips = computeAIv1({ days: state.days, language: state.language, aiFeedback: state.aiFeedback, aiInsightsEnabled: state.aiInsightsEnabled });
    const top = tips.slice(0,3).map(x => `• ${x.text}`).join('\n');
    if (top) return t(lang, `Kurze Analyse & Tipps:\n${top}`, `Quick analysis & tips:\n${top}`, `Krótka analiza i wskazówki:\n${top}`);
  }
  // smalltalk default
  const fallback = t(lang,
    'Erzähl mir, wie es dir heute geht – oder frag nach Rezepten (z. B. „italienisches Abendessen, low carb“).',
    'Tell me how you feel today – or ask for recipes (e.g., “Italian dinner, low carb”).',
    'Powiedz, jak się dziś czujesz – albo poproś o przepisy (np. „włoska kolacja, low carb”).'
  );
  return fallback;
}