## ADDED Requirements

### Requirement: 波形进度条显示

系统 SHALL 提供 WaveformBar 组件，用竖条波形展示音频播放进度。已播放部分使用主题色，未播放部分使用半透明色。

#### Scenario: 波形渲染
- **WHEN** WaveformBar 组件渲染
- **THEN** 显示一排等间距竖条（宽 3px，间距 2px），高度由 track id 种子生成的伪随机数组决定（范围 8~24px）

#### Scenario: 进度颜色区分
- **WHEN** 播放进度为 50%
- **THEN** 左侧 50% 竖条使用 TH.primary 颜色，右侧 50% 竖条使用 rgba(255,255,255,.2) 颜色

#### Scenario: 同曲目波形一致
- **WHEN** 同一首曲目多次渲染 WaveformBar
- **THEN** 波形高度数组完全一致

### Requirement: 波形点击跳转

用户 SHALL 能通过点击波形进度条跳转到对应播放位置。

#### Scenario: 点击跳转
- **WHEN** 用户点击波形进度条的 75% 位置
- **THEN** 调用 player.seekTo() 跳转到音频 75% 处的时间位置

### Requirement: 实时进度更新

波形进度条 SHALL 使用 useAudioPlayerStatus 实时更新播放进度。

#### Scenario: 播放中进度更新
- **WHEN** 音频正在播放
- **THEN** 波形进度条的已播/未播分界线随 currentTime 实时移动
