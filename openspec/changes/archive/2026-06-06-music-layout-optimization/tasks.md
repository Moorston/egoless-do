## 1. 数据层扩展

- [x] 1.1 扩展 useMusicStore：增加 favorites 状态、toggleFavorite action、loadFavorites、saveFavorites 持久化 (apps/mobile/src/features/music/useMusicStore.ts)
- [x] 1.2 扩展 constants/music.ts：增加分类元数据映射 MUSIC_CATEGORY_META（图标、渐变色、背景图 require） (packages/core/src/constants/music.ts)
- [x] 1.3 新增 i18n key：musicFavorites、musicTrackCount 等 (packages/core/src/i18n/)

## 2. 波形进度条组件

- [x] 2.1 创建 WaveformBar 组件：固定种子伪随机波形、已播/未播颜色、Pressable 点击跳转 (apps/mobile/src/features/music/WaveformBar.tsx)
- [x] 2.2 集成 useAudioPlayerStatus 获取 currentTime/duration 实时更新进度

## 3. 播放动画组件

- [x] 3.1 创建 AnimatedMusicIcon 组件：3 竖条交替跳动动画，播放/静止状态切换 (apps/mobile/src/features/music/AnimatedMusicIcon.tsx)

## 4. 收藏按钮组件

- [x] 4.1 创建 FavoriteButton 组件：空心♡/实心♥切换，调用 store.toggleFavorite (apps/mobile/src/features/music/FavoriteButton.tsx)

## 5. 分类卡片组件

- [x] 5.1 创建 CategoryCard 组件：背景图+图标+分类名+曲目数，点击回调 (apps/mobile/src/features/music/CategoryCard.tsx)

## 6. 分类列表页

- [x] 6.1 创建 MusicCategoryScreen：接收 category 参数，显示曲目列表（WaveformBar + FavoriteButton + AnimatedMusicIcon + 底部 PlayerBar） (apps/mobile/src/features/music/MusicCategoryScreen.tsx)
- [x] 6.2 注册 MusicCategory 路由 (apps/mobile/src/navigation/types.ts, index.tsx)

## 7. 主页重构

- [x] 7.1 重构 MusicScreen：改为分类卡片网格布局（CategoryCard 2列），底部 PlayerBar (apps/mobile/src/features/music/MusicScreen.tsx)

## 8. 播放器增强

- [x] 8.1 重构 PlayerBar：增加 WaveformBar 进度条 + AnimatedMusicIcon 替代静态 ▶ (apps/mobile/src/features/music/PlayerBar.tsx)

## 9. 列表项重构

- [x] 9.1 重构 TrackListItem：布局改为左曲名+右(收藏+播放+图标)，下方波形进度条，当前播放高亮 (apps/mobile/src/features/music/TrackListItem.tsx)

## 10. 收尾

- [x] 10.1 添加分类背景图资源到 assets/music-covers/，收藏卡片渐变兜底
- [x] 10.2 确认所有主题（cosmos/dark/light/ocean/rose）下文字颜色可见
