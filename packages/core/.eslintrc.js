const baseConfig = require('../../packages/config/eslint.base');

module.exports = {
  root: true,
  ...baseConfig,
  // type-aware linting 必须用一个包含测试文件的 tsconfig，
  // 否则每个 .test.ts 都会报 "TSConfig does not include this file" parse error。
  // build/type-check 仍用 tsconfig.json（排除测试，不进 dist）。
  parserOptions: {
    ...baseConfig.parserOptions,
    project: './tsconfig.lint.json',
  },
  overrides: [
    ...(baseConfig.overrides || []),
    {
      // AI 本地引擎用动态 require 做平台检测（require('react-native')）与引擎懒加载。
      // core 不得静态导入 react-native（架构 P0），动态 require 是合规出口，关闭规则。
      files: ['src/ai/local-engine/**/*.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  rules: {
    ...baseConfig.rules,

    // ─── Forbidden Imports (P3 单向依赖原则) ─────────────────────
    // core 是平台无关的业务逻辑层，严禁导入 app 层或框架绑定的包
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          // 禁止导入 mobile 或 web app 代码
          {
            group: ['**/apps/mobile/**', '**/apps/web/**', '**/_archive/**'],
            message: 'P3 violation: packages/core must not import from apps/* or _archive/. Move shared logic to packages/core or inject via interface.',
          },
          // 禁止导入平台特定依赖
          {
            group: ['react-native', 'expo-*', '@react-native-*', '@expo-*', 'AsyncStorage'],
            message: 'P3 violation: packages/core must not depend on platform-specific packages (React Native / Expo). Extract interface to core and keep implementation in apps/mobile.',
          },
        ],
      },
    ],
  },
};
