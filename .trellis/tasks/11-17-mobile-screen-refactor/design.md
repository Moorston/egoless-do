# Design — mobile screen 保守拆分（策略 C）

## 决策

采用策略 C：不写测试，只提取明确行为保持的部分，每个拆分人工验证渲染不变。

## 拆分方法（优先级降序，每个 screen 按此顺序评估）

### 1. StyleSheet 提取（最安全，先做）
- 组件内的 `StyleSheet.create({...})` 或 inline style 对象提取到模块级常量
- 纯数据移动，零行为变化，零回归风险
- 若组件主要行数是样式（如 DiaryModal），这一步即可达标

### 2. useCallback handler 提取
- 组件内定义的 onPress/onChange 闭包 handler，若有复杂逻辑，提取为模块级纯函数（接收所需参数）
- 或用 useCallback 包裹（不減行数但提升可读性，不解决 max-lines）
- **注意**：handler 引用组件 state/props 时不能简单提取——需传参，确保行为一致

### 3. 大 JSX 块抽子组件
- 组件 render 内大块 JSX（如某个 section、modal、card）抽成独立子组件
- props 传所需数据/callback
- **行为保持关键**：抽出的子组件渲染与原内联 JSX 完全一致，state 提升或保持在父级

### 4. 数据计算提取（纯函数）
- 组件内的 useMemo/计算逻辑提取到模块级纯函数
- 参考 MEMORY.md "Complexity Pure Function Extraction"（模块级纯函数转移计算）

## 不做

- ❌ 不改组件行为/交互逻辑
- ❌ 不重命名 props/state
- ❌ 不调整组件层级结构（除非抽子组件必需）
- ❌ 不引入新依赖

## 按行数降序处理（重的先做，收益大）

1. PlanCreateScreen (673)
2. ProfileScreen (568)
3. PreceptScreen (473)
4. BodyPlanEditorScreen (392)
5. DayCheckinScreen (368)
6. DiaryModal (336)
7. RelationMapView (326)
8. ReviewAIPanel (324)

## 验证（每个 screen 拆分后）

- `npx eslint <file> --ext .ts,.tsx` 确认 max-lines warning 消除（函数 ≤300 行）
- `pnpm --filter mobile run type-check` 0 error
- **人工验证**：读 diff 确认拆分行为保持（StyleSheet 移动、子组件 props 传递、handler 逻辑不变）
- 全量 mobile 测试绿（确认无编译/导入破坏）

## 风险缓解

- 无测试网：每个拆分尽量小且独立，一次只动一个 screen
- StyleSheet 提取作为第一步（零风险），若已达标则不再做 handler/JSX 拆分
- 抽子组件时，props 接口要完整（不丢字段），type-check 会兜底部分错误
