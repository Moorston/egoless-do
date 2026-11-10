# Design — mobile type-check 脚本补全与 7 个类型错误修复

## 决策

### 决策 1：amap3d 用 paths 重定向到本地 shim（非 ambient declare）

- `react-native-amap3d` package.json 无 `types`/`typings` 字段，`main: "lib/src"`（目录），TS 按源码解析找到 `lib/src/index.tsx` 并 type-check 其内部源码 → 暴露 4 个 React 19 类型不兼容错误。
- ambient `declare module 'react-native-amap3d'` **会失效**：当 TS 能找到模块的真实源码时，ambient 声明被忽略。`skipLibCheck` 也无效（仅跳 .d.ts）。
- **方案**：在 `apps/mobile/tsconfig.json` 的 `compilerOptions.paths` 加 `"react-native-amap3d": ["./src/types/react-native-amap3d.d.ts"]`，把 TS 对该模块的解析重定向到本地 shim。paths 在 TS 5.x 无需 baseUrl 即可工作（项目已有 `@egoless-do/core`、`@/*` 两条 paths 验证）。
- 运行时不受影响：Metro/Expo 打包走 node_modules 物理解析，paths 只作用于 `tsc` 类型解析。

### 决策 2：shim 提供最小可用类型，非全 any

全 `any` 会让 3 个使用文件（`GlobalPulseMap.tsx` 静态导入、`useAmapComponents.ts` 动态 import、`types.ts` 间接）丢失类型安全。shim 覆盖实际使用的导出，给 props 留 `[key: string]: unknown` 索引签名兜底，既消除 lib 内部错误又保留基本类型提示：

```ts
declare module 'react-native-amap3d' {
  import type { ComponentType } from 'react';
  export interface LatLng { latitude: number; longitude: number; }
  export interface CameraPosition { center: LatLng; zoom?: number; tilt?: number; }
  export interface LatLngBounds { southWest: LatLng; northEast: LatLng; }
  export interface MapViewProps {
    center?: LatLng; zoom?: number; cameraPosition?: CameraPosition;
    mapType?: string; onLoad?: (e: { nativeEvent: unknown }) => void;
    [key: string]: unknown;
  }
  export interface MarkerProps {
    position?: LatLng; icon?: unknown; onPress?: () => void; [key: string]: unknown;
  }
  export interface PolylineProps {
    points?: LatLng[]; color?: string; width?: number; [key: string]: unknown;
  }
  export const MapView: ComponentType<MapViewProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Polyline: ComponentType<PolylineProps>;
}
```

### 决策 3：FilterDrawer 补 PillSelector import

`FilterDrawer.tsx` 第 7 行已 `import {useTheme} from '../../../components/UI';`，改为 `import {useTheme, PillSelector} from '../../../components/UI';`。`PillSelector` 在 `UI.tsx:237` 已 export，无需新增组件。

### 决策 4：buildCheckinNote.test habit 工厂补字段

`habit()` 返回对象补 `abandonReason: '',`，与 `pauseReason: ''`、`goal: ''` 等必填 string 字段保持一致。`plan()` 工厂同步检查是否缺必填字段（实施时确认）。

### 决策 5：type-check 脚本

`apps/mobile/package.json` scripts 加 `"type-check": "tsc --noEmit"`（与 core 一致）。turbo `type-check` 任务定义已存在（`outputs: []`），自动覆盖。

## 变更文件清单

| 文件 | 变更 |
|---|---|
| `apps/mobile/src/types/react-native-amap3d.d.ts` | 新建，类型 shim |
| `apps/mobile/tsconfig.json` | `paths` 加 `react-native-amap3d` 重定向 |
| `apps/mobile/package.json` | 增加 `type-check` 脚本 |
| `apps/mobile/src/features/reflections/core/FilterDrawer.tsx` | import 补 `PillSelector` |
| `apps/mobile/src/features/home/screens/buildCheckinNote.test.ts` | `habit()` 补 `abandonReason: ''` |

## 兼容性与回滚

- 不改动 core，不影响 core type-check/lint/test。
- 不改动 amap3d 运行时行为（patchedDependencies 不变）。
- mobile lint 规则不变；新增 `src/types/*.d.ts` 不被 eslint `--ext .ts,.tsx` 扫描（除非显式），无 lint 影响。
- 回滚：删 shim + 还原 tsconfig paths + 删 type-check 脚本 + 还原两处源码。

## 验证命令

```bash
cd apps/mobile && npx tsc --noEmit        # AC1: 0 error
pnpm run type-check                       # AC2: core+mobile successful
pnpm run lint                             # AC3: 无新 error
pnpm run test                             # AC4: ≥2052 passed
```
