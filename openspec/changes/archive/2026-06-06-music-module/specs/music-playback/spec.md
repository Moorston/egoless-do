## ADDED Requirements

### Requirement: 全局音乐状态管理
系统 SHALL 提供全局音乐状态 store（useMusicStore），管理当前播放曲目、播放状态、音量、循环模式、音乐库列表。状态 SHALL 在所有页面间共享。

#### Scenario: 跨页面播放状态一致
- **WHEN** 用户在 MusicScreen 播放音乐后导航至其他页面
- **THEN** 播放状态保持不变，其他页面可通过 store 读取当前播放信息

#### Scenario: 应用重启后恢复用户音乐列表
- **WHEN** 用户重启应用
- **THEN** 用户导入的音乐列表从 AsyncStorage 恢复，内置音乐列表从常量加载

### Requirement: 播放控制
useMusicStore SHALL 提供 play(track)、pause()、resume()、stop() 方法。播放新曲目时 SHALL 自动停止当前曲目。

#### Scenario: 播放新曲目
- **WHEN** 用户调用 play(trackB) 且当前正在播放 trackA
- **THEN** trackA 停止，trackB 开始播放，currentTrack 更新为 trackB

#### Scenario: 暂停和恢复
- **WHEN** 用户调用 pause() 后调用 resume()
- **THEN** 音乐从暂停位置继续播放

#### Scenario: 停止播放
- **WHEN** 用户调用 stop()
- **THEN** 音乐停止，播放位置重置，currentTrack 设为 null

### Requirement: 音量控制
useMusicStore SHALL 维护 volume 状态（0~1），默认 0.3。用户 SHALL 可通过 UI 滑块调节音量。

#### Scenario: 调节音量
- **WHEN** 用户拖动音量滑块至 0.5
- **THEN** 当前播放音乐音量立即调整为 0.5，状态持久化

### Requirement: 循环播放
useMusicStore SHALL 维护 loop 状态，默认 true。单曲循环：当前曲目播放完毕后自动重新播放。

#### Scenario: 循环模式开启
- **WHEN** loop 为 true 且当前曲目播放完毕
- **THEN** 曲目自动从头开始播放

#### Scenario: 循环模式关闭
- **WHEN** loop 为 false 且当前曲目播放完毕
- **THEN** 播放停止，currentTrack 设为 null

#### Scenario: 切换循环模式
- **WHEN** 用户点击循环按钮
- **THEN** loop 状态取反，按钮样式相应更新

### Requirement: 音频引擎封装
系统 SHALL 提供 useAudioEngine hook，封装 expo-audio 的 useAudioPlayer，支持播放内置音乐（require）和用户导入音乐（文件 URI）。

#### Scenario: 播放内置音乐
- **WHEN** play() 被调用且 track.file 为 require 路径
- **THEN** useAudioPlayer 使用 require 路径加载音频并播放

#### Scenario: 播放用户导入音乐
- **WHEN** play() 被调用且 track.uri 为文件系统路径
- **THEN** useAudioPlayer 使用 { uri } 格式加载音频并播放

### Requirement: i18n 支持
音乐模块所有 UI 文本 SHALL 使用 i18n key，支持中文、英文、繁体中文。

#### Scenario: 多语言显示
- **WHEN** 用户语言设置为英文
- **THEN** 音乐模块所有文本显示英文翻译
