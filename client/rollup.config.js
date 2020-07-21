import typescript from "@rollup/plugin-typescript";

export default {
    input: 'src/index.ts',
    output: {
        file: 'public/bundle.js',
        format: 'iife'
    },
    plugins: [typescript({tsconfig: 'tsconfig.json'})]
};
