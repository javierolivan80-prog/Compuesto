/*
 * Genera los modelos de referencia de Naranjas del Turia (skill `modelo-referencia`) en
 * /content/shared/models/. Uso: `npm run models:build`. Los tests de src/content/models.test.ts
 * comprueban que los JSON cuadran y que coinciden con lo que este script produce.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildModels } from '../src/content/reference-models';

const outDir = resolve(import.meta.dirname, '../content/shared/models');
mkdirSync(outDir, { recursive: true });
for (const [file, model] of Object.entries(buildModels())) {
  writeFileSync(resolve(outDir, file), JSON.stringify(model, null, 2) + '\n');
  console.log(`✔ ${file}`);
}
