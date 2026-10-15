import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlacement, unitConcepts } from '../src/content/library';
import { CompuestoDB } from '../src/db/db';
import { RepoProvider } from '../src/db/RepoProvider';
import { Repository } from '../src/db/repository';
import type { Exercise } from '../src/content/schemas';
import { projectSeenConcepts } from '../src/engine/projections';
import { PlacementScreen } from '../src/features/placement/PlacementScreen';

let db: CompuestoDB;
let repo: Repository;
let n = 0;
beforeEach(() => {
  db = new CompuestoDB(`placement-${++n}`);
  let tick = 0;
  repo = new Repository(db, {
    now: () => new Date(Date.parse('2026-04-01T10:00:00Z') + 1000 * tick++),
  });
});
afterEach(async () => {
  db.close();
  await Dexie.delete(db.name);
});

const bank = getPlacement('n0-u2')!;

async function answerQuestion(
  user: ReturnType<typeof userEvent.setup>,
  q: Exercise,
  wrong: boolean,
) {
  if (q.type === 'multiple_choice') {
    const idx = wrong ? (q.answer === 0 ? 1 : 0) : q.answer;
    await user.click(screen.getByRole('radio', { name: q.options[idx]! }));
  } else if (q.type === 'true_false_swipe') {
    await user.click(
      screen.getByRole('radio', { name: q.answer !== wrong ? 'Verdadero' : 'Falso' }),
    );
  } else if (q.type === 'multi_select') {
    const bad = q.options.findIndex((_, i) => !q.answers.includes(i));
    for (const i of wrong ? [bad] : q.answers)
      await user.click(screen.getByRole('checkbox', { name: q.options[i]! }));
  }
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
}

async function runTest(wrongCount: number) {
  const user = userEvent.setup();
  const onDone = vi.fn();
  render(
    <RepoProvider repo={repo}>
      <PlacementScreen
        bank={bank}
        unitName="TIN, TAE, préstamos e hipotecas"
        level={0}
        onDone={onDone}
        onExit={() => {}}
      />
    </RepoProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Empezar el test' }));
  for (const [i, q] of bank.questions.entries()) {
    await waitFor(() =>
      expect(
        screen.getByText(`Pregunta ${i + 1} de 8`, { selector: 'p[data-num]' }),
      ).toBeInTheDocument(),
    );
    await answerQuestion(user, q as Exercise, i < wrongCount);
  }
  return { user, onDone };
}

describe('PlacementScreen', () => {
  it('8 de 8: unidad dominada, evento unit_skipped y sus conceptos cuentan como vistos', async () => {
    await runTest(0);
    expect(await screen.findByRole('heading', { name: 'Unidad dominada' })).toBeInTheDocument();
    expect(screen.getByTestId('placement-score')).toHaveTextContent('8 de 8 · 100 %');

    const events = await repo.allEvents();
    expect(events.filter((e) => e.type === 'exercise_answered')).toHaveLength(8);
    expect(events.filter((e) => e.type === 'unit_skipped')).toHaveLength(1);

    const summary = await repo.summary();
    expect(summary.progress.skippedUnits).toEqual(['n0-u2']);
    expect(summary.xp.total).toBe(0); // el test no da XP ni racha
    expect(summary.streak.current).toBe(0);

    const seen = projectSeenConcepts(events, unitConcepts());
    for (const c of [
      'tin',
      'tae',
      'prestamo',
      'cuadro-amortizacion',
      'hipoteca',
      'euribor',
      'alquilar-vs-comprar',
    ])
      expect(seen).toContain(c);
  });

  it('no revela si cada respuesta fue correcta hasta el final (sin hoja de feedback)', async () => {
    const user = userEvent.setup();
    render(
      <RepoProvider repo={repo}>
        <PlacementScreen
          bank={bank}
          unitName="Unidad"
          level={0}
          onDone={() => {}}
          onExit={() => {}}
        />
      </RepoProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Empezar el test' }));
    await answerQuestion(user, bank.questions[0] as Exercise, true);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText(/Correcto|Casi: repásalo/)).toBeNull();
    expect(
      await screen.findByText('Pregunta 2 de 8', { selector: 'p[data-num]' }),
    ).toBeInTheDocument();
  });

  it('6 de 8 (75 %) no aprueba: no se guarda unit_skipped y se ofrece estudiar', async () => {
    await runTest(2);
    expect(await screen.findByRole('heading', { name: 'Todavía no' })).toBeInTheDocument();
    expect(screen.getByTestId('placement-score')).toHaveTextContent('6 de 8 · 75 %');
    expect((await repo.allEvents()).some((e) => e.type === 'unit_skipped')).toBe(false);
    expect((await repo.summary()).progress.skippedUnits).toEqual([]);
  });

  it('7 de 8 (87,5 %) aprueba', async () => {
    await runTest(1);
    expect(await screen.findByRole('heading', { name: 'Unidad dominada' })).toBeInTheDocument();
  });

  it('cada banco tiene 8 preguntas y cubre todos los conceptos de su unidad', () => {
    const concepts = unitConcepts();
    for (const unit of Object.keys(concepts)) {
      const b = getPlacement(unit);
      if (!b) continue;
      expect(b.questions, unit).toHaveLength(8);
      expect(new Set(b.questions.flatMap((q) => q.concepts)), unit).toEqual(
        new Set(concepts[unit]),
      );
    }
    expect(
      [
        'n0-u1',
        'n0-u2',
        'n0-u3',
        'n0-u4',
        'n0-u5',
        'n1-u1',
        'n1-u2',
        'n1-u3',
        'n1-u4',
        'n1-u5',
        'n1-u6',
      ].every((u) => getPlacement(u)),
    ).toBe(true);
  });
});
