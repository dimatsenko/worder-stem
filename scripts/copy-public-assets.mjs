import { cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const project = new URL('../', import.meta.url);
// The catalog is fetched at runtime. Vite handles images and fonts referenced in HTML/CSS.
await cp(new URL('assets/data/', project), new URL('dist/assets/data/', project), {
  recursive: true,
  filter: (source) => !source.endsWith('.DS_Store'),
});
console.log(`Copied public assets to ${fileURLToPath(new URL('dist/', project))}`);
