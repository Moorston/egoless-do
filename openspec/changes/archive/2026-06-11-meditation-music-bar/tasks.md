## 1. i18n

- [x] 1.1 添加 i18n key：medMusicFocus、medMusicMeditate、medMusicExercise、medMusicUser、medSelectMusic、medTapToSelect（zh.ts、zh-Hant.ts、en.ts）

## 2. 组件

- [x] 2.1 新建 `apps/mobile/src/features/meditation/MeditationMusicBar.tsx`，实现空闲态（封面+歌名+副标题+箭头）和打坐中（均衡器+歌名）两种模式

## 3. 集成

- [x] 3.1 在 `MeditationScreen.tsx` 中导入并使用 MeditationMusicBar，替换空闲态和打坐中的内联音乐显示
