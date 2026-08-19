# Design: Code Quality 收尾

> 技术设计详见 OpenSpec：`openspec/changes/code-quality-batch-2/design.md`
> 本文件仅记录 Trellis 执行视角的关键决策点。

## 关键设计决策

### D1: 新 ESLint 规则的启用级别
- 先以 `error` 级加入，跑 lint 统计新违规数
- 若某条规则暴露超阈值违规（>20），该规则降为 `warn` 渐进，在本 task 记录降级原因
- 默认阈值：单条规则新增 warning ≤ 10 立即修，> 10 降级

### D2: no-raw-number-in-text 修复模式
- 检测器不动，只修 56 个调用点
- 按 feature 分桶（vow / zhiguan / body / 其他），每桶修完跑 lint 确认归零
- 修法：`<Text>{count}</Text>` → `<Text>{String(count)}</Text>` 或模板字面量

### D3: exhaustive-deps 处理原则
- 真漏依赖 → 补上
- 有意排除（如会导致无限重渲染的稳定引用）→ 加 `// eslint-disable-next-line react-hooks/exhaustive-deps` 并注明原因
- 这类是允许保留的剩余 warning，占 AC2 阈值的主体

### D4: max-depth 范围边界
- 普通函数：提取早返回 / 子函数降嵌套
- 高风险函数（migrateDatabase / initApp / SportPage / MindTrailScreen）的 max-depth 跳过，加注释指向独立 change

## 风险

| 风险 | 缓解 |
|------|------|
| exhaustive-deps 修复改变 hook 行为 | 逐个判断，有意排除加 disable 注释 |
| 新规则暴露大量违规 | 超阈值降级为 warn |
| 56 处批量改遗漏 | 分桶 + 每桶 lint 归零确认 |
