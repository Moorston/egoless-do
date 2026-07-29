// ─── Test setup ───────────────────────────────────────────────────
// Global test configuration and mocks.

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

// Mock react-native (Flow 源码，Node/Vite 无法解析)
// 注意：此 mock 为 fallback，精确 mock 走 apps/mobile/test/react-native-shim.cjs alias
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: 1, select: (o: any) => o.ios },
  StyleSheet: { create: (s: any) => s, flatten: (a: any, b: any) => ({ ...a, ...b }) },
  View: () => null,
  Text: () => null,
  TouchableOpacity: () => null,
  NativeModules: {},
  NativeEventEmitter: class {
    addListener() { return { remove() {} }; }
    removeAllListeners() {}
  },
}));

// Mock expo-modules-core (react-native 的传递依赖，需要 Expo 运行时全局变量)
vi.mock('expo-modules-core', () => ({
  EventEmitter: class {
    addListener() { return { remove() {} }; }
    removeAllListeners() {}
    emit() {}
  },
  NativeModule: class {},
  SharedObject: class {},
  SharedRef: class {},
  requireNativeModule: () => ({}),
  requireOptionalNativeModule: () => ({}),
}));

// Mock expo-file-system (expo-modules-core 的传递依赖，Flow 源码)
vi.mock('expo-file-system', () => ({
  documentDirectory: 'file:///tmp/test/',
  cacheDirectory: 'file:///tmp/test/cache/',
  getInfoAsync: vi.fn().mockResolvedValue({ exists: false }),
  readAsStringAsync: vi.fn().mockResolvedValue(''),
  writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
  deleteAsync: vi.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: vi.fn().mockResolvedValue(undefined),
  copyAsync: vi.fn().mockResolvedValue(undefined),
  moveAsync: vi.fn().mockResolvedValue(undefined),
  downloadAsync: vi.fn().mockResolvedValue({ uri: 'file:///tmp/test/downloaded' }),
}));

// Mock expo-file-system/legacy — 与上面独立的子路径，fileStorage.ts 实际导入此路径。
// 若仅 mock 根路径，真实 Flow 源码会在 transform 阶段加载并反向依赖 expo-modules-core。
vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///tmp/test/',
  cacheDirectory: 'file:///tmp/test/cache/',
  getInfoAsync: vi.fn().mockResolvedValue({ exists: false }),
  readAsStringAsync: vi.fn().mockResolvedValue(''),
  writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
  deleteAsync: vi.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: vi.fn().mockResolvedValue(undefined),
  copyAsync: vi.fn().mockResolvedValue(undefined),
  moveAsync: vi.fn().mockResolvedValue(undefined),
  downloadAsync: vi.fn().mockResolvedValue({ uri: 'file:///tmp/test/downloaded' }),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

// Mock expo-sqlite
vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn().mockResolvedValue({
    execAsync: vi.fn(),
    runAsync: vi.fn().mockResolvedValue({ changes: 0 }),
    getAllAsync: vi.fn().mockResolvedValue([]),
    getFirstAsync: vi.fn().mockResolvedValue(null),
  }),
}));

// Mock @react-native-community/netinfo
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: vi.fn().mockReturnValue(() => {}),
    fetch: vi.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));
