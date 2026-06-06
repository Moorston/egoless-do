## ADDED Requirements

### Requirement: 跳动音符动画

系统 SHALL 提供 AnimatedMusicIcon 组件，在曲目播放中显示跳动音符动画，替代静态 ▶ 图标。

#### Scenario: 播放中显示动画
- **WHEN** 曲目正在播放
- **THEN** 显示 3 个竖条交替跳动的动画效果（类似 iOS 音乐 app）

#### Scenario: 暂停/停止时显示静态图标
- **WHEN** 曲目暂停或停止
- **THEN** 显示静态 ▶ 播放图标，无动画

#### Scenario: 动画循环
- **WHEN** 动画播放中
- **THEN** 3 个竖条各自用 Animated.loop 循环执行高度动画，交错启动形成波浪效果

### Requirement: 动画应用范围

跳动音符动画 SHALL 应用于：当前播放曲目的列表项播放按钮、底部播放器的播放按钮。

#### Scenario: 列表项动画
- **WHEN** 某曲目正在播放且显示在列表中
- **THEN** 该列表项右侧的播放按钮位置显示跳动音符动画

#### Scenario: 底部播放器动画
- **WHEN** 有曲目正在播放且底部播放器可见
- **THEN** 播放器的播放按钮位置显示跳动音符动画
