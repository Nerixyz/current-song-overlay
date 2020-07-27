import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy'

export default [
  ['src/background.ts', 'dist/build/background.js'],
  ['src/trackVideoProgress.ts', 'dist/build/trackVideoProgress.js'],
].map(([input, output]) => ({
  input,
  output: {
    file: output,
    format: 'iife',
  },
  plugins: [typescript({ tsconfig: 'tsconfig.json' }), copy({
    targets: [{src: 'manifest.json', dest: 'dist/build'}]
  })],
}));
