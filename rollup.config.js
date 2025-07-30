import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/modules/index.js',
  output: [
    {
      file: 'dist/bundle.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/bundle.min.js',
      format: 'es',
      plugins: [terser()],
      sourcemap: true
    }
  ],
  watch: {
    include: 'src/**',
    exclude: 'src/modules/test/**'
  }
};