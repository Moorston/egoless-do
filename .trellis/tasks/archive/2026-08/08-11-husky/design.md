# 代码审查与修复 — 技术设计

## 修复策略

### 维度 1: husky pre-commit（独立修复，影响最小）

```
当前: .husky/pre-commit → {"hooks": {"pre-commit": "lint-staged"}}  ← v4 JSON 格式
目标: .husky/pre-commit → #!/usr/bin/env sh\nnpx lint-staged          ← v9 shell 脚本
```

- 风险：低，文件行数 1→2
- 验证：手动执行 `git commit --allow-empty -m "test"` 确认 hook 通过

### 维度 2: TypeScript 类型错误（按错误类型批量修复）

按错误类型分批修复，每种类型修复后立即验证：

| 批次 | 错误类型 | 数量 | 典型修复方式 | 估计工作量 |
|------|---------|------|------------|-----------|
| A | TS2345 i18n key | ~214 | 扩展 I18nKeys 类型或放宽 key 约束 | 30-60 min |
| B | TS2322 类型赋值 | ~62 | 修复类型声明或 cast 到正确类型 | 15-30 min |
| C | TS2339 属性不存在 | ~37 | 添加缺失属性或修复类型定义 | 10-20 min |
| D | TS2593 test runner | ~12 | 安装 `@types/jest` 或配置 vitest 类型 | 2-5 min |
| E | 其他（TS2769/2352/18048/2307 等） | ~100 | 逐类修复 | 20-40 min |

**修复原则：**
- i18n key 错误：优先扩展 `I18nKeys` 联合类型或放宽参数类型，不修改所有调用点
- 类型赋值：优先修复声明，不使用 `as any`
- 属性缺失：优先补充接口定义
- 模块解析：优先修复路径映射或 tsconfig

### 维度 3: 测试文件修复（6 个文件）

- 均为模块解析问题（`Cannot find module`）
- 根因：`packages/core` 测试文件在 `apps/mobile/node_modules/` 下被重新发现，但路径映射不匹配
- 修复：检查 vitest 配置，确保 `@egoless-do/core` 解析正确，或添加 `vite-tsconfig-paths` 插件

### 维度 4: lint-staged 恢复

- 依赖 husky v9 修复
- 配置已存在（`package.json` 中的 `lint-staged` 块）
- 验证：`git commit` 触发后自动运行

## 回滚策略

- 每个批次独立修复，可逐个 revert
- 关键 checkpoint：husky 修复 → 类型检查 → 测试 → 最终提交