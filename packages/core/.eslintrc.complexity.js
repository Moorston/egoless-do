// lint:complexity 独立配置——主 lint 不启用 complexity（团队约定 ≤15 默认不跑），
// 该配置继承主配置 + 显式启用 complexity，配合 --max-warnings ratchet（只降不升）。
// core 阈值 37 = 32 complexity 存量 + 5 既有 no-unsafe 残差（继承全部规则，跑分含残差；
// 2026-11-20 实测，proposal 预估 34 complexity 偏差 2，以实测为准）；
// core 残差清零时同步下调（见 quality-guidelines Lint Ratchet 章节）。
const mainConfig = require('./.eslintrc');

module.exports = {
  ...mainConfig,
  rules: {
    ...mainConfig.rules,
    complexity: ['warn', 15],
  },
};
