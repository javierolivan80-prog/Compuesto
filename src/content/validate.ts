import { chartFacts, chartSeries } from '../engine/charts';
import { evaluateNumber } from '../engine/expr';
import { LESSON_GAME_FORMATS, referenceValues } from '../engine/games/lesson-games';
import { BASE_LEVEL, FLOOR_COUNT, levelOfFloor, levelOrder } from '../engine/floors';
import {
  ANSWER_MARKER,
  fillFormula,
  gridSize,
  instantiate,
  isParametric,
  markersOf,
  onGrid,
  templateStrings,
  type ParametricExercise,
} from '../engine/params';
import { evaluateSheet, numericValue } from '../engine/sheet';
import { checkCompany } from './accounting';
import { EXPLAINER_NAMES, type ExplainerName } from './explainer-names';
import { EXPLAINER_PROPS } from './explainer-props';
import {
  EXERCISE_CATEGORY,
  companiesSchema,
  conceptsSchema,
  curriculumSchema,
  type Curriculum,
  glossarySchema,
  gamesDataSchema,
  lessonSchema,
  placementSchema,
  type Concept,
  type Exercise,
  type Lesson,
  type Placement,
} from './schemas';

export type Severity = 'error' | 'warning';
export interface Issue {
  severity: Severity;
  code: string;
  where: string;
  message: string;
}

export interface RawFile {
  path: string;
  data: unknown;
}

export interface ContentBundle {
  concepts: unknown;
  companies: unknown;
  glossary?: unknown;
  curriculum?: unknown;
  lessons: RawFile[];
  placements?: RawFile[];
  /** content/shared/games.json */
  games?: unknown;
  /** Nombres de empresas reales que no pueden aparecer fuera de document_read y lecciones históricas. */
  realCompanies?: string[];
  /** id → estado de lo ya publicado (ids-lock.json). */
  idsLock?: Record<string, string>;
}

const PERCENT_MIN_PRODUCE = 0.4;
const PERCENT_MAX_RECOGNIZE = 0.4;

function zodIssues(
  where: string,
  error: { issues: { path: PropertyKey[]; message: string }[] },
): Issue[] {
  return error.issues.slice(0, 8).map((i) => ({
    severity: 'error' as const,
    code: 'esquema',
    where,
    message: `${i.path.join('.') || '(raíz)'}: ${i.message}`,
  }));
}

/** Todas las cadenas de un valor (para buscar nombres de empresas reales). */
function strings(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === 'object') return Object.values(v).flatMap(strings);
  return [];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function conceptCycles(concepts: Concept[]): string[][] {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const cycles: string[][] = [];
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string) => {
    state.set(id, 1);
    stack.push(id);
    for (const p of byId.get(id)?.prerequisites ?? []) {
      if (!byId.has(p)) continue;
      if (state.get(p) === 1) cycles.push([...stack.slice(stack.indexOf(p)), p]);
      else if (!state.has(p)) visit(p);
    }
    stack.pop();
    state.set(id, 2);
  };
  for (const c of concepts) if (!state.has(c.id)) visit(c.id);
  return cycles;
}

/** Comprobaciones semánticas de un ejercicio (más allá de la forma del JSON). */
/** Semillas que prueba content:validate en cada ejercicio paramétrico (TEMARIO §6). */
export const PARAM_SEEDS = 100;

/** Comprobaciones de un ejercicio: las de siempre y, si tiene `params`, las de la plantilla y 100 variantes. */
export function checkExercise(e: Exercise, strict: boolean): Issue[] {
  if (isParametric(e)) return checkParametric(e, strict);
  // sin params nadie rellena los marcadores (ni las cifras de una lección-juego): se verían literales
  const loose = markersOf(JSON.stringify(e)).map<Issue>((m) => ({
    severity: 'error',
    code: 'params',
    where: e.id,
    message: `Marcador {${m}} en un ejercicio sin params: se vería literal (solo se rellenan los parámetros declarados)`,
  }));
  return [...loose, ...checkConcrete(e, strict)];
}

function checkParametric(e: ParametricExercise, strict: boolean): Issue[] {
  const out: Issue[] = [];
  const err = (message: string) =>
    out.push({ severity: 'error', code: 'params', where: e.id, message });
  const params = e.params ?? {};
  const derived = Object.keys(e.derived ?? {});
  for (const [name, p] of Object.entries(params)) {
    if (!(p.min < p.max)) err(`Parámetro ${name}: min debe ser menor que max`);
    else if (!onGrid(p, p.value))
      err(
        `Parámetro ${name}: value ${p.value} fuera de [${p.min}, ${p.max}] o de la rejilla de paso ${p.step}`,
      );
    if (derived.includes(name)) err(`"${name}" es a la vez parámetro y derivado`);
  }
  if (Object.values(params).every((p) => gridSize(p) === 0))
    err('Ningún parámetro admite otra cifra: el repaso repetiría el enunciado');
  const { texts, formulas } = templateStrings(e);
  const known = new Set([...Object.keys(params), ...derived]);
  for (const s of texts)
    for (const m of markersOf(s))
      if (!known.has(m) && !(m === ANSWER_MARKER && e.type === 'numeric_input' && s !== e.prompt))
        err(`Marcador sin definir en el texto: {${m}}`);
  for (const s of formulas)
    for (const m of markersOf(s))
      if (!known.has(m)) err(`Marcador sin definir en una fórmula: {${m}}`);
  const used = new Set([...texts, ...formulas].flatMap(markersOf));
  for (const name of Object.keys(params))
    if (!used.has(name)) err(`El parámetro ${name} no se usa en ningún texto ni fórmula`);
  if (out.length) return out;

  // La plantilla con las cifras del enunciado pasa las comprobaciones de siempre.
  let base: Exercise;
  try {
    base = instantiate(e).exercise;
  } catch (x) {
    err(`Con las cifras del enunciado: ${(x as Error).message}`);
    return out;
  }
  out.push(...checkConcrete(base, strict));
  if (e.type === 'build_statement') {
    const scope = Object.fromEntries(Object.entries(params).map(([k, p]) => [k, p.value]));
    for (const s of e.sections)
      for (const r of s.rows)
        if (r.formula !== undefined) {
          try {
            const v = evaluateNumber(fillFormula(r.formula, scope));
            if (Math.abs(v - r.value) > 0.005)
              err(`Fila "${r.label}": la fórmula da ${Number(v.toPrecision(12))}, no ${r.value}`);
          } catch (x) {
            err(`Fila "${r.label}": ${(x as Error).message}`);
          }
        }
  }

  // 100 variantes: deben evaluarse, cuadrar y (si se declara) caer en answerRange. Se informa la primera que falla.
  for (let i = 0; i < PARAM_SEEDS; i++) {
    const seed = `validate#${i}`;
    try {
      const v = instantiate(e, seed);
      const problems = checkConcrete(v.exercise, strict).filter((x) => x.severity === 'error');
      if (problems.length) {
        err(`Semilla "${seed}" (${JSON.stringify(v.values)}): ${problems[0]!.message}`);
        break;
      }
      const x = v.exercise;
      if (x.type === 'numeric_input' && e.type === 'numeric_input' && e.answerRange) {
        if (
          !Number.isFinite(x.answer) ||
          x.answer < e.answerRange.min ||
          x.answer > e.answerRange.max
        ) {
          err(
            `Semilla "${seed}" (${JSON.stringify(v.values)}): la respuesta ${x.answer} sale de answerRange [${e.answerRange.min}, ${e.answerRange.max}]`,
          );
          break;
        }
      }
    } catch (x) {
      err(`Semilla "${seed}": ${(x as Error).message}`);
      break;
    }
  }
  return out;
}

function checkConcrete(e: Exercise, strict: boolean): Issue[] {
  const out: Issue[] = [];
  const err = (code: string, message: string) =>
    out.push({ severity: 'error', code, where: e.id, message });
  const soft = (code: string, message: string) =>
    out.push({ severity: strict ? 'error' : 'warning', code, where: e.id, message });

  const wrongCoverage = (n: number, answers: number[], w: Record<string, string> | undefined) => {
    for (let i = 0; i < n; i++) {
      if (answers.includes(i)) {
        if (w?.[String(i)])
          err(
            'explicacion-opcion-correcta',
            `wrongExplanations["${i}"] explica la opción correcta`,
          );
      } else if (!w?.[String(i)]) {
        soft(
          'falta-explicacion-erronea',
          `Falta explicación específica para la opción incorrecta ${i}`,
        );
      }
    }
    for (const k of Object.keys(w ?? {}))
      if (Number(k) >= n) err('indice', `wrongExplanations["${k}"] fuera de rango`);
  };

  if (e.type === 'chart_read') {
    const facts = chartFacts(chartSeries(e.chart));
    if (facts[e.truth.metric] !== e.truth.value)
      err(
        'grafico',
        `El gráfico con semilla ${e.chart.seed} da ${e.truth.metric} = ${facts[e.truth.metric]}, no ${e.truth.value}`,
      );
  }

  switch (e.type) {
    case 'multiple_choice':
    case 'scenario':
    case 'chart_read':
      if (e.answer >= e.options.length)
        err('indice', `answer ${e.answer} fuera de las ${e.options.length} opciones`);
      else wrongCoverage(e.options.length, [e.answer], e.wrongExplanations);
      if (new Set(e.options).size !== e.options.length)
        err('opciones-duplicadas', 'Hay opciones repetidas');
      break;
    case 'best_argument':
      if (e.answer >= e.options.length)
        err('indice', `answer ${e.answer} fuera de las ${e.options.length} opciones`);
      else wrongCoverage(e.options.length, [e.answer], e.wrongExplanations);
      break;
    case 'multi_select':
      if (e.answers.some((a) => a >= e.options.length))
        err('indice', 'Una respuesta está fuera de las opciones');
      if (new Set(e.answers).size !== e.answers.length)
        err('respuestas-duplicadas', 'Respuestas repetidas');
      if (e.answers.length === e.options.length)
        err('sin-distractores', 'Todas las opciones son correctas');
      break;
    case 'fill_blank': {
      const gaps = (e.prompt.match(/___/g) ?? []).length;
      if (gaps !== e.answers.length)
        err(
          'huecos',
          `El enunciado tiene ${gaps} hueco(s) (___) y ${e.answers.length} respuesta(s)`,
        );
      break;
    }
    case 'match_pairs':
      if (new Set(e.pairs.map((p) => p.left)).size !== e.pairs.length)
        err('pares-duplicados', 'Hay elementos de la izquierda repetidos');
      break;
    case 'categorize': {
      const bad = e.items.filter((i) => !e.categories.includes(i.category));
      if (bad.length)
        err(
          'categoria',
          `Elemento(s) con categoría inexistente: ${bad.map((b) => b.text).join(', ')}`,
        );
      break;
    }
    case 'numeric_input': {
      try {
        const v = evaluateNumber(e.formula);
        const allowed = Math.max(
          (Math.abs(e.answer) * e.tolerance) / 100,
          Math.abs(e.answer) * 1e-6,
          1e-9,
        );
        if (Math.abs(v - e.answer) > allowed)
          err(
            'formula',
            `La fórmula "${e.formula}" da ${Number(v.toPrecision(12))}, no ${e.answer} (tolerancia ${e.tolerance} %)`,
          );
      } catch (x) {
        err('formula', `La fórmula "${e.formula}" no se puede evaluar: ${(x as Error).message}`);
      }
      break;
    }
    case 'spreadsheet': {
      const formula = e.solution.startsWith('=') ? e.solution : `=${e.solution}`;
      const run = (set: Record<string, number>) =>
        numericValue(evaluateSheet({ ...e.cells, ...set, [e.target]: formula })[e.target]);
      const within = (v: number | null, expected: number) =>
        v !== null &&
        Math.abs(v - expected) <=
          Math.max((Math.abs(expected) * e.tolerance) / 100, Math.abs(expected) * 1e-6, 1e-9);
      const v = run({});
      if (!within(v, e.expected))
        err(
          'formula',
          `La solución "${e.solution}" da ${v === null ? 'un error o un valor no numérico' : Number(v.toPrecision(12))}, no ${e.expected}`,
        );
      e.hiddenCases.forEach((c, i) => {
        const hv = run(c.set);
        if (!within(hv, c.expected))
          err(
            'formula',
            `Caso oculto ${i + 1}: la solución da ${hv === null ? 'un error' : Number(hv.toPrecision(12))}, no ${c.expected}`,
          );
      });
      for (const ref of e.editable)
        if (ref in e.cells && e.cells[ref] !== '')
          err('editable', `La celda editable ${ref} ya tiene contenido inicial`);
      break;
    }
    case 'spot_the_error':
      if (e.errorIndex >= e.lines.length) err('indice', 'errorIndex fuera de las líneas');
      break;
    case 'slider_estimate':
      if (!(e.min < e.max)) err('rango', 'min debe ser menor que max');
      else if (e.answer < e.min || e.answer > e.max) err('rango', 'answer fuera de [min, max]');
      break;
    case 'case_step':
      e.steps.forEach((s, i) => {
        if (s.answer >= s.options.length)
          err('indice', `Paso ${i + 1}: answer fuera de las opciones`);
      });
      break;
    case 'document_read':
      e.questions.forEach((q, i) => {
        if (q.answer >= q.options.length)
          err('indice', `Pregunta ${i + 1}: answer fuera de las opciones`);
      });
      if (Date.parse(e.documentDate) > Date.now()) err('fecha', 'documentDate está en el futuro');
      break;
    case 'build_statement': {
      const blanks = e.sections.flatMap((s) => s.rows).filter((r) => r.blank).length;
      if (!blanks) err('sin-huecos', 'build_statement debe tener al menos una fila a completar');
      if (e.statement === 'balance') {
        const sum = (side: string) =>
          e.sections
            .filter((s) => s.side === side)
            .flatMap((s) => s.rows)
            .reduce((a, r) => a + r.value, 0);
        if (sum('activo') !== sum('pasivo') + sum('patrimonio'))
          err(
            'balance',
            `El balance no cuadra: activo ${sum('activo')} ≠ pasivo + patrimonio ${sum('pasivo') + sum('patrimonio')}`,
          );
      }
      break;
    }
    case 'code':
    case 'true_false_swipe':
    case 'order_steps':
    case 'self_explain':
      break;
  }
  return out;
}

function checkLesson(
  l: Lesson,
  ctx: { conceptIds: Map<string, Concept>; companyIds: Set<string>; realCompanies: string[] },
): Issue[] {
  const out: Issue[] = [];
  const err = (code: string, message: string, where = l.id) =>
    out.push({ severity: 'error', code, where, message });
  const strict = l.status === 'reviewed' || l.status === 'published';

  // 6–10 ejercicios; mezcla (TEMARIO §6, CLAUDE.md §8)
  const n = l.exercises.length;
  if (n < 6 || n > 10)
    err('num-ejercicios', `Una lección tiene entre 6 y 10 ejercicios; esta tiene ${n}`);
  const count = { reconocer: 0, producir: 0, aplicar: 0 };
  for (const e of l.exercises) count[EXERCISE_CATEGORY[e.type]]++;
  if (count.reconocer / n > PERCENT_MAX_RECOGNIZE)
    err('mezcla', `Demasiados ejercicios de reconocer: ${count.reconocer}/${n} (máx. 40 %)`);
  if (count.producir / n < PERCENT_MIN_PRODUCE)
    err('mezcla', `Pocos ejercicios de producir: ${count.producir}/${n} (mín. 40 %)`);

  // teoría breve: máx. 60 palabras por tarjeta y máx. 3 tarjetas antes de la primera pregunta (CLAUDE.md §8)
  if (l.intro.length > 3)
    err(
      'intro-larga',
      `La introducción tiene ${l.intro.length} tarjetas; el máximo antes de la primera pregunta es 3`,
    );
  l.intro.forEach((b, i) => {
    if (b.type === 'visual' && !(EXPLAINER_NAMES as readonly string[]).includes(b.component))
      err(
        'explicador-inexistente',
        `El explicador "${b.component}" no existe (disponibles: ${EXPLAINER_NAMES.join(', ')})`,
        `${l.id} intro[${i}]`,
      );
    if (b.type === 'visual' && (EXPLAINER_NAMES as readonly string[]).includes(b.component)) {
      const r = EXPLAINER_PROPS[b.component as ExplainerName].safeParse(b.props);
      if (!r.success)
        err(
          'explicador-props',
          `Props de ${b.component} no válidas: ${r.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ')}`,
          `${l.id} intro[${i}]`,
        );
    }
    if (b.type === 'card' && b.term && b.term.trim().toLowerCase() === l.title.trim().toLowerCase())
      err(
        'termino-igual-titulo',
        `El término de la tarjeta "${b.term}" repite el título de la lección (dos encabezados iguales)`,
        `${l.id} intro[${i}]`,
      );
    if (b.type !== 'visual') {
      const words = b.text.trim().split(/\s+/).length;
      if (words > 60)
        err(
          'teoria-larga',
          `La tarjeta ${i + 1} tiene ${words} palabras; el máximo es 60`,
          `${l.id} intro[${i}]`,
        );
    }
  });

  // estado y revisión
  if (l.status === 'published' && !l.reviewedBy.includes('humano'))
    err('revision', 'published exige reviewedBy con "humano"');
  if (strict && !l.reviewedBy.includes('subagente'))
    err('revision', `${l.status} exige reviewedBy con "subagente"`);

  // conceptos: existen y no se usan antes de su nivel
  const used = new Set([...l.concepts, ...l.exercises.flatMap((e) => e.concepts)]);
  for (const id of used) {
    const c = ctx.conceptIds.get(id);
    if (!c) {
      err('concepto-inexistente', `El concepto "${id}" no existe en concepts.json`);
    } else if (levelOrder(c.level) > levelOrder(l.level) && !(l.track && c.track === l.track)) {
      err(
        'concepto-adelantado',
        `El concepto "${id}" es del nivel ${c.level} (planta posterior) y se usa en el nivel ${l.level}`,
      );
    }
  }

  // empresas: solo del universo ficticio
  for (const id of l.companies)
    if (!ctx.companyIds.has(id))
      err('empresa-inexistente', `La empresa "${id}" no está en companies.json`);
  if (!l.historical) {
    const scanned = [
      l.title,
      l.objectives,
      l.intro,
      l.realWorld,
      l.exercises.filter((e) => e.type !== 'document_read'),
    ];
    const text = strings(scanned).join('\n');
    for (const name of ctx.realCompanies) {
      if (new RegExp(`(^|[^\\p{L}])${escapeRe(name)}([^\\p{L}]|$)`, 'u').test(text))
        err(
          'empresa-real',
          `Aparece la empresa real "${name}" fuera de document_read o de una lección histórica`,
        );
    }
  }

  // fiscalidad / normativa: fuente y fecha
  const regulated = l.exercises.some((e) =>
    e.tags.some((t) => ['fiscalidad', 'normativa'].includes(t.toLowerCase())),
  );
  if (regulated && !l.sources.length)
    err('sin-fuente', 'Contenido de fiscalidad o normativa sin sources oficiales');
  if (regulated && l.verificarAntesDe === null)
    err('sin-caducidad', 'Contenido de fiscalidad o normativa sin verificarAntesDe');

  // ejercicios
  const seen = new Set<string>();
  for (const e of l.exercises) {
    if (seen.has(e.id)) err('id-duplicado', `Ejercicio repetido en la lección: ${e.id}`, e.id);
    seen.add(e.id);
    if (!e.id.startsWith(`${l.id}-`))
      err('id-formato', `El id debería empezar por "${l.id}-"`, e.id);
    out.push(...checkExercise(e, strict));
  }
  if (l.game) out.push(...checkLessonGame(l));
  return out;
}

/**
 * Lección-juego: la explicación solo puede citar cifras que devuelve el juego, y cada ejercicio paramétrico tiene
 * que funcionar con las cifras de varias partidas de referencia (todo de golpe, trocear, esperar…).
 */
/** curriculum.json en el orden de las plantas de `floors.ts`, con la Base aparte. */
function checkFloors(c: Curriculum): Issue[] {
  const out: Issue[] = [];
  const bad = (message: string) =>
    out.push({ severity: 'error', code: 'plantas', where: 'curriculum.json', message });
  const floors = c.levels.filter((l) => !l.base);
  floors.forEach((l, i) => {
    if (l.floor !== i)
      bad(`El nivel ${l.level} está en la posición ${i} pero dice planta ${l.floor}`);
    if (levelOfFloor(i) !== l.level)
      bad(`La planta ${i} debería ser el nivel ${levelOfFloor(i)} (floors.ts) y es el ${l.level}`);
    if (!l.rank) bad(`La planta ${i} no tiene rango`);
  });
  if (floors.length !== FLOOR_COUNT)
    bad(`Hay ${floors.length} plantas y floors.ts define ${FLOOR_COUNT}`);
  for (const l of c.levels.filter((x) => x.base))
    if (l.level !== BASE_LEVEL || l.floor !== undefined)
      bad(`Solo el nivel ${BASE_LEVEL} es Base y no tiene planta`);
  return out;
}

function checkLessonGame(l: Lesson): Issue[] {
  const out: Issue[] = [];
  const game = l.game!;
  const keys = new Set(Object.keys(LESSON_GAME_FORMATS[game.kind]));
  const bad = (where: string, message: string) =>
    out.push({ severity: 'error', code: 'juego-leccion', where, message });
  for (const b of l.intro)
    if (b.type !== 'visual')
      for (const m of markersOf(b.text))
        if (!keys.has(m))
          bad(l.id, `La explicación cita {${m}}, que el juego ${game.kind} no devuelve`);
  const runs = referenceValues(game.kind, game.seed);
  for (const e of l.exercises) {
    if (!isParametric(e)) continue;
    runs.forEach((values, i) => {
      try {
        const concrete = instantiate(e, undefined, values).exercise;
        const problems = checkConcrete(concrete, true).filter((x) => x.severity === 'error');
        if (problems.length)
          bad(e.id, `Con la partida de referencia ${i + 1}: ${problems[0]!.message}`);
      } catch (x) {
        bad(e.id, `Con la partida de referencia ${i + 1}: ${(x as Error).message}`);
      }
    });
  }
  return out;
}

/** Bloom por nivel (CLAUDE.md §8): sobre lecciones reviewed/published; error con ≥4 lecciones, aviso si hay pocas. */
function checkBloom(lessons: Lesson[]): Issue[] {
  const out: Issue[] = [];
  const levels = [...new Set(lessons.filter((l) => !l.track).map((l) => l.level))];
  for (const level of levels) {
    const ls = lessons.filter(
      (l) => !l.track && l.level === level && (l.status === 'reviewed' || l.status === 'published'),
    );
    const ex = ls.flatMap((l) => l.exercises);
    if (!ex.length) continue;
    const share = (names: readonly string[]) =>
      ex.filter((e) => names.includes(e.bloom)).length / ex.length;
    const rule =
      level <= 2
        ? { names: ['recordar', 'entender'], min: 0.5, text: '≥ 50 % recordar/entender' }
        : level <= 6
          ? { names: ['aplicar', 'analizar'], min: 0.5, text: '≥ 50 % aplicar/analizar' }
          : { names: ['evaluar'], min: 0.3, text: '≥ 30 % evaluar' };
    const s = share(rule.names);
    if (s < rule.min)
      out.push({
        severity: ls.length >= 4 ? 'error' : 'warning',
        code: 'bloom',
        where: `nivel-${level}`,
        message: `Nivel ${level}: ${(s * 100).toFixed(0)} % (${rule.text}) sobre ${ls.length} lección(es)`,
      });
  }
  return out;
}

export function validateContent(b: ContentBundle): {
  issues: Issue[];
  lessons: Lesson[];
  concepts: Concept[];
  placements: Placement[];
} {
  const issues: Issue[] = [];

  const cp = conceptsSchema.safeParse(b.concepts);
  if (!cp.success) issues.push(...zodIssues('concepts.json', cp.error));
  const concepts = cp.success ? cp.data : [];
  const conceptIds = new Map(concepts.map((c) => [c.id, c]));
  const dup = concepts.map((c) => c.id).filter((id, i, a) => a.indexOf(id) !== i);
  for (const id of new Set(dup))
    issues.push({
      severity: 'error',
      code: 'id-duplicado',
      where: 'concepts.json',
      message: `Concepto repetido: ${id}`,
    });
  for (const c of concepts) {
    for (const p of c.prerequisites) {
      const pc = conceptIds.get(p);
      if (!pc)
        issues.push({
          severity: 'error',
          code: 'prerrequisito',
          where: c.id,
          message: `Prerrequisito inexistente: ${p}`,
        });
      else if (levelOrder(pc.level) > levelOrder(c.level) && !(c.track && c.track !== pc.track))
        issues.push({
          severity: 'error',
          code: 'prerrequisito-nivel',
          where: c.id,
          message: `Prerrequisito ${p} (nivel ${pc.level}) se enseña en una planta posterior a ${c.id} (nivel ${c.level})`,
        });
    }
  }
  for (const cycle of conceptCycles(concepts))
    issues.push({
      severity: 'error',
      code: 'ciclo',
      where: 'concepts.json',
      message: `Ciclo de prerrequisitos: ${cycle.join(' → ')}`,
    });

  if (b.games !== undefined) {
    const gp = gamesDataSchema.safeParse(b.games);
    if (!gp.success) issues.push(...zodIssues('games.json', gp.error));
    else {
      const g = gp.data;
      const err = (code: string, where: string, message: string) =>
        issues.push({ severity: 'error', code, where: `games.json/${where}`, message });
      const known = (ids: string[], where: string) =>
        ids
          .filter((c) => !conceptIds.has(c))
          .forEach((c) => err('concepto-inexistente', where, `El concepto "${c}" no existe`));
      known(g.presupuesto.concepts, 'presupuesto');
      known(g.impulsivo.concepts, 'impulsivo');
      known([...g.ordenes.concepts, ...g.ordenes.auctionConcepts], 'ordenes');
      const ids = [...g.presupuesto.items.map((i) => i.id), ...g.titulares.map((t) => t.id)];
      for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i)))
        err('id-duplicado', id, 'id repetido');
      for (const i of g.presupuesto.items) if (i.min > i.max) err('rango', i.id, 'min > max');
      for (const cat of ['ingreso', 'gasto', 'ahorro'] as const)
        if (g.presupuesto.items.filter((i) => i.category === cat).length < 3)
          err('presupuesto', cat, `hacen falta al menos 3 partidas de ${cat}`);
      for (const t of g.titulares) {
        known(t.concepts, t.id);
        if (new Set(t.motives).size !== 3)
          err('motivos', t.id, 'los 3 motivos deben ser distintos');
      }
    }
  }

  const co = companiesSchema.safeParse(b.companies);
  if (!co.success) issues.push(...zodIssues('companies.json', co.error));
  const companies = co.success ? co.data : [];
  for (const c of companies)
    for (const a of checkCompany(c))
      issues.push({
        severity: 'error',
        code: 'cuentas',
        where: `${a.company} ${a.year}`,
        message: a.message,
      });

  if (b.glossary !== undefined) {
    const g = glossarySchema.safeParse(b.glossary);
    if (!g.success) issues.push(...zodIssues('glossary.json', g.error));
    else {
      const seenId = new Set<string>();
      const seenTerm = new Set<string>();
      for (const e of g.data) {
        const bad = (code: string, message: string) =>
          issues.push({ severity: 'error', code, where: `glossary.json › ${e.id}`, message });
        if (seenId.has(e.id)) bad('id-duplicado', `Término repetido: ${e.id}`);
        seenId.add(e.id);
        for (const t of [e.term, ...e.aliases].map((x) => x.toLowerCase())) {
          if (seenTerm.has(t))
            bad('termino-duplicado', `"${t}" aparece en más de un término o alias`);
          seenTerm.add(t);
        }
        for (const c of e.concepts)
          if (!conceptIds.has(c)) bad('concepto-inexistente', `Concepto inexistente: ${c}`);
        const words = e.definition.trim().split(/\s+/).length;
        if (words > 60)
          bad('definicion-larga', `La definición tiene ${words} palabras; el máximo es 60`);
        if (e.status === 'published' && !e.reviewedBy.includes('humano'))
          bad('revision', 'published exige reviewedBy con "humano"');
        if (e.status === 'reviewed' && !e.reviewedBy.includes('subagente'))
          bad('revision', 'reviewed exige reviewedBy con "subagente"');
        for (const a of e.aliases)
          if (a.trim().split(/\s+/).length === 1 && a.length < 5)
            bad('alias-ambiguo', `El alias "${a}" es demasiado corto y daría falsos positivos`);
      }
    }
  }
  if (b.curriculum !== undefined) {
    const c = curriculumSchema.safeParse(b.curriculum);
    if (!c.success) issues.push(...zodIssues('curriculum.json', c.error));
    else {
      for (const u of c.data.levels.flatMap((l) => l.units).flatMap((u) => u.concepts))
        if (!conceptIds.has(u))
          issues.push({
            severity: 'error',
            code: 'concepto-inexistente',
            where: 'curriculum.json',
            message: `Concepto inexistente en el curriculum: ${u}`,
          });
      issues.push(...checkFloors(c.data));
    }
  }

  const ctx = {
    conceptIds,
    companyIds: new Set(companies.map((c) => c.id)),
    realCompanies: b.realCompanies ?? [],
  };
  const lessons: Lesson[] = [];
  for (const f of b.lessons) {
    const r = lessonSchema.safeParse(f.data);
    if (!r.success) {
      issues.push(...zodIssues(f.path, r.error));
      continue;
    }
    lessons.push(r.data);
    issues.push(
      ...checkLesson(r.data, ctx).map((i) => ({ ...i, where: `${f.path} › ${i.where}` })),
    );
  }

  const placements: Placement[] = [];
  const unitConcepts = new Map<string, string[]>();
  if (b.curriculum !== undefined) {
    const cur = curriculumSchema.safeParse(b.curriculum);
    if (cur.success)
      for (const u of cur.data.levels.flatMap((l) => l.units)) unitConcepts.set(u.id, u.concepts);
  }
  for (const f of b.placements ?? []) {
    const r = placementSchema.safeParse(f.data);
    if (!r.success) {
      issues.push(...zodIssues(f.path, r.error));
      continue;
    }
    const pl = r.data;
    placements.push(pl);
    const bad = (code: string, message: string, where = f.path) =>
      issues.push({ severity: 'error', code, where, message });
    if (pl.status === 'published' && !pl.reviewedBy.includes('humano'))
      bad('revision', 'published exige reviewedBy con "humano"');
    if (pl.status === 'reviewed' && !pl.reviewedBy.includes('subagente'))
      bad('revision', 'reviewed exige reviewedBy con "subagente"');
    const expected = unitConcepts.get(pl.unitId);
    if (!expected)
      bad('unidad-inexistente', `La unidad "${pl.unitId}" no existe en curriculum.json`);
    const seen = new Set<string>();
    pl.questions.forEach((q, i) => {
      issues.push(
        ...checkExercise(q, true).map((x) => ({ ...x, where: `${f.path} › ${x.where}` })),
      );
      if (!q.id.startsWith(`salto-${pl.unitId}-`))
        bad('id-formato', `El id debería empezar por "salto-${pl.unitId}-"`, `${f.path} › ${q.id}`);
      for (const id of q.concepts) {
        seen.add(id);
        if (!conceptIds.has(id))
          bad('concepto-inexistente', `Concepto inexistente: ${id}`, `${f.path} › ${q.id}`);
        else if (expected && !expected.includes(id))
          bad(
            'concepto-ajeno',
            `El concepto "${id}" no pertenece a la unidad ${pl.unitId}`,
            `${f.path} › ${q.id}`,
          );
      }
      if (new Set(pl.questions.map((x) => x.id)).size !== pl.questions.length && i === 0)
        bad('id-duplicado', 'Hay ids de pregunta repetidos');
    });
    for (const c of expected ?? [])
      if (!seen.has(c))
        bad(
          'concepto-sin-cubrir',
          `Ninguna pregunta evalúa el concepto "${c}" de la unidad ${pl.unitId}`,
        );
    // contenido de las preguntas: sin empresas reales
    const text = strings(pl.questions).join('\n');
    for (const name of b.realCompanies ?? [])
      if (new RegExp(`(^|[^\\p{L}])${escapeRe(name)}([^\\p{L}]|$)`, 'u').test(text))
        bad('empresa-real', `Aparece la empresa real "${name}" en un test de salto`);
    if (pl.sources.length === 0 && pl.verificarAntesDe !== null)
      bad('caducidad-sin-fuente', 'verificarAntesDe sin sources');
  }

  // ids únicos entre lecciones y ejercicios
  const ids = new Map<string, string>();
  for (const l of lessons) {
    for (const id of [l.id, ...l.exercises.map((e) => e.id)]) {
      if (ids.has(id) && id !== l.id)
        issues.push({
          severity: 'error',
          code: 'id-duplicado',
          where: id,
          message: `Id repetido (también en ${ids.get(id)})`,
        });
      else if (ids.has(id) && id === l.id)
        issues.push({
          severity: 'error',
          code: 'id-duplicado',
          where: id,
          message: `Lección repetida (también en ${ids.get(id)})`,
        });
      ids.set(id, l.id);
    }
  }
  for (const pl of placements) {
    for (const id of [pl.id, ...pl.questions.map((q) => q.id)]) {
      if (ids.has(id))
        issues.push({
          severity: 'error',
          code: 'id-duplicado',
          where: id,
          message: `Id repetido (también en ${ids.get(id)})`,
        });
      ids.set(id, pl.id);
    }
  }
  // ids estables: lo ya publicado nunca desaparece (se retira con status "retired")
  for (const [id, status] of Object.entries(b.idsLock ?? {})) {
    if (!ids.has(id) && status !== 'retired')
      issues.push({
        severity: 'error',
        code: 'id-desaparecido',
        where: id,
        message:
          'Un id publicado ha desaparecido; los ids son inmutables: usa status "retired" en vez de borrar',
      });
  }

  issues.push(...checkBloom(lessons));
  return { issues, lessons, concepts, placements };
}

/** id → status de lo que ya está reviewed/published, para escribir ids-lock.json. */
export function buildIdsLock(
  lessons: Lesson[],
  placements: Placement[] = [],
): Record<string, string> {
  const lock: Record<string, string> = {};
  for (const l of lessons) {
    if (l.status === 'draft') continue;
    lock[l.id] = l.status;
    for (const e of l.exercises) lock[e.id] = l.status;
  }
  for (const p of placements) {
    if (p.status === 'draft') continue;
    lock[p.id] = p.status;
    for (const q of p.questions) lock[q.id] = p.status;
  }
  return Object.fromEntries(Object.entries(lock).sort(([a], [b]) => a.localeCompare(b)));
}

export interface Expiry {
  id: string;
  kind: 'vencido' | 'proximo';
  date: string;
  daysLeft: number;
}

/** content:check: verificarAntesDe vencido o dentro de `windowDays` días. */
export function findExpiring(
  items: { id: string; verificarAntesDe: string | null }[],
  today: string,
  windowDays = 30,
): Expiry[] {
  const day = 86_400_000;
  const out: Expiry[] = [];
  for (const i of items) {
    if (!i.verificarAntesDe) continue;
    const left = Math.round((Date.parse(i.verificarAntesDe) - Date.parse(today)) / day);
    if (left < 0) out.push({ id: i.id, kind: 'vencido', date: i.verificarAntesDe, daysLeft: left });
    else if (left <= windowDays)
      out.push({ id: i.id, kind: 'proximo', date: i.verificarAntesDe, daysLeft: left });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
