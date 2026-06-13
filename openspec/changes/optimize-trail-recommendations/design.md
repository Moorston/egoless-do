## Context

当前推荐系统流程：

```
全部未删除感念 → computeRecommendations (本地, max 3)
             → recommendTrailsViaAI (AI, max 3)
             → 简单拼接 [...local, ...ai]
             → applyUserPreferences (降分, 不移除)
             → 展示
```

问题：
1. 没有候选源过滤，已分配的感念也会被推荐
2. 推荐数量无上限，本地和 AI 各 3 条
3. 忽略机制只降分不移除，`buildIgnoredPattern` 用 `type:tag` 匹配不够精确
4. UI 层用简单拼接，没有用已有的 `mergeAndRank` 函数

## Goals / Non-Goals

**Goals:**
- 推荐候选源限定为最近 30 天内、未分配到任何思维链的感念
- 每次推荐最多 2 条
- 用户忽略的推荐完全移除，不再出现
- 使用感念 ID 集合哈希作为忽略 key，避免误匹配

**Non-Goals:**
- 不新增本地检测器（关键词聚类、连续记录等）
- 不优化 AI 推荐的 RAG 策略
- 不改变推荐卡片 UI 样式
- 忽略记录不跨设备同步

## Decisions

### 1. 候选源过滤位置

**决定**: 在 MindTrailScreen 的 `useMemo` 中过滤，生成 `recommendationCandidates`，传给本地和 AI 推荐。

**理由**: 过滤逻辑集中在一处，本地和 AI 推荐使用同一份候选集。不改 `computeRecommendations` 和 `recommendTrailsViaAI` 的内部逻辑，保持函数纯粹性。

**替代方案**: 在每个检测器内部过滤 → 改动太多，且 AI 推荐也需要同样过滤。

### 2. 忽略 key 的哈希算法

**决定**: 用感念 ID 排序后拼接，取简单字符串哈希（djb2 变体），格式 `type:hash`。

```typescript
function buildIgnoredPattern(rec: TrailRecommendation): string {
  const ids = [...rec.reflectionIds].sort().join(',');
  let hash = 5381;
  for (let i = 0; i < ids.length; i++) {
    hash = ((hash << 5) + hash + ids.charCodeAt(i)) | 0;
  }
  return `${rec.type}:${hash}`;
}
```

**理由**: 同一批感念组成的推荐 → 同一个 key → 精确忽略。不同感念组成的同类型推荐 → 不同 key → 不受影响。

**替代方案**: 用 `type:tag` 匹配 → 两条无标签的 mood 推荐会被一起忽略，误伤。

### 3. 忽略存储方式

**决定**: 用 AsyncStorage 存储 `string[]`，key 为 `trailIgnoredPatterns`。

**理由**: 本地存储，不跨设备同步，符合用户需求。AsyncStorage 在 React Native 中标准且可靠。

**替代方案**: 存 Zustand store → 会通过 PocketBase 同步到其他设备。

### 4. 合并策略

**决定**: 使用已有的 `mergeAndRank` 函数，替换 MindTrailScreen 中的简单拼接。

**理由**: `mergeAndRank` 已实现 >50% 重叠去重，将重叠的本地+AI 推荐合并为 `hybrid` 源。当前 UI 层没有使用这个函数。

### 5. 数量限制的施加点

**决定**: 在三个层面施加 max 2 限制：
1. `computeRecommendations` 返回值 `.slice(0, 2)`
2. AI 推荐结果 `.slice(0, 2)`
3. `mergeAndRank` 后 `.slice(0, 2)`

**理由**: 多层限制确保最终结果不超过 2 条，同时减少不必要的 AI 调用。

## Risks / Trade-offs

- **候选不足**: 30天+未分配的感念可能少于 3 条，此时不推荐。用户可能觉得功能"失灵"。→ 无降级策略，用户需求明确。
- **哈希碰撞**: djb2 哈希理论上可能碰撞，但感念 ID 是 UUID，实际概率极低。→ 可接受。
- **AsyncStorage 清除**: 用户清除 app 数据会丢失忽略记录。→ 可接受，重新推荐不算严重问题。
