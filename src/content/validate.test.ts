import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkCompany } from './accounting';
import { loadContent } from './node-loader';
import { companiesSchema, EXERCISE_TYPES, lessonSchema } from './schemas';
import {
  buildIdsLock,
  conceptCycles,
  findExpiring,
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
  it('N0–N1 llevan el detalle completo (descripción y unidad); el resto, esqueleto', () => {
    const { concepts } = validateContent(base);
    for (const c of concepts.filter((c) => c.level <= 1 && !c.track)) {
      expect(c.description, c.id).toBeTruthy();
      expect(c.unit, c.id).toMatch(/^n[01]-u\d$/);
    }
    expect(concepts.filter((c) => c.level >= 2).every((c) => !c.description)).toBe(true);
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
    expect(msg).toContain('El concepto "dcf" es del nivel 3 y se usa en el nivel 1');
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
    expect(msgs).toContain('Prerrequisito e (nivel 3) posterior a d (nivel 0)');
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
  it('hay 5 empresas ficticias, incluida Naranjas del Turia, con 5 años', () => {
    expect(companies).toHaveLength(5);
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
