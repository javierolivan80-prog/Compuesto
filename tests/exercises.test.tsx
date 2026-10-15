import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseRunner, type ExerciseOutcome } from '../src/features/exercises/ExerciseRunner';
import { SAMPLE_TYPES, sampleExercise, type SampleType } from '../src/features/exercises/samples';

/** Completa un ejercicio SOLO con teclado: Tab, Enter, Espacio y flechas. */
function setup(type: SampleType) {
  const onComplete = vi.fn<(o: ExerciseOutcome) => void>();
  const user = userEvent.setup();
  render(<ExerciseRunner exercise={sampleExercise(type)} onComplete={onComplete} />);
  return { user, onComplete };
}

/** Pulsa Tab hasta que el foco cae en el elemento (con tope), como haría una persona. */
async function tabTo(user: ReturnType<typeof userEvent.setup>, el: HTMLElement) {
  for (let i = 0; i < 40; i++) {
    if (document.activeElement === el) return;
    await user.tab();
  }
  throw new Error(`El foco no llega a ${el.textContent || el.getAttribute('aria-label')} con Tab`);
}

async function pressKey(
  user: ReturnType<typeof userEvent.setup>,
  el: HTMLElement,
  key = '{Enter}',
) {
  await tabTo(user, el);
  await user.keyboard(key);
}

const check = () => screen.getByRole('button', { name: 'Comprobar' });

describe('Comprobar deshabilitado con la respuesta vacía', () => {
  it.each([
    'multiple_choice',
    'multi_select',
    'true_false_swipe',
    'match_pairs',
    'fill_blank',
    'numeric_input',
    'categorize',
  ] as SampleType[])('%s', (type) => {
    setup(type);
    expect(check()).toBeDisabled();
  });
  it('order_steps nace barajado y se puede comprobar sin tocar nada', () => {
    setup('order_steps');
    expect(check()).toBeEnabled();
  });
});

describe('cada tipo se completa solo con teclado', () => {
  it('multiple_choice: acierto y feedback con explicación', async () => {
    const { user, onComplete } = setup('multiple_choice');
    await pressKey(user, screen.getByRole('radio', { name: 'Limitada' }), ' ');
    await pressKey(user, check());
    expect(screen.getByRole('status')).toHaveTextContent('Correcto');
    expect(screen.getByRole('status')).toHaveTextContent('La limitada fija el precio');
    await pressKey(user, screen.getByRole('button', { name: 'Continuar' }));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });

  it('multiple_choice: el fallo muestra la explicación específica de la opción elegida y marca la correcta', async () => {
    const { user, onComplete } = setup('multiple_choice');
    await pressKey(user, screen.getByRole('radio', { name: 'De mercado' }));
    await pressKey(user, check());
    expect(screen.getByRole('status')).toHaveTextContent(
      'La de mercado garantiza ejecución, no precio.',
    );
    expect(screen.getByRole('radio', { name: /Limitada/ })).toHaveAttribute(
      'data-state',
      'correct',
    );
    expect(screen.getByRole('radio', { name: /De mercado/ })).toHaveAttribute(
      'data-state',
      'incorrect',
    );
    expect(screen.getByRole('radio', { name: /Limitada/ })).toHaveTextContent('✓ Correcta'); // no solo color
    await pressKey(user, screen.getByRole('button', { name: 'Continuar' }));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });

  it('multi_select', async () => {
    const { user, onComplete } = setup('multi_select');
    for (const n of ['Comisión del bróker', 'Horquilla', 'Canon de bolsa'])
      await pressKey(user, screen.getByRole('checkbox', { name: n }), ' ');
    await pressKey(user, check());
    await pressKey(user, screen.getByRole('button', { name: 'Continuar' }));
    expect(onComplete.mock.calls[0]![0].correct).toBe(true);
  });

  it('true_false_swipe: con botones (alternativa al gesto)', async () => {
    const { user, onComplete } = setup('true_false_swipe');
    await pressKey(user, screen.getByRole('radio', { name: 'Falso' }));
    await pressKey(user, check());
    await pressKey(user, screen.getByRole('button', { name: 'Continuar' }));
    expect(onComplete.mock.calls[0]![0].correct).toBe(true);
  });

  it('match_pairs: tocar el elemento y su pareja', async () => {
    const { user, onComplete } = setup('match_pairs');
    const pairs: [string, string][] = [
      ['TIN', 'Interés sin comisiones'],
      ['TAE', 'Coste efectivo anual'],
      ['Euríbor', 'Índice del tipo variable'],
    ];
    for (const [l, r] of pairs) {
      await pressKey(
        user,
        within(screen.getByRole('list', { name: 'Elementos' })).getByRole('checkbox', {
          name: new RegExp(`^${l}`),
        }),
      );
      await pressKey(
        user,
        within(screen.getByRole('list', { name: 'Parejas' })).getByRole('radio', { name: r }),
      );
    }
    await pressKey(user, check());
    await pressKey(user, screen.getByRole('button', { name: 'Continuar' }));
    expect(onComplete.mock.calls[0]![0].correct).toBe(true);
  });

  it('fill_blank: escribir y pulsar Enter comprueba', async () => {
    const { user, onComplete } = setup('fill_blank');
    await tabTo(user, screen.getByRole('textbox', { name: /Hueco 1/ }));
    await user.keyboard('Compuesto{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Correcto');
    await pressKey(user, screen.getByRole('button', { name: 'Continuar' }));
    expect(onComplete.mock.calls[0]![0].correct).toBe(true);
  });

  it('order_steps: reordenar con los botones Subir/Bajar', async () => {
    const { user, onComplete } = setup('order_steps');
    const steps = [
      'Fijas el precio máximo',
      'La orden entra en el libro',
      'Aparece una venta a ese precio o menos',
      'Se ejecuta la operación',
    ];
    const text = () =>
      screen
        .getAllByRole('listitem')
        .map((li) => steps.findIndex((s) => li.textContent?.includes(s)));
    // ordenación por selección: sube cada paso a su posición usando solo los botones
    for (let target = 0; target < steps.length; target++) {
      while (text()[target] !== target) {
        const pos = text().indexOf(target);
        await pressKey(user, screen.getByRole('button', { name: `Subir «${steps[target]}»` }));
        expect(text().indexOf(target)).toBe(pos - 1);
      }
    }
    await pressKey(user, check());
    await pressKey(user, screen.getByRole('button', { name: 'Continuar' }));
    expect(onComplete.mock.calls[0]![0].correct).toBe(true);
  });

  it('numeric_input: acepta coma decimal y avisa si no es un número', async () => {
    const { user, onComplete } = setup('numeric_input');
    const input = screen.getByRole('textbox', { name: /Tu respuesta/ });
    await tabTo(user, input);
    await user.keyboard('mil{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un número');
    expect(screen.queryByRole('status')).toBeNull();
    await user.clear(input);
    await user.keyboard('1.102,50{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Correcto');
    await pressKey(user, screen.getByRole('button', { name: 'Continuar' }));
    expect(onComplete.mock.calls[0]![0].correct).toBe(true);
  });

  it('numeric_input: respuesta incorrecta muestra la correcta', async () => {
    const { user } = setup('numeric_input');
    await tabTo(user, screen.getByRole('textbox', { name: /Tu respuesta/ }));
    await user.keyboard('1100{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Casi: repásalo');
    expect(screen.getByText(/Respuesta correcta: 1\.102,5/)).toBeInTheDocument();
  });

  it('categorize: elegir categoría de cada partida con teclado', async () => {
    const { user, onComplete } = setup('categorize');
    const choose = async (item: string, cat: string) =>
      pressKey(
        user,
        within(screen.getByRole('group', { name: item })).getByRole('button', {
          name: new RegExp(cat),
        }),
      );
    await choose('Caja', 'Activo');
    await choose('Deuda con el banco', 'Pasivo');
    await choose('Clientes', 'Activo');
    await choose('Proveedores', 'Pasivo');
    await pressKey(user, check());
    await pressKey(user, screen.getByRole('button', { name: 'Continuar' }));
    expect(onComplete.mock.calls[0]![0].correct).toBe(true);
  });

  it('categorize: un fallo marca la partida con texto, no solo color', async () => {
    const { user } = setup('categorize');
    const choose = async (item: string, cat: string) =>
      pressKey(
        user,
        within(screen.getByRole('group', { name: item })).getByRole('button', {
          name: new RegExp(cat),
        }),
      );
    await choose('Caja', 'Pasivo');
    await pressKey(user, check());
    expect(screen.getByRole('group', { name: 'Caja' })).toHaveTextContent('✗ era Activo');
  });
});

describe('build_statement y spreadsheet con teclado', () => {
  it('build_statement: los totales en vivo avisan de si cuadra y se completa con teclado', async () => {
    const { user, onComplete } = setup('build_statement');
    const caja = screen.getByRole('textbox', { name: 'Caja' });
    const reservas = screen.getByRole('textbox', { name: 'Reservas' });
    await tabTo(user, caja);
    await user.keyboard('5.152');
    expect(screen.getByText('—')).toBeInTheDocument(); // falta el otro hueco: aún no se sabe
    await tabTo(user, reservas);
    await user.keyboard('1000');
    expect(screen.getByText(/El balance no cuadra todavía/)).toBeInTheDocument();
    await user.clear(reservas);
    await user.keyboard('17.731{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Correcto');
    await pressKey(user, screen.getByRole('button', { name: 'Continuar' }));
    expect(onComplete.mock.calls[0]![0].correct).toBe(true);
  });

  it('build_statement: un hueco mal marca ✗ con la cifra correcta', async () => {
    const { user } = setup('build_statement');
    await tabTo(user, screen.getByRole('textbox', { name: 'Caja' }));
    await user.keyboard('5000');
    await tabTo(user, screen.getByRole('textbox', { name: 'Reservas' }));
    await user.keyboard('17731{Enter}');
    expect(screen.getByText(/✗ era 5\.152/)).toBeInTheDocument();
  });

  it('spreadsheet: escribir la fórmula en B3 y comprobar; muestra el resultado en vivo', async () => {
    const { user, onComplete } = setup('spreadsheet');
    const cell = screen.getByRole('textbox', { name: 'Celda B3' });
    await tabTo(user, cell);
    await user.keyboard('=B1*(1+B2)');
    expect(screen.getByText('Resultado de B3: 1.050')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Correcto');
    await pressKey(user, screen.getByRole('button', { name: 'Continuar' }));
    expect(onComplete.mock.calls[0]![0].correct).toBe(true);
  });

  it('spreadsheet: el número a mano no vale y un error de fórmula se muestra con su código', async () => {
    const { user } = setup('spreadsheet');
    const cell = screen.getByRole('textbox', { name: 'Celda B3' });
    await tabTo(user, cell);
    await user.keyboard('=B1/0');
    expect(screen.getByText(/#DIV\/0! División por cero/)).toBeInTheDocument();
    await user.clear(cell);
    await user.keyboard('1050{Enter}');
    expect(screen.getByText(/hay que escribir una fórmula/)).toBeInTheDocument();
  });

  it('spreadsheet: una fórmula con los números tecleados falla los casos ocultos', async () => {
    const { user } = setup('spreadsheet');
    await tabTo(user, screen.getByRole('textbox', { name: 'Celda B3' }));
    await user.keyboard('=1000*1.05{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Casi: repásalo');
  });
});

it('hay un ejemplo de los 10 tipos con componente', () => {
  expect(SAMPLE_TYPES).toHaveLength(10);
});
