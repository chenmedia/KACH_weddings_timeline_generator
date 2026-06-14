import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-console': 'off',
    },
  },
  {
    // Server-side code (Vercel functions, DB schema/migrations, tooling configs).
    files: ['test/**/*.js', 'api/**/*.js', 'db/**/*.js', 'scripts/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
];
