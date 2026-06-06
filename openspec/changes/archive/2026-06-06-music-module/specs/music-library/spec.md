## ADDED Requirements

### Requirement: 音乐库页面
系统 SHALL 提供独立的音乐库页面（MusicScreen），用户可通过设置页、冥想页、锻炼页进入。页面 SHALL 支持按分类浏览所有可用音乐。

#### Scenario: 从设置页进入音乐库
- **WHEN** 用户在设置页点击"轻松听"入口
- **THEN** 系统导航至 MusicScreen，显示全部音乐列表

#### Scenario: 从冥想页进入音乐库
- **WHEN** 用户在冥想页点击"轻松听"入口
- **THEN** 系统导航至 MusicScreen

#### Scenario: 从锻炼页进入音乐库
- **WHEN** 用户在锻炼活跃页点击音乐条的曲名
- **THEN** 系统导航至 MusicScreen

### Requirement: 音乐分类浏览
MusicScreen SHALL 支持通过 Tab 筛选音乐分类：全部、专注、冥想、运动、我的。

#### Scenario: 切换分类 Tab
- **WHEN** 用户点击"专注"Tab
- **THEN** 列表仅显示分类为"专注"的音乐

#### Scenario: "我的"分类显示用户导入音乐
- **WHEN** 用户点击"我的"Tab
- **THEN** 列表仅显示用户导入的音乐，若为空则显示导入引导提示

### Requirement: 音乐列表展示
每个音乐列表项 SHALL 显示：曲名、分类标签、时长、播放/暂停按钮。用户导入的音乐额外显示删除按钮。

#### Scenario: 播放内置音乐
- **WHEN** 用户点击某首内置音乐的播放按钮
- **THEN** 该音乐开始播放，播放按钮切换为暂停图标，底部播放控制条更新为当前曲目

#### Scenario: 删除用户导入音乐
- **WHEN** 用户点击用户导入音乐的删除按钮
- **THEN** 弹出确认对话框，确认后从列表和沙盒文件系统中移除该音乐

### Requirement: 底部播放控制条
MusicScreen 底部 SHALL 显示播放控制条，包含：当前曲名、播放/暂停按钮、音量控制、循环切换。

#### Scenario: 无音乐播放时
- **WHEN** 当前无音乐播放
- **THEN** 底部播放控制条不显示

#### Scenario: 有音乐播放时
- **WHEN** 有音乐正在播放
- **THEN** 底部播放控制条显示当前曲名和控制按钮

### Requirement: 内置音乐定义
系统 SHALL 将现有 7 个 mp3 音频文件重新分类为三个类别：专注（海潮、雨声、溪流）、冥想（钵声、风铃、鸟叫）、运动（复用自然类）。内置音乐定义 SHALL 存放在 `packages/core/src/constants/music.ts`。

#### Scenario: 内置音乐包含分类和多语言名称
- **WHEN** 系统加载内置音乐列表
- **THEN** 每首音乐包含 id、name（中文）、nameEn（英文）、category（focus/meditate/exercise）、file（require 路径）

### Requirement: 设置页音乐入口
设置页 SHALL 新增"音乐"section，包含一行"轻松听"入口，点击导航至 MusicScreen。

#### Scenario: 设置页显示音乐 section
- **WHEN** 用户打开设置页
- **THEN** 在现有 section 列表中显示"音乐"section，包含"轻松听"行项

### Requirement: 冥想页音乐入口
冥想页 SHALL 在准备阶段提供"轻松听"入口，用户可选择音乐后开始冥想。

#### Scenario: 冥想页显示音乐入口
- **WHEN** 用户进入冥想页准备阶段
- **THEN** 显示"轻松听"入口，点击导航至 MusicScreen

#### Scenario: 选择音乐后返回冥想页
- **WHEN** 用户在 MusicScreen 选择一首音乐并返回冥想页
- **THEN** 冥想页显示已选音乐名称，开始冥想时自动播放该音乐
