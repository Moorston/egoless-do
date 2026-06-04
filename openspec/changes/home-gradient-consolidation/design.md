## Context

当前首页使用了 8 种渐变色，定义在 `packages/core/src/constants.ts` 中：

- `BANNER_COLORS`：3 种纯色（CHECKED/NOT_DONE/DONE）
- `STATS_GRADIENT`：4 组渐变色对
- 页面内硬编码的渐变：Streak 卡片、Grace 提醒、饮水进度条、卡路里进度条

渐变色之间缺乏统一性，部分存在色相跳跃（如 `#F59E0B → #EF4444` 橙→红）。

## Goals / Non-Goals

**Goals:**
- 建立 3 级渐变色彩体系，统一视觉风格
- 所有渐变遵循"同色系深浅过渡"原则，色相不变
- 渐变色从主题色自动派生，减少硬编码

**Non-Goals:**
- 不改变字体层级（方向 A）
- 不改变 Streak 卡片布局（方向 C）
- 不改变快捷操作（方向 D）
- 不改变整体布局（方向 E）
- 不涉及 PlanDetailPage 等其他页面

## Decisions

### 1. 渐变色派生方式

**选择：静态定义 + 工具函数**

理由：
- `THEME_GRADIENTS` 静态定义每个主题的渐变色对，确保精确控制
- `deriveStatsGradients` 工具函数从主题渐变派生 Stats 卡片渐变，避免硬编码 4 组渐变
- 状态色渐变 `STATUS_GRADIENTS` 静态定义，因为状态色不依赖主题

替代方案（运行时计算）：从 `theme.primary` 通过 HSL 调整明度生成渐变。问题：HSL 转换可能产生意外颜色，不如手动定义可靠。

### 2. Stats 渐变派生策略

**选择：透明度递增**

从 `THEME_GRADIENTS[theme]` 派生 4 组渐变，通过递增透明度创造层次感：

```
Stats[0]: primary/10% → primary-dark/10%
Stats[1]: primary/15% → primary-dark/15%
Stats[2]: primary/20% → primary-dark/20%
Stats[3]: primary/25% → primary-dark/25%
```

理由：
- 4 张卡片有层次感但全部从同一色系派生
- 透明度变化比色相变化更微妙
- 与主题色保持一致

替代方案（固定 4 组渐变）：当前的 `STATS_GRADIENT` 方式，问题：与主题色无关，切换主题时视觉不协调。

### 3. 废弃常量处理

**选择：保留导出 + 标记废弃**

理由：
- `BANNER_COLORS` 和 `STATS_GRADIENT` 保留导出，向后兼容
- 用 `@deprecated` 注释标记，新代码统一使用新常量
- 不需要一次性迁移所有引用（渐进式迁移）

### 4. Web 与 Mobile 差异处理

**选择：统一使用 core 包常量**

理由：
- Web 使用 CSS `linear-gradient()`，Mobile 使用 `expo-linear-gradient` 的 `colors` 数组
- 两者都接受 `[string, string]` 格式的颜色对
- `THEME_GRADIENTS` 和 `STATUS_GRADIENTS` 的类型为 `[string, string]`，两端通用

## Risks / Trade-offs

- **[主题切换延迟]** 从 `THEME_GRADIENTS` 读取渐变需要知道当前主题 → 已通过 `useTheme()` 解决，无额外开销
- **[Stats 渐变透明度]** 透明度在深色主题上可能不够明显 → 实际测试中 10%-25% 的透明度范围在深色背景上仍然可见
- **[废弃常量]** 保留旧常量可能造成混淆 → 通过 `@deprecated` 注释和文档说明引导开发者使用新常量
