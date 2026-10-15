// Validador de contenido: en 0.1 solo comprueba que los JSON de /content son parseables.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let errors = 0;
let count = 0;
for (const file of walk('content').filter((f) => f.endsWith('.json'))) {
  count++;
  try {
    JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    errors++;
    console.error(`${file}: ${e.message}`);
  }
}
console.log(`content:validate → ${count} archivo(s) JSON, ${errors} error(es)`);
process.exit(errors ? 1 : 0);
