# 音乐模块重构 — Service Extraction

## 实现阶段

### Phase 1：服务提取（已完成 ✓）

#### 1.1 MusicPlaybackService
- [x] 提取播放队列管理逻辑到 `MusicPlaybackService`
- [x] 支持 sequential/shuffle/repeat-one/repeat-all 播放模式
- [x] 通过 `playbackState` 回调与 store 解耦
- [x] `toggleLoop()` 切换循环模式

#### 1.2 MusicStorageService
- [x] 提取持久化逻辑到 `MusicStorageService`
- [x] 用户音乐增删改查（`addUserTrack`, `removeUserTrack`, `loadUserTracks`, `saveUserTracks`）
- [x] 收藏管理（`loadFavorites`, `saveFavorites`, `toggleFavorite`）
- [x] 音量管理（`loadVolume`, `saveVolume`）
- [x] 播放模式持久化（`loadPlayMode`, `savePlayMode`）
- [x] `expo-file-system` 的 File/Directory API 实现
- [x] 文件存在性验证

#### 1.3 MusicTimerService
- [x] 提取睡眠定时器逻辑到 `MusicTimerService`
- [x] 定时器管理（set/clear/destroy）
- [x] `onTimeUp` 回调触发停止播放

#### 1.4 Store 重构
- [x] `useMusicStore` 从内联逻辑改为委托调用
- [x] 移除 ~80 行内联文件 I/O 代码
- [x] 保持外部接口完全兼容（无 break change）
- [x] 纯选择器函数保留在 store 模块（`computeTracksByCategory`, `computeCategoryMeta`）

---

### Phase 2：验证与质量（当前阶段）

#### 2.1 类型检查
- [x] `@egoless-do/core` 类型检查通过（cached, 430ms）
- [x] `apps/mobile` 类型检查 — 修复 useMusicStore 7 个错误（sleepTimerRef 孤儿引用 + 函数体缺 brace），剩余 41 个为预存问题

#### 2.2 Lint 检查
- [x] Lint 通过（exit code 0）

#### 2.3 单元测试
- [x] 运行 `pnpm run test` — 148 passed, 7 failed（均为预存问题，非本模块引入）

#### 2.4 代码审查
- [x] 审查 service 接口设计是否合理 — 通过回调模式解耦，无直接 store import
- [x] 确认无架构违规 — 符合 5 个规范文档要求

---

### Phase 3：提交与归档

#### 3.1 提交
- [x] 提交 4 个文件：MusicPlaybackService.ts, MusicStorageService.ts, MusicTimerService.ts, useMusicStore.ts

#### 3.2 任务完成
- [x] 更新 spec 文档 — 补充 Service Extraction 模式到 state-management.md
- [ ] 运行 `/trellis:finish-work`

---

## 关键文件

### 新增文件

| 文件 | 用途 |
|------|------|
| `apps/mobile/src/media/services/MusicPlaybackService.ts` | 播放队列管理服务 |
| `apps/mobile/src/media/services/MusicStorageService.ts` | 音乐数据持久化服务 |
| `apps/mobile/src/media/services/MusicTimerService.ts` | 睡眠定时器服务 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `apps/mobile/src/media/useMusicStore.ts` | 重构为委托调用 3 个新服务，移除 ~80 行内联逻辑 |

---

## 架构说明

```
┌───────────────────────────────────────────────────────────────────┐
│                         Service Extraction                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  useMusicStore (Zustand)                                          │
│       │                                                           │
│       ├──→ MusicPlaybackService    ← 播放/暂停/队列/模式           │
│       ├──→ MusicStorageService     ← 持久化 CRUD                  │
│       └──→ MusicTimerService       ← 睡眠定时器                    │
│                                                                    │
│  回调模式：                                                        │
│  ┌───────────────────────────────────────────────────────┐        │
│  │ Service 通过构造函数传入的 updateState 回调更新 store    │        │
│  │ Service 不直接 import store，通过 getState 读取状态      │        │
│  └───────────────────────────────────────────────────────┘        │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

## 测试计划

### 单元测试
- [ ] MusicPlaybackService 测试 — 队列管理、播放模式
- [ ] MusicStorageService 测试 — CRUD 操作
- [ ] MusicTimerService 测试 — 定时器管理

### 集成测试
- [ ] Store 与服务集成测试
- [ ] 数据持久化正确性

---

## 验收标准

- [x] 播放功能正常（play/pause/resume/stop）
- [x] 队列管理正常（next/previous/setQueue）
- [x] 播放模式正常（sequential/shuffle/repeat-one/repeat-all）
- [x] 用户音乐管理正常（add/remove/load）
- [x] 收藏功能正常（toggle/load）
- [x] 音量持久化正常
- [x] 睡眠定时器正常
- [x] Store 外部接口兼容（无 break change）
- [ ] 类型检查通过
- [ ] 测试通过