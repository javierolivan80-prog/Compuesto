import { describe, expect, it } from 'vitest';
import { SOUND_DURATION, playSound, setSoundEnabled, soundPlan, type SoundId } from './sound';

const IDS = Object.keys(SOUND_DURATION) as SoundId[];

describe('sonidos del kit', () => {
  it.each(IDS)('%s: dura lo que dice ANIMACIONES.md §7 y suena en un volumen prudente', (id) => {
    const notes = soundPlan(id);
    expect(notes.length).toBeGreaterThan(0);
    const end = Math.max(...notes.map((n) => n.at + n.dur));
    expect(end).toBeLessThanOrEqual(SOUND_DURATION[id] + 0.15);
    expect(end).toBeGreaterThanOrEqual(SOUND_DURATION[id] * 0.5);
    for (const n of notes) expect(n.gain).toBeLessThanOrEqual(0.3);
  });
  it('silenciado no reproduce nada', () => {
    setSoundEnabled(false);
    expect(playSound('hit')).toBe(false);
    setSoundEnabled(true);
  });
  it('sin Web Audio (jsdom) se omite sin error', () => {
    expect(playSound('hit')).toBe(false);
  });
});
