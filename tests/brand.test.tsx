import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Bolsin, BOLSIN_STATES } from '../src/brand/Bolsin';
import { Avatar, CHARACTERS, type CharacterId } from '../src/brand/Characters';
import { Logo } from '../src/brand/Logo';

describe('marca', () => {
  it('Bolsín tiene 6 estados con nombre accesible distinto', () => {
    const names = new Set<string>();
    for (const state of BOLSIN_STATES) {
      const { unmount } = render(<Bolsin state={state} />);
      names.add(screen.getByRole('img').textContent ?? '');
      unmount();
    }
    expect(BOLSIN_STATES).toHaveLength(6);
    expect(names.size).toBe(6);
  });

  it('los 4 personajes tienen avatar con nombre y cargo', () => {
    for (const id of Object.keys(CHARACTERS) as CharacterId[]) {
      const { unmount } = render(<Avatar character={id} />);
      expect(screen.getByRole('img')).toHaveTextContent(CHARACTERS[id].role);
      unmount();
    }
  });

  it('el logo completo incluye el wordmark', () => {
    render(<Logo variant="full" />);
    expect(screen.getByRole('img')).toHaveTextContent('Compuesto');
  });

  it.each([
    ['public/icon-192.png', 192],
    ['public/icon-512.png', 512],
    ['public/icon-maskable-512.png', 512],
    ['public/apple-touch-icon.png', 180],
    ['public/favicon-32.png', 32],
  ])('%s mide exactamente %d px', (file, size) => {
    const png = readFileSync(file);
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  });
});
