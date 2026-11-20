# Design — complexity-ratchet

## 1. ReviewAIPanel 拆分（策略 C，零行为变更）

### 现状结构（主函数 41）

```
ReviewAIPanel(props)
├─ defaultTab = insightCache ? 0 : reviewCache ? 1 : 0        ← 2 分支
├─ useState ×4 / useEffect ×2（cache 出现自动切 tab）/ useCallback ×2
├─ if (!hasAny) return <EmptyState/>                            ← 既有子组件
└─ return
   ├─ Header（折叠态预览三元链 subTab×cache ×2 + chevron 三元）  ← 抽 PanelHeader
   ├─ SegmentBar segments={['洞察','复盘思路']}                 ← 硬编码中文 → T()
   ├─ ScrollView FIXED_HEIGHT
   │  ├─ subTab===0 洞察 tab                                    ← 抽 AiResultTab
   │  │  loading→骨架(80/60/90) / cache→summary+3×bullet 段+stale 行 / 无→按钮
   │  └─ subTab=== 1 复盘 tab                                   ← 抽 AiResultTab
   │     loading→骨架(75/55/85) / cache→perspectives 卡片+2×text 段+stale 行 / 无→按钮
   └─ PanelFooter（既有子组件）
```

### 拆分后组件树

```
ReviewAIPanel  ← 状态owner + sections 构建 + 组合（目标 ≤15）
├─ EmptyState / PanelFooter / PanelHeader（既有 + 新抽，均 ≤15）
├─ AiResultTab ×2（三态机共用，≤15）
│  ├─ SkeletonBlock（共用，≤15）
│  └─ SectionList（sections 渲染，≤15）——或内联在 AiResultTab 内（若 ≤15）
└─ buildInsightSections / buildReviewSections（模块级纯函数）
```

### 关键接口

```tsx
type SectionItemStyle = 'prose' | 'bullet' | 'text' | 'card';

interface TabSection {
  label: string;            // 已翻译文本（T() 在构建时调用）
  items: string[];
  itemStyle: SectionItemStyle;
}

interface AiResultTabProps {
  loading: boolean;
  sections: TabSection[];   // 空数组 = 无 cache（触发生成按钮态）
  stale: boolean;
  staleLabel: string;
  skeletonWidths: [string, string, string];  // '80%' 等，两 tab 差异显式化
  skeletonLabelKey: string;  // trailInsightGenerating / trailReviewGenerating
  generateLabelKey: string;
  onGenerate: () => void;
  onRegenerate: () => void;
  TH: ThemeTokens; P: string; T: TranslateFn;
}
```

三态判定：`loading` → SkeletonBlock；`sections.length > 0` → SectionList + stale 行；否则 → 生成按钮。
（原代码判定顺序是 loading → cache 存在性 → 按钮；sections 非空与 cache 存在等价——cache 存在但全部字段为空时原代码仍渲染 cache 分支的空 fragment，新代码渲染 0 个 section，视觉等价。）

### itemStyle → 渲染形态映射（样式差异逐字保留）

| itemStyle | 样式 | 前缀 | 使用处 |
|-----------|------|------|--------|
| 'prose' | contentText | 无 | insight summary |
| 'bullet' | bulletText | `• ` | keyPoints / turningPoints / insight suggestions |
| 'text' | contentText | `• ` | observations / review suggestions |
| 'card' | perspectiveItem 卡片 | 无 | perspectives |

⚠️ 'bullet' 与 'text' 的区别是 bulletText 有 `marginLeft: 4`——两 tab 混用是历史现状，不"顺手统一"（零行为变更约束）。

### sections 构建纯函数

```tsx
function buildInsightSections(cache: TrailInsightCache, T: TranslateFn): TabSection[] {
  return [
    { label: T('trailInsightSummary'), items: [cache.summary], itemStyle: 'prose' },
    { label: T('trailInsightKeyPoints'), items: cache.keyPoints ?? [], itemStyle: 'bullet' },
    ...
  ];
}
```

原代码的 `?? []` 防御 + `length > 0` 条件渲染：SectionList 内对每个 section 做 `items.length > 0` 过滤（或构建时过滤——**构建时过滤**，保持与原条件渲染完全一致：空 section 不渲染 label）。

### R2 顺带修复

**`as` 强转删除**（4 处，原 line 339/344）：
```tsx
// 前：((reviewCache as { perspectives?: string[]; questions?: string[] }).perspectives
//       ?? (reviewCache as { perspectives?: string[]; questions?: string[] }).questions ?? [])
// 后：
(reviewCache.perspectives ?? reviewCache.questions ?? [])
```
`??` 链保留（SQLite 旧数据可能缺 perspectives 字段的运行时防御）；类型上 perspectives 必填所以 `??` 左侧永不 nullish 是类型层面的冗余、运行时层面的防御——加一行注释说明。

**i18n key 表**（5 新 + 1 复用）：

| key | zh | en | zh-Hant | 使用处 |
|-----|----|----|---------|--------|
| `trailAIAnalysis` | AI 分析 | AI Analysis | AI 分析 | header ×2（EmptyState + 主） |
| `trailInsightTab` | 洞察 | Insight | 洞察 | SegmentBar 第一段 |
| `trailInsightStale` | 已有洞察（可能已过期） | Cached insight (may be stale) | 已有洞察（可能已過期） | 洞察 stale 行 |
| `trailReviewStale` | 已有复盘（可能已过期） | Cached review (may be stale) | 已有復盤（可能已過期） | 复盘 stale 行 |
| `trailReviewSuggestions` | 建议 | Suggestions | 建議 | 复盘 suggestions label |
| （复用）`trailReviewQuestions` | 复盘思路 | Review Perspectives | 復盤思路 | SegmentBar 第二段 + perspectives label |

落点：`packages/core/src/i18n/types.ts`（trail 段）+ zh.ts / en.ts / zh-Hant.ts 三语字典。

## 2. PlanCreateScreen 豁免注解

```tsx
// 表单固有分支：字段错误显隐 ×N + frequency 5-mode union 切换，
// presentational 组件无进一步可拆语义单元（quality-guidelines 豁免条款）
// eslint-disable-next-line complexity
function PlanBasicInfoCard(...) {
```

PlanItemEditor 同构。注解只在 lint:complexity 下生效（主 lint 未启用 complexity 规则，ESLint 8.57 默认不报 unused disable）。

## 3. 双包 lint:complexity ratchet

### 独立 config 文件（同构 ×2）

```js
// apps/mobile/.eslintrc.complexity.js（core 同构，路径相对）
const mainConfig = require('./.eslintrc');
module.exports = {
  ...mainConfig,
  rules: {
    ...mainConfig.rules,
    complexity: ['warn', 15],
  },
};
```

注意 `root: true` 随 spread 继承；`plugins`/`overrides`/`parserOptions` 均随 spread 保留（浅拷贝足够——只在 rules 增加一条）。

### package.json 脚本

```jsonc
// apps/mobile
"lint:complexity": "eslint src --ext .ts,.tsx --config .eslintrc.complexity.js --max-warnings 56"
// packages/core
"lint:complexity": "eslint src --ext .ts,.tsx --config .eslintrc.complexity.js --max-warnings 39"
```

- mobile 56 = 59 − 1（ReviewAIPanel 拆分）− 2（豁免注解）；B1 完成后实测校准（若实测 ≠ 56 以实测为准）。
- core 39 = 34 complexity + 5 既有 no-unsafe ratchet 残差（complexity config 继承全部规则，跑出来的总数含残差）。
- 只降不升；mobile 侧因主 lint ratchet=0，complexity 跑分 = 纯 complexity。

## 4. 测试与验证策略

- ReviewAIPanel 无 co-located 测试（RN 渲染测试环境限制，见 quality-guidelines Known Test Environment Limitations）——策略 C 无测试保守拆分：拆分靠 move-only + diff 审查（样式表不动 + JSX 结构等价）+ type-check 护航。
- 每阶段门禁：`pnpm exec eslint <file> --rule '{"complexity": ["warn", 15]}'` 显式检查 + type-check + mobile lint ratchet 0。
- i18n key 新增：三语字典类型由 types.ts 强约束（漏一语 = type error）。

## 5. 风险表

| 风险 | 缓解 |
|------|------|
| AiResultTab 参数化两 tab 不对称（洞察有 summary 单段、复盘有 perspectives 卡片） | itemStyle 4 态显式覆盖全部渲染形态；不统一历史样式差异 |
| cache 存在但字段全空的视觉等价性 | sections 构建时过滤空 section（与原 `length > 0` 条件渲染一致） |
| complexity config 文件 spread 浅拷贝遗漏嵌套结构 | 主 config 的 overrides/plugins 均为顶层属性，浅 spread 完整；B 阶段跑通即证 |
| 豁免注解行号偏移（函数声明上一行） | 注解紧贴函数声明行，实测验证注解后显式检查不报 |
| en/zh-Hant 文案与 zh 语义漂移 | key 表在设计冻结，实施逐字填入 |

## 6. 回滚

单一 commit 序列（test-free 拆分 + 脚本），任一门禁红 → `git checkout -- <file>` 逐文件回退；config/脚本文件独立可弃。
