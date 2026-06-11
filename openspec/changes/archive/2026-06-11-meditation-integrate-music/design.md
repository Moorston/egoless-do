## Approach

### 音频架构变更

移除冥想页自管的 bgPlayer，改用 useMusicStore 全局 store：

```
useMusicStore (全局)
├─ currentTrack / isPlaying / volume / loop
├─ play(track) / pause() / resume() / stop()
└─ useAudioEngine (expo-audio player)
```

### UI 布局

主卡片内部分为 3 个区域：

1. **音乐区** — MusicMiniBar 显示当前曲目，右侧"选择音乐 >"按钮跳转 MusicScreen
2. **时长选择** — TagPill 选择打坐时长（保留不变）
3. **开始按钮** — PrimaryButton（保留不变）

打坐中模式下 MusicMiniBar 仍然显示在倒计时上方。

### 打坐流程

1. 用户点击"选择音乐"→ 跳转 MusicScreen 选曲
2. 返回后 MusicMiniBar 显示当前曲目
3. 点击"开始打坐"→ 音乐继续播放（如果正在播放）
4. 打坐中可随时切歌/暂停/循环
5. 完成/停止 → 播放钵声 bell，音乐继续（不强制停止）
