# 音乐模块代码质量提升

## 背景

音乐模块存在代码重复、可访问性缺失、ESLint warnings、硬编码颜色等代码质量问题。本次任务系统性修复。

## 要求

### 1. 提取共享代码（消除重复）
- 提取 `PLAY_MODES` 数组、`SLEEP_PRESETS` 数组、`formatTime()` 函数到共享模块
- 提取睡眠定时器 Modal 为共享组件（PlayerBar 与 FullPlayerScreen 复用）
- 提取 `handleCycleMode` / `handleToggleVolume` 逻辑（如适用）

### 2. 补全可访问性（accessibilityLabel）
- 为所有图标按钮（播放/暂停/上一首/下一首/删除/音量/收藏/队列/睡眠定时器）添加 accessibilityLabel
- 为可点击曲目项添加 accessibilityRole

### 3. 修复 ESLint warnings（20 个）
- 移除 5 个未使用的 import/变量
- 修复 3 个 useCallback 缺失依赖
- 修复 3 个 import 顺序
- 修复 3 个 Text 中原始数字表达式（String() 包装）
- 修复 2 个 `any` 赋值（MusicDownloadService）
- 修复 1 个嵌套过深（MusicStorageService）

### 4. Theme 变量替换硬编码颜色（7 处）
- `#ec4899` → favorite/accent 色
- `#EF4444` → danger/error 色（4 处）
- `#10b981` → success 色（2 处）

## 验收标准

- [ ] 共享代码提取完成，PlayerBar/FullPlayerScreen 无重复
- [ ] 所有交互元素有 accessibilityLabel
- [ ] ESLint 0 errors 0 warnings（音乐模块）
- [ ] 无硬编码颜色（音乐模块）
- [ ] 类型检查通过（零新增错误）
- [ ] 测试通过（无回归）
- [ ] 不使用 any 作为修复手段