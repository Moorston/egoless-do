// lint:complexity 独立配置——主 lint 不启用 complexity（团队约定 ≤15 默认不跑），
// 该配置继承主配置 + 显式启用 complexity，配合 --max-warnings ratchet（只降不升）。
// 独立文件是 Windows 下 npm script 内联 --rule JSON 的引号转义问题的跨平台正解。
const mainConfig = require('./.eslintrc');

module.exports = {
  ...mainConfig,
  rules: {
    ...mainConfig.rules,
    complexity: ['warn', 15],
  },
};
