const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve workspace packages from monorepo root
config.projectRoot = __dirname;
config.watchFolders = [
  path.resolve(__dirname, '../..'),  // monorepo root
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

// Exclude web app build outputs and other non-mobile directories from Metro's file map
const blockList = config.resolver.blockList || [];
config.resolver.blockList = [
  ...blockList,
  /apps\/web\/\.next\/.*/,
  /apps\/web\/node_modules\/.*/,
  /\.openspec\/.*/,
];

module.exports = config;
