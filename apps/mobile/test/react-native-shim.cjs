/**
 * Pre-compiled CommonJS shim for react-native (test-only).
 *
 * PURPOSE: Avoid Vite/Rollup SSR transform parsing react-native's Flow-typed
 * entry (index.js), which causes "Unexpected token 'typeof'" in vitest.
 *
 * This shim provides the minimal surface that @egoless-do/core and sync
 * modules touch during tests. It is NOT a full react-native implementation.
 *
 * See: openspec/changes/tech-debt-cleanup-batch-1/design.md § 设计假设漂移记录
 */
module.exports = {
  // Platform
  Platform: { OS: 'ios', Version: 1, select: (o) => o.ios, isTesting: true },

  // StyleSheet (no-op)
  StyleSheet: {
    create: (s) => s,
    flatten: (a, b) => Object.assign({}, a, b),
    hairlineWidth: 1,
  },

  // Primitive components (render-null stubs)
  View: function View() {},
  Text: function Text() {},
  ScrollView: function ScrollView() {},
  TouchableOpacity: function TouchableOpacity() {},
  Pressable: function Pressable() {},
  TextInput: function TextInput() {},
  Image: function Image() {},
  FlatList: function FlatList() {},
  ActivityIndicator: function ActivityIndicator() {},

  // Native modules (empty)
  NativeModules: {},
  NativeEventEmitter: class NativeEventEmitter {
    addListener() { return { remove() {} }; }
    removeAllListeners() {}
  },

  // App registry
  AppRegistry: { registerComponent: () => {} },

  // Dimensions
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }) },

  // Misc no-ops
  PixelRatio: { get: () => 3, getFontScale: () => 1, getPixelSizeForLayoutSize: (n) => n * 3 },
  Alert: { alert: () => {} },
  InteractionManager: { runAfterInteractions: (cb) => cb && cb() },
  Keyboard: { addListener: () => ({ remove() {} }), removeAllListeners() {} },
};
