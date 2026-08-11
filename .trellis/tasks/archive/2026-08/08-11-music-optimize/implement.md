# 音乐模块优化 — 执行计划

## Phase 1: 基础设施

### 1.1 Store 层扩展
- [x] `useMusicStore` 添加 `recentlyPlayed: string[]` + `removeFromQueue(index)`
- [x] `MusicStorageService` 添加 `loadRecentlyPlayed` / `saveRecentlyPlayed`
- [x] `play()` 时更新最近播放记录

### 1.2 WaveformBar 拖动支持
- [x] 扩展 WaveformBar 支持 onPanResponder 拖动
- [x] 拖动时显示预览时间

## Phase 2: 功能增强

### 2.1 搜索 + 排序
- [x] MusicCategoryScreen 头部添加搜索栏
- [x] 添加排序按钮（名称）
- [x] 实时过滤 + 排序

### 2.2 队列管理
- [x] 新增 QueueModal 组件
- [x] PlayerBar 添加队列按钮
- [x] 支持查看/删除/跳转队列曲目

### 2.3 最近播放
- [x] MusicScreen 添加最近播放列表（水平滚动）
- [x] 持久化支持

## Phase 3: 播放器界面增强

### 3.1 全屏播放器
- [x] 新增 FullPlayerScreen 组件
- [x] PlayerBar 点击触发全屏
- [x] 大尺寸可视化 + 播放控制
- [x] 手势滑动关闭

## Phase 4: 界面视觉优化

### 4.1 主界面布局
- [x] Now Playing 卡片阴影/渐变增强
- [x] 分类网格间距优化
- [x] 空状态优化

### 4.2 主题适配
- [x] 审核所有颜色值使用 Theme 变量

## Phase 5: 音乐库管理

### 5.1 批量操作
- [x] TrackListItem 长按进入多选模式
- [x] 批量删除用户曲目

### 5.2 导入优化
- [x] 导入成功后自动刷新列表（store 自动更新）
- [x] 导入进度提示（importing 状态 + 文字提示）

## Phase 6: 验证与提交

### 6.1 验证
- [x] 类型检查：项目代码 0 错误
- [x] 测试：155 文件 1937 全部通过
- [x] Lint：0 errors

### 6.2 提交
- [ ] 提交变更
- [ ] 运行 `/trellis:finish-work`

## 验证命令

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "node_modules" | wc -l
pnpm run test 2>&1 | tail -5
cd apps/mobile && npx eslint src/media/ 2>&1 | grep "error" | grep -v "warning" | wc -l
```