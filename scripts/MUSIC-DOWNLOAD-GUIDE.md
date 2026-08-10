# 🎵 音乐下载指南

## 方法一：使用 Pixabay API（推荐）

### 步骤 1：注册 Pixabay 账号
1. 访问 https://pixabay.com/
2. 点击 "Sign Up" 注册账号（免费）

### 步骤 2：获取 API Key
1. 登录后访问 https://pixabay.com/api/docs/
2. 页面会显示你的 API Key（类似 `12345678-abcdef1234567890`）
3. 复制这个 Key

### 步骤 3：设置环境变量

**Windows (PowerShell):**
```powershell
$env:PIXABAY_API_KEY="your_api_key_here"
```

**Windows (CMD):**
```cmd
set PIXABAY_API_KEY=your_api_key_here
```

**Mac/Linux:**
```bash
export PIXABAY_API_KEY=your_api_key_here
```

### 步骤 4：运行下载脚本

**使用 Node.js 脚本（推荐）:**
```bash
node scripts/pixabay-downloader.js
```

**或使用 Shell 脚本:**
```bash
bash scripts/download-pixabay-music.sh
```

### 步骤 5：验证下载
```bash
ls -lh apps/mobile/assets/sounds/*.mp3
```

---

## 方法二：手动下载（最简单）

### 访问 Pixabay 音乐页面
https://pixabay.com/music/

### 搜索并下载以下音乐

| 文件名 | 搜索关键词 | 分类 |
|--------|-----------|------|
| `white-noise.mp3` | white noise | 专注 |
| `cafe.mp3` | cafe ambience | 专注 |
| `keyboard.mp3` | keyboard typing | 专注 |
| `singing-bowl.mp3` | singing bowl | 冥想 |
| `tibetan-bell.mp3` | tibetan bell | 冥想 |
| `water-flow.mp3` | water flow stream | 冥想 |
| `beat.mp3` | beat rhythm | 运动 |
| `drums.mp3` | drums percussion | 运动 |
| `electronic.mp3` | electronic music | 运动 |
| `lullaby.mp3` | lullaby sleep | 睡眠 |
| `asmr.mp3` | asmr soft | 睡眠 |
| `fireplace.mp3` | fireplace crackling | 睡眠 |
| `forest.mp3` | forest nature | 自然 |
| `thunderstorm.mp3` | thunderstorm rain | 自然 |
| `seagulls.mp3` | seagulls ocean | 自然 |

### 下载后放置位置
```
apps/mobile/assets/sounds/
├── white-noise.mp3
├── cafe.mp3
├── keyboard.mp3
├── singing-bowl.mp3
├── tibetan-bell.mp3
├── water-flow.mp3
├── beat.mp3
├── drums.mp3
├── electronic.mp3
├── lullaby.mp3
├── asmr.mp3
├── fireplace.mp3
├── forest.mp3
├── thunderstorm.mp3
└── seagulls.mp3
```

---

## 方法三：使用其他免费音乐源

### Freesound.org
- 访问 https://freesound.org/
- 注册账号并搜索上述关键词
- 下载 MP3 格式文件

### Free Music Archive
- 访问 https://freemusicarchive.org/
- 搜索 ambient/nature 类别

### YouTube Audio Library
- 访问 https://studio.youtube.com/channel/audio
- 搜索 sound effects

---

## ⚠️ 注意事项

1. **文件格式**：必须是 MP3 格式
2. **文件大小**：建议每个文件 1-5MB（太大会增加 app 体积）
3. **音质**：建议 128kbps 或更高
4. **版权**：确保下载的音乐是免费可商用的（Pixabay、Freesound 等都是 CC0 或类似协议）

---

## 验证下载

下载完成后，运行以下命令验证：

```bash
ls -lh apps/mobile/assets/sounds/*.mp3
```

应该看到所有 15 个新文件都存在且大小 > 0。
