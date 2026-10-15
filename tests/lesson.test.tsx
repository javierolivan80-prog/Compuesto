import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompuestoDB } from '../src/db/db';
import { RepoProvider } from '../src/db/RepoProvider';
import { Repository } from '../src/db/repository';
import { lessonSchema, type Lesson } from '../src/content/schemas';
import { LessonScreen } from '../src/features/lesson/LessonScreen';
import { Explainer } from '../src/features/lesson/explainers/Explainer';
import { Rule72 } from '../src/features/lesson/explainers/Rule72';

let db: CompuestoDB;
let repo: Repository;
let n = 0;
beforeEach(() => {
  db = new CompuestoDB(`lesson-${++n}`);
  // el reloj avanza 1 s por evento: con marcas de tiempo idénticas el orden se desempata por id aleatorio
  let tick = 0;
  repo = new Repository(db, {
    now: () => new Date(Date.parse('2026-03-10T10:00:00Z') + 1000 * tick++),
  });
});
afterEach(async () => {
  db.close();
  await Dexie.delete(db.name);
});

const c = {
  difficulty: 1,
  bloom: 'recordar',
  tags: [],
  concepts: ['inflacion'],
  explanation: 'Porque sí, con motivo.',
};
const lesson: Lesson = lessonSchema.parse({
  id: 't-l1',
  version: 1,
  status: 'draft',
  level: 0,
  unit: 1,
  title: 'Lección de prueba',
  estimatedMinutes: 3,
  objectives: ['x'],
  concepts: ['inflacion'],
  lastReviewed: '2026-03-10',
  intro: [
    { type: 'card', term: 'Inflación', text: 'Los precios suben.' },
    { type: 'example', text: 'Un ejemplo.' },
  ],
  exercises: [
    {
      id: 't-l1-e1',
      type: 'true_false_swipe',
      statement: 'La inflación es una subida de precios.',
      answer: true,
      ...c,
    },
    {
      id: 't-l1-e2',
      type: 'true_false_swipe',
      statement: 'La inflación baja los precios.',
      answer: false,
      ...c,
    },
  ],
});

function renderLesson(onExit = vi.fn()) {
  const user = userEvent.setup();
  render(
    <RepoProvider repo={repo}>
      <LessonScreen lesson={lesson} onExit={onExit} />
    </RepoProvider>,
  );
  return { user, onExit };
}

async function answerTF(user: ReturnType<typeof userEvent.setup>, value: 'Verdadero' | 'Falso') {
  await user.click(screen.getByRole('radio', { name: value }));
  await user.click(screen.getByRole('button', { name: 'Comprobar' }));
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
  // guardar y pasar al siguiente ejercicio es asíncrono
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
}

describe('LessonScreen', () => {
  it('teoría → ejercicios → cierre; guarda eventos y muestra XP y racha reales', async () => {
    const { user } = renderLesson();
    expect(screen.getByText('Los precios suben.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Un ejemplo.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Empezar los ejercicios' }));

    await answerTF(user, 'Verdadero');
    await answerTF(user, 'Falso');

    expect(await screen.findByRole('heading', { name: 'Lección completada' })).toBeInTheDocument();
    expect(screen.getByText('100 %')).toBeInTheDocument(); // precisión
    expect(await screen.findByText('1 día')).toBeInTheDocument(); // racha
    const events = await repo.allEvents();
    expect(events.map((e) => e.type)).toEqual([
      'lesson_started',
      'exercise_answered',
      'exercise_answered',
      'lesson_completed',
    ]);
    const s = await repo.summary();
    expect(s.xp.total).toBe(10 + 10 + 20); // dos aciertos a la primera + bonificación de cierre
    expect(s.progress.lessons['t-l1']!.status).toBe('completed');
  });

  it('un fallo vuelve al final, da 5 XP al acertarlo y baja la precisión', async () => {
    const { user } = renderLesson();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Empezar los ejercicios' }));

    await answerTF(user, 'Falso'); // e1 mal
    expect(screen.getByText('La inflación baja los precios.')).toBeInTheDocument(); // ahora e2
    await answerTF(user, 'Falso'); // e2 bien
    expect(screen.getByText('La inflación es una subida de precios.')).toBeInTheDocument(); // e1 vuelve
    await answerTF(user, 'Verdadero'); // e1 bien (repaso)

    expect(await screen.findByText('50 %')).toBeInTheDocument();
    const s = await repo.summary();
    expect(s.xp.total).toBe(0 + 10 + 5 + 10); // fallo 0, e2 10, repaso 5, cierre 10 (precisión < 80 %)
    const answered = (await repo.allEvents()).filter((e) => e.type === 'exercise_answered');
    expect(answered).toHaveLength(3);
  });

  it('Salir llama a onExit y el progreso ya guardado se conserva', async () => {
    const { user, onExit } = renderLesson();
    await user.click(screen.getByRole('button', { name: 'Salir' }));
    expect(onExit).toHaveBeenCalled();
    await waitFor(async () =>
      expect((await repo.allEvents()).map((e) => e.type)).toEqual(['lesson_started']),
    );
  });

  it('si no se puede guardar, avisa pero deja terminar la lección', async () => {
    vi.spyOn(repo, 'record').mockRejectedValue(new Error('cuota llena'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { user } = renderLesson();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Empezar los ejercicios' }));
    await answerTF(user, 'Verdadero');
    expect(await screen.findAllByText(/no se pudo guardar tu progreso/i)).not.toHaveLength(0);
    await answerTF(user, 'Falso');
    expect(await screen.findByRole('heading', { name: 'Lección completada' })).toBeInTheDocument();
  });
});

describe('Explainer', () => {
  const steps = [
    { title: 'Uno', text: 'a' },
    { title: 'Dos', text: 'b' },
    { title: 'Tres', text: 'c' },
  ];
  const renderIt = (onInteract = vi.fn()) => {
    render(
      <Explainer
        explainerId="demo"
        title="Demo"
        description="Descripción textual."
        steps={steps}
        render={(t) => <span data-testid="t">{t.toFixed(2)}</span>}
        onInteract={onInteract}
      />,
    );
    return onInteract;
  };

  it('nace en su estado final, con descripción textual y pasos', () => {
    renderIt();
    expect(screen.getByTestId('t')).toHaveTextContent('1.00');
    expect(screen.getByText('Descripción textual.')).toBeInTheDocument();
    expect(screen.getByText('Estado final')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('slider', { name: 'Recorrer a mano' })).toHaveValue('1000');
  });

  it('el deslizador recorre los pasos y avisa una sola vez de la interacción', () => {
    const onInteract = renderIt();
    const slider = screen.getByRole('slider', { name: 'Recorrer a mano' });
    fireEvent.change(slider, { target: { value: '0' } });
    expect(screen.getByTestId('t')).toHaveTextContent('0.00');
    expect(slider).toHaveAttribute('aria-valuetext', 'Paso 1 de 3: Uno');
    expect(screen.getByText('Uno', { exact: false }).closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );
    fireEvent.change(slider, { target: { value: '500' } });
    expect(slider).toHaveAttribute('aria-valuetext', 'Paso 2 de 3: Dos');
    expect(onInteract).toHaveBeenCalledTimes(1);
    expect(onInteract).toHaveBeenCalledWith('demo');
  });

  it('Rule72 usa el tipo recibido: con un 6 % se duplica en 12 años', () => {
    render(<Rule72 rate={6} />);
    expect(screen.getAllByText(/72 \/ 6,0 = 12,0 años/).length).toBeGreaterThan(0);
    expect(screen.getByText(/8 veces|ocho veces/)).toBeInTheDocument();
  });
});
