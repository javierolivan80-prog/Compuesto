import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { instantiate } from '../engine/params';
import { exerciseSchema } from './schemas';

/*
 * Suelos implementados con ROUND(x − 0,5 + 1e-9; 0) (n5-u6): se barre la rejilla completa de parámetros y se compara
 * con un suelo calculado en enteros, para que la coma flotante no reste una acción (p. ej. 249 en vez de 250).
 */
const exercise = (path: string, id: string) => {
  const l = JSON.parse(readFileSync(path, 'utf8'));
  return exerciseSchema.parse(l.exercises.find((e: { id: string }) => e.id === id));
};
const grid = (p: { min: number; max: number; step: number }) => {
  const out: number[] = [];
  for (let i = 0; p.min + i * p.step <= p.max + 1e-9; i++)
    out.push(Math.round((p.min + i * p.step) * 1e6) / 1e6);
  return out;
};
/** Suelo de a / b con enteros. */
const idiv = (a: number, b: number) => (a - (a % b)) / b;

describe('suelos con ROUND en el contenido', () => {
  it('n5-u6-l1-e1: acciones = 10.000 × r2 % / (entrada × stop %), redondeado hacia abajo', () => {
    const e = exercise('content/es/levels/n5/u6/l1.json', 'n5-u6-l1-e1');
    if (e.type !== 'numeric_input' || !e.params) throw new Error('no es paramétrico');
    let n = 0;
    for (const entry of grid(e.params.entry!))
      for (const sp of grid(e.params.stop_pct!))
        for (const r2 of grid(e.params.r2!)) {
          const got = (
            instantiate(e, undefined, { entry, stop_pct: sp, r2 }).exercise as { answer: number }
          ).answer;
          // 10.000 × r2 / (entrada × stop %) = 1.000 × (10 × r2) / (entrada × stop %)
          expect(got, `${entry} ${sp} ${r2}`).toBe(idiv(1000 * Math.round(r2 * 10), entry * sp));
          n++;
        }
    expect(n).toBeGreaterThan(50);
  });

  it('n5-u6-l2-e1: acciones = capital × r % / (entrada − stop), con el stop en céntimos', () => {
    const e = exercise('content/es/levels/n5/u6/l2.json', 'n5-u6-l2-e1');
    if (e.type !== 'numeric_input' || !e.params) throw new Error('no es paramétrico');
    let n = 0;
    for (const c of grid(e.params.c!))
      for (const r of grid(e.params.r!))
        for (const ent of grid(e.params.e!))
          for (const p of grid(e.params.p!)) {
            const got = (
              instantiate(e, undefined, { c, r, e: ent, p }).exercise as { answer: number }
            ).answer;
            // distancia al stop = entrada × p % = entrada × p céntimos; acciones = c × r / (entrada × p)
            expect(got, `${c} ${r} ${ent} ${p}`).toBe(idiv(c * Math.round(r * 2), 2 * ent * p));
            n++;
          }
    expect(n).toBeGreaterThan(1000);
  });
});
