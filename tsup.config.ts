import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  minify: true,
  target: 'es2020',
  sourcemap: true,
  dts: true,
  format: ['esm', 'cjs'],
  treeshake: true,
  outDir: 'dist',
})
