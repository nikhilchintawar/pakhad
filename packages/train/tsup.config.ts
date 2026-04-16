import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    runtime: 'src/runtime/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm', 'cjs'],
  banner: ({ format }) => {
    if (format === 'esm') {
      return { js: '' };
    }
    return {};
  },
  dts: true,
  splitting: true,
  clean: true,
  sourcemap: true,
});
