# 音乐浏览与下载功能设计

## 概述

允许用户在 app 内浏览、预览和下载音乐，替代当前的静态内置音乐列表。

---

## 功能需求

### 核心功能

| 功能 | 描述 |
|------|------|
| 音乐浏览 | 按分类浏览可用音乐 |
| 音乐预览 | 在线试听音乐片段 |
| 音乐下载 | 下载音乐到本地 |
| 下载管理 | 查看已下载、删除音乐 |
| 搜索功能 | 按关键词搜索音乐 |

### 用户流程

```
┌─────────────────┐
│   音乐主页      │
│   (MusicScreen) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   浏览分类      │
│   - 专注        │
│   - 冥想        │
│   - 运动        │
│   - 睡眠        │
│   - 自然        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   音乐列表      │
│   - 曲目名称    │
│   - 时长        │
│   - 下载状态    │
│   - 预览按钮    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   预览/下载     │
│   - 播放预览    │
│   - 下载按钮    │
│   - 收藏按钮    │
└─────────────────┘
```

---

## 技术方案

### 方案 1：本地音乐库（推荐）

**优点**：
- ✅ 无需网络连接
- ✅ 无版权风险
- ✅ 响应速度快
- ✅ 用户体验好

**实现**：
- 预置 50-100 首内置音乐
- 用户可选择下载到本地
- 下载后永久保存

**数据结构**：
```typescript
interface MusicCatalog {
  id: string;
  name: string;
  nameEn: string;
  category: MusicCategory;
  duration: number;  // 秒
  size: number;      // 字节
  previewUrl: string; // 预览音频 URL
  downloadUrl: string; // 下载 URL
  isDownloaded: boolean;
  isFavorite: boolean;
}
```

### 方案 2：在线音乐库

**优点**：
- ✅ 音乐库可动态更新
- ✅ 不增加 app 体积

**缺点**：
- ❌ 需要网络连接
- ❌ 需要服务器支持
- ❌ 版权风险

### 方案 3：混合方案（推荐）

**内置音乐**：预置 20-30 首常用音乐
**在线扩展**：提供在线音乐库供下载

---

## UI 设计

### 音乐浏览页面

```
┌─────────────────────────────────────┐
│ ← 音乐库                    🔍 搜索 │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │ 专注    │  │ 冥想    │          │
│  │ 6首     │  │ 7首     │          │
│  └─────────┘  └─────────┘          │
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │ 运动    │  │ 睡眠    │          │
│  │ 3首     │  │ 3首     │          │
│  └─────────┘  └─────────┘          │
│                                     │
│  ┌─────────┐                        │
│  │ 自然    │                        │
│  │ 3首     │                        │
│  └─────────┘                        │
│                                     │
├─────────────────────────────────────┤
│  [播放器]                           │
└─────────────────────────────────────┘
```

### 音乐列表页面

```
┌─────────────────────────────────────┐
│ ← 专注音乐                         │
├─────────────────────────────────────┤
│                                     │
│  🎵 白噪音                  ▶ 下载  │
│     3:00 · 2.5MB                    │
│                                     │
│  🎵 咖啡馆                  ▶ 下载  │
│     4:30 · 3.2MB                    │
│                                     │
│  🎵 键盘声 ✓已下载          ▶ 删除  │
│     2:15 · 1.8MB                    │
│                                     │
├─────────────────────────────────────┤
│  [播放器]                           │
└─────────────────────────────────────┘
```

---

## 数据存储

### 本地存储

```
apps/mobile/assets/
├── sounds/
│   ├── builtin/          # 内置音乐（随 app 安装）
│   │   ├── ocean.mp3
│   │   ├── rain.mp3
│   │   └── ...
│   └── downloaded/       # 用户下载的音乐
│       ├── white-noise.mp3
│       └── ...
```

### 数据库

```sql
-- 音乐目录表
CREATE TABLE music_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL,
  duration INTEGER,
  size INTEGER,
  preview_url TEXT,
  download_url TEXT,
  is_builtin BOOLEAN DEFAULT FALSE
);

-- 用户下载记录
CREATE TABLE user_downloads (
  track_id TEXT PRIMARY KEY,
  downloaded_at INTEGER,
  file_path TEXT,
  FOREIGN KEY (track_id) REFERENCES music_catalog(id)
);

-- 用户收藏
CREATE TABLE user_favorites (
  track_id TEXT PRIMARY KEY,
  added_at INTEGER,
  FOREIGN KEY (track_id) REFERENCES music_catalog(id)
);
```

---

## 实现步骤

### Phase 1：基础架构

1. 创建音乐目录数据结构
2. 设计本地存储方案
3. 实现下载管理器

### Phase 2：UI 开发

1. 音乐浏览页面
2. 音乐列表页面
3. 预览播放器
4. 下载进度显示

### Phase 3：功能完善

1. 搜索功能
2. 收藏功能
3. 下载队列管理
4. 错误处理

---

## 技术细节

### 下载管理器

```typescript
class MusicDownloadManager {
  // 下载音乐
  async download(trackId: string): Promise<void>;

  // 取消下载
  async cancel(trackId: string): Promise<void>;

  // 获取下载状态
  getStatus(trackId): DownloadStatus;

  // 获取已下载列表
  getDownloaded(): MusicTrack[];
}

interface DownloadStatus {
  trackId: string;
  progress: number;  // 0-100
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
}
```

### 预览播放器

```typescript
// 使用 expo-av 播放预览
const previewPlayer = new Audio.Sound();

async function previewTrack(url: string) {
  await previewPlayer.loadAsync({ uri: url });
  await previewPlayer.playAsync();

  // 30秒后自动停止
  setTimeout(async () => {
    await previewPlayer.stopAsync();
  }, 30000);
}
```

---

## 风险与对策

| 风险 | 对策 |
|------|------|
| 版权问题 | 使用 CC0 协议音乐，或自制音频 |
| 存储空间 | 限制下载数量，提供清理功能 |
| 网络问题 | 支持断点续传，离线可用 |
| 用户体验 | 提供预览，避免下载不喜欢的音乐 |

---

## 开放问题

1. **音乐来源**：使用 CC0 音乐还是自制音频？
2. **存储限制**：是否限制下载数量？
3. **更新机制**：如何更新在线音乐库？
4. **版权合规**：如何确保音乐版权合规？
