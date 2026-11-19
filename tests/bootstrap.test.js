import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('opening app.html as a local file explains how to launch without importing modules', () => {
  const root = { innerHTML: 'Готуємо твої колоди…' };
  let imports = 0;
  runInNewContext(
    readFileSync(new URL('../src/scripts/app/bootstrap.js', import.meta.url), 'utf8'),
    {
      location: { protocol: 'file:' },
      document: { getElementById: () => root },
    },
    {
      importModuleDynamically() {
        imports++;
        throw new Error('Local modules must not load');
      },
    },
  );
  assert.equal(imports, 0);
  assert.match(root.innerHTML, /http:\/\/127\.0\.0\.1:8765\/app\.html/);
  assert.match(root.innerHTML, /npm run dev/);
  assert.doesNotMatch(root.innerHTML, /Готуємо твої колоди/);
});
