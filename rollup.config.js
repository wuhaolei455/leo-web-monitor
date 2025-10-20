const resolve = require('@rollup/plugin-node-resolve').default;
const typescript = require('@rollup/plugin-typescript').default;
const terser = require('@rollup/plugin-terser').default;
const dts = require('rollup-plugin-dts').default;
const { readFileSync } = require('fs');
const { join } = require('path');

const production = !process.env.ROLLUP_WATCH;

// 读取package.json中的版本号
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const version = packageJson.version;

// 创建版本替换插件
const versionPlugin = {
  name: 'version-plugin',
  transform(code) {
    return code.replace(/process\.env\.SDK_VERSION/g, `"${version}"`);
  }
};

module.exports = [
  // ES modules build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      versionPlugin,
      production && terser()
    ].filter(Boolean)
  },
  
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      versionPlugin,
      production && terser()
    ].filter(Boolean)
  },
  
  // UMD build for browsers
  {
    input: 'src/umd-index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'LeoWebMonitor',
      sourcemap: true,
      exports: 'default'
    },
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      versionPlugin,
      production && terser()
    ].filter(Boolean)
  },
  
  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [
      dts()
    ]
  }
];
