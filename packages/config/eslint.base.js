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
    // ── P0 rules from architecture constraints ──
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      // packages/core must stay platform-agnostic and handle promises properly
      files: ['packages/core/src/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', {
          paths: [{
            name: 'react',
            message: 'packages/core 必须保持平台无关，禁止直接导入 react',
          }, {
            name: 'react-native',
            message: 'packages/core 必须保持平台无关，禁止直接导入 react-native',
          }, {
            name: 'expo',
            message: 'packages/core 必须保持平台无关，禁止直接导入 expo-*',
          }],
          patterns: [{
            group: ['@egoless-do/mobile', '@egoless-do/web'],
            message: 'packages/core 禁止导入 apps 中的代码',
          }],
        }],
        '@typescript-eslint/no-floating-promises': ['error', { ignoreIIFE: true }],
      },
    },
    {
      // Mobile app: enforce floating promises handling (fire-and-forget must be explicit)
      files: ['apps/mobile/src/**/*.ts', 'apps/mobile/src/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-floating-promises': ['error', { ignoreIIFE: true }],
      },
    },
    {
      // Test files may use any for mocks, and fire-and-forget promises are allowed
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-floating-promises': 'off',
      },
    },
  ],
};
