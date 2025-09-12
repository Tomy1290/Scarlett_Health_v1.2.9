import { Cycle } from "../store/useStore";

export const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export function getAverageCycleLengthDays(cycles: Cycle[]): number {
  const starts = cycles.filter(c => c.start).map(c => c.start).sort();
  if (starts.length < 2) return 28;
  const diffs: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const a = new Date(starts[i-1]); const b = new Date(starts[i]);
    const diff = Math.round((+b - +a)/(24*60*60*1000));
    if (diff > 0) diffs.push(diff);
  }
  if (diffs.length === 0) return 28;
  const last3 = diffs.slice(-3);
  const avg = Math.round(last3.reduce((a,b)=>a+b,0)/last3.length);
  return avg || 28;
}

export function predictNextStart(cycles: Cycle[]): Date | null {
  const avg = getAverageCycleLengthDays(cycles);
  const starts = cycles.map(c => c.start).filter(Boolean).sort();
  const last = starts.slice(-1)[0];
  if (!last) return null;
  const dt = new Date(last);
  dt.setDate(dt.getDate() + avg);
  return dt;
}

// Typical model: ovulation occurs ~14 days before next period. Fertile window = ovulation -5 .. ovulation -1
export function getOvulationDate(cycles: Cycle[], refDate?: Date): Date | null {
  const next = predictNextStart(cycles);
  if (!next) return null;
  const ov = new Date(next);
  ov.setDate(ov.getDate() - 14);
  return ov;
}

export function getFertileWindow(cycles: Cycle[]): { start: Date; end: Date } | null {
  const ov = getOvulationDate(cycles);
  if (!ov) return null;
  const start = new Date(ov);
  start.setDate(start.getDate() - 5);
  const end = new Date(ov);
  end.setDate(end.getDate() - 1);
  return { start, end };
}

export function isWithin(date: Date, start: Date, end: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return +d >= +s && +d <= +e;
}

export function buildPeriodDaysSet(cycles: Cycle[], periodLength = 5): Set<string> {
  const set = new Set<string>();
  for (const c of cycles) {
    const start = new Date(c.start);
    const len = Math.max(1, periodLength);
    const end = new Date(start);
    end.setDate(start.getDate() + len - 1);
    let cur = new Date(start);
    while (+cur <= +end) { set.add(toKey(cur)); cur.setDate(cur.getDate()+1); }
  }
  return set;
}

export function markersForMonth(year: number, month: number, cycles: Cycle[]) {
  const avg = getAverageCycleLengthDays(cycles);
  const expectedNext = predictNextStart(cycles);
  const fertile = getFertileWindow(cycles);
  const ovulation = getOvulationDate(cycles);

  const periodSet = buildPeriodDaysSet(cycles, 5);

  // build arrays of dates in current month for markers
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate()+1); }

  const period = new Set(days.filter(dd => periodSet.has(toKey(dd))).map(toKey));
  const fertileSet = new Set(days.filter(dd => fertile && isWithin(dd, fertile.start, fertile.end)).map(toKey));
  const ovulationSet = new Set(days.filter(dd => ovulation && toKey(dd) === toKey(ovulation)).map(toKey));
  const expectedSet = new Set(days.filter(dd => expectedNext && toKey(dd) === toKey(expectedNext)).map(toKey));

  return { period, fertile: fertileSet, ovulation: ovulationSet, expected: expectedSet, avg };
}