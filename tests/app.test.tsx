import 'fake-indexeddb/auto';
import { render, screen, within } from '@testing-library/react';
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

  // la primera lección es un juego de la planta 0 (mercados), no la Base de finanzas personales
  expect(await screen.findByRole('heading', { name: 'Tus primeras acciones' })).toBeInTheDocument();
  expect(window.location.hash).toBe('#/leccion/n1-u1-l6');
});

it('con el onboarding hecho la app abre en Inicio con la barra de 5 pestañas', async () => {
  window.location.hash = '#/';
  render(<App />); // misma base: el onboarding quedó guardado en el test anterior
  expect(await screen.findByRole('heading', { name: 'Objetivo de hoy' })).toBeInTheDocument();
  const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
  expect(
    within(nav)
      .getAllByRole('link')
      .map((a) => a.textContent),
  ).toEqual(['Inicio', 'Camino', 'Practicar', 'Rivales', 'Despacho']);
  expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: /Abrir mercado|Continuar/ })).toBeInTheDocument();
  expect(screen.getByText('Cifras ficticias del universo Compuesto.')).toBeInTheDocument();
});
