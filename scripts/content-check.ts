// npm run content:check [-- --today=2026-10-15] [-- --window=30]
// Lista lo que tiene verificarAntesDe vencido o próximo. Sale con 1 si hay vencidos.
import { loadContent } from '../src/content/node-loader';
import { findExpiring, validateContent } from '../src/content/validate';
import { glossarySchema } from '../src/content/schemas';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const today = arg('today') ?? new Date().toISOString().slice(0, 10);
const windowDays = Number(arg('window') ?? 30);

const bundle = loadContent();
const { lessons } = validateContent(bundle);
const glossary = glossarySchema.safeParse(bundle.glossary);
const items = [
  ...lessons.map((l) => ({ id: l.id, verificarAntesDe: l.verificarAntesDe })),
  ...(glossary.success
    ? glossary.data.map((g) => ({ id: `glosario:${g.id}`, verificarAntesDe: g.verificarAntesDe }))
    : []),
];
const found = findExpiring(items, today, windowDays);
if (!found.length)
  console.log(`content:check → nada vence en los próximos ${windowDays} días (hoy ${today})`);
for (const f of found)
  console.log(
    f.kind === 'vencido'
      ? `VENCIDO  ${f.id}: ${f.date} (hace ${-f.daysLeft} días)`
      : `próximo  ${f.id}: ${f.date} (en ${f.daysLeft} días)`,
  );
process.exit(found.some((f) => f.kind === 'vencido') ? 1 : 0);
