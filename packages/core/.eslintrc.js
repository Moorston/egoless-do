const baseConfig = require('../../packages/config/eslint.base');

module.exports = {
  root: true,
  ...baseConfig,
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
