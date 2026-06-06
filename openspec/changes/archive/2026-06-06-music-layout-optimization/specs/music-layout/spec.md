## ADDED Requirements

### Requirement: 主页分类卡片网格

系统 SHALL 在 MusicScreen 主页显示分类卡片网格布局，替代原来的 tab+列表布局。每个分类显示为一张卡片，包含背景图、图标、分类名和曲目数。

#### Scenario: 显示分类卡片
- **WHEN** 用户进入轻松听页面
- **THEN** 显示 2 列网格布局的分类卡片（专注、冥想、运动、收藏），每张卡片显示背景图、中央图标、分类名和曲目数

#### Scenario: 收藏卡片动态计数
- **WHEN** 用户收藏或取消收藏曲目
- **THEN** 收藏卡片上的曲目数实时更新

### Requirement: 分类列表页

系统 SHALL 提供分类列表页（MusicCategoryScreen），点击分类卡片后进入，展示该分类下的曲目列表。

#### Scenario: 进入分类列表
- **WHEN** 用户点击某分类卡片
- **THEN** 导航到 MusicCategoryScreen，显示该分类名作为标题，列出所有曲目

#### Scenario: 列表页返回
- **WHEN** 用户点击返回按钮
- **THEN** 返回到 MusicScreen 主页

### Requirement: 曲目列表项布局

曲目列表项 SHALL 显示：曲名（左侧）、分类标签和时间（曲名下方）、收藏按钮+播放按钮+分类图标（右侧）、波形进度条（下方）。

#### Scenario: 列表项显示
- **WHEN** 分类列表页加载完成
- **THEN** 每个列表项左侧显示曲名和分类标签，右侧显示收藏按钮、播放按钮、分类图标，下方显示波形进度条

#### Scenario: 当前播放高亮
- **WHEN** 某曲目正在播放
- **THEN** 该列表项曲名使用 TH.primary 主题色显示

### Requirement: 底部播放器全局显示

底部播放器 SHALL 在 MusicScreen 主页和 MusicCategoryScreen 列表页都显示。

#### Scenario: 主页显示播放器
- **WHEN** 有曲目正在播放且用户在主页
- **THEN** 页面底部显示播放器（曲名、播放控制、波形进度条）

#### Scenario: 列表页显示播放器
- **WHEN** 有曲目正在播放且用户在分类列表页
- **THEN** 页面底部显示播放器
