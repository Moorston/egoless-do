import type { UserConfig } from "@tarojs/cli";

const config: UserConfig = {
  projectName: "egoless-do",
  designWidth: 750,
  deviceRatio: { 750: 1, 375: 2 },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: "webpack5",
  mini: {
    postcss: { pxtransform: { enable: true } },
  },
};
export default config;

