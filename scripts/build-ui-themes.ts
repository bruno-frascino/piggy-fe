import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const output = new URL('../public/themes/', import.meta.url);
mkdirSync(output, { recursive: true });

for (const mode of ['light', 'dark']) {
  const source = require.resolve(
    `primereact/resources/themes/lara-${mode}-blue/theme.css`
  );
  // Geist is already loaded by Next; avoid shipping a second font family.
  const css = readFileSync(source, 'utf8')
    .replace(/@font-face\s*\{[^}]*\}/g, '')
    .replaceAll('"Inter var"', 'var(--font-geist-sans, sans-serif)');
  writeFileSync(new URL(`${mode}.css`, output), css);
}
