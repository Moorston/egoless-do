# 音乐模块代码质量提升 — 执行计划

## Phase 1: 共享代码提取

### 1.1 提取常量 + 工具函数
- [ ] 新建 `media/utils/constants.ts`：PLAY_MODES、SLEEP_PRESETS
- [ ] 新建 `media/utils/helpers.ts`：formatTime()
- [ ] PlayerBar 改用共享常量
- [ ] FullPlayerScreen 改用共享常量

### 1.2 提取睡眠定时器 Modal
- [ ] 新建 `media/components/SleepTimerModal.tsx`（合并 PlayerBar 和 FullPlayerScreen 的重复实现）
- [ ] PlayerBar 使用共享 SleepTimerModal
- [ ] FullPlayerScreen 使用共享 SleepTimerModal

## Phase 2: ESLint warnings 修复

### 2.1 未使用的 import/变量（5 个）
- [ ] FullPlayerScreen: 移除 `toggleFavorite`、`isFavorite`
- [ ] SearchSortBar: 不移除 `FONT_SUB`（实际使用）
- [ ] MusicLibraryScreen: 移除 `Heart`、`useMusicStore`
- [ ] MusicLibraryScreen: 修复 import 顺序

### 2.2 useCallback 依赖（3 个）
- [ ] PlayerBar: 将 `PLAY_MODES` 放到组件外常量
- [ ] FullPlayerScreen: 同上
- [ ] MusicLibraryScreen: 添加 `T` 到依赖数组

### 2.3 原始数字表达式（3 个）
- [ ] MusicCategoryScreen: `String(selectedIds.size)`
- [ ] MusicLibraryScreen: `String(Math.floor(...))`
- [ ] MusicLibraryScreen: `String(downloadStatus.progress)`

### 2.4 其他（3 个）
- [ ] AudioPreviewService: 修复 import 顺序
- [ ] MusicDownloadService: 修复 `any` 赋值
- [ ] 检查 MusicStorageService max-depth

## Phase 3: 可访问性补全

### 3.1 PlayerBar
- [ ] 播放/暂停按钮 accessibilityLabel
- [ ] 上一首/下一首按钮
- [ ] 音量/队列/播放模式/睡眠定时器按钮

### 3.2 FullPlayerScreen
- [ ] 同上

### 3.3 TrackListItem
- [ ] 曲目项 accessibilityRole="button"
- [ ] 删除按钮 accessibilityLabel

### 3.4 其他组件
- [ ] CategoryCard: accessibilityLabel
- [ ] FavoriteButton: accessibilityLabel
- [ ] QueueModal: 列表项 accessibilityLabel

## Phase 4: 硬编码颜色替换

### 4.1 FavoriteButton
- [ ] `#ec4899` → Theme 颜色

### 4.2 PlayerBar + FullPlayerScreen
- [ ] `#EF4444` → Theme 或颜色常量

### 4.3 MusicLibraryScreen
- [ ] `#10b981` → Theme 颜色

## Phase 5: 验证与提交

### 5.1 验证
- [ ] ESLint 0 errors 0 warnings（音乐模块）
- [ ] 类型检查：零新增错误
- [ ] 测试：无回归

### 5.2 提交
- [ ] 提交变更
- [ ] 运行 `/trellis:finish-work`

## 验证命令

```bash
cd apps/mobile && npx eslint src/media/ 2>&1 | grep -E "error|warning" | wc -l
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -E "media" | wc -l
pnpm run test 2>&1 | tail -5
```