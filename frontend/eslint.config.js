// @ts-check
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

/**
 * ESLint flat config enforcing module boundary rules via no-restricted-imports.
 *
 * Core rule: modules in src/modules/<name>/* must NOT import from other modules.
 *   Allowed imports for a module:
 *     - src/core/*
 *     - src/ui/*
 *     - src/lib/*
 *     - their own src/modules/<name>/* files (relative imports only)
 *
 * The constraint is enforced by forbidding absolute @modules/ imports and
 * cross-module relative path patterns from within any module directory.
 */

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'scripts/**'],
  },

  // ─── Base TypeScript config for all src files ────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // ─── Module boundary rules ───────────────────────────────────────────────
  // Applied only to files inside src/modules/**
  {
    files: ['src/modules/**/*.{ts,tsx}'],
    rules: {
      /**
       * Modules must not import from other modules.
       *
       * Forbidden patterns (when inside src/modules/foo/):
       *   - Any absolute @modules/* import   (would cross module boundary)
       *   - Relative paths that traverse up to another module folder
       *     e.g. "../../bar/..." or "../../../modules/bar/..."
       *
       * Allowed:
       *   - relative imports within the same module  (./foo, ../foo stay inside)
       *   - ../../core/*  ../../ui/*  ../../lib/*
       *   - @core/*  @ui/*  @lib/*
       */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Forbid direct imports from other module directories.
              // Pattern: from a module file, going up 2+ levels into modules/
              // e.g.  ../other-module/...  or  ../../modules/other-module/...
              group: ['**/modules/!(.)*/'],
              message:
                'Modules must not import from other modules. ' +
                'Use the EventBus or Storage from src/core/* for cross-module communication.',
            },
          ],
        },
      ],
    },
  },

  // ─── Core boundary rules ─────────────────────────────────────────────────
  // Core files must not import module implementations (only registry.ts may).
  {
    files: ['src/core/**/*.{ts,tsx}'],
    ignores: ['src/registry.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../modules/**', '../../modules/**', '**/modules/**'],
              message:
                'Core must not import module implementations. ' +
                'Only src/registry.ts is allowed to import modules.',
            },
          ],
        },
      ],
    },
  },
];
