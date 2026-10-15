// npm run content:validate [-- --update-lock]
import { writeFileSync } from 'node:fs';
import { loadContent } from '../src/content/node-loader';
import { buildIdsLock, validateContent } from '../src/content/validate';

const bundle = loadContent();
const { issues, lessons, placements } = validateContent(bundle);

if (process.argv.includes('--update-lock')) {
  const lock = { ...(bundle.idsLock ?? {}), ...buildIdsLock(lessons, placements) };
  writeFileSync('content/shared/ids-lock.json', JSON.stringify(lock, null, 2) + '\n');
  console.log(`ids-lock.json actualizado (${Object.keys(lock).length} ids)`);
}

const errors = issues.filter((i) => i.severity === 'error');
for (const i of issues) {
  console.log(`${i.severity === 'error' ? 'ERROR' : 'aviso'} [${i.code}] ${i.where}: ${i.message}`);
}
console.log(
  `content:validate → ${lessons.length} lección(es), ${placements.length} test(s) de salto, ${errors.length} error(es), ${issues.length - errors.length} aviso(s)`,
);
process.exit(errors.length ? 1 : 0);
