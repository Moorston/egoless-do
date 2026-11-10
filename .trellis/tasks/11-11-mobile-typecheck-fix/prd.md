# mobile 补全 type-check 脚本并修复 7 个类型错误

## Goal

`apps/mobile` 没有 `type-check` 脚本，`turbo run type-check`（CI）只覆盖 core，mobile 的 TypeScript 完全绕过类型检查。本任务为 mobile 补全 type-check 脚本、修复当前 7 个 `tsc --noEmit` 错误，使 mobile 类型检查纳入 CI 且通过（0 error）。

## Background

实测（2026-11-11）`cd apps/mobile && npx tsc --noEmit` 报 7 个 error：

1. **`src/features/reflections/core/FilterDrawer.tsx:154,169`** — `PillSelector` 被使用但未 import（2 error，TS2304 Cannot find name）。`PillSelector` 已在 `src/components/UI.tsx:237` 导出，FilterDrawer 已从 `'../../../components/UI'` 导入 `useTheme`，只需补入同条 import。**这是真 bug**：该组件渲染到这两行会运行时崩溃。
2. **`src/features/home/screens/buildCheckinNote.test.ts:14`** — `habit()` 工厂返回 `Habit` 但缺 `abandonReason` 字段，`...overrides`（Partial<Habit>）使其变 `string | undefined`，不可赋给 `abandonReason: string`（1 error，TS2322）。
3. **`node_modules/react-native-amap3d/lib/src/**`** — 4 error（TS7016 supercluster 缺类型、TS2304 GeolocationPosition 未声明、TS2416 Cluster render 与 React19 不兼容、TS2322 map-view ref 类型冲突）。amap3d package.json 无 `types` 字段、`main: lib/src`，TS 直接解析其 `.tsx` 源码并检查 → 暴露 lib 内部与 React 19 的类型不兼容。`skipLibCheck` 只跳 .d.ts，无效。

## Requirements

### R1 — 补全 type-check 脚本
- `apps/mobile/package.json` 增加 `"type-check": "tsc --noEmit"`。
- `turbo run type-check` 须同时覆盖 core 与 mobile（"2 successful"）。

### R2 — 修复 2 个真实源码错误
- FilterDrawer.tsx：把 `PillSelector` 加入从 `'../../../components/UI'` 的 import。
- buildCheckinNote.test.ts：`habit()` 工厂补 `abandonReason: ''`（与其它必填 string 字段一致）。

### R3 — 规避 amap3d 第三方类型错误（4 个）
- 新建 `apps/mobile/src/types/react-native-amap3d.d.ts`，提供最小类型 shim，覆盖实际使用的导出：`MapView`、`Marker`、`Polyline`（值）、`CameraPosition`、`LatLngBounds`、`LatLng`（类型）。
- `apps/mobile/tsconfig.json` 的 `paths` 增加 `"react-native-amap3d": ["./src/types/react-native-amap3d.d.ts"]`，把 TS 对该模块的解析重定向到本地 shim（ambient `declare module` 会被 lib 的真实源码覆盖，故必须用 paths 重定向）。
- 运行时不受影响：Metro/bundler 仍走 node_modules 解析，paths 只作用于 TS 类型解析。

### R4 — 不回归
- core type-check / lint / test 不受影响。
- mobile lint / test 用例数不减少。
- amap3d 运行时行为不变（shim 仅类型层）。

## Acceptance Criteria

- [ ] AC1：`cd apps/mobile && npx tsc --noEmit` exit 0，0 error。
- [ ] AC2：`pnpm run type-check`（turbo）显示 core 与 mobile 两个任务均 successful。
- [ ] AC3：`pnpm run lint`（turbo）仍 core + mobile 均 successful，无新 error。
- [ ] AC4：`pnpm run test` 通过用例数 ≥ 2052，无新失败。
- [ ] AC5：`src/types/react-native-amap3d.d.ts` 存在且 tsconfig `paths` 显式引用；shim 覆盖 `MapView/Marker/Polyline/CameraPosition/LatLngBounds`。
- [ ] AC6：FilterDrawer.tsx 的 `PillSelector` 有正确 import；buildCheckinNote.test.ts `habit()` 含 `abandonReason`。

## Out of Scope

- 收敛 core 620 lint warnings。
- 删除根目录垃圾文件。
- 升级 / 替换 react-native-amap3d（仅做类型 shim）。
- 修 3 个超时测试。
