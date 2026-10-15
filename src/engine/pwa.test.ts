import { describe, expect, it } from 'vitest';
import { backupReminder, compareVersions, decideSwAction, parseSwControl } from './pwa';

describe('versiones', () => {
  it('compara x.y.z numéricamente', () => {
    expect(compareVersions('0.1.0', '0.1.0')).toBe(0);
    expect(compareVersions('0.1.0', '0.2.0')).toBeLessThan(0);
    expect(compareVersions('1.10.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
  });
});

describe('control del SW', () => {
  it('valida la forma del JSON y descarta lo raro', () => {
    expect(parseSwControl({ kill: false, minVersion: '0.1.0' })).toEqual({
      kill: false,
      minVersion: '0.1.0',
    });
    expect(parseSwControl(null)).toBeNull();
    expect(parseSwControl({ kill: 'sí', minVersion: '0.1.0' })).toBeNull();
    expect(parseSwControl({ kill: false, minVersion: 'latest' })).toBeNull();
  });
  it('kill gana a todo; versión menor fuerza; sin control no hace nada', () => {
    expect(decideSwAction({ kill: true, minVersion: '0.0.0' }, '9.9.9')).toBe('kill');
    expect(decideSwAction({ kill: false, minVersion: '0.2.0' }, '0.1.0')).toBe('force-update');
    expect(decideSwAction({ kill: false, minVersion: '0.1.0' }, '0.1.0')).toBe('none');
    expect(decideSwAction(null, '0.1.0')).toBe('none');
  });
});

describe('recordatorio de copia', () => {
  const now = new Date('2026-10-15T10:00:00Z');
  const base = { now, lastDismissedAt: null, hasProgress: true };
  it('nunca avisa sin progreso que perder', () => {
    expect(backupReminder({ ...base, lastBackupAt: null, hasProgress: false }).due).toBe(false);
  });
  it('avisa si nunca hubo copia', () => {
    expect(backupReminder({ ...base, lastBackupAt: null })).toEqual({ due: true, days: null });
  });
  it('avisa a partir de 7 días y no antes', () => {
    expect(backupReminder({ ...base, lastBackupAt: '2026-10-09T10:00:00Z' }).due).toBe(false);
    expect(backupReminder({ ...base, lastBackupAt: '2026-10-08T10:00:00Z' })).toEqual({
      due: true,
      days: 7,
    });
  });
  it('descartar el aviso lo silencia 7 días', () => {
    const r = backupReminder({
      ...base,
      lastBackupAt: null,
      lastDismissedAt: '2026-10-12T10:00:00Z',
    });
    expect(r.due).toBe(false);
    expect(
      backupReminder({ ...base, lastBackupAt: null, lastDismissedAt: '2026-10-08T10:00:00Z' }).due,
    ).toBe(true);
  });
  it('una fecha corrupta cuenta como "nunca"', () => {
    expect(backupReminder({ ...base, lastBackupAt: 'basura' }).due).toBe(true);
  });
});
