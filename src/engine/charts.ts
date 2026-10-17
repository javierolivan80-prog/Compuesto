import { mulberry32 } from './prng';

/* Generador de series con semilla para chart_read (TEMARIO §6). Misma semilla → mismo gráfico, en cualquier dispositivo. */

export type ChartKind = 'price' | 'yield_curve' | 'bars' | 'line';

export interface ChartSpec {
  kind: ChartKind;
  seed: number;
  points: number;
}

export interface Series {
  kind: ChartKind;
  /** Etiqueta de cada punto (día, vencimiento…). */
  labels: string[];
  values: number[];
  unit: string;
}

const MATURITIES = ['3m', '6m', '1a', '2a', '3a', '5a', '7a', '10a', '15a', '20a', '30a'];
const round2 = (n: number) => Math.round(n * 100) / 100;

export function chartSeries(spec: ChartSpec): Series {
  const rnd = mulberry32(spec.seed);
  const n = spec.points;
  switch (spec.kind) {
    case 'price': {
      // paseo aleatorio con deriva; precio inicial 100
      const drift = (rnd() - 0.45) * 0.8;
      const values: number[] = [100];
      for (let i = 1; i < n; i++)
        values.push(round2(Math.max(5, values[i - 1]! * (1 + (drift + (rnd() - 0.5) * 3) / 100))));
      return {
        kind: spec.kind,
        labels: values.map((_, i) => `Día ${i + 1}`),
        values,
        unit: '€',
      };
    }
    case 'line': {
      const slope = (rnd() - 0.5) * 4;
      const values = Array.from({ length: n }, (_, i) =>
        round2(50 + slope * i + (rnd() - 0.5) * 6),
      );
      return { kind: spec.kind, labels: values.map((_, i) => `T${i + 1}`), values, unit: '' };
    }
    case 'bars': {
      const values = Array.from({ length: n }, () => Math.round(20 + rnd() * 80));
      return { kind: spec.kind, labels: values.map((_, i) => `P${i + 1}`), values, unit: '' };
    }
    case 'yield_curve': {
      const count = Math.min(n, MATURITIES.length);
      const shape = Math.floor(rnd() * 3); // 0 normal, 1 invertida, 2 plana
      const base = 2 + rnd() * 2;
      const values = Array.from({ length: count }, (_, i) => {
        const x = i / Math.max(1, count - 1);
        const bend = shape === 0 ? 2.2 * Math.sqrt(x) : shape === 1 ? -1.8 * Math.sqrt(x) : 0.1 * x;
        return round2(base + bend + (rnd() - 0.5) * 0.05);
      });
      return { kind: spec.kind, labels: MATURITIES.slice(0, count), values, unit: '%' };
    }
  }
}

export interface ChartFacts {
  first: number;
  last: number;
  /** Variación primero → último en %. */
  changePct: number;
  maxIndex: number;
  minIndex: number;
  /** ¿cada valor es ≥ el anterior? */
  nonDecreasing: boolean;
  /** ¿cada valor es ≤ el anterior? */
  nonIncreasing: boolean;
}

export function chartFacts(s: Series): ChartFacts {
  const v = s.values;
  const first = v[0]!;
  const last = v[v.length - 1]!;
  let maxIndex = 0;
  let minIndex = 0;
  v.forEach((x, i) => {
    if (x > v[maxIndex]!) maxIndex = i;
    if (x < v[minIndex]!) minIndex = i;
  });
  return {
    first,
    last,
    changePct: Math.round(((last - first) / first) * 1000) / 10,
    maxIndex,
    minIndex,
    nonDecreasing: v.every((x, i) => i === 0 || x >= v[i - 1]!),
    nonIncreasing: v.every((x, i) => i === 0 || x <= v[i - 1]!),
  };
}

/** Descripción textual generada de los datos: acompaña al `altText` del contenido para lectores de pantalla. */
export function describeSeries(s: Series): string {
  const f = chartFacts(s);
  const fmt = (x: number) => `${x.toLocaleString('es-ES', { maximumFractionDigits: 2 })}${s.unit}`;
  return `${s.values.length} puntos. Empieza en ${fmt(f.first)} y termina en ${fmt(f.last)}. Máximo ${fmt(s.values[f.maxIndex]!)} en ${s.labels[f.maxIndex]}; mínimo ${fmt(s.values[f.minIndex]!)} en ${s.labels[f.minIndex]}.`;
}
