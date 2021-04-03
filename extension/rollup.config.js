import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy'
import nodeResolve from '@rollup/plugin-node-resolve';

export default [
  'background',
  ...fromDirectory('content-scripts', [
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
  plugins: [typescript({ tsconfig: 'tsconfig.json' }), nodeResolve({extensions: ['js', 'ts']}), copy({
    targets: [{src: 'manifest.json', dest: 'dist/build'}]
  })],
}));

function fromDirectory(directory, files = []) {
  return files.map(file => `${directory}/${file}`);
}
