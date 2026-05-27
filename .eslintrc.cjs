module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    '.eslintrc.cjs',
    'backend',
    'node_modules',
    'scripts',
    'ejemplos',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: 'detect' } },
  rules: {
    // Props validadas por TypeScript-like patterns — desactivado intencionalmente
    'react/prop-types': 'off',
    // Entidades HTML en JSX — aceptado con cuidado
    'react/no-unescaped-entities': 'off',
    // Variables sin usar → warning (excepto parámetros con _)
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // console.log/info/warn → error en producción; permitir console.error siempre
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    // Evitar eval
    'no-eval': 'error',
    // Evitar innerHTML directo
    'no-new-func': 'error',
    // Comparaciones estrictas
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    // Evitar variables globales implícitas
    'no-undef': 'error',
    // type explícito en botones
    'react/button-has-type': 'off', // desactivado — revisión manual pendiente
  },
};
