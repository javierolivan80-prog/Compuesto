import { render, screen } from '@testing-library/react';
import { App } from '../src/app/App';

it('muestra el nombre y la promesa', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Compuesto' })).toBeInTheDocument();
  expect(screen.getByText('20 minutos al día. Se capitalizan.')).toBeInTheDocument();
});
