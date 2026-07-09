# 全维度审查报告 — 依赖/无障碍/平台/性能/i18n

> 审查日期：2026-07-09
> 审查方法：5 个并行 Agent
> 共发现：**60 项问题**

---

## 总体统计

| 维度 | 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | ⚪ LOW | **合计** |
|------|------------|---------|-----------|--------|----------|
| 📦 依赖审计 | 3 | 1 | 2 | 0 | **6** |
| ♿ 无障碍 | 1 | 3 | 1 | 0 | **5** |
| 📱 平台兼容 | 1 | 2 | 2 | 4 | **9** |
| ⚡ 性能 | 2 | 3 | 3 | 1 | **9** |
| 🌐 i18n | 3 | 2 | 2 | 1 | **8** |
| **合计** | **10** | **11** | **10** | **6** | **37** |

---

## 🔴 CRITICAL（10项）

### 依赖（3项）

| # | 问题 | 当前 | 修复 |
|---|------|------|------|
| C-1 | **nodemailer SSRF/任意文件读取** | 8.0.7（root）+ 6.10.1（api） | 升级至 ≥9.0.1 |
| C-2 | **postcss XSS**（CVE-2026-41305） | 8.4.49（Expo 传递） | pnpm.overrides 锁定 ≥8.5.10 |
| C-3 | **uuid 缓冲区越界** | 7.0.3（xcode 插件传递） | 等待 Expo 升级或锁定 |

### 无障碍（1项）

| # | 问题 | 位置 | 修复 |
|---|------|------|------|
| C-4 | **底部 Tab 导航无任何无障碍属性** | `navigation/index.tsx:106-164` | 添加 `accessibilityRole="tab"` + `accessibilityState` |

### 平台（1项）

| # | 问题 | 位置 | 修复 |
|---|------|------|------|
| C-5 | **iOS 图片选择器崩溃** — 缺 `NSCameraUsageDescription`/`NSPhotoLibraryUsageDescription` | `app.json` + `Info.plist` | 添加两个 Info.plist key |

### 性能（2项）

| # | 问题 | 位置 | 修复 |
|---|------|------|------|
| C-6 | **内联 `renderItem` 无 `useCallback`** | `MindScreen.tsx:297/376`、`Leaderboard.tsx:111` | useCallback 包裹或提取为组件 |
| C-7 | **所有 `<Image>` 缺 `resizeMode`/占位图** | 6 个文件 | 添加 `resizeMode="cover"` + `defaultSource` |

### i18n（3项）

| # | 问题 | 规模 | 修复 |
|---|------|------|------|
| C-8 | **zh ↔ en 缺失 ~39 个翻译键** | 13 en 缺 + 26 zh 缺 | 补齐翻译资源文件 |
| C-9 | **硬编码中文字符串 ~80+ 处** | UI 50+ + AI 30+ | 迁入 i18n 资源文件 |
| C-10 | **日期格式化硬编码 `'zh-CN'` ~20 处** | 多个屏幕 + core 层 | 创建 `formatDate` 工具函数 |

---

## 🟠 HIGH（11项）

### 依赖（1项）

| # | 问题 | 修复 |
|---|------|------|
| H-1 | Expo 54 → 57 落后 3 个大版本；Sentry 6 → 8 落后 2 个大版本 | 整体升级 |

### 无障碍（3项）

| # | 问题 | 位置 |
|---|------|------|
| H-2 | **所有 TouchableOpacity 缺 accessibilityLabel/accessibilityRole（~30 处）** | 全局 |
| H-3 | **所有 Pressable 缺 accessibilityLabel/accessibilityRole（~55 处）** | 全局 |
| H-4 | **所有 TextInput 缺 accessibilityLabel（100+ 处）** — 根源：`ThemedInput` 组件 | `UI.tsx:208` |

### 平台（2项）

| # | 问题 | 修复 |
|---|------|------|
| H-5 | iOS 后台模式不一致 — 手动 Info.plist 缺 `location` | 同步 app.json 与 Info.plist |
| H-6 | 缺少 RTL 布局处理（`AndroidManifest` 已声明 `supportsRtl=true` 但代码未处理） | 使用 `start`/`end` 替代 `left`/`right` |

### 性能（3项）

| # | 问题 | 位置 |
|---|------|------|
| H-7 | **所有 FlatList 缺 `getItemLayout`/`windowSize`/`maxToRenderPerBatch`** | 全局 |
| H-8 | **大量内联样式**（`AddFoodModal.tsx`、`ExerciseHistoryScreen.tsx`、`FastHistoryPage.tsx`） | 3 个文件 |
| H-9 | **`VirtualList.tsx` 缺 `estimatedItemSize`** — FlashList 布局跳跃 | `VirtualList.tsx:30` |

### i18n（2项）

| # | 问题 | 修复 |
|---|------|------|
| H-10 | AI 层提示/提醒全部硬编码中文（`context-reminder.ts`、`ai-service.ts`、`cloud-providers.ts`） | 迁入 i18n 资源 |
| H-11 | 日期格式化无 locale 参数 ~8 处 | 使用 locale-aware 工具函数 |

---

## 🟡 MEDIUM（10项）

### 依赖（2项）

| # | 问题 |
|---|------|
| M-1 | 根目录误列 4 个依赖（bcryptjs、better-sqlite3、nodemailer、expo-image） |
| M-2 | metro 3 个版本共存（0.83.3/0.83.7/0.84.4），增加 bundle 体积 |

### 无障碍（1项）

| # | 问题 |
|---|------|
| M-3 | FlatList/FlashList 缺 `ListEmptyComponent`（~14 处） |

### 平台（2项）

| # | 问题 |
|---|------|
| M-4 | 3 个文件 KeyboardAvoidingView Android behavior 为 `undefined`（应为 `'height'`） |
| M-5 | expo-haptics/expo-location 导入不一致（部分惰性加载，部分直接导入） |

### 性能（3项）

| # | 问题 | 位置 |
|---|------|------|
| M-6 | `CheckinModal.tsx`/`HomeScreen.tsx` useShallowStore 选择器粒度过粗 | 2 个文件 |
| M-7 | `VirtualList.tsx`/`ItemManagerPanel.tsx` renderItem 箭头函数包装器多余 | 2 个文件 |
| M-8 | `CheckinModal.tsx` useCallback 依赖数组过大（~20 属性） | CheckinModal.tsx |

### i18n（2项）

| # | 问题 |
|---|------|
| M-9 | 数字格式化 `toLocaleString()` 无 locale 参数（~15 处） |
| M-10 | `useT()` 接受 `any string` 而非 `I18nKey`（类型安全缺口） |

---

## ⚪ LOW（6项）

| # | 维度 | 问题 |
|---|------|------|
| L-1 | 平台 | StatusBar 样式未跨屏幕传播 |
| L-2 | 平台 | expo-secure-store 无 Face ID 回退配置 |
| L-3 | 平台 | 低端设备检测仅限 Android |
| L-4 | 性能 | `SyncApplyService.ts:59` console.warn 未受 `__DEV__` 防护 |
| L-5 | i18n | zh-Hant 与 zh/en 有 2 个键不一致 |
| L-6 | 依赖 | `@gorhom/bottom-sheet` 可能未使用 |

---

## 修复优先级建议

| 批次 | 包含项 | 工作量 | 性质 |
|------|--------|--------|------|
| **A 安全修复** | C-1, C-2, C-3 | 1h | 升级依赖版本 |
| **B iOS 兼容** | C-5, H-5 | 1h | Info.plist 配置 |
| **C 无障碍基础** | C-4, H-2, H-3, H-4 | 3h | 添加 accessibility 属性 |
| **D 性能优化** | C-6, C-7, H-7, H-8, H-9, M-6, M-7 | 4h | 渲染优化 |
| **E i18n 补全** | C-8, C-9, C-10, H-10, H-11, M-9 | 5h | 翻译 + 工具函数 |
| **F 依赖清理** | H-1, M-1, M-2, L-6 | 2h | 升级 + 清理 |