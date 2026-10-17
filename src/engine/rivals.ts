import { addDays } from './days';
import type { AppEvent } from './events';
import { hashSeed } from './games/common';
import { mulberry32 } from './prng';
import { projectXp } from './projections';
import { weekStart } from './session';

/* Liga semanal contra rivales simulados (CLAUDE.md §3b): los becarios ficticios de Albufera Partners.
   Todo se deriva de los eventos del usuario (su XP por día), sin servidor ni estado propio: las divisiones se
   recalculan jugando las semanas cerradas en orden. Puro y determinista por semilla: mismo historial → misma
   liga en cualquier dispositivo. */

export const DIVISIONS = ['Bronce', 'Plata', 'Oro', 'Platino', 'Wall Street'] as const;
export const PROMOTE = 3;
export const RELEGATE = 3;
/** XP semanal de referencia cuando aún no hay historial (5 días del objetivo diario). */
export const DEFAULT_WEEKLY_XP = 300;
/** Suelo de la media: si dejas de estudiar los rivales no se hunden hasta ser triviales. */
export const MIN_WEEKLY_AVG = 150;
/** Semanas previas que promedian tu ritmo. */
export const AVG_WEEKS = 4;
/** Cada división sube un 4 % el ritmo de los rivales. */
export const DIVISION_STEP = 0.04;

export type Personality = 'constante' | 'sprinter' | 'madrugador' | 'irregular';

export interface RivalDef {
  id: string;
  name: string;
  personality: Personality;
  /** Ritmo respecto a tu media semanal. */
  factor: number;
}

export const RIVALS: readonly RivalDef[] = [
  { id: 'lucia', name: 'Lucía Ferrer', personality: 'constante', factor: 0.95 },
  { id: 'marcos', name: 'Marcos Beltrán', personality: 'sprinter', factor: 1.15 },
  { id: 'irene', name: 'Irene Soler', personality: 'madrugador', factor: 1.0 },
  { id: 'pau', name: 'Pau Ribera', personality: 'irregular', factor: 1.3 },
  { id: 'carmen', name: 'Carmen Olmos', personality: 'constante', factor: 0.75 },
  { id: 'hugo', name: 'Hugo Navarro', personality: 'sprinter', factor: 0.85 },
  { id: 'alba', name: 'Alba Quirós', personality: 'irregular', factor: 1.05 },
  { id: 'dani', name: 'Dani Cervera', personality: 'madrugador', factor: 0.6 },
];

/** Peso relativo de cada día (lunes..domingo) según la personalidad, con ruido de la semilla. */
function dayWeights(personality: Personality, rnd: () => number): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const noise = 0.7 + rnd() * 0.6;
    switch (personality) {
      case 'constante':
        return 1 * noise;
      case 'sprinter':
        return (0.4 + i * 0.25) * noise;
      case 'madrugador':
        return (2.2 - i * 0.28) * noise;
      case 'irregular':
        return (rnd() < 0.35 ? 0 : 1.6) * noise;
    }
  });
}

/** XP por día (lunes..domingo) de un rival en una semana. Entero por día; la suma ≈ objetivo semanal. */
export function rivalWeek(
  rival: RivalDef,
  week: string,
  division: number,
  avgWeekly: number,
): number[] {
  const rnd = mulberry32(hashSeed(`liga:${rival.id}:${week}:${division}`));
  const weekNoise = 0.92 + rnd() * 0.16;
  const target = avgWeekly * rival.factor * (1 + DIVISION_STEP * division) * weekNoise;
  let w = dayWeights(rival.personality, rnd);
  if (w.every((x) => x === 0)) w = w.map(() => 1);
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => Math.round((target * x) / sum));
}

export interface StandingRow {
  id: string;
  name: string;
  me: boolean;
  xp: number;
  rank: number;
  zone: 'promote' | 'relegate' | 'stay';
}

export interface WeekOutcome {
  week: string;
  division: number;
  nextDivision: number;
  myXp: number;
  myRank: number;
  result: 'promoted' | 'relegated' | 'stayed';
  standings: StandingRow[];
}

const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);

/** Clasificación: ordena por XP; los empates se resuelven a tu favor solo si tienes XP, luego por nombre. */
export function standingsFor(
  myXp: number,
  rivalsXp: readonly { rival: RivalDef; xp: number }[],
  division: number,
  myName = 'Tú',
): StandingRow[] {
  const rows = [
    { id: 'yo', name: myName, me: true, xp: myXp },
    ...rivalsXp.map(({ rival, xp }) => ({ id: rival.id, name: rival.name, me: false, xp })),
  ].sort((a, b) => b.xp - a.xp || Number(b.me) - Number(a.me) || a.name.localeCompare(b.name));
  const n = rows.length;
  return rows.map((r, i) => ({
    ...r,
    rank: i + 1,
    zone:
      i < PROMOTE && division < DIVISIONS.length - 1 && r.xp > 0
        ? 'promote'
        : i >= n - RELEGATE && division > 0
          ? 'relegate'
          : 'stay',
  }));
}

/** Media de XP semanal de las semanas anteriores (solo desde que empezaste), con suelo. */
export function weeklyAverage(
  byWeek: Readonly<Record<string, number>>,
  week: string,
  firstWeek: string | null,
): number {
  if (!firstWeek) return DEFAULT_WEEKLY_XP;
  const vals: number[] = [];
  for (let i = 1; i <= AVG_WEEKS; i++) {
    const w = addDays(week, -7 * i);
    if (w < firstWeek) break;
    vals.push(byWeek[w] ?? 0);
  }
  if (!vals.length) return DEFAULT_WEEKLY_XP;
  return Math.max(MIN_WEEKLY_AVG, sum(vals) / vals.length);
}

/** Cierra una semana: XP final de todos, nueva división. */
export function closeWeek(
  week: string,
  division: number,
  myXp: number,
  avgWeekly: number,
): WeekOutcome {
  const rivalsXp = RIVALS.map((rival) => ({
    rival,
    xp: sum(rivalWeek(rival, week, division, avgWeekly)),
  }));
  const standings = standingsFor(myXp, rivalsXp, division);
  const me = standings.find((r) => r.me)!;
  const nextDivision =
    me.zone === 'promote' ? division + 1 : me.zone === 'relegate' ? division - 1 : division;
  return {
    week,
    division,
    nextDivision,
    myXp,
    myRank: me.rank,
    result: me.zone === 'promote' ? 'promoted' : me.zone === 'relegate' ? 'relegated' : 'stayed',
    standings,
  };
}

/** XP del usuario por semana (clave = lunes). */
export function xpByWeek(byDay: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [d, xp] of Object.entries(byDay)) {
    const w = weekStart(d);
    out[w] = (out[w] ?? 0) + xp;
  }
  return out;
}

export interface League {
  /** Lunes de la semana en curso. */
  week: string;
  division: number;
  divisionName: string;
  /** Posición actual y clasificación parcial (acumulado hasta hoy incluido). */
  standings: StandingRow[];
  myXp: number;
  /** Días de la semana ya jugados (1–7). */
  dayIndex: number;
  /** Semanas cerradas desde que empezaste, de la más antigua a la más reciente. */
  history: WeekOutcome[];
  /** Cierre de la semana pasada (si participabas); null si es tu primera semana. */
  lastClose: WeekOutcome | null;
  /** Clasificación de la semana pasada en su día intermedio (jueves), para animar el reordenamiento. */
  lastCloseMidweek: StandingRow[] | null;
  /** Tú contra tu yo de la semana pasada, acumulado hasta el mismo día. */
  vsLastWeek: { now: number; before: number; delta: number } | null;
  avgWeekly: number;
  /** ¿Has empezado a estudiar? Sin XP nunca se muestra una liga inventada. */
  started: boolean;
}

/** Liga completa a partir de los eventos. `today` es la clave de día local. */
export function leagueFromEvents(events: readonly AppEvent[], today: string): League {
  const byDay = projectXp(events).byDay;
  const days = Object.keys(byDay).sort();
  const week = weekStart(today);
  const first = days[0] ? weekStart(days[0]) : null;
  const byWeek = xpByWeek(byDay);
  const started = first !== null;

  // juega las semanas cerradas en orden
  let division = 0;
  const history: WeekOutcome[] = [];
  if (first) {
    for (let w = first, i = 0; w < week && i < 600; w = addDays(w, 7), i++) {
      const out = closeWeek(w, division, byWeek[w] ?? 0, weeklyAverage(byWeek, w, first));
      history.push(out);
      division = out.nextDivision;
    }
  }

  const avgWeekly = weeklyAverage(byWeek, week, first);
  const dayIndex = Math.min(7, Math.max(1, daysFrom(week, today) + 1));
  const myXp = sumDays(byDay, week, dayIndex);
  const standings = standingsFor(
    myXp,
    RIVALS.map((rival) => ({
      rival,
      xp: sum(rivalWeek(rival, week, division, avgWeekly).slice(0, dayIndex)),
    })),
    division,
  );

  const lastClose = history.length ? history[history.length - 1]! : null;
  let lastCloseMidweek: StandingRow[] | null = null;
  if (lastClose) {
    const mid = 4;
    lastCloseMidweek = standingsFor(
      sumDays(byDay, lastClose.week, mid),
      RIVALS.map((rival) => ({
        rival,
        xp: sum(
          rivalWeek(
            rival,
            lastClose.week,
            lastClose.division,
            weeklyAverage(byWeek, lastClose.week, first),
          ).slice(0, mid),
        ),
      })),
      lastClose.division,
    );
  }

  const prevWeek = addDays(week, -7);
  const vsLastWeek =
    first && prevWeek >= first
      ? (() => {
          const before = sumDays(byDay, prevWeek, dayIndex);
          return { now: myXp, before, delta: myXp - before };
        })()
      : null;

  return {
    week,
    division,
    divisionName: DIVISIONS[division]!,
    standings,
    myXp,
    dayIndex,
    history,
    lastClose,
    lastCloseMidweek,
    vsLastWeek,
    avgWeekly,
    started,
  };
}

function daysFrom(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** XP del usuario en los primeros `n` días de la semana que empieza en `week`. */
function sumDays(byDay: Readonly<Record<string, number>>, week: string, n: number): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += byDay[addDays(week, i)] ?? 0;
  return s;
}
