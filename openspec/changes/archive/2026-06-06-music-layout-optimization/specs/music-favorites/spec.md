## ADDED Requirements

### Requirement: 收藏状态管理

系统 SHALL 在 useMusicStore 中维护 favorites 状态（track id 数组），支持收藏和取消收藏操作。

#### Scenario: 收藏曲目
- **WHEN** 用户点击曲目列表项的空心 ♡ 按钮
- **THEN** 该曲目 id 加入 favorites 数组，按钮变为实心 ♥

#### Scenario: 取消收藏
- **WHEN** 用户点击已收藏曲目的实心 ♥ 按钮
- **THEN** 该曲目 id 从 favorites 数组移除，按钮变为空心 ♡

### Requirement: 收藏持久化

favorites 状态 SHALL 持久化到 AsyncStorage，key 为 `music_favorites`。

#### Scenario: 收藏后持久化
- **WHEN** 用户收藏或取消收藏曲目
- **THEN** 更新后的 favorites 数组立即写入 AsyncStorage

#### Scenario: 启动时加载
- **WHEN** 应用启动且 MusicScreen 或 MusicCategoryScreen 挂载
- **THEN** 从 AsyncStorage 加载 favorites 到 store

### Requirement: 收藏分类卡片

收藏分类 SHALL 作为特殊卡片显示在主页，展示已收藏曲目数。点击进入收藏列表页。

#### Scenario: 收藏卡片显示
- **WHEN** 用户进入轻松听主页
- **THEN** 显示"收藏"卡片，使用渐变背景，显示收藏曲目数

#### Scenario: 收藏列表页
- **WHEN** 用户点击收藏卡片
- **THEN** 进入 MusicCategoryScreen，仅显示已收藏的曲目

#### Scenario: 空收藏提示
- **WHEN** 收藏曲目数为 0 且用户进入收藏列表页
- **THEN** 显示空状态提示
