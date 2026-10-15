import { describe, expect, it } from 'vitest';
import { cssEase, dur, ease, spring, stagger, transition } from './motion';

describe('tokens de motion', () => {
  it('coinciden con ANIMACIONES.md §1', () => {
    expect(ease.out).toEqual([0.23, 1, 0.32, 1]);
    expect(cssEase.out).toBe('cubic-bezier(0.23, 1, 0.32, 1)');
    expect(spring.ui).toMatchObject({ stiffness: 400, damping: 40 });
    expect(spring.reward).toMatchObject({ stiffness: 300, damping: 18 });
    expect([dur.micro, dur.short, dur.medium, dur.long]).toEqual([0.12, 0.2, 0.32, 0.6]);
    expect(stagger).toBe(0.04);
  });
  it('reduced-motion sustituye la transición por un fundido corto', () => {
    expect(transition({ duration: dur.long }, true)).toEqual({ duration: dur.micro });
    expect(transition({ duration: dur.long }, false)).toEqual({ duration: dur.long });
  });
});
