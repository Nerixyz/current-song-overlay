import typescript from '@rollup/plugin-typescript';

export default [
  ['src/background.ts', 'dist/build/background.js'],
].map(([input, output]) => ({
  input,
  output: {
    file: output,
    format: 'iife',
  },
  plugins: [typescript({ tsconfig: 'tsconfig.json' })],
}));
