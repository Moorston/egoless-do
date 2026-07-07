const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve workspace packages from monorepo root
config.projectRoot = __dirname;
// Only watch directories that mobile actually needs (prevents heap OOM)
config.watchFolders = [
  __dirname,                                    // apps/mobile
  path.resolve(__dirname, '../../packages/core'), // @egoless-do/core
];

// Ensure Metro can resolve packages from root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

// Follow symlinks for workspace packages
config.resolver.unstable_enableSymlinks = true;

// Disable .babelrc lookup in node_modules to prevent conflicts
// with packages that ship their own babel configs (e.g. @egjs/hammerjs)
config.transformer.enableBabelRCLookup = false;

// Exclude build artifacts from watched directories
const blockList = config.resolver.blockList || [];
config.resolver.blockList = [
  ...blockList,
  /packages\/core\/node_modules\/.*/,
  /packages\/core\/dist\/.*/,
  /packages\/core\/\.turbo\/.*/,
];

module.exports = config;
