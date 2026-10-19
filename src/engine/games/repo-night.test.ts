import { describe, expect, it } from 'vitest';
import {
  interest,
  interestOptions,
  loan,
  loanOptions,
  repoResult,
  repoValues,
  setupRepo,
} from './repo-night';

describe('Una noche en la tesorería', () => {
  it('semilla 0: 10 M€ en bonos con un 2 % de recorte dan 9,8 M€; un día al 3,2 % son 871 €', () => {
    const s = setupRepo(0);
    expect(loan(s)).toBe(9.8);
    expect(loanOptions(s)).toEqual([9.8, 10, 10.2]);
    expect(interest(s)).toBe(871);
    expect(interestOptions(s)).toEqual([859, 871, 313600]);
  });

  it('en todas las semillas, opciones distintas y la buena entre ellas', () => {
    for (let seed = 0; seed <= 40; seed++) {
      const s = setupRepo(seed);
      expect(setupRepo(seed)).toEqual(s);
      expect(new Set(loanOptions(s)).size).toBe(3);
      expect(new Set(interestOptions(s)).size).toBe(3);
      expect(interestOptions(s)).toContain(interest(s));
    }
  });

  it('nota y cifras para la lección', () => {
    const s = setupRepo(0);
    const best = { loan: 9.8, interest: 871, recourse: 'cedula' as const };
    expect(repoResult(s, best).score).toBe(1);
    expect(repoResult(s, { ...best, recourse: 'titulizacion' }).score).toBe(0.667);
    expect(repoValues(s, best)).toMatchObject({
      loan: 9.8,
      interest: 871,
      repay: 9800871,
      hits: 3,
    });
  });
});
