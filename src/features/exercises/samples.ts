import { exerciseSchema, type Exercise } from '../../content/schemas';

/* PROVISIONAL(tarea 1.4): ejemplos para /exercises-lab y los tests de componentes; el contenido real llega con la Unidad 1. */
const c = { difficulty: 2, bloom: 'aplicar', tags: [], concepts: ['interes-compuesto'] };

export const SAMPLE_EXERCISES = {
  multiple_choice: {
    id: 'lab-mc',
    type: 'multiple_choice',
    ...c,
    prompt: '¿Qué orden garantiza el precio pero no la ejecución?',
    options: ['De mercado', 'Limitada', 'Stop', 'Ninguna'],
    answer: 1,
    explanation: 'La limitada fija el precio; si el mercado no llega, no se ejecuta.',
    wrongExplanations: {
      '0': 'La de mercado garantiza ejecución, no precio.',
      '2': 'La stop se activa al tocar un precio y después ejecuta a mercado.',
      '3': 'La limitada sí lo garantiza.',
    },
  },
  multi_select: {
    id: 'lab-ms',
    type: 'multi_select',
    ...c,
    prompt: '¿Cuáles son costes de operar en bolsa?',
    options: ['Comisión del bróker', 'Horquilla', 'Dividendo', 'Canon de bolsa'],
    answers: [0, 1, 3],
    explanation: 'Comisión, horquilla y canon son costes; el dividendo es un ingreso.',
  },
  true_false_swipe: {
    id: 'lab-tf',
    type: 'true_false_swipe',
    ...c,
    statement: 'Una orden de mercado fija el precio máximo que pagas.',
    answer: false,
    explanation:
      'La orden de mercado se ejecuta al mejor precio disponible; el precio máximo lo fija la limitada.',
  },
  match_pairs: {
    id: 'lab-mp',
    type: 'match_pairs',
    ...c,
    prompt: 'Une cada concepto con su definición.',
    pairs: [
      { left: 'TIN', right: 'Interés sin comisiones' },
      { left: 'TAE', right: 'Coste efectivo anual' },
      { left: 'Euríbor', right: 'Índice del tipo variable' },
    ],
    explanation:
      'El TIN no incluye comisiones; la TAE sí. El Euríbor es el índice de referencia de las hipotecas variables.',
  },
  fill_blank: {
    id: 'lab-fb',
    type: 'fill_blank',
    ...c,
    prompt: 'El interés ___ se calcula sobre el capital más los intereses acumulados.',
    answers: [['compuesto']],
    explanation: 'El interés compuesto genera intereses sobre los intereses.',
  },
  order_steps: {
    id: 'lab-os',
    type: 'order_steps',
    ...c,
    prompt: 'Ordena lo que ocurre al lanzar una orden limitada de compra.',
    steps: [
      'Fijas el precio máximo',
      'La orden entra en el libro',
      'Aparece una venta a ese precio o menos',
      'Se ejecuta la operación',
    ],
    explanation: 'La orden espera en el libro hasta que hay contrapartida.',
  },
  numeric_input: {
    id: 'lab-ni',
    type: 'numeric_input',
    ...c,
    prompt: 'Inviertes 1.000 € al 5 % anual compuesto durante 2 años. ¿Cuánto tienes al final?',
    answer: 1102.5,
    unit: '€',
    tolerance: 0,
    formula: '1000 * (1 + 0.05) ^ 2',
    explanation: '1.000 × 1,05² = 1.102,50 €: el interés también genera interés.',
  },
  categorize: {
    id: 'lab-cat',
    type: 'categorize',
    ...c,
    prompt: 'Clasifica cada partida del balance.',
    categories: ['Activo', 'Pasivo'],
    items: [
      { text: 'Caja', category: 'Activo' },
      { text: 'Deuda con el banco', category: 'Pasivo' },
      { text: 'Clientes', category: 'Activo' },
      { text: 'Proveedores', category: 'Pasivo' },
    ],
    explanation:
      'Caja y clientes son derechos de cobro (activo); deuda y proveedores son obligaciones de pago (pasivo).',
  },
} as const;

export type SampleType = keyof typeof SAMPLE_EXERCISES;
export const SAMPLE_TYPES = Object.keys(SAMPLE_EXERCISES) as SampleType[];

export function sampleExercise(type: SampleType): Exercise {
  return exerciseSchema.parse(SAMPLE_EXERCISES[type]);
}
