import { readFileSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

/**
 * Build de producao da API.
 *
 * O `tsc` com `moduleResolution: Bundler` deixa os imports relativos sem extensao (`./app`), que o
 * Node em ESM nao resolve, e o `@nexora/shared` entrega `.ts` cru, que o Node nao executa. O
 * esbuild resolve as duas coisas: junta o codigo da API e o do `shared` num ficheiro por ponto de
 * entrada. As restantes dependencias ficam em `node_modules` e sao carregadas pelo Node como
 * sempre - embuti-las traria de volta os problemas de CommonJS dentro de ESM.
 */
const pacote = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const EXTERNAS = Object.keys(pacote.dependencies).filter((nome) => nome !== '@nexora/shared');

rmSync('dist', { recursive: true, force: true });

await build({
  entryPoints: ['src/server.ts', 'src/db/migrate.ts'],
  outdir: 'dist',
  outbase: 'src',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  external: EXTERNAS,
  logLevel: 'info',
});
