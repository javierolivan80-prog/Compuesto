/* Sonidos propios del kit de juegos, sintetizados con Web Audio (sin archivos, coste 0 y funciona offline).
   Cortos, silenciables y nunca más de uno a la vez (docs/ANIMACIONES.md §7). */

export type SoundId =
  'open' | 'hit' | 'miss' | 'combo' | 'rank' | 'lift' | 'seal' | 'close' | 'register';

export interface Note {
  freq: number;
  /** Inicio (s) respecto al arranque del sonido. */
  at: number;
  dur: number;
  gain: number;
  type: OscillatorType;
}

/** Duración total (s) de cada sonido según ANIMACIONES.md §7. */
export const SOUND_DURATION: Record<SoundId, number> = {
  open: 0.8,
  hit: 0.1,
  miss: 0.2,
  combo: 0.2,
  rank: 1.5,
  lift: 0.4,
  seal: 0.2,
  close: 0.8,
  register: 0.25,
};

/** Plan de notas de cada sonido (puro y testeable). */
export function soundPlan(id: SoundId): Note[] {
  switch (id) {
    case 'open':
      return bell(660, 0.8);
    case 'close':
      return bell(520, 0.8);
    case 'hit':
      return [{ freq: 1900, at: 0, dur: 0.1, gain: 0.18, type: 'square' }];
    case 'miss':
      return [{ freq: 140, at: 0, dur: 0.2, gain: 0.22, type: 'triangle' }];
    case 'combo':
      return [
        { freq: 1200, at: 0, dur: 0.09, gain: 0.16, type: 'square' },
        { freq: 1800, at: 0.1, dur: 0.1, gain: 0.16, type: 'square' },
      ];
    case 'rank':
      return [...bell(523, 1.5), ...bell(784, 1.3).map((n) => ({ ...n, at: n.at + 0.12 }))];
    case 'lift':
      return [{ freq: 988, at: 0, dur: 0.4, gain: 0.14, type: 'sine' }];
    case 'seal':
      return [{ freq: 90, at: 0, dur: 0.2, gain: 0.3, type: 'triangle' }];
    case 'register':
      return [
        { freq: 2400, at: 0, dur: 0.06, gain: 0.1, type: 'sine' },
        { freq: 3200, at: 0.08, dur: 0.16, gain: 0.08, type: 'sine' },
      ];
  }
}

const bell = (freq: number, dur: number): Note[] => [
  { freq, at: 0, dur, gain: 0.2, type: 'sine' },
  { freq: freq * 2.01, at: 0, dur: dur * 0.6, gain: 0.07, type: 'sine' },
];

let enabled = true;
export const setSoundEnabled = (v: boolean): void => {
  enabled = v;
  if (!v) stopSound();
};
export const soundEnabled = () => enabled;

let ctx: AudioContext | null = null;
let current: OscillatorNode[] = [];

export function stopSound(): void {
  for (const o of current) {
    try {
      o.stop();
    } catch {
      /* ya terminado */
    }
  }
  current = [];
}

/** Reproduce un sonido (cortando el anterior). Devuelve false si está silenciado o el navegador no lo admite. */
export function playSound(id: SoundId): boolean {
  if (!enabled || typeof window === 'undefined') return false;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return false;
  try {
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    stopSound();
    const t0 = ctx.currentTime;
    for (const n of soundPlan(id)) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type;
      osc.frequency.value = n.freq;
      g.gain.setValueAtTime(0.0001, t0 + n.at);
      g.gain.exponentialRampToValueAtTime(n.gain, t0 + n.at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.dur + 0.02);
      current.push(osc);
    }
    return true;
  } catch {
    return false;
  }
}
