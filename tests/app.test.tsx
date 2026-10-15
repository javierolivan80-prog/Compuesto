import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import { App } from '../src/app/App';

it('la Home muestra la promesa, el aviso legal y la Unidad 1 del Nivel 0', async () => {
  render(<App />);
  expect(screen.getByRole('img', { name: 'Compuesto' })).toBeInTheDocument();
  expect(screen.getByText('20 minutos al día. Se capitalizan.')).toBeInTheDocument();
  expect(screen.getByText(/no asesoramiento financiero/)).toBeInTheDocument();
  expect(
    await screen.findByRole('heading', { name: /El dinero en el tiempo/ }),
  ).toBeInTheDocument();
  expect(
    screen.getAllByRole('button', { name: /Empezar|Abrir mercado/ }).length,
  ).toBeGreaterThanOrEqual(5);
});
