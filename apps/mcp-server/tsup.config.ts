import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  // @joboard/db is a workspace-only source package (no build step of its own),
  // so it must be bundled in rather than left as an external `import` that
  // Node's raw ESM resolver would have to follow back to unextensioned .ts files.
  noExternal: ['@joboard/db'],
});
