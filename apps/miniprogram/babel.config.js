module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-taro', {
        framework: 'react',
        ts: true,
        compiler: 5,
      }],
    ],
  };
};
