import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy'

export default [
  'background',
  ...fromDirectory('content-scripts', [
    'bugDjFix',
    'plugDjFix',
    'trackVideoProgress',
    'soundcloud',
    'neverthink',
    'mediaSessionProxy',
    'mediaSessionProxy.inject'
  ]),
].map((file) => ({
  input: `src/${file}.ts`,
  output: {
    file: `dist/build/${file}.js`,
    format: 'iife',
  },
  plugins: [typescript({ tsconfig: 'tsconfig.json' }), copy({
    targets: [{src: 'manifest.json', dest: 'dist/build'}]
  })],
}));

function fromDirectory(directory, files = []) {
  return files.map(file => `${directory}/${file}`);
}
