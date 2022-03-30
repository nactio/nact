// rollup.config.js
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'index.ts',
  output: {
    sourcemap: true,
    file: 'index.js',
    name: 'nact',
    format: 'umd'
  },
  plugins: [typescript({ tsconfig: './tsconfig.json' })]
};
