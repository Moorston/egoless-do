# Design: 性能 Phase 2

## 1. 消除嵌套 FlatList 反模式

### 问题
```typescript
// 当前（首页、打卡页、回顾页等 13 处）
<ScrollView>
  <FlatList scrollEnabled={false} data={habits} renderItem={...} />
  <FlatList scrollEnabled={false} data={plans} renderItem={...} />
  <FlatList scrollEnabled={false} data={todos} renderItem={...} />
</ScrollView>
```

**影响**: 所有列表项一次性布局 + 渲染，帧率下降。

### 修复方案

#### 方案 A: 单一 SectionList（推荐）
```typescript
const sections = [
  { title: 'habits', data: habits },
  { title: 'plans', data: plans },
  { title: 'todos', data: todos },
];

<SectionList
  sections={sections}
  renderSectionHeader={({ section }) => <Text>{section.title}</Text>}
  renderItem={({ item, section }) => {
    switch (section.title) {
      case 'habits': return <HabitCard {...item} />;
      case 'plans': return <PlanCard {...item} />;
      case 'todos': return <TodoCard {...item} />;
    }
  }}
/>
```

#### 方案 B: FlashList + 自定义布局
```typescript
<FlashList
  data={[...habits, ...plans, ...todos]}
  renderItem={({ item }) => {
    if (item.type === 'habit') return <HabitCard {...item} />;
    if (item.type === 'plan') return <PlanCard {...item} />;
    return <TodoCard {...item} />;
  }}
  getItemType={(item) => item.type}
  estimatedItemSize={80}
/>
```

---

## 2. FlashList 迁移

### 目标页面
| 页面 | 当前 | 目标 |
|------|------|------|
| HomeScreen | 3 FlatList 嵌套 | 1 SectionList |
| DayCheckinScreen | 3 FlatList 嵌套 | 1 SectionList |
| ReviewView | 4 FlatList 嵌套 | 1 SectionList |
| CheckinModal | 3 FlatList 嵌套 | 1 SectionList |
| MindScreen | 3 FlatList 嵌套 | 1 SectionList |
| DietScreen | ScrollView+.map | FlashList |
| UnifiedExercisePool | ScrollView+.map | FlashList numColumns=3 |
| 历史列表 | FlatList | FlashList + 分页 |

### VirtualList 包装器
```typescript
// components/VirtualList.tsx
import { FlashList } from '@shopify/flash-list';

export function VirtualList<T>(props: FlashListProps<T>) {
  return (
    <FlashList
      {...props}
      estimatedItemSize={props.estimatedItemSize ?? 80}
      removeClippedSubviews={props.removeClippedSubviews ?? true}
      drawDistance={props.drawDistance ?? 250}
    />
  );
}
```

---

## 3. 列表分页

### 反思列表（当前无限增长）
```typescript
// 当前
const reflections = await db.getAllAsync('SELECT * FROM mind_reflections WHERE deleted = 0 ORDER BY created_at DESC');

// 优化：分页
const reflections = await db.getAllAsync(
  'SELECT * FROM mind_reflections WHERE deleted = 0 AND created_at < ? ORDER BY created_at DESC LIMIT 50',
  [cursor]
);
```

### 食物列表
```typescript
const foods = await db.getAllAsync(
  'SELECT * FROM food_entries WHERE deleted = 0 AND entry_date < ? ORDER BY entry_date DESC LIMIT 100',
  [cursor]
);
```

### 滚动加载更多
```typescript
<FlashList
  data={items}
  onEndReached={() => loadMore()}
  onEndReachedThreshold={0.5}
/>
```

---

## 4. 性能监控

### Frame Rate 监控
```typescript
// src/performance/monitor.ts
let frameCount = 0;
let lastTime = performance.now();

export function startFrameMonitor() {
  requestAnimationFrame(function loop() {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastTime));
      if (fps < 45) {
        log.warn(`[Perf] Low FPS: ${fps}`);
      }
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(loop);
  });
}
```

### Re-render 监控
```typescript
// 开发模式：检测不必要的重渲染
if (__DEV__) {
  const origRender = Component.prototype.render;
  Component.prototype.render = function (...args) {
    console.log(`[Render] ${this.constructor.name}`);
    return origRender.apply(this, args);
  };
}
```

---

## 执行顺序

### Phase 2a（核心，6h）
1. HomeScreen → SectionList（最高优先级）
2. DayCheckinScreen → SectionList
3. ReviewView → SectionList

### Phase 2b（扩展，4h）
4. DietScreen → FlashList
5. UnifiedExercisePool → FlashList
6. 历史列表 → FlashList

### Phase 2c（分页 + 监控，2h）
7. 列表分页实现
8. 性能监控 marker

---

## 验证

```bash
npx vitest run  # 1832/1832
npx tsc --noEmit
# 真机测试：首页帧率 55fps+
```

---

## 风险

| 风险 | 缓解 |
|------|------|
| SectionList 布局异常 | 先用低频页面试验 |
| FlashList 兼容性 | VirtualList 包装器统一接口 |
| 分页导致数据缺失 | onEndReachedThreshold 提前加载 |
