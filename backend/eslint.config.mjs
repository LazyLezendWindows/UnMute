import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'data/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      // Request bodies and driver rows are loosely typed at the edges; validation happens in zod.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Never log from request paths without intent; console.debug/log are for scripts only.
      'no-console': ['warn', { allow: ['info', 'warn', 'error', 'log'] }],
      eqeqeq: ['error', 'always'],
    },
  }
);
