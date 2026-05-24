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

module.exports = config;
