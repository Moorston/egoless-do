# 设计方案

## 目标样式

```
┌─────────────────────┐
│ TH.card 背景         │
│ 1px TH.border 边框   │
│ borderRadius: 14     │
│                      │
│   🕐 26px P 色图标   │
│   FONT_BODY TH.sub   │
│   26px P 色数字      │
│   FONT_SUB TH.sub 单位│
└─────────────────────┘
```

## 属性对照

| 属性 | 来源 | 值 |
|------|------|-----|
| 圆角 | 禁食页 | 14 |
| 图标大小 | 禁食页 | 26px |
| 标签字号 | 禁食页 | FONT_BODY (15) |
| 数字字号 | 禁食页 | 26px |
| 背景 | 打卡弹窗 | TH.card |
| 边框 | 打卡弹窗 | 1px TH.border |
| 标签颜色 | 打卡弹窗 | TH.sub |
| 数字颜色 | 打卡弹窗 | P |
| 图标颜色 | 打卡弹窗 | P |
| 布局 | 保持 | 2 列 |

## 改动内容

### Mobile FastingScreen.tsx
- 移除统计卡片的 `<LinearGradient>` 包裹
- 改为 `View` + `backgroundColor: TH.card` + `borderWidth: 1` + `borderColor: TH.border`
- 图标颜色：`#fff` → `P`
- 标签颜色：`rgba(255,255,255,.85)` → `TH.sub`，字号保持 FONT_BODY
- 数字颜色：`#fff` → `P`，字号保持 26
- 单位颜色：`rgba(255,255,255,.6)` → `TH.sub`
- 检查 LinearGradient 是否还有其他用途，如无则移除 import

### Web FastingTab.tsx
- 移除 `linear-gradient(135deg, ...)` 背景
- 改为 `TH.card` + `1px solid TH.border`
- 图标/文字颜色同步修改

### Mobile CheckinStatsModal.tsx
- 圆角：12 → 14
- 标签字号：FONT_SUB → FONT_BODY
- 数字字号：FONT_STAT_CARD (22) → 26

### Web CheckinStatsModal.tsx
- 圆角：12 → 14
- 标签字号：FONT_SUB → FONT_BODY
- 数字字号：FONT_STAT_CARD (22) → 26

### Mobile StatsScreen.tsx
- 背景：cardAccent() → TH.card
- 添加边框：1px TH.border
- 图标颜色：tc → P
- 标签颜色：tc → TH.sub
- 数字颜色：tc → P
- 单位颜色：tc → TH.sub
- 运动指标卡片同步修改

### Web StatsTab.tsx
- 背景：硬编码纯色 → TH.card
- 添加边框：1px TH.border
- 图标大小：20px → 26px，颜色 #fff → P
- 标签字号：FONT_SUB → FONT_BODY，颜色 → TH.sub
- 数字字号：FONT_TITLE (18) → 26，颜色 #fff → P
- 运动指标卡片同步修改
