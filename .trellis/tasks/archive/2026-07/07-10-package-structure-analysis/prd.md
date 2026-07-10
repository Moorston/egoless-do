# 包结构深度分析

## 目标
对 egoless-do 的 monorepo 包结构进行深度分析，识别包依赖关系、模块边界违规、循环依赖、以及架构改进机会。

## 分析维度

1. **包依赖图** — 精确绘制每个包的依赖关系
2. **模块边界违规** — 检查是否有跨边界引用
3. **循环依赖** — 识别 packages/core 和 apps/mobile 之间的导入环
4. **依赖注入边界** — 检查 DI 模式是否一致
5. **未使用/冗余代码** — 检查死模块、死导出
6. **Barrel 导出影响** — 检查 tree-shaking 问题

## 分析工具
- grep 跨包引用分析
- pnpm ls 依赖树
- turbo.json 构建链
- pnpm-workspace.yaml

## 产出
- `docs/package-structure-analysis.md`

## 验收标准
- [ ] 完整的包依赖图
- [ ] 至少 3 个边界违规或改进点
- [ ] 可执行的改进建议