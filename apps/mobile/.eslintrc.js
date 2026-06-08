const baseConfig = require('../../packages/config/eslint.base');

module.exports = {
  root: true,
  ...baseConfig,
  plugins: [...(baseConfig.plugins || []), 'react-hooks'],
  rules: {
    ...baseConfig.rules,
    '@typescript-eslint/no-var-requires': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
