# 打卡复盘系统 - 性能优化指南

## 性能目标

1. **复盘数据计算**: < 100ms
2. **AI生成**: < 5s (云端) / < 1s (本地)
3. **UI渲染**: 60fps
4. **内存占用**: < 50MB (复盘相关)

## 优化策略

### 1. 计算性能优化

#### 1.1 缓存策略
```typescript
// 使用useMemo缓存计算结果
const reviewData = useMemo(() => {
  return calculateReviewData(period, targetDate, checkinHistory, ...);
}, [period, targetDate, checkinHistory, ...]);
```

#### 1.2 懒加载
```typescript
// 只在需要时计算复盘数据
const [review, setReview] = useState<CheckinReview | null>(null);

useEffect(() => {
  if (activeTab === 'weekReview' || activeTab === 'monthReview') {
    loadReview();
  }
}, [activeTab]);
```

#### 1.3 增量更新
```typescript
// 只更新变化的部分
const updateReview = (newData: Partial<CheckinReview>) => {
  setReview(prev => prev ? { ...prev, ...newData } : null);
};
```

### 2. UI渲染优化

#### 2.1 虚拟列表
```typescript
// 使用FlatList替代ScrollView
<FlatList
  data={reviews}
  renderItem={({ item }) => <ReviewItem review={item} />}
  keyExtractor={item => item.id}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

#### 2.2 组件懒加载
```typescript
// 使用React.lazy懒加载组件
const ReviewView = React.lazy(() => import('./ReviewView'));

<Suspense fallback={<Loading />}>
  <ReviewView period="week" />
</Suspense>
```

#### 2.3 图表优化
```typescript
// 使用useMemo缓存图表数据
const chartData = useMemo(() => {
  return processChartData(rawData);
}, [rawData]);

// 使用React.memo避免不必要的重渲染
const ChartComponent = React.memo(({ data }) => {
  return <LineChart data={data} />;
});
```

### 3. 内存优化

#### 3.1 数据清理
```typescript
// 定期清理过期数据
const cleanupOldReviews = () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  return reviews.filter(r => {
    const reviewDate = new Date(r.endDate);
    return reviewDate > sixMonthsAgo;
  });
};
```

#### 3.2 状态管理
```typescript
// 使用Zustand的partialize只持久化必要数据
{
  partialize: (state) => ({
    checkinReviews: state.checkinReviews.map(r => ({
      id: r.id,
      period: r.period,
      startDate: r.startDate,
      endDate: r.endDate,
      completionRate: r.completionRate,
      // 只持久化核心字段
    })),
  }),
}
```

### 4. 网络优化

#### 4.1 请求合并
```typescript
// 批量请求复盘数据
const fetchReviews = async (ids: string[]) => {
  const response = await api.post('/reviews/batch', { ids });
  return response.data;
};
```

#### 4.2 缓存策略
```typescript
// 使用缓存减少请求
const fetchReviewWithCache = async (id: string) => {
  const cached = cache.get(id);
  if (cached && !isExpired(cached)) {
    return cached.data;
  }
  
  const data = await api.get(`/reviews/${id}`);
  cache.set(id, { data, timestamp: Date.now() });
  return data;
};
```

### 5. AI生成优化

#### 5.1 流式响应
```typescript
// 使用流式响应减少等待时间
const generateReviewStream = async (data: ReviewData) => {
  const response = await fetch('/api/review/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    updateUI(text);
  }
};
```

#### 5.2 本地降级
```typescript
// 云端失败时使用本地生成
const generateReview = async (data: ReviewData) => {
  try {
    const result = await aiService.generateCheckinReview(data, { useCloud: true });
    return result;
  } catch (error) {
    console.warn('Cloud AI failed, using local:', error);
    return aiService.generateCheckinReview(data, { useCloud: false });
  }
};
```

## 性能监控

### 1. 计算性能监控
```typescript
const monitorCalculation = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`[Performance] ${name}: ${end - start}ms`);
};
```

### 2. 渲染性能监控
```typescript
const useRenderCount = (componentName: string) => {
  const count = useRef(0);
  
  useEffect(() => {
    count.current++;
    console.log(`[Render] ${componentName}: ${count.current} renders`);
  });
};
```

### 3. 内存监控
```typescript
const monitorMemory = () => {
  if (performance.memory) {
    const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
    console.log(`[Memory] Used: ${usedJSHeapSize / 1024 / 1024}MB, Total: ${totalJSHeapSize / 1024 / 1024}MB`);
  }
};
```

## 优化清单

### 计算优化
- [ ] 使用useMemo缓存复盘数据计算
- [ ] 实现懒加载，只在需要时计算
- [ ] 避免重复计算，使用缓存

### UI优化
- [ ] 使用FlatList替代ScrollView
- [ ] 实现组件懒加载
- [ ] 使用React.memo避免不必要的重渲染
- [ ] 优化图表渲染

### 内存优化
- [ ] 定期清理过期数据
- [ ] 优化状态管理，只持久化必要数据
- [ ] 避免内存泄漏

### 网络优化
- [ ] 实现请求合并
- [ ] 使用缓存减少请求
- [ ] 实现本地降级

### AI优化
- [ ] 实现流式响应
- [ ] 实现本地降级
- [ ] 优化Prompt长度

## 性能基准

### 计算性能
- 复盘数据计算: < 100ms
- 图表数据处理: < 50ms
- 数据聚合: < 30ms

### 渲染性能
- 首屏渲染: < 500ms
- Tab切换: < 200ms
- 列表滚动: 60fps

### 网络性能
- 复盘数据同步: < 2s
- AI生成: < 5s (云端)
- 缓存命中: < 50ms

### 内存性能
- 复盘数据占用: < 10MB
- 图表占用: < 5MB
- 总内存占用: < 50MB
