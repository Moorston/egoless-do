# Egoless-Do 全局代码规范

> 项目级代码质量标准 — 适用于 `packages/core`、`apps/mobile`、`infra/docker/api`、`backend/pb_hooks`
>
> **维护者**: 所有开发者 | **审核**: Architecture Review
> **版本**: 1.0 | **更新**: 2026-07-09

---

## 目录

- [规则格式说明](#规则格式说明)
- [1. 类型安全](#1-类型安全)
- [2. 副作用管控](#2-副作用管控)
- [3. 日志规范](#3-日志规范)
- [4. 导入规范](#4-导入规范)
- [5. 命名规范](#5-命名规范)
- [6. 错误处理](#6-错误处理)
- [7. 测试规范](#7-测试规范)
- [8. 国际化规范](#8-国际化规范)
- [9. ESLint 配置联动](#9-eslint-配置联动)

---

## 规则格式说明

每条规则遵循以下标记：

```
[🔴 MUST | 🟡 SHOULD | 🟢 MAY] [🤖 Auto | 👁 Manual]
适用范围: core | mobile | api | pb | ALL
```

| 标记 | 含义 |
|------|------|
| 🔴 **MUST** | 违反即产生 bug 或架构违规，必须修复 |
| 🟡 **SHOULD** | 违反降低可维护性，建议修复 |
| 🟢 **MAY** | 团队约定，无自动化检查 |
| 🤖 **Auto** | ESLint/TSConfig 可自动检测或修复 |
| 👁 **Manual** | 需要人工 Code Review |

---

## 1. 类型安全

### 1.1 `any` 禁止

> [🔴 MUST] [🤖 Auto — `@typescript-eslint/no-explicit-any: error`]
> 适用范围: ALL

禁止使用 `any` 类型。需要使用动态类型时，用 `unknown` 替代并通过类型守卫窄化。

```typescript
// ❌ 禁止
function process(data: any) { return data.value; }

// ✅ 正确
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: number }).value;
  }
  throw new Error('Invalid data shape');
}
```

**例外**（需加注释说明原因）：
- 测试文件（`*.test.ts`）中降为 `warn`
- Mock 工厂中确需动态类型的有限场景

### 1.2 `as` 转型限制

> [🟡 SHOULD] [👁 Manual]
> 适用范围: ALL

`as` 转型仅可用于类型窄化（收窄），不可用于类型强制扩展（拓宽）。外部数据（API 响应、SQLite 查询结果）必须通过 Zod 验证后使用。

```typescript
// ❌ 禁止 — 绕过类型检查
const habit = rawData as Habit;

// ✅ 正确 — 通过 Zod schema 验证
const habit = HabitSchema.parse(rawData);

// ✅ 正确 — as 用于窄化联合类型
const value = event as KeyboardEvent;
```

### 1.3 `@ts-ignore` / `@ts-expect-error` 管理

> [🔴 MUST] [🤖 Auto — ESLint `@typescript-eslint/ban-ts-comment`]
> 适用范围: ALL

禁止无注释的 `@ts-*` 指令。每次使用时必须附带原因说明。

```typescript
// ❌ 禁止
// @ts-expect-error

// ✅ 正确
// @ts-expect-error — expo-image 的类型定义尚未导出 LinearGradientProps
const props: LinearGradientProps = { ... };
```

### 1.4 优先使用 `import type`

> [🟡 SHOULD] [🤖 Auto — `@typescript-eslint/consistent-type-imports`]
> 适用范围: ALL

仅用于编译时的类型引用使用 `import type`，避免运行时依赖。

```typescript
// ✅ 正确
import type { Habit, PlanItem } from '@egoless-do/core';
import { useAppStore } from '../store/useAppStore';
```

### 1.5 禁止在 mobile 中重复定义 core 已有类型

> [🔴 MUST] [👁 Manual]
> 适用范围: mobile

`apps/mobile` 的业务类型必须从 `@egoless-do/core` 导入。禁止在 screen/component 文件中重新定义已在 core 中存在的实体类型。导航参数类型等 mobile 特有类型除外。

```typescript
// ❌ 禁止
interface Habit { id: string; name: string; }

// ✅ 正确
import type { Habit } from '@egoless-do/core';
```

---

## 2. 副作用管控

### 2.1 Pure Function 纯度要求

> [🔴 MUST] [👁 Manual]
> 适用范围: core

`packages/core/src/business/` 下的函数必须保持纯函数特性：相同输入 → 相同输出，无 I/O、无 Date.now()、无 Math.random()。

```typescript
// ❌ 禁止
export function getTodayFoods(foods: FoodEntry[]): FoodEntry[] {
  const today = new Date().toISOString().slice(0, 10); // 隐藏依赖
  return foods.filter(f => f.date === today);
}

// ✅ 正确
export function filterFoodsByDate(foods: FoodEntry[], date: string): FoodEntry[] {
  return foods.filter(f => f.date === date);
}
```

### 2.2 时间/随机数参数化

> [🟡 SHOULD] [👁 Manual]
> 适用范围: ALL

需要 `Date.now()` 或 `Math.random()` 的函数应将其作为参数注入，便于测试和 mock。

```typescript
// ✅ 正确
export function calculateStreak(history: CheckinEntry[], now: number = Date.now()): number {
  // ...
}
```

### 2.3 禁止在 Render 中执行副作用

> [🔴 MUST] [🤖 Auto — `react-hooks/exhaustive-deps`]
> 适用范围: mobile

React 组件的 render body 中禁止执行副作用（API 调用、持久化写入、同步触发）。所有副作用必须包裹在 `useEffect` 或事件处理器中。

```typescript
// ❌ 禁止
function MyScreen() {
  const { addFood } = useAppStore(useShallow(s => ({ addFood: s.addFood })));
  addFood(newEntry); // 每次 render 都会执行
  return <View />;
}

// ✅ 正确
function MyScreen() {
  const { addFood } = useAppStore(useShallow(s => ({ addFood: s.addFood })));
  const handleSubmit = useCallback(() => addFood(newEntry), [addFood]);
  return <Button onPress={handleSubmit} />;
}
```

### 2.4 禁止直接修改状态

> [🔴 MUST] [👁 Manual]
> 适用范围: core, mobile

Zustand 中禁止直接修改状态对象，必须返回新的引用。

```typescript
// ❌ 禁止
set(state => { state.items.push(newItem); return state; });

// ✅ 正确
set(state => ({ items: [...state.items, newItem] }));
```

---

## 3. 日志规范

### 3.1 统一使用 `createLogger`

> [🔴 MUST] [👁 Manual]
> 适用范围: ALL

禁止使用 `console.log`、`console.warn`、`console.error`。统一使用 `@egoless-do/core` 提供的 `createLogger`。

```typescript
// ❌ 禁止
console.log('food saved:', id);
console.warn('network slow');
console.error('sync failed', err);

// ✅ 正确
import { createLogger } from '@egoless-do/core';
const log = createLogger('FoodSlice');
log.info('food saved', { id });
log.warn('network slow');
log.error(err, { context: 'sync failed' });
```

### 3.2 Logger Tag 命名规范

> [🟡 SHOULD] [👁 Manual]
> 适用范围: ALL

Logger tag 使用 PascalCase 组件/模块名，保持稳定（不随重构改变）。

```typescript
// ✅ 正确
const log = createLogger('AuthSlice');    // Slice 名
const log = createLogger('BreathingScreen'); // 组件名
const log = createLogger('SyncEngine');    // 服务名

// ❌ 不建议
const log = createLogger('my-component'); // 不统一的命名风格
```

---

## 4. 导入规范

### 4.1 导入顺序

> [🟡 SHOULD] [🤖 Auto — `import/order`]
> 适用范围: ALL

按分组排序：builtin → external → internal → parent → sibling → index，组间空行分隔，组内按字母序。

```typescript
// ✅ 正确（自动格式化）
import { Platform } from 'react-native';
import { create } from 'zustand';

import type { Habit } from '@egoless-do/core';
import { createLogger } from '@egoless-do/core';

import { useAppStore } from '../../store/useAppStore';
import { styles } from './styles';
```

### 4.2 禁止导入 core → app

> [🔴 MUST] [🤖 Auto — 已配置 `no-restricted-imports`]
> 适用范围: core

`packages/core` 禁止导入 `apps/mobile` 或 `apps/web` 中的任何内容，构成循环依赖。

### 4.3 禁止导入 core → react/react-native

> [🔴 MUST] [🤖 Auto — 已配置 `no-restricted-imports`]
> 适用范围: core

`packages/core` 必须保持平台无关，禁止导入 `react`、`react-native`、`expo-*`。

### 4.4 禁止跨 Feature 直接引用

> [🔴 MUST] [👁 Manual]
> 适用范围: mobile

Feature 模块之间禁止直接文件引用。共享功能应抽取到 `components/` 或 `packages/core`。

```typescript
// ❌ 禁止
import { BreathingScreen } from '../breathing/BreathingScreen';

// ✅ 正确 — 通过导航路由跳转
navigation.navigate('Breathing');
```

---

## 5. 命名规范

### 5.1 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| Screen 组件 | `XxxScreen.tsx` | `BreathingScreen.tsx` |
| 组件 | PascalCase | `HabitCard.tsx` |
| Hook | camelCase + `use` 前缀 | `useBreathAudio.ts` |
| Slice 工厂 | camelCase + `create` 前缀 | `createHabitSlice.ts` |
| 纯函数 | camelCase | `calculateStreak.ts` |
| 类型文件 | camelCase | `habit.ts` |
| 测试文件 | `*.test.ts(x)` | `habits.test.ts` |
| 目录 | kebab-case | `global-pulse/` |

### 5.2 标识符命名

```typescript
// 🔴 禁止
const temp = 42;
const data = getData();

// 🟡 建议改进
const maxCalories = 2500;
const validEntries = filterEntries(allEntries);
```

---

## 6. 错误处理

### 6.1 异步错误必须捕获

> [🔴 MUST] [👁 Manual]
> 适用范围: ALL

所有 async 操作必须处理 rejection，禁止 dangling promise。

```typescript
// ❌ 禁止
adapter.persistChange('habit', id, data);
someAsyncFunction();

// ✅ 正确
adapter.persistChange('habit', id, data).catch(e => log.error(e));
await someAsyncFunction().catch(handleError);
```

### 6.2 错误边界

> [🔴 MUST] [👁 Manual]
> 适用范围: mobile

每个顶层 Screen 应包裹 `ErrorBoundary`，防止未捕获异常导致白屏。

```typescript
<ErrorBoundary fallback={<ErrorScreen />}>
  <BreathingScreen />
</ErrorBoundary>
```

### 6.3 错误信息分级

> [🟡 SHOULD] [👁 Manual]
> 适用范围: ALL

| 级别 | 用途 | 日志方法 |
|------|------|---------|
| `error` | 不可恢复异常，需要人工介入 | `log.error(err, ctx)` |
| `warn` | 可恢复异常，不影响核心流程 | `log.warn(msg, data)` |
| `info` | 重要流程节点，用于调试 | `log.info(msg, data)` |
| `debug` | 详细调试信息（仅开发环境） | `log.debug(msg, data)` |

---

## 7. 测试规范

### 7.1 测试位置

> [🟡 SHOULD] [👁 Manual]
> 适用范围: core

纯函数测试与源码同目录（`business/habits.test.ts`）。Slice 测试放置在 `store/` 下。跨包集成测试放置在根 `__tests__/`。

### 7.2 Mock 模式

> [🔴 MUST] [👁 Manual]
> 适用范围: ALL

测试中避免 mock 整个模块，优先通过依赖注入模拟。

```typescript
// ✅ 正确 — 注入依赖
function calculateStreak(history: CheckinEntry[], now: number): number { ... }
test('calculates streak', () => {
  expect(calculateStreak(mockHistory, 1000)).toBe(5);
});

// ✅ 正确 — 适配器 mock (StorageAdapter)
const mockAdapter = {
  persistChange: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
};
```

### 7.3 避免测试生产代码中的 `any`

> [🟡 SHOULD] [🤖 Auto — override 为 warn]
> 适用范围: ALL

测试文件中的 `any` 会降低测试价值，尽量使用具体类型或 `vi.fn<...>()`。

### 7.4 性能基准测试阈值

> [🟡 SHOULD] [👁 Manual]
> 适用范围: ALL

性能基准测试（`performance.test.ts`）的阈值必须足够宽松以通过 CI 环境（较慢的机器/容器）。经验法则：将预期时间设为本地开发环境实测值的 3-5 倍。`10ms` 级别的紧阈值在 CI 上会频繁不稳定（`76ms > 10ms`），应设为 `100ms` 或更高。

```typescript
// ❌ 脆弱 — CI 上不稳定
expect(elapsed).toBeLessThan(10);

// ✅ 稳健 — 给 CI 环境留余量
expect(elapsed).toBeLessThan(100);
```

---

## 8. 国际化规范

### 8.1 所有用户可见字符串走 `t()`

> [🔴 MUST] [👁 Manual]
> 适用范围: mobile

禁止在 JSX 或 UI 组件中硬编码用户可见文本，必须通过 `t()` 函数引用 i18n key。

```typescript
// ❌ 禁止
<Text>保存成功</Text>
<Text>Please enter your name</Text>

// ✅ 正确
<Text>{t('save_success')}</Text>
<Text>{t('name_placeholder')}</Text>
```

### 8.2 i18n Key 命名

> [🟡 SHOULD] [👁 Manual]
> 适用范围: mobile

使用 snake_case 分层命名：`<module>_<action>_<element>`。

### 8.3 禁止「假国际化」

> [🔴 MUST] [👁 Manual + 🤖 Lint 辅助]
> 适用范围: mobile

`T('key') || '回退文案'` 模式仅在 key 真实存在于 i18n 文件时才允许。若 key 不存在，`T()` 永远返回空字符串，回退文案始终生效，等同于硬编码。

```typescript
// ❌ 禁止 — bodyUndo 从未在 types.ts 声明，'撤销' 始终显示
<Text>{T('bodyUndo') || '撤销'}</Text>

// ✅ 正确 — key 已声明，回退仅作极端兜底
<Text>{T('bodyUndo') || '撤销'}</Text>
// 且 types.ts 中声明：bodyUndo: string;
// 且 zh.ts / en.ts / zh-Hant.ts 中均有对应值
```

**验收**：新增 `T('someKey')` 引用时，必须同时在 `packages/core/src/i18n/types.ts` 声明 key，并在 zh.ts / en.ts / zh-Hant.ts 三个文件提供翻译。

### 8.4 运行时生成的字符串也必须国际化

> [🔴 MUST] [👁 Manual]
> 适用范围: mobile

8.1 规则禁止 JSX 中的字面量硬编码，但**运行时拼接产生的非 ASCII 文本同样违规**。日期、时长、数量等格式化函数若返回中文/英文文本，必须通过 i18n key 输出，不能用字符串拼接生成。

```typescript
// ❌ 禁止 — 拼接产生中文，且永远不响应语言切换
return `${month}月${day}day`;              // "8月2日" — 硬编码中文量词
return `距${period}还有 ${h}h${m}m`;       // "距子时还有" — 硬编码中文

// ✅ 正确 — 通过 T() 输出，响应语言切换
return T('sleepDistance', { time: `${h}h${m}m` });  // 文案在字典中翻译
```

**常见陷阱**：
- 日期格式化（"M月D日"、"周X"）→ 使用 `T('monthUnit')` / `T('weekdayMon')` 等 key
- 时长格式化（"X小时Y分"）→ 字典中定义单位 key，数值作为参数传入
- 列表连接（"A、B、C"）→ 使用 `Intl.ListFormat` 或 i18n key 模板

**验收**：grep 非字典文件中的中文量词（月、日、时、分、秒）和连接词（和、与、或），确认均为运行时参数而非拼接产物。

### 8.5 `t()` 与 `T()` 的选择

> [🔴 MUST] [👁 Manual]
> 适用范围: mobile

项目存在两套翻译函数，行为不同：

| 函数 | 来源 | 响应语言切换 | 使用场景 |
|------|------|-------------|---------|
| `T()` | `useT()` hook（来自 `../../components/UI`） | ✅ 响应 | React 组件/hook 内部 |
| `t()` | `@egoless-do/core` 模块级导出 | ❌ 不响应，默认 zh | 纯工具函数、非 React 上下文 |

```typescript
// ❌ 禁止 — 组件内使用 t()，切换语言后仍显示中文
import { t } from '@egoless-do/core';
<Text>{t('sleepMonthAvg')}</Text>   // 切换英文后仍显示"本月平均"

// ✅ 正确 — 组件内使用 T() 响应语言切换
const { T } = useTheme();  // 或从 UI hook 解构
<Text>{T('sleepMonthAvg')}</Text>
```

**例外**：非 React 工具函数（如 `business/sleep.ts`、`business/dateUtils.ts`）可用 `t()` 作为静态文案输出，但需注释说明"该函数不在 React 上下文中，语言切换需调用方自行刷新"。

**验收**：组件/hook 文件中的翻译调用必须是 `T()`；若因层级传递无法使用 hook，需通过 props 传入翻译后的文本。

### 8.6 颜色/字号走 Token

> [🔴 MUST] [👁 Manual]
> 适用范围: mobile

禁止硬编码颜色值和字号，使用 `THEMES[...]` 和 `FONT_*`。

```typescript
// ❌ 禁止
<Text style={{ color: '#333', fontSize: 16 }}>内容</Text>

// ✅ 正确
<Text style={{ color: THEMES[theme].text, fontSize: FONT_BODY }}>内容</Text>
```

---

## 9. ESLint 配置联动

> 以下规则已配置在 `packages/config/eslint.base.js` 中，与本规范同步。

| 规范条目 | ESLint 规则 | 状态 |
|---------|------------|------|
| 1.1 any 禁止 | `@typescript-eslint/no-explicit-any: error` | ✅ 已配置 |
| 1.3 @ts-* 管理 | `@typescript-eslint/ban-ts-comment` | 🟡 需确认 |
| 4.1 导入顺序 | `import/order` | ✅ 已配置 |
| 4.2 禁止 core→app | `no-restricted-imports` | ✅ 已配置（packages/core override） |
| 4.3 禁止 core→React | `no-restricted-imports` | ✅ 已配置（packages/core override） |
| 嵌套深度 | `max-depth: [warn, 4]` | ✅ 已配置 |
| 8.3 假国际化（key 必须声明） | 自定义 lint 脚本 + code review | 🟡 需确认 |
| 8.4 运行时字符串国际化 | grep 扫描中文量词 + code review | 🟡 需确认 |
| 8.5 t()/T() 选择 | 静态分析：组件文件禁止 import t from core | 🟡 待配置 |
| 函数长度 | `max-lines-per-function: [warn, 300]` | ✅ 已配置 |
| 等号判断 | `eqeqeq: [error, smart]` | ✅ 已配置 |
| 重复导入 | `import/no-duplicates: error` | ✅ 已配置 |

### 建议新增规则（按优先级）

| 优先级 | 规则 | 说明 |
|--------|------|------|
| **P0** | ~~`no-restricted-imports`~~ | ~~阻止 core→app 和 core→react 的非法跨层导入~~ ✅ 已配置 |
| **P0** | ~~`react-hooks/exhaustive-deps`~~ | ~~确保 useEffect 等 hooks 的依赖数组完整~~ ✅ 已配置（mobile） |
| **P1** | `no-console` (error) | 强制使用 createLogger，禁止 console.* |
| **P1** | `import/no-restricted-paths` | 补充 no-restricted-imports 的路径级限制 |
| **P1** | `@typescript-eslint/prefer-nullish-coalescing` | 统一使用 `??` 而非 `\|\|` 处理 null/undefined |
| **P2** | `@typescript-eslint/no-unnecessary-condition` | 捕获多余 null 检查 |
| **P2** | `react/jsx-no-leaked-render` | 防止条件渲染中的意外 0/NaN 显示 |

---

> **参见**: `.trellis/spec/mobile/frontend/quality-guidelines.md`（移动端详细规范）
> `.trellis/spec/core/backend/quality-guidelines.md`（Core 详细规范）
> `.trellis/spec/governance/ARCHITECTURE-CONSTRAINTS.md`（架构约束）