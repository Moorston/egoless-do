# PRD: CI 改进

## 背景
项目已有 GitHub Actions CI（`.github/workflows/ci.yml`），但存在 3 个可改进点。

## 需求

### 1. build-mobile job 依赖修复
- **当前**: `build-mobile` 仅 `needs: lint`
- **期望**: `needs: [lint, test, security]`
- **原因**: 确保所有检查通过后才构建，避免浪费构建资源

### 2. pnpm store 缓存优化
- **当前**: 每次 job 全量 `pnpm install`
- **期望**: 加 `actions/cache` 缓存 `~/.pnpm-store`
- **原因**: 加速 CI（预计节省 30-60 秒/次）

### 3. 失败通知（可选）
- **当前**: CI 失败无通知
- **期望**: 加 `notify` job，失败时发送通知
- **约束**: 需 webhook URL，如无则跳过此项

## 验收标准
- [ ] `build-mobile` 的 `needs` 包含 `[lint, test, security]`
- [ ] 每个 job 加 pnpm store 缓存（`actions/cache@v4`）
- [ ] （如有 webhook）加 `notify` job，`if: failure()`
- [ ] YAML 语法合法（`yamllint` 或 GitHub 不报错）

## 影响范围
- 仅 `.github/workflows/ci.yml`
- 不影响应用代码、测试、构建产物

## 回滚点
revert ci.yml 单文件即可恢复
