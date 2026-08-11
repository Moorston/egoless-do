# 代码审查与修复 — 类型错误 / husky / 测试修复

## 背景

代码库存在 425 个 TypeScript 类型错误、husky pre-commit hook 故障、6 个测试文件失败，以及 lint-staged 被阻塞。这些问题阻碍了日常开发流程（每次 git commit 都会失败）。

## 要求

### 1. husky pre-commit 修复
- `.husky/pre-commit` 文件内容为 husky v4 JSON 格式（`{"hooks": {"pre-commit": "lint-staged"}}`），与安装的 husky v9 不兼容
- 需改为 v9 兼容的 shell 脚本格式，执行 `npx lint-staged`

### 2. TypeScript 类型错误修复
- 425 个错误（376 个非测试文件）
- 按错误类型分布：
  - TS2345（214 个）：参数类型不匹配，主要为 i18n key 类型
  - TS2322（62 个）：类型赋值不兼容
  - TS2339（37 个）：属性不存在
  - TS2769（18 个）：重载不匹配
  - TS2593（12 个）：测试运行器类型定义缺失（未安装 `@types/jest`）
  - TS2352（12 个）：类型转换问题
  - TS18048（11 个）：可能为 undefined
  - 其他（59 个）
- 目标：剩余错误 ≤ 42 个（90% 减少率）

### 3. 测试文件修复
- 6 个测试文件失败，均为模块解析问题（`Cannot find module`）
- 涉及 `packages/core` 的测试文件路径映射问题

### 4. lint-staged 恢复
- husky 修复后使 lint-staged 可在 pre-commit 自动运行（eslint --fix + prettier --write）

## 验收标准

- [ ] `git commit` 正常执行（husky 无错误）
- [ ] TS 类型错误 ≤ 42 个
- [ ] 100% 测试通过（0 failed）
- [ ] lint-staged 在 pre-commit 时自动运行
- [ ] 不使用 `any` 作为类型修复手段（测试文件降级为 warn 除外）
- [ ] 不更改外部 API 或公共行为
- [ ] 遵循 `.trellis/spec/governance/GLOBAL-CODE-STANDARDS.md`