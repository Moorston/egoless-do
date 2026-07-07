module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true, // auto-detect closest tsconfig.json
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    'eqeqeq': ['error', 'smart'],
    // ── Import rules ──
    'import/no-duplicates': 'error',
    'import/order': ['warn', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc' },
    }],
    'import/newline-after-import': ['warn', { count: 1 }],
    // ── Architecture rules (docs/architecture-rules.md) ──
    'max-lines-per-function': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-depth': ['warn', 4],
  },
  overrides: [
    {
      // Test files may use any for mocks
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
};
