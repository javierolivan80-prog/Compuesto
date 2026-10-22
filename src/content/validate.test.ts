import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkCompany } from './accounting';
import { loadContent } from './node-loader';
import { companiesSchema, EXERCISE_TYPES, exerciseSchema, lessonSchema } from './schemas';
import {
  buildIdsLock,
  checkExercise,
  conceptCycles,
  findExpiring,
  resolveModelPath,
  staleModelRefs,
  validateContent,
  type ContentBundle,
} from './validate';

const fixture = (n: string): unknown =>
  JSON.parse(readFileSync(`tests/fixtures/content/${n}.json`, 'utf8'));
const base = loadContent();
const bundle = (lessons: unknown[], extra: Partial<ContentBundle> = {}): ContentBundle => ({
  ...base,
  lessons: lessons.map((data, i) => ({ path: `fixture-${i}.json`, data })),
  placements: [],
  idsLock: {},
  ...extra,
});
const codes = (r: ReturnType<typeof validateContent>) =>
  r.issues.filter((i) => i.severity === 'error').map((i) => i.code);

describe('contenido real del repositorio', () => {
  it('pasa la validación (conceptos, empresas, curriculum, glosario)', () => {
    const r = validateContent(base);
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(r.concepts.length).toBeGreaterThan(200);
  });
  it('el mapa de conceptos cubre todos los niveles y las 4 ramas, sin ciclos', () => {
    const { concepts } = validateContent(base);
    for (let l = 0; l <= 9; l++)
      expect(
        concepts.some((c) => c.level === l && !c.track),
        `nivel ${l}`,
      ).toBe(true);
    expect(new Set(concepts.filter((c) => c.track).map((c) => c.track)).size).toBe(4);
    expect(conceptCycles(concepts)).toEqual([]);
  });
  it('N0–N1 llevan el detalle completo (descripción y unidad); del resto, solo los de unidades ya escritas', () => {
    const { concepts } = validateContent(base);
    for (const c of concepts.filter((c) => c.level <= 1 && !c.track)) {
      expect(c.description, c.id).toBeTruthy();
      expect(c.unit, c.id).toMatch(/^n[01]-u\d$/);
    }
    const units = new Set(
      (base.curriculum as { levels: { units: { id: string; concepts: string[] }[] }[] }).levels
        .flatMap((l) => l.units)
        .flatMap((u) => u.concepts),
    );
    for (const c of concepts.filter((c) => c.level >= 2)) {
      if (units.has(c.id)) expect(c.description && c.unit, c.id).toBeTruthy();
      else expect(c.description, c.id).toBeFalsy();
    }
  });
  it('el curriculum de N0 y N1 enlaza con conceptos existentes', () => {
    const cur = base.curriculum as { levels: { level: number; units: { concepts: string[] }[] }[] };
    expect(cur.levels.find((l) => l.level === 0)!.units.length).toBeGreaterThanOrEqual(5);
    expect(
      cur.levels.find((l) => l.level === 1)!.units.flatMap((u) => u.concepts).length,
    ).toBeGreaterThan(20);
  });
});

describe('lección de ejemplo válida y lecciones inválidas', () => {
  it('acepta la lección válida sin errores', () => {
    const r = validateContent(bundle([fixture('valid-lesson')]));
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(r.lessons).toHaveLength(1);
  });

  it('rechaza la inválida con mensajes claros', () => {
    const r = validateContent(bundle([fixture('invalid-lesson')]));
    const errors = r.issues.filter((i) => i.severity === 'error');
    const msg = errors.map((e) => e.message).join('\n');
    expect(new Set(codes(r))).toEqual(
      new Set([
        'revision', // published sin "humano"
        'concepto-inexistente', // no-existe
        'concepto-adelantado', // dcf (nivel 3) en nivel 1
        'empresa-inexistente', // empresa-fantasma
        'empresa-real', // Inditex
        'formula', // 1000 ≠ 1001
        'huecos', // 2 huecos, 1 respuesta
        'indice', // answer 5 con 3 opciones
        'falta-explicacion-erronea', // published exige explicar cada opción incorrecta
      ]),
    );
    expect(msg).toContain('published exige reviewedBy con "humano"');
    expect(msg).toContain('"100 * 10 * (1 + 0.001)" da 1001, no 1000');
    expect(msg).toContain(
      'El concepto "dcf" es del nivel 3 (planta posterior) y se usa en el nivel 1',
    );
    expect(msg).toContain('Aparece la empresa real "Inditex"');
    expect(msg).toContain('2 hueco(s) (___) y 1 respuesta(s)');
    expect(msg).toContain('answer 5 fuera de las 3 opciones');
    // cada error dice en qué archivo y ejercicio está
    expect(errors.every((e) => e.where.startsWith('fixture-0.json'))).toBe(true);
  });

  it('rechaza lecciones con menos de 6 ejercicios y con mezcla fuera de rango', () => {
    const r = validateContent(bundle([fixture('invalid-count-lesson')]));
    expect(r.issues.map((i) => i.message).join('\n')).toContain(
      'entre 6 y 10 ejercicios; esta tiene 5',
    );
    const onlyMc = JSON.parse(JSON.stringify(fixture('valid-lesson')));
    onlyMc.exercises = onlyMc.exercises
      .slice(0, 1)
      .concat(onlyMc.exercises.slice(0, 1))
      .map((e: { id: string }, i: number) => ({ ...e, id: `n1-u4-l2-m${i}` }));
    const r2 = validateContent(bundle([onlyMc]));
    expect(codes(r2)).toContain('mezcla');
  });

  it('rechaza ids repetidos entre lecciones y una lección que rompe el esquema', () => {
    const l = fixture('valid-lesson');
    expect(codes(validateContent(bundle([l, l])))).toContain('id-duplicado');
    const broken = { ...(l as object), status: 'listo', exercises: [] };
    const r = validateContent(bundle([broken]));
    expect(codes(r)).toEqual(['esquema', 'esquema']);
    expect(r.issues[0]!.message).toMatch(/status|exercises/);
  });

  it('published con revisión humana y de subagente es válida; la empresa real se permite en una lección histórica', () => {
    const l = JSON.parse(JSON.stringify(fixture('valid-lesson')));
    l.status = 'published';
    l.reviewedBy = ['subagente', 'humano'];
    expect(codes(validateContent(bundle([l])))).toEqual([]);
    l.exercises[1].statement = 'Lehman Brothers quebró en 2008.';
    expect(codes(validateContent(bundle([l])))).toContain('empresa-real');
    l.historical = true;
    expect(codes(validateContent(bundle([l])))).toEqual([]);
  });

  it('un id publicado que desaparece es un error (los ids son inmutables)', () => {
    const l = fixture('valid-lesson') as { id: string };
    expect(
      codes(
        validateContent(
          bundle([l], {
            idsLock: { 'n1-u4-l2': 'published', 'n1-u9-l9': 'published', 'x-retirada': 'retired' },
          }),
        ),
      ),
    ).toEqual(['id-desaparecido']);
    expect(buildIdsLock([lessonSchema.parse(l)])['n1-u4-l2']).toBe('reviewed');
  });

  it('fiscalidad sin fuente ni caducidad es un error', () => {
    const l = JSON.parse(JSON.stringify(fixture('valid-lesson')));
    l.exercises[0].tags = ['fiscalidad'];
    expect(codes(validateContent(bundle([l])))).toEqual(['sin-fuente', 'sin-caducidad']);
    l.sources = [
      { title: 'AEAT', url: 'https://sede.agenciatributaria.gob.es/', date: '2026-01-01' },
    ];
    l.verificarAntesDe = '2027-01-31';
    expect(codes(validateContent(bundle([l])))).toEqual([]);
  });
});

describe('mapa de conceptos', () => {
  const mk = (extra: object[]): ContentBundle => ({
    ...base,
    concepts: [
      { id: 'a', name: 'A', level: 0, prerequisites: ['b'] },
      { id: 'b', name: 'B', level: 0, prerequisites: ['a'] },
      ...extra,
    ],
    lessons: [],
  });
  it('detecta ciclos, prerrequisitos inexistentes y prerrequisitos de un nivel posterior', () => {
    const r = validateContent(
      mk([
        { id: 'c', name: 'C', level: 0, prerequisites: ['zzz'] },
        { id: 'd', name: 'D', level: 0, prerequisites: ['e'] },
        { id: 'e', name: 'E', level: 3, prerequisites: [] },
      ]),
    );
    const msgs = r.issues.map((i) => i.message).join('\n');
    expect(msgs).toContain('Ciclo de prerrequisitos: a → b → a');
    expect(msgs).toContain('Prerrequisito inexistente: zzz');
    expect(msgs).toContain(
      'Prerrequisito e (nivel 3) se enseña en una planta posterior a d (nivel 0)',
    );
  });
});

describe('los 19 tipos de ejercicio', () => {
  it('el esquema define exactamente los 19 tipos del TEMARIO §6', () => {
    expect(EXERCISE_TYPES).toHaveLength(19);
    expect(new Set(EXERCISE_TYPES).size).toBe(19);
  });
});

describe('numeric_input y spreadsheet: la fórmula se evalúa y se compara', () => {
  const lesson = (ex: object) => {
    const l = JSON.parse(JSON.stringify(fixture('valid-lesson')));
    l.exercises[2] = { ...l.exercises[2], ...ex };
    return validateContent(bundle([l]));
  };
  it('tolerancia: una respuesta redondeada necesita tolerance > 0', () => {
    const f = '1000 / 3';
    expect(codes(lesson({ answer: 333.33, formula: f, tolerance: 0 }))).toContain('formula');
    expect(codes(lesson({ answer: 333.33, formula: f, tolerance: 0.01 }))).toEqual([]);
  });
  it('fórmula ilegible o peligrosa → error, no excepción', () => {
    expect(codes(lesson({ formula: '1 +' }))).toContain('formula');
    expect(codes(lesson({ formula: 'process.exit(1)' }))).toContain('formula');
  });
  it('spreadsheet: la solución con referencias de celda da el valor esperado', () => {
    const ss = {
      id: 'n1-u4-l2-e3',
      type: 'spreadsheet',
      difficulty: 2,
      bloom: 'aplicar',
      tags: [],
      concepts: ['comisiones'],
      explanation: 'Suma y comisión.',
      prompt: 'Calcula el total con comisión.',
      cells: { A1: 1000, A2: '=A1*0.001', A3: '' },
      target: 'A3',
      solution: 'A1 + A2',
      expected: 1001,
      tolerance: 0,
    };
    expect(codes(lesson(ss))).toEqual([]);
    expect(codes(lesson({ ...ss, expected: 1002 }))).toContain('formula');
  });
});

describe('companies.json: cuentas coherentes de 5 años', () => {
  const companies = companiesSchema.parse(base.companies);
  it('hay 7 empresas ficticias, incluida Naranjas del Turia, con 5 años', () => {
    expect(companies).toHaveLength(7);
    expect(companies.map((c) => c.id)).toContain('naranjas-del-turia');
    for (const c of companies)
      expect(c.years.map((y) => y.year)).toEqual([2021, 2022, 2023, 2024, 2025]);
  });
  for (const c of companies) {
    it(`${c.name}: activo = pasivo + patrimonio cada año`, () => {
      for (const y of c.years)
        expect(y.balance.total_activo, `${y.year}`).toBe(
          y.balance.total_pasivo + y.balance.total_patrimonio,
        );
    });
    it(`${c.name}: el flujo de caja reconcilia la variación de caja`, () => {
      c.years.forEach((y, i) => {
        expect(y.flujos.variacion_caja).toBe(
          y.flujos.operativo + y.flujos.inversion + y.flujos.financiacion,
        );
        const prev = c.years[i - 1];
        if (prev)
          expect(y.balance.caja - prev.balance.caja, `${y.year}`).toBe(y.flujos.variacion_caja);
      });
    });
    it(`${c.name}: la PyG enlaza con el patrimonio (reservas = previas + resultado − dividendos)`, () => {
      c.years.forEach((y, i) => {
        const prev = c.years[i - 1];
        if (prev)
          expect(y.balance.reservas, `${y.year}`).toBe(
            prev.balance.reservas + y.pyg.resultado_neto - y.dividendos,
          );
      });
    });
    it(`${c.name}: sin ningún aviso contable`, () => {
      expect(checkCompany(c)).toEqual([]);
    });
  }
  it('detecta cuentas que no cuadran', () => {
    const broken = JSON.parse(JSON.stringify(companies[0]));
    broken.years[2].balance.caja += 1;
    const msgs = checkCompany(broken)
      .map((m) => m.message)
      .join('\n');
    expect(msgs).toContain('Total activo ≠ suma de sus partidas');
    expect(msgs).toContain('no reconcilia');
  });
});

describe('content:check (caducidades)', () => {
  const items = [
    { id: 'a', verificarAntesDe: '2026-09-30' },
    { id: 'b', verificarAntesDe: '2026-11-01' },
    { id: 'c', verificarAntesDe: '2027-06-30' },
    { id: 'd', verificarAntesDe: null },
  ];
  it('separa vencidos y próximos (30 días) y ordena por urgencia', () => {
    expect(findExpiring(items, '2026-10-15', 30)).toEqual([
      { id: 'a', kind: 'vencido', date: '2026-09-30', daysLeft: -15 },
      { id: 'b', kind: 'proximo', date: '2026-11-01', daysLeft: 17 },
    ]);
    expect(findExpiring(items, '2026-10-15', 5)).toHaveLength(1);
  });
});

describe('reglas de la teoría y de los explicadores', () => {
  const lessonWith = (patch: (l: { intro: object[] }) => void) => {
    const l = JSON.parse(JSON.stringify(fixture('valid-lesson')));
    patch(l);
    return validateContent(bundle([l]));
  };
  const card = (text: string) => ({ type: 'card', text });
  it('máximo 3 tarjetas antes de la primera pregunta', () => {
    const r = lessonWith((l) => (l.intro = [card('a'), card('b'), card('c'), card('d')]));
    expect(codes(r)).toEqual(['intro-larga']);
  });
  it('máximo 60 palabras por tarjeta', () => {
    const long = Array.from({ length: 61 }, (_, i) => `palabra${i}`).join(' ');
    expect(
      lessonWith((l) => (l.intro = [card(long)]))
        .issues.map((i) => i.message)
        .join(),
    ).toContain('tiene 61 palabras');
    expect(
      codes(lessonWith((l) => (l.intro = [card(long.split(' ').slice(0, 60).join(' '))]))),
    ).toEqual([]);
  });
  it('el explicador debe existir y recibir props válidas', () => {
    const visual = (component: string, props: object) => ({ type: 'visual', component, props });
    expect(codes(lessonWith((l) => (l.intro = [visual('NoExiste', {})])))).toEqual([
      'explicador-inexistente',
    ]);
    expect(codes(lessonWith((l) => (l.intro = [visual('Rule72', { rate: 6 })])))).toEqual([]);
    const bad = lessonWith((l) => (l.intro = [visual('Rule72', { rate: 'seis' })]));
    expect(codes(bad)).toEqual(['explicador-props']);
    expect(bad.issues[0]!.message).toContain('rate');
  });
});

describe('Unidad 1 del Nivel 0 (contenido real)', () => {
  const { lessons: all, issues } = validateContent(base);
  const lessons = all.filter((l) => l.level === 0 && l.unit === 1);
  it('tiene 5 lecciones en estado reviewed, sin errores ni avisos', () => {
    expect(lessons.map((l) => l.id)).toEqual([
      'n0-u1-l1',
      'n0-u1-l2',
      'n0-u1-l3',
      'n0-u1-l4',
      'n0-u1-l5',
    ]);
    // los bancos de salto antiguos (8 preguntas) solo avisan hasta ampliarlos (tarea 2.12)
    expect(issues.filter((i) => i.code !== 'banco-antiguo')).toEqual([]);
    for (const l of lessons) {
      expect(l.status).toBe('reviewed');
      expect(l.reviewedBy).toEqual(['subagente']); // nunca "humano" hasta que Javier lo revise
      expect(l.exercises.length).toBeGreaterThanOrEqual(6);
    }
  });
  it('solo usa los tipos 1–8', () => {
    const allowed = [
      'multiple_choice',
      'multi_select',
      'true_false_swipe',
      'match_pairs',
      'fill_blank',
      'order_steps',
      'numeric_input',
      'categorize',
      'build_statement',
      'spreadsheet',
      'chart_read',
      'scenario',
      'spot_the_error',
      'slider_estimate',
      'case_step',
      'document_read',
      'best_argument',
      'self_explain',
    ];
    for (const e of lessons.flatMap((l) => l.exercises)) expect(allowed).toContain(e.type);
  });
  it('usa los 3 explicadores y cada lección tiene Dónde verás esto', () => {
    const used = lessons
      .flatMap((l) => l.intro)
      .filter((b) => b.type === 'visual')
      .map((b) => (b as { component: string }).component);
    expect(new Set(used)).toEqual(new Set(['CompoundCurve', 'InflationCart', 'Rule72']));
    for (const l of lessons) expect(l.realWorld, l.id).toBeTruthy();
  });
  it('en conjunto cumple el Bloom del nivel 0 (≥ 50 % recordar/entender)', () => {
    const ex = lessons.flatMap((l) => l.exercises);
    expect(
      ex.filter((e) => ['recordar', 'entender'].includes(e.bloom)).length / ex.length,
    ).toBeGreaterThanOrEqual(0.5);
  });
});

describe('tests de salto (validación)', () => {
  const real = JSON.parse(readFileSync('content/es/placement/n0-u2.json', 'utf8'));
  const withPlacement = (patch: (p: typeof real) => void) => {
    const p = JSON.parse(JSON.stringify(real));
    patch(p);
    return validateContent({
      ...base,
      lessons: [],
      idsLock: {},
      placements: [{ path: 'p.json', data: p }],
    });
  };
  const placementCodes = (r: ReturnType<typeof validateContent>) =>
    r.issues.filter((i) => i.severity === 'error').map((i) => i.code);

  it('acepta un banco real y detecta que fue revisado', () => {
    const r = withPlacement(() => {});
    expect(placementCodes(r)).toEqual([]);
    expect(r.placements).toHaveLength(1);
  });
  it('exige 12 preguntas (u 8 en un banco antiguo, que solo avisa)', () => {
    const r = withPlacement((p) => p.questions.pop());
    expect(placementCodes(r)).toEqual(['esquema']);
    expect(r.issues[0]!.message).toContain('12 preguntas');
    expect(
      withPlacement((p) => (p.questions = p.questions.slice(0, 8))).issues.map((i) => i.code),
    ).toContain('banco-antiguo');
  });
  it('un banco de 12 exige ≥ 50 % de producir y que la primera fase cubra todos los conceptos', () => {
    type Q = (typeof real)['questions'][number];
    const fill = (q: Q, i: number) => ({
      id: `${q.id}-p${i}`,
      type: 'fill_blank' as const,
      difficulty: 1,
      bloom: 'recordar' as const,
      tags: [],
      concepts: q.concepts,
      prompt: 'Rellena: ___',
      answers: [['x']],
      explanation: 'x',
    });
    // 8 originales (reconocer) + 4 de producir: 4/12 < 50 %
    const r = withPlacement((p) => {
      // 12 preguntas con solo 4 de producir: las demás pasan a verdadero/falso
      let produce = 0;
      p.questions = p.questions.map((q: Q, i: number) => {
        if (['multiple_choice', 'true_false_swipe', 'multi_select'].includes(q.type)) return q;
        if (++produce <= 4) return q;
        return {
          ...fill(q, i),
          type: 'true_false_swipe',
          statement: 'Afirmación',
          answer: true,
          prompt: undefined,
          answers: undefined,
        };
      });
    });
    expect(placementCodes(r)).toEqual(['mezcla']);
    expect(r.issues.map((i) => i.code)).not.toContain('banco-antiguo');
    // 6 de producir en la primera fase y 4 en la segunda: vale
    const ok = withPlacement((p) => {
      p.questions = p.questions.slice(0, 8);
      const extra = p.questions.slice(0, 4).map(fill);
      p.questions = [...p.questions.slice(0, 2), ...p.questions.slice(2).map(fill), ...extra];
    });
    expect(placementCodes(ok)).toEqual([]);
    // si un concepto solo aparece en la segunda fase, falla
    const late = withPlacement((p) => {
      p.questions = p.questions.slice(0, 8);
      const extra = p.questions.map(fill);
      p.questions = [
        ...extra
          .slice(0, 8)
          .map((q: ReturnType<typeof fill>) => ({ ...q, concepts: [p.questions[0].concepts[0]] })),
        ...extra.slice(0, 4),
      ];
    });
    expect(placementCodes(late)).toContain('concepto-sin-cubrir');
  });
  it('una pregunta con un concepto de otra unidad es un error, y todo concepto de la unidad debe estar cubierto', () => {
    const r = withPlacement((p) => (p.questions[0].concepts = ['inflacion']));
    expect(placementCodes(r)).toEqual(['concepto-ajeno', 'concepto-sin-cubrir']);
  });
  it('published exige revisión humana; la unidad debe existir; el id debe llevar el prefijo de la unidad', () => {
    expect(
      placementCodes(
        withPlacement((p) => ((p.status = 'published'), (p.reviewedBy = ['subagente']))),
      ),
    ).toEqual(['revision']);
    expect(placementCodes(withPlacement((p) => (p.unitId = 'n9-u9')))).toContain(
      'unidad-inexistente',
    );
    expect(placementCodes(withPlacement((p) => (p.questions[2].id = 'otra-cosa')))).toContain(
      'id-formato',
    );
  });
  it('ids de pregunta repetidos y lock de ids estables', () => {
    expect(placementCodes(withPlacement((p) => (p.questions[1].id = p.questions[0].id)))).toContain(
      'id-duplicado',
    );
    const lock = { 'salto-n0-u2-q1': 'published', 'salto-n0-u9-q1': 'published' };
    const r = validateContent({
      ...base,
      lessons: [],
      idsLock: lock,
      placements: [{ path: 'p.json', data: real }],
    });
    expect(placementCodes(r)).toEqual(['id-desaparecido']);
  });
  it('un test de salto sin fuente no puede llevar fecha de verificación', () => {
    expect(
      placementCodes(withPlacement((p) => ((p.sources = []), (p.verificarAntesDe = '2027-01-01')))),
    ).toEqual(['caducidad-sin-fuente']);
  });
});

describe('ejercicios paramétricos (tarea 2.9)', () => {
  const good = {
    id: 'pv-num',
    type: 'numeric_input',
    difficulty: 2,
    bloom: 'aplicar',
    concepts: ['interes-compuesto'],
    prompt: 'Depositas {capital} € al {tipo} % durante un año. ¿Cuánto tendrás?',
    answer: 1050,
    tolerance: 0,
    formula: '{capital} * (1 + {tipo}/100)',
    params: {
      capital: { value: 1000, min: 500, max: 5000, step: 500 },
      tipo: { value: 5, min: 1, max: 9, step: 1 },
    },
    explanation: 'Tendrás {answer} €.',
  };
  const check = (x: unknown) =>
    checkExercise(exerciseSchema.parse(x), true).filter((i) => i.severity === 'error');
  const messages = (x: unknown) => check(x).map((i) => `${i.code}: ${i.message}`);

  it('un ejercicio paramétrico correcto pasa (plantilla y 100 variantes)', () => {
    expect(check(good)).toEqual([]);
  });
  it('la plantilla sigue comprobando la respuesta del enunciado', () => {
    expect(messages({ ...good, answer: 1051 }).join()).toMatch(/formula/);
  });
  it('marcador sin definir en texto o fórmula', () => {
    expect(messages({ ...good, prompt: 'Depositas {capitall} € al {tipo} %.' }).join()).toMatch(
      /params: Marcador sin definir en el texto: \{capitall\}/,
    );
    expect(messages({ ...good, formula: '{capital}*(1+{tasa}/100)' }).join()).toMatch(
      /Marcador sin definir en una fórmula: \{tasa\}/,
    );
  });
  it('{answer} no vale en el enunciado (lo revelaría), sí en la explicación', () => {
    expect(messages({ ...good, prompt: `${good.prompt} ({answer})` }).join()).toMatch(/\{answer\}/);
  });
  it('value fuera de la rejilla, min ≥ max y parámetro sin usar', () => {
    expect(
      messages({
        ...good,
        params: { ...good.params, tipo: { value: 5.5, min: 1, max: 9, step: 1 } },
      }).join(),
    ).toMatch(/rejilla/);
    expect(
      messages({
        ...good,
        params: { ...good.params, tipo: { value: 5, min: 9, max: 1, step: 1 } },
      }).join(),
    ).toMatch(/min debe ser menor/);
    expect(
      messages({
        ...good,
        params: { ...good.params, extra: { value: 1, min: 1, max: 2, step: 1 } },
      }).join(),
    ).toMatch(/extra no se usa/);
  });
  it('ningún parámetro puede variar → error', () => {
    expect(
      messages({
        ...good,
        params: {
          capital: { value: 1000, min: 1000, max: 1000.5, step: 1 },
          tipo: { value: 5, min: 5, max: 5.5, step: 1 },
        },
      }).join(),
    ).toMatch(/Ningún parámetro admite otra cifra/);
  });
  it('fórmula que se rompe con alguna cifra del rango (división por cero) → error con la semilla', () => {
    expect(
      messages({
        ...good,
        answer: 1000 / 5,
        formula: '{capital} / ({tipo} - 3)',
        params: { ...good.params, tipo: { value: 8, min: 1, max: 9, step: 1 } },
        answerRange: undefined,
      }).join(),
    ).toMatch(/Semilla "validate#\d+"/);
  });
  it('answerRange: alguna variante fuera → error', () => {
    expect(messages({ ...good, answerRange: { min: 0, max: 2000 } }).join()).toMatch(/answerRange/);
    expect(check({ ...good, answerRange: { min: 0, max: 100000 } })).toEqual([]);
  });
  it('build_statement: la fórmula de cada fila debe dar su value; las variantes deben cuadrar', () => {
    const bs = {
      id: 'pv-bs',
      type: 'build_statement',
      difficulty: 2,
      bloom: 'aplicar',
      concepts: ['balance'],
      statement: 'balance',
      prompt: 'Caja de {caja}.',
      params: { caja: { value: 100, min: 50, max: 200, step: 10 } },
      sections: [
        {
          name: 'Activo',
          side: 'activo',
          rows: [{ label: 'Caja', value: 100, formula: '{caja}' }],
        },
        {
          name: 'Patrimonio',
          side: 'patrimonio',
          rows: [{ label: 'Capital', value: 100, blank: true, formula: '{caja}' }],
        },
      ],
      explanation: 'Cuadra.',
    };
    expect(check(bs)).toEqual([]);
    const wrongRow = structuredClone(bs);
    wrongRow.sections[1]!.rows[0]!.formula = '{caja} + 1';
    expect(messages(wrongRow).join()).toMatch(/Fila "Capital": la fórmula da 101/);
    const unbalanced = structuredClone(bs);
    unbalanced.sections[1]!.rows[0]!.formula = '{caja} * 0 + 100';
    expect(messages(unbalanced).join()).toMatch(/Semilla .*balance no cuadra/);
  });
  it('spreadsheet: la solución se evalúa en las variantes', () => {
    const ss = {
      id: 'pv-ss',
      type: 'spreadsheet',
      difficulty: 2,
      bloom: 'aplicar',
      concepts: ['porcentajes'],
      prompt: 'IVA de {precio} €.',
      cells: { B1: '{precio}' },
      target: 'B2',
      solution: '=B1*1.21',
      expected: 121,
      params: { precio: { value: 100, min: 50, max: 300, step: 10 } },
      explanation: 'Precio × 1,21.',
    };
    expect(check(ss)).toEqual([]);
    expect(messages({ ...ss, solution: '=B1/(B1-150)', expected: 100 / -50 }).join()).toMatch(
      /Semilla/,
    );
  });
});

describe('modelRef contra los modelos de referencia (tarea 2.10)', () => {
  const dcf = JSON.parse(
    readFileSync('content/shared/models/naranjas-del-turia-dcf.json', 'utf8'),
  ) as { version: number; valuation: { gordon: { pricePerShare: number } } };
  const price = dcf.valuation.gordon.pricePerShare;
  /** La lección válida con su tercer ejercicio (numérico) atado al precio por acción del DCF. */
  const withRef = (
    ref: Record<string, unknown>,
    answer = Math.round(price * 100) / 100,
    status?: string,
  ) => {
    const l = structuredClone(fixture('valid-lesson')) as {
      status: string;
      reviewedBy: string[];
      exercises: Record<string, unknown>[];
    };
    const e = l.exercises[2]!;
    delete e.params;
    delete e.derived;
    Object.assign(e, { answer, tolerance: 0.5, modelRef: ref });
    if (status) Object.assign(l, { status, reviewedBy: ['subagente', 'humano'] });
    return l;
  };
  const ok = {
    model: 'naranjas-del-turia-dcf',
    path: 'valuation.gordon.pricePerShare',
    version: 1,
  };
  const refCodes = (l: unknown) =>
    codes(validateContent(bundle([l]))).filter((c) => c.startsWith('modelref'));

  it('los modelos del repositorio pasan el esquema y una cifra correcta no da error', () => {
    expect(codes(validateContent(base)).filter((c) => c.startsWith('modelref'))).toEqual([]);
    expect(refCodes(withRef(ok))).toEqual([]);
  });
  it('ruta inexistente', () => {
    expect(refCodes(withRef({ ...ok, path: 'valuation.gordon.noExiste' }))).toEqual([
      'modelref-ruta',
    ]);
    expect(refCodes(withRef({ ...ok, path: 'fcff.99.fcff' }))).toEqual(['modelref-ruta']);
  });
  it('cifra desviada (y la escala y la tolerancia propias)', () => {
    expect(refCodes(withRef(ok, price * 1.1))).toEqual(['modelref-cifra']);
    expect(refCodes(withRef({ ...ok, scale: 100 }, Math.round(price * 100)))).toEqual([]);
    expect(refCodes(withRef({ ...ok, tolerance: 20 }, price * 1.1))).toEqual([]);
  });
  it('modelo inexistente, versión futura y modelo en draft desde un ejercicio publicado', () => {
    expect(refCodes(withRef({ ...ok, model: 'no-existe' }))).toEqual(['modelref-modelo']);
    expect(refCodes(withRef({ ...ok, version: dcf.version + 1 }))).toEqual(['modelref-version']);
    expect(refCodes(withRef(ok, undefined, 'published'))).toContain('modelref-draft');
  });
  it('content:check lista los ejercicios que citan una versión anterior del modelo', () => {
    const l = lessonSchema.parse(withRef(ok));
    const bumped = { ...dcf, version: dcf.version + 1 };
    expect(staleModelRefs([l], [{ path: 'm.json', data: bumped }])).toEqual([
      { exerciseId: 'n1-u4-l2-e3', model: ok.model, cited: 1, current: dcf.version + 1 },
    ]);
    expect(staleModelRefs([l], base.models ?? [])).toEqual([]);
    expect(resolveModelPath({ a: [{ b: 3 }] }, 'a.0.b')).toBe(3);
  });
});
