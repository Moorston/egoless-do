# 设计方案

## 布局结构

```
before:
SafeAreaView(edges=['top','bottom'])
  └─ View(bg=TH.bg)
       ├─ Header
       └─ ScrollView(paddingBottom=32)

after:
View(bg=TH.bg, flex=1)
  ├─ View(paddingTop=insets.top, header styles)
  │    └─ Header
  └─ ScrollView(contentContainerStyle={paddingBottom: 32 + insets.bottom})
       ├─ Calendar
       └─ Stats Grid
```

## 关键改动

1. `SafeAreaView` → 普通 `View`（移除 `edges` prop）
2. 导入 `useSafeAreaInsets`，调用 `const insets = useSafeAreaInsets()`
3. Header 区域添加 `paddingTop: insets.top`
4. ScrollView `contentContainerStyle.paddingBottom` 改为 `16 + insets.bottom`

## 一致性

与 `AddFoodModal` 使用相同模式：`useSafeAreaInsets()` + 手动 padding。
