# expo-file-system 迁移到新 API

## Goal

把移动端对废弃的 `expo-file-system/legacy` API 的使用迁移到 Expo SDK 53+ 的模块化新 API
（`expo-file-system` 的 `File` / `Directory` / `Paths`），为后续的 SDK 55 升级（legacy 将被移除）消除障碍。

## 新 API 映射（已核对 `node_modules/expo-file-system@19.0.23` 类型定义）

| 旧 (legacy) | 新 (`expo-file-system`) |
|---|---|
| `FileSystem.documentDirectory` (字符串) | `Paths.document` (`Directory`) |
| `getInfoAsync(p).exists` | `new File(p).exists` / `new Directory(p).exists`（属性） |
| `makeDirectoryAsync(dir, {intermediates})` | `dir.create({ intermediates })`（同步） |
| `writeAsStringAsync(p, s, {encoding})` | `file.write(s, { encoding: 'utf8' \| 'base64' })`（同步） |
| `readAsStringAsync(p, {encoding:UTF8})` | `await file.text()` |
| `readAsStringAsync(p, {encoding:Base64})` | `await file.base64()` |
| `deleteAsync(p, {idempotent})` | `if (file.exists) file.delete()`（同步） |
| `copyAsync({from,to})` | `new File(from).copy(new File(to))`（同步） |
| `StorageAccessFramework.*` | `Directory.pickDirectoryAsync()` + `dir.createFile()` + `file.write()` |
| `createDownloadResumable`（续传+进度） | `XMLHttpRequest` + `onprogress` 保进度，再 `file.write(bytes)`（新 API 无续传/进度） |

注意：新 API 的 `exists/create/write/delete/copy` 为同步方法；写入时直接传 `'utf8'`/`'base64'` 字面量，无需引入 `EncodingType`。

## 改动文件

- `apps/mobile/src/features/music/useMusicStore.ts` — JSON 读写、用户音乐导入/删除/校验全部迁移。
- `apps/mobile/src/features/shared/hooks/useAudioCache.ts` — 移除 legacy 懒加载；下载改为 XHR 保进度。
- `apps/mobile/src/features/reflections/core/ShareCard.tsx` — 「保存到本地」由 SAF 改为目录选择器。

## Acceptance Criteria

- [x] 移动端源码不再 `import ... from 'expo-file-system/legacy'`（仅注释提及）。
- [x] `tsc --noEmit` 在三个改动文件上无错误（项目其余既有类型错误与本任务无关）。
- [x] ESLint 对三个文件 0 error（剩余 warning 为既有问题）。
- [ ] 真机验证：音乐 JSON 读写、用户音乐导入/删除、音频缓存下载带进度、反思卡片「保存到本地」。
- [x] 未引入 forbidden imports，未改动 core。

## 遗留 / 风险

- `Directory.pickDirectoryAsync` 取消时的异常类型未核实，按「reject = 取消」静默返回，需真机确认。
- XHR 方案整文件缓冲进内存再落盘（无 streaming 到磁盘）；音频通常几 MB，可接受。
- 新 API 暂无断点续传（`createDownloadResumable` 的能力），当前以 XHR 进度替代，续传能力在 SDK 升级后再评估。
