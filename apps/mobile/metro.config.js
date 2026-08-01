const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve workspace packages from monorepo root
config.projectRoot = __dirname;

// MONOREPO FIX: Pin the Metro server root to the mobile dir.
// The RN Gradle plugin runs the bundle command from the repo root, which makes
// Expo walk up to the monorepo package.json. Without this, entry resolution
// fails because Metro's server root is the repo root, not the mobile dir.
if (!config.server) config.server = {};
config.server.unstable_serverRoot = __dirname;

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
  /packages\/core\/__tests__\/.*/,
];

// Force Metro to resolve @egoless-do/core from source (not dist)
const CORE_SRC = path.resolve(__dirname, '../../packages/core/src');
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@egoless-do/core': CORE_SRC,
};

module.exports = config;
