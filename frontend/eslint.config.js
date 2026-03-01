import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import astroParser from 'astro-eslint-parser';
import localPlugin from './eslint-rules/require-testid.js';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.astro/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Module boundary: modules cannot import other modules
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['../home/*', '../calendar/*', '../settings/*', '../dev/*', '../../modules/*'],
            message: 'Modules must not import from other modules. Use core events/store instead.',
          },
        ],
      }],
    },
  },
  // core/ cannot import modules/
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/modules/*', '../modules/*', '../../modules/*'],
            message: 'Core must not import from modules.',
          },
        ],
      }],
    },
  },
  // ui/ cannot import core/ or modules/
  {
    files: ['src/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/core/*', '**/modules/*', '../core/*', '../../core/*', '../modules/*', '../../modules/*'],
            message: 'UI must not import from core or modules.',
          },
        ],
      }],
    },
  },
  // lib/ is pure utilities — no imports from core, modules, or ui
  {
    files: ['src/lib/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/core/*', '**/modules/*', '**/ui/*'],
            message: 'Lib must be pure utilities with no app imports.',
          },
        ],
      }],
    },
  },
  // Astro templates — enforce data-testid on interactive elements
  {
    files: ['src/**/*.astro'],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.astro'],
      },
    },
    plugins: { local: localPlugin },
    rules: {
      'local/require-testid': 'error',
    },
  },
];
