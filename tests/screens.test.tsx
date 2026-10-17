import 'fake-indexeddb/auto';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App';
import { getDb } from '../src/db/db';
import { Repository } from '../src/db/repository';

vi.mock('../src/lib/download', () => ({ downloadText: vi.fn(() => true) }));
import { downloadText } from '../src/lib/download';

const repo = new Repository(getDb());

beforeAll(async () => {
  // usuario ya incorporado y con una lección completada
  await repo.record('settings_changed', { key: 'onboarded', value: true });
  await repo.record('settings_changed', { key: 'tickerInitials', value: 'JAV' });
  await repo.record('lesson_started', { lessonId: 'n0-u1-l1', unitId: 'n0-u1', level: 0 });
  await repo.record('exercise_answered', {
    exerciseId: 'n0-u1-l1-e1',
    lessonId: 'n0-u1-l1',
    conceptIds: ['inflacion'],
    correct: false,
    timeMs: 1000,
    xp: 0,
  });
  await repo.record('exercise_answered', {
    exerciseId: 'n0-u1-l1-e2',
    lessonId: 'n0-u1-l1',
    conceptIds: ['poder-adquisitivo'],
    correct: true,
    timeMs: 1000,
    xp: 10,
  });
  await repo.record('lesson_completed', {
    lessonId: 'n0-u1-l1',
    unitId: 'n0-u1',
    level: 0,
    xp: 20,
    accuracy: 0.5,
  });
});
afterEach(() => {
  vi.mocked(downloadText).mockClear();
});

const open = async (hash: string) => {
  window.location.hash = hash;
  render(<App />);
};

describe('pantallas principales', () => {
  it('Inicio: objetivo, racha, XP reales y siguiente lección', async () => {
    await open('#/');
    expect(await screen.findByTestId('xp-total')).toHaveTextContent('30');
    expect(screen.getByTestId('goal-xp')).toHaveTextContent('30 / 60 XP');
    expect(screen.getByTestId('streak')).toHaveTextContent('1 d');
    expect(screen.getByRole('heading', { name: 'Siguiente' })).toBeInTheDocument();
    expect(screen.getByText(/Interés simple e interés compuesto/)).toBeInTheDocument(); // la siguiente sin completar
  });

  it('Camino: 11 plantas, la más alta arriba, con estados y "Próximamente" explícito', async () => {
    await open('#/camino');
    const building = await screen.findByRole('list', { name: 'Edificio de Albufera Partners' });
    const floors = within(building)
      .getAllByRole('listitem', { name: '' })
      .filter((li) => li.querySelector(':scope > details'));
    expect(floors).toHaveLength(11);
    expect(floors[0]).toHaveTextContent('P10');
    expect(floors[10]).toHaveTextContent('P0');
    expect(floors[10]).toHaveTextContent('▶ en curso');
    expect(floors[5]).toHaveTextContent('próximamente');
    expect(screen.getAllByText(/Próximamente/).length).toBeGreaterThan(3);
  });

  it('Practicar: permite repetir lo completado', async () => {
    await open('#/practicar');
    expect(await screen.findByRole('heading', { name: 'Minijuegos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Repetir' })).toBeInTheDocument();
  });

  it('Rivales', async () => {
    await open('#/rivales');
    expect(await screen.findByRole('heading', { name: 'Rivales', level: 1 })).toBeInTheDocument();
    // con XP real hay liga: clasificación de 8 rivales + tú, y nada inventado
    expect(
      await screen.findByRole('heading', { name: 'Clasificación de la semana' }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('rival-row')).toHaveLength(8);
    expect(screen.getByTestId('rival-me')).toBeInTheDocument();
  });

  it('Despacho: estadísticas reales, ejercicios más fallados y enlaces', async () => {
    await open('#/despacho');
    expect(
      await screen.findByRole('heading', { name: 'Tu cartera de conocimiento' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ejercicios respondidos').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Precisión').nextSibling).toHaveTextContent('50 %');
    expect(screen.getByText('$JAV ·', { exact: false })).toBeInTheDocument();
    const failed = screen.getByRole('heading', { name: 'Ejercicios más fallados' }).parentElement!;
    expect(failed).toHaveTextContent('1 fallo(s) en 1 intento(s)');
    expect(screen.getByRole('link', { name: 'Glosario' })).toHaveAttribute(
      'href',
      '#/despacho/glosario',
    );
    expect(screen.getByRole('link', { name: 'Ajustes' })).toHaveAttribute(
      'href',
      '#/despacho/ajustes',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Exportar estadísticas (CSV)' }));
    expect(downloadText).toHaveBeenCalledWith(
      'compuesto-estadisticas.csv',
      expect.stringContaining('xp_total,30'),
      'text/csv',
    );
  });

  it('Glosario: busca por término o definición y abre la definición en una hoja', async () => {
    await open('#/despacho/glosario');
    const user = userEvent.setup();
    expect(await screen.findByText('76 de 76 términos')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Buscar un término'), 'inflacion'); // sin tilde
    expect(screen.getByRole('list', { name: 'Términos' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(2);
    await user.click(screen.getByRole('button', { name: 'Inflación' }));
    expect(await screen.findByRole('dialog', { name: 'Inflación' })).toHaveTextContent(
      'Subida generalizada y sostenida de los precios',
    );
    await user.keyboard('{Escape}');
    await user.clear(screen.getByLabelText('Buscar un término'));
    await user.type(screen.getByLabelText('Buscar un término'), 'zzzz');
    expect(screen.getByText('Ningún término coincide')).toBeInTheDocument();
  });

  it('Ajustes: temas bloqueados por rango, háptica, recordatorio .ics y copia', async () => {
    await open('#/despacho/ajustes');
    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wall Street Noche' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mayfair' })).toBeInTheDocument();
    expect(screen.getByText(/Tokio 3 a\.m\. · se desbloquea como Director/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tokio/ })).toBeNull(); // bloqueado: sin control

    await user.click(screen.getByRole('button', { name: 'Mayfair' }));
    expect(document.documentElement.dataset.theme).toBe('mayfair');

    await user.click(screen.getByRole('switch', { name: /Vibración/ }));
    await waitFor(async () => expect((await repo.summary()).settings['haptics']).toBe(false));

    await user.click(screen.getByRole('button', { name: 'Descargar recordatorio (.ics)' }));
    expect(downloadText).toHaveBeenCalledWith(
      'compuesto-recordatorio.ics',
      expect.stringContaining('RRULE:FREQ=DAILY'),
      'text/calendar',
    );

    await user.click(screen.getByRole('button', { name: 'Exportar copia (JSON)' }));
    await waitFor(() =>
      expect(downloadText).toHaveBeenCalledWith(
        expect.stringMatching(/^compuesto-copia-\d{4}-\d{2}-\d{2}\.json$/),
        expect.stringContaining('"format":"compuesto-backup"'),
        'application/json',
      ),
    );
  });

  it('Ajustes: borrar datos pide confirmación y se puede cancelar', async () => {
    await open('#/despacho/ajustes');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Borrar todos mis datos' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Borrar todos tus datos?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((await repo.allEvents()).length).toBeGreaterThan(0); // nada se borró
  });

  it('Ajustes: importar un archivo no válido muestra el error sin tocar los datos', async () => {
    await open('#/despacho/ajustes');
    const user = userEvent.setup();
    const before = (await repo.allEvents()).length;
    const input = (await screen.findByLabelText('Archivo de copia de seguridad', {
      selector: 'input',
    })) as HTMLInputElement;
    await act(async () => {
      await user.upload(input, new File(['{no es json'], 'x.json', { type: 'application/json' }));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Error: El archivo no es un JSON válido.',
    );
    expect((await repo.allEvents()).length).toBe(before);
  });

  it('Reportes: sin reportes muestra el estado vacío', async () => {
    await open('#/despacho/reportes');
    expect(await screen.findByText('No hay reportes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exportar reportes (JSON)' })).toBeNull();
  });

  it('Reportes: listado exportable y borrable', async () => {
    await repo.addReport('n0-u1-l1-e1', 'La opción B también es correcta');
    await open('#/despacho/reportes');
    const user = userEvent.setup();
    expect(await screen.findByText('La opción B también es correcta')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exportar reportes (JSON)' }));
    expect(downloadText).toHaveBeenCalledWith(
      'compuesto-reportes.json',
      expect.stringContaining('La opción B también es correcta'),
      'application/json',
    );
    await user.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(await screen.findByText('No hay reportes')).toBeInTheDocument();
  });

  it('el botón "Reportar error" de una lección guarda el reporte', async () => {
    await open('#/leccion/n0-u1-l1');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Siguiente' }));
    await user.click(await screen.findByRole('button', { name: 'Siguiente' }));
    await user.click(await screen.findByRole('button', { name: 'Empezar los ejercicios' }));
    await user.click(await screen.findByRole('button', { name: 'Reportar error' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reportar un error' });
    expect(within(dialog).getByRole('button', { name: 'Guardar reporte' })).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/¿Qué está mal/), 'Enunciado ambiguo');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar reporte' }));
    await waitFor(async () =>
      expect(
        (await repo.listReports()).some(
          (r) => r.text === 'Enunciado ambiguo' && r.exerciseId === 'n0-u1-l1-e1',
        ),
      ).toBe(true),
    );
  });

  it('los términos del glosario aparecen subrayados en la teoría y abren su definición', async () => {
    await open('#/leccion/n0-u1-l1');
    const user = userEvent.setup();
    const term = await screen.findByRole('button', { name: 'poder adquisitivo' });
    await user.click(term);
    expect(await screen.findByRole('dialog', { name: 'Poder adquisitivo' })).toHaveTextContent(
      'Cantidad de bienes y servicios',
    );
  });
});
