module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: { browsers: ['last 3 versions', 'Android >= 4.1', 'iOS >= 9'] },
    }],
    ['@babel/preset-react', {
      runtime: 'automatic',
      importSource: 'react',
    }],
    '@babel/preset-typescript',
  ],
  plugins: [
    ['@babel/plugin-transform-runtime', {
      corejs: false,
      helpers: true,
      regenerator: true,
    }],
  ],
};
