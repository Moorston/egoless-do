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

    // ─── Forbidden Imports (Feature 自治原则 §2.2) ─────────────────
    // Feature 之间禁止直接文件引用，共享内容应提升到 src/components/ 或 packages/core
    // 此处使用 paths 列出已知的旧跨 feature import 路径，防止恢复旧写法
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '../../meditation/MeditationMusicBar',
            message: 'MeditationMusicBar 已搬迁到 src/components/MeditationMusicBar，请更新导入路径。',
          },
          {
            name: '../music/services/AudioSessionManager',
            message: 'AudioSessionManager 已搬迁到 src/services/AudioSessionManager，请更新导入路径。',
          },
          {
            name: '../music/components/AnimatedMusicIcon',
            message: 'AnimatedMusicIcon 已搬迁到 src/components/AnimatedMusicIcon，请更新导入路径。',
          },
        ],
      },
    ],
  },
};