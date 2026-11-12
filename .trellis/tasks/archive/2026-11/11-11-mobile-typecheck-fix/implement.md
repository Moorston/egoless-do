# Implement — mobile type-check 脚本补全与 7 个类型错误修复

## 执行清单（有序）

### Step 1 — 新建 `apps/mobile/src/types/react-native-amap3d.d.ts`
内容见 design.md 决策 2 的 shim（declare module + 最小类型覆盖 MapView/Marker/Polyline/CameraPosition/LatLngBounds/LatLng）。

### Step 2 — 改 `apps/mobile/tsconfig.json`
`compilerOptions.paths` 追加：
```json
"react-native-amap3d": ["./src/types/react-native-amap3d.d.ts"]
```
保留现有 `@egoless-do/core`、`@/*` 两条 paths。

### Step 3 — 加 type-check 脚本到 `apps/mobile/package.json`
```json
"type-check": "tsc --noEmit"
```
（插在 `lint` 之后。）

### Step 4 — 修 FilterDrawer.tsx
第 7 行 `import {useTheme} from '../../../components/UI';` → 加 `PillSelector`。

### Step 5 — 修 buildCheckinNote.test.ts
`habit()` 工厂返回对象补 `abandonReason: '',`。同步检查 `plan()` 工厂是否缺必填字段，缺则补。

### Step 6 — 验证 AC1
```bash
cd apps/mobile && npx tsc --noEmit
```
→ exit 0，0 error。若仍有 amap3d 错误，说明 paths 重定向未生效，检查 shim 路径与 paths 配置。

### Step 7 — 验证 AC2/AC3/AC4
```bash
pnpm run type-check   # core+mobile successful
pnpm run lint         # 无新 error
pnpm run test         # ≥2052 passed，无新失败
```

## Review Gates
- Step 6 后 tsc 必须 0 error 才进 Step 7。
- Step 7 任意回归即停下回查。

## Rollback Points
- Step 1~3 配置层：删 shim + 还原 tsconfig paths + 删脚本。
- Step 4~5 代码层：逐文件 revert。
