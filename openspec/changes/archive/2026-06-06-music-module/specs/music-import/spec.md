## ADDED Requirements

### Requirement: 导入本地音频文件
用户 SHALL 可通过 MusicScreen 的"导入"按钮从手机本地选择音频文件导入到 app。

#### Scenario: 选择音频文件
- **WHEN** 用户点击"导入音乐"按钮
- **THEN** 系统调用 expo-document-picker 打开文件选择器，过滤类型为 audio/*（mp3、wav、m4a、aac）

#### Scenario: 导入成功
- **WHEN** 用户选择一个有效音频文件
- **THEN** 文件拷贝到 `FileSystem.documentDirectory/user-music/` 目录，元数据（id、name、uri、addedAt）保存到 AsyncStorage，音乐出现在"我的"分类中

#### Scenario: 导入取消
- **WHEN** 用户在文件选择器中取消
- **THEN** 不执行任何操作，返回 MusicScreen

### Requirement: 文件存储管理
用户导入的音频文件 SHALL 存储在 app 沙盒的 `documentDirectory/user-music/` 目录下，文件名使用 UUID 避免冲突。

#### Scenario: 文件拷贝到沙盒
- **WHEN** 用户导入文件 `MySong.mp3`
- **THEN** 文件拷贝到 `documentDirectory/user-music/{uuid}.mp3`，原始文件名保留为元数据的 name 字段

### Requirement: 用户音乐元数据持久化
用户导入的音乐元数据 SHALL 持久化到 AsyncStorage，key 为 `user_music_library`。

#### Scenario: 应用重启后恢复
- **WHEN** 用户重启应用
- **THEN** 从 AsyncStorage 读取 `user_music_library`，恢复用户音乐列表

#### Scenario: 删除音乐清理文件
- **WHEN** 用户删除一首导入的音乐
- **THEN** 从 AsyncStorage 元数据中移除，同时删除沙盒中的音频文件

### Requirement: 导入入口
MusicScreen SHALL 在页面顶部提供"导入音乐"按钮，"我的"分类 Tab 下在列表为空时显示导入引导。

#### Scenario: 顶部导入按钮
- **WHEN** 用户打开 MusicScreen
- **THEN** 页面 header 区域显示"导入"按钮

#### Scenario: 空列表引导
- **WHEN** 用户切换到"我的"Tab 且无导入音乐
- **THEN** 显示空状态提示"暂无导入音乐，点击上方按钮导入"
