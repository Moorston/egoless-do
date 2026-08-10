# 混合音频 API 实施方案

## 概述

采用 Openverse API + Freesound API 混合方案，覆盖所有音乐场景。

---

## API 配置

### Openverse API

| 项目 | 详情 |
|------|------|
| **端点** | https://api.openverse.org/v1/audio/ |
| **认证** | 基础搜索无需认证 |
| **速率限制** | 有限制（具体未公开） |
| **协议** | Creative Commons |

### Freesound API

| 项目 | 详情 |
|------|------|
| **端点** | https://freesound.org/apiv2/ |
| **认证** | 需要 Token |
| **速率限制** | 有限制 |
| **协议** | CC0 / CC-BY |

---

## 实施步骤

### Phase 1：API 客户端开发（2-3天）

#### 1.1 Openverse API 客户端

```typescript
// services/openverseApi.ts

interface OpenverseTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  license: string;
  duration: number;
  thumbnail?: string;
}

interface OpenverseResponse {
  result_count: number;
  results: OpenverseTrack[];
}

export async function searchOpenverse(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<OpenverseTrack[]> {
  const url = `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Openverse API error: ${response.status}`);
  }

  const data: OpenverseResponse = await response.json();

  return data.results.map(track => ({
    id: track.id,
    title: track.title,
    artist: track.creator,
    url: track.audio_url,
    license: track.license,
    duration: track.duration,
    thumbnail: track.thumbnail,
  }));
}
```

#### 1.2 Freesound API 客户端

```typescript
// services/freesoundApi.ts

interface FreesoundTrack {
  id: number;
  name: string;
  username: string;
  url: string;
  license: string;
  duration: number;
  previewUrl: string;
}

interface FreesoundResponse {
  count: number;
  results: FreesoundTrack[];
}

export async function searchFreesound(
  query: string,
  token: string,
  page: number = 1,
  pageSize: number = 20
): Promise<FreesoundTrack[]> {
  const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&token=${token}&page=${page}&page_size=${pageSize}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Freesound API error: ${response.status}`);
  }

  const data: FreesoundResponse = await response.json();

  return data.results.map(sound => ({
    id: sound.id,
    name: sound.name,
    username: sound.username,
    url: sound.url,
    license: sound.license,
    duration: sound.duration,
    previewUrl: sound.previews['preview-hq-mp3'],
  }));
}
```

#### 1.3 混合音乐服务

```typescript
// services/musicCatalogService.ts

import { searchOpenverse } from './openverseApi';
import { searchFreesound } from './freesoundApi';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  previewUrl: string;
  license: string;
  duration: number;
  source: 'openverse' | 'freesound';
  category: MusicCategory;
}

export async function searchMusic(
  query: string,
  category: MusicCategory,
  freesoundToken: string
): Promise<MusicTrack[]> {
  // 并行搜索两个 API
  const [openverseResults, freesoundResults] = await Promise.allSettled([
    searchOpenverse(query, 1, 10),
    searchFreesound(query, freesoundToken, 1, 10),
  ]);

  const tracks: MusicTrack[] = [];

  // 处理 Openverse 结果
  if (openverseResults.status === 'fulfilled') {
    tracks.push(...openverseResults.value.map(track => ({
      id: `openverse-${track.id}`,
      title: track.title,
      artist: track.artist,
      url: track.url,
      previewUrl: track.url,
      license: track.license,
      duration: track.duration,
      source: 'openverse' as const,
      category,
    })));
  }

  // 处理 Freesound 结果
  if (freesoundResults.status === 'fulfilled') {
    tracks.push(...freesoundResults.value.map(sound => ({
      id: `freesound-${sound.id}`,
      title: sound.name,
      artist: sound.username,
      url: sound.previewUrl,
      previewUrl: sound.previewUrl,
      license: sound.license,
      duration: sound.duration,
      source: 'freesound' as const,
      category,
    })));
  }

  // 去重（按标题）
  const uniqueTracks = tracks.filter((track, index, self) =>
    index === self.findIndex(t => t.title === track.title)
  );

  return uniqueTracks;
}
```

---

### Phase 2：数据库设计（1天）

#### 2.1 音乐目录表

```sql
CREATE TABLE music_catalog (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  url TEXT NOT NULL,
  preview_url TEXT,
  license TEXT,
  duration INTEGER,
  source TEXT NOT NULL,  -- 'openverse' | 'freesound'
  category TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX idx_music_category ON music_catalog(category);
CREATE INDEX idx_music_source ON music_catalog(source);
```

#### 2.2 用户下载表

```sql
CREATE TABLE user_downloads (
  track_id TEXT PRIMARY KEY,
  downloaded_at INTEGER,
  file_path TEXT,
  FOREIGN KEY (track_id) REFERENCES music_catalog(id)
);
```

#### 2.3 用户收藏表

```sql
CREATE TABLE user_favorites (
  track_id TEXT PRIMARY KEY,
  added_at INTEGER,
  FOREIGN KEY (track_id) REFERENCES music_catalog(id)
);
```

---

### Phase 3：UI 开发（2-3天）

#### 3.1 音乐浏览页面

- 分类卡片展示
- 搜索栏
- 最近下载列表

#### 3.2 音乐列表页面

- 曲目列表项
- 下载状态显示
- 预览/下载按钮

#### 3.3 预览播放器

- 30秒预览限制
- 播放/暂停控制
- 进度条显示

---

## 配置文件

### config.json

```json
{
  "freesound": {
    "api_token": "YOUR_FREESOUND_TOKEN"
  },
  "openverse": {
    "enabled": true
  }
}
```

---

## 错误处理

### API 不可用降级

```typescript
async function searchMusicWithFallback(query: string, category: MusicCategory) {
  try {
    // 尝试混合搜索
    return await searchMusic(query, category, config.freesound.api_token);
  } catch (error) {
    console.warn('API search failed, using builtin music:', error);

    // 降级到内置音乐
    return getBuiltinMusic(category);
  }
}
```

### 网络错误处理

```typescript
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 时间估算

| 阶段 | 时间 | 依赖 |
|------|------|------|
| Phase 1 | 2-3天 | 无 |
| Phase 2 | 1天 | Phase 1 |
| Phase 3 | 2-3天 | Phase 2 |
| **总计** | **5-7天** | |

---

## 验收标准

- [ ] Openverse API 集成完成
- [ ] Freesound API 集成完成
- [ ] 混合搜索功能正常
- [ ] 音乐预览功能正常
- [ ] 音乐下载功能正常
- [ ] 错误处理和降级方案正常
- [ ] 数据库设计和实现完成
- [ ] UI 界面完成
