import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Solo la URL pública se incluye en Angular. Las claves Fintoc viven en Flask.
const value = process.env.API_URL?.trim();
let api;
try {
  api = new URL(value);
  if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash ||
      ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname) ||
      !api.pathname.endsWith('/api')) {
    throw new Error();
  }
} catch {
  console.error('Configura API_URL con la URL HTTPS pública de Flask terminada en /api.');
  process.exit(1);
}

const root = fileURLToPath(new URL('../', import.meta.url));
const target = new URL('../src/environments/environment.deploy.ts', import.meta.url);
writeFileSync(target, `// Generado por build-deploy.mjs\nexport const environment = ${
  JSON.stringify({ production: true, apiUrl: api.href }, null, 2)};\n`);
const result = spawnSync(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'build',
  '--configuration', 'production,deployment'], { cwd: root, stdio: 'inherit' });
if (result.error) { console.error('No se pudo iniciar Angular. Ejecuta npm ci primero.'); }
process.exit(result.status ?? 1);
