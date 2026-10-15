import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { App } from '../src/app/App';

it('un usuario nuevo ve la bienvenida; tras el onboarding llega a su primera lección', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(
    await screen.findByRole('heading', { name: 'Bienvenido a Albufera Partners' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/no asesoramiento financiero/)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Entrar a la oficina' }));
  expect(screen.getByRole('heading', { name: '¿Cuánto tiempo al día?' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^15 min$/ }));
  expect(screen.getByRole('button', { name: /^15 min$/ })).toHaveAttribute('aria-pressed', 'true');
  await user.click(screen.getByRole('button', { name: 'Continuar' }));

  const start = screen.getByRole('button', { name: 'Empezar mi primera lección' });
  expect(start).toBeDisabled(); // sin iniciales no se puede continuar
  await user.type(screen.getByLabelText('Tus iniciales'), 'x');
  expect(screen.getByText(/Error: usa entre 2 y 4 letras/)).toBeInTheDocument();
  await user.clear(screen.getByLabelText('Tus iniciales'));
  await user.type(screen.getByLabelText('Tus iniciales'), 'jav');
  await user.click(start);

  expect(
    await screen.findByRole('heading', { name: 'Inflación: por qué tu dinero compra menos' }),
  ).toBeInTheDocument();
  expect(window.location.hash).toBe('#/leccion/n0-u1-l1');
});

it('con el onboarding hecho la app abre en la Home con la Unidad 1 y los tests de salto', async () => {
  window.location.hash = '#/';
  render(<App />); // misma base: el onboarding quedó guardado en el test anterior
  expect(
    await screen.findByRole('heading', { name: /El dinero en el tiempo/ }),
  ).toBeInTheDocument();
  expect(
    screen.getAllByRole('button', { name: /Empezar|Abrir mercado/ }).length,
  ).toBeGreaterThanOrEqual(5);
  expect(screen.getByRole('button', { name: 'Saltar el Nivel 0' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Saltar el Nivel 1' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Test de salto' })).toHaveLength(11);
});
