import { mulberry32 } from './prng';

/* Partículas deterministas para celebraciones (kit de game feel). La física es pura; el dibujo es del kit. */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  /** Vida restante 0–1. */
  life: number;
}

export interface BurstOptions {
  x: number;
  y: number;
  seed: number;
  /** 20–40 por la especificación. */
  count?: number;
  speed?: number;
}

export const PARTICLE_MIN = 20;
export const PARTICLE_MAX = 40;
export const PARTICLE_MS = 700;

export function spawnBurst({ x, y, seed, count = 30, speed = 4 }: BurstOptions): Particle[] {
  const n = Math.min(PARTICLE_MAX, Math.max(PARTICLE_MIN, Math.round(count)));
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const angle = rnd() * Math.PI * 2;
    const v = speed * (0.4 + rnd() * 0.6);
    return {
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 1.5,
      size: 2 + rnd() * 2.5,
      life: 1,
    };
  });
}

/** Avanza `dtMs` (se limita a 50 ms para que un tirón no teletransporte): gravedad suave y vida lineal en PARTICLE_MS. */
export function stepParticles(ps: readonly Particle[], dtMs: number): Particle[] {
  const dt = Math.min(Math.max(dtMs, 0), 50) / 16.667;
  return ps
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + 0.12 * dt,
      life: p.life - dtMs / PARTICLE_MS,
    }))
    .filter((p) => p.life > 0);
}
