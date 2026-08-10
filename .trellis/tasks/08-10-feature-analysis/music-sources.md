# 音乐来源实施方案

## 概述

采用混合方案：Pixabay Music + Freesound + ccMixter，覆盖所有音乐场景。

---

## 音乐来源详情

### 1. Pixabay Music（主要来源）

**协议**：Pixabay License（免费商用，无需署名）

**用途**：专注、冥想、运动、睡眠背景音乐

**获取方式**：
- API: https://pixabay.com/api/docs/
- 网站: https://pixabay.com/music/

**API 限制**：
- 免费用户：100 请求/分钟
- 需要注册获取 API Key

**搜索关键词**：

| 类型 | 关键词 |
|------|--------|
| 专注 | ambient, focus, concentration, study |
| 冥想 | meditation, relaxation, calm, peaceful |
| 运动 | workout, fitness, energy, motivation |
| 睡眠 | sleep, lullaby, dream, night |

---

### 2. Freesound.org（环境音/白噪音）

**协议**：CC0 / CC-BY（需筛选）

**用途**：白噪音、环境音、自然音

**获取方式**：
- API: https://freesound.org/docs/api/
- 网站: https://freesound.org/

**API 限制**：
- 需要注册获取 API Key
- 有速率限制

**搜索关键词**：

| 类型 | 关键词 |
|------|--------|
| 白噪音 | white noise, pink noise, brown noise |
| 自然 | rain, ocean, forest, birds, thunder |
| 环境 | cafe, library, city, traffic |
| ASMR | asmr, whisper, soft sounds |

---

### 3. ccMixter（背景音乐）

**协议**：CC0 / CC-BY（需筛选）

**用途**：背景音乐、氛围音乐

**获取方式**：
- 网站: http://ccmixter.org/
- 无官方 API，需爬取或手动筛选

**搜索关键词**：

| 类型 | 关键词 |
|------|--------|
| 氛围 | ambient, atmospheric, chill |
| 放松 | relaxation, calm, peaceful |
| 背景 | background, instrumental |

---

## 音乐库设计

### 内置音乐（随 app 安装）

| 类型 | 数量 | 来源 | 说明 |
|------|------|------|------|
| 专注 | 6 首 | Pixabay | 白噪音、咖啡馆、键盘声等 |
| 冥想 | 7 首 | Pixabay + Freesound | 颂钵、风铃、鸟鸣等 |
| 运动 | 3 首 | Pixabay | 节拍、鼓点、电子 |
| 睡眠 | 3 首 | Pixabay + Freesound | 摇篮曲、ASMR、壁炉 |
| 自然 | 3 首 | Freesound | 森林、雷雨、海鸥 |
| **总计** | **22 首** | | |

### 在线扩展（可下载）

| 类型 | 数量 | 来源 | 说明 |
|------|------|------|------|
| 专注 | 20 首 | Pixabay | 更多专注音乐 |
| 冥想 | 20 首 | Pixabay + Freesound | 更多冥想音乐 |
| 运动 | 10 首 | Pixabay + ccMixter | 更多运动音乐 |
| 睡眠 | 10 首 | Pixabay + Freesound | 更多睡眠音乐 |
| 自然 | 10 首 | Freesound | 更多自然音 |
| **总计** | **70 首** | | |

---

## 实施步骤

### Phase 1：音乐筛选与下载（2-3天）

#### 1.1 Pixabay 音乐筛选
- [ ] 注册 Pixabay 账号
- [ ] 获取 API Key
- [ ] 筛选 40 首高质量音乐
- [ ] 下载并分类

#### 1.2 Freesound 音乐筛选
- [ ] 注册 Freesound 账号
- [ ] 获取 API Key
- [ ] 筛选 20 首环境音
- [ ] 下载并分类

#### 1.3 ccMixter 音乐筛选
- [ ] 手动筛选 10 首背景音乐
- [ ] 下载并分类

#### 1.4 音乐整理
- [ ] 统一文件格式（MP3）
- [ ] 统一文件命名
- [ ] 记录来源和许可证

---

### Phase 2：内置音乐集成（1-2天）

#### 2.1 文件集成
- [ ] 将 22 首内置音乐放入 `apps/mobile/assets/sounds/builtin/`
- [ ] 更新 `BUILTIN_FILES` 映射
- [ ] 更新 `TRACK_VISUAL` 映射

#### 2.2 代码更新
- [ ] 更新 `music.ts` 常量
- [ ] 更新 `useMusicStore.ts`
- [ ] 测试播放功能

---

### Phase 3：在线音乐库（3-5天）

#### 3.1 数据库设计
- [ ] 创建 `music_catalog` 表
- [ ] 创建 `user_downloads` 表
- [ ] 创建 `user_favorites` 表

#### 3.2 API 集成
- [ ] 实现 Pixabay API 客户端
- [ ] 实现 Freesound API 客户端
- [ ] 实现音乐目录服务

#### 3.3 UI 开发
- [ ] 音乐浏览页面
- [ ] 音乐列表页面
- [ ] 预览播放器
- [ ] 下载管理

---

## 音乐清单

### 内置音乐（22首）

#### 专注类（6首）
1. 白噪音 - Pixabay
2. 咖啡馆 - Pixabay
3. 键盘声 - Pixabay
4. 雨声 - Freesound (CC0)
5. 海浪 - Freesound (CC0)
6. 溪流 - Freesound (CC0)

#### 冥想类（7首）
1. 颂钵 - Pixabay
2. 西藏铃 - Pixabay
3. 风铃 - Pixabay
4. 鸟鸣 - Freesound (CC0)
5. 寺庙钟声 - Pixabay
6. 流水 - Freesound (CC0)
7. 柔和钢琴 - Pixabay

#### 运动类（3首）
1. 节拍 - Pixabay
2. 鼓点 - Pixabay
3. 电子 - Pixabay

#### 睡眠类（3首）
1. 摇篮曲 - Pixabay
2. ASMR - Freesound (CC0)
3. 壁炉 - Freesound (CC0)

#### 自然类（3首）
1. 森林 - Freesound (CC0)
2. 雷雨 - Freesound (CC0)
3. 海鸥 - Freesound (CC0)

---

## 版权合规

### 许可证记录表

| 文件名 | 来源 | 许可证 | 署名要求 | 下载日期 |
|--------|------|--------|----------|----------|
| white-noise.mp3 | Pixabay | Pixabay License | 无需 | 2026-08-10 |
| rain.mp3 | Freesound | CC0 | 无需 | 2026-08-10 |
| ... | ... | ... | ... | ... |

### 署名显示

在 app 的"关于"页面显示：

```
音乐来源：
- Pixabay (pixabay.com)
- Freesound (freesound.org)
- ccMixter (ccmixter.org)

所有音乐均遵循相应许可协议，允许免费商用。
```

---

## 时间估算

| 阶段 | 时间 | 依赖 |
|------|------|------|
| Phase 1 | 2-3天 | 无 |
| Phase 2 | 1-2天 | Phase 1 |
| Phase 3 | 3-5天 | Phase 2 |
| **总计** | **6-10天** | |

---

## 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 版权问题 | 高 | 严格筛选 CC0 音乐，记录许可证 |
| 音乐质量 | 中 | 人工试听筛选 |
| API 限制 | 中 | 缓存结果，批量下载 |
| 存储空间 | 低 | 限制下载数量，提供清理功能 |
