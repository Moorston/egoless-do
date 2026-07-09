# 实施计划 — 全局代码规范与架构约束

## 阶段划分

### Phase 1: 产出 GLOBAL-CODE-STANDARDS.md（全局代码规范）

任务：
1. 从现有 `.claude/rules/conventions.md` 提取已有规则
2. 从 `.trellis/spec/mobile/frontend/quality-guidelines.md` 提取移动端规范
3. 从 `.trellis/spec/core/backend/quality-guidelines.md` 提取 core 规范
4. 从 `eslint.base.js` 提取自动化规则
5. 聚合去重，按 9 个维度分类
6. 为每条规则标注：强制等级 + 自动化程度 + 适用范围
7. 产出完整文档

### Phase 2: 产出 ARCHITECTURE-CONSTRAINTS.md（架构约束）

任务：
1. 从 `.claude/rules/architecture.md` 提取已有结构
2. 从 `.trellis/spec/*/directory-structure.md` 提取目录规范
3. 从 `.trellis/spec/*/state-management.md` 提取状态管理约束
4. 从代码分析结果提取数据流
5. 定义禁止架构模式黑名单（从 git 历史中的 bug fix 提取）
6. 为每条约束标注适用范围
7. 产出完整文档

### Phase 3: 关联更新

任务：
1. 产出 `INDEX.md`
2. 更新 `.claude/rules/conventions.md` 添加新文档链接
3. 更新 `.claude/rules/architecture.md` 添加新文档链接
4. 产出 ESLint 增强建议清单

## 文件清单

| 文件 | 阶段 | 类型 |
|------|------|------|
| `.trellis/spec/governance/GLOBAL-CODE-STANDARDS.md` | Phase 1 | 产出 |
| `.trellis/spec/governance/ARCHITECTURE-CONSTRAINTS.md` | Phase 2 | 产出 |
| `.trellis/spec/governance/INDEX.md` | Phase 3 | 产出 |
| `.claude/rules/conventions.md` (更新) | Phase 3 | 更新 |
| `.claude/rules/architecture.md` (更新) | Phase 3 | 更新 |

## 时间估计

| Phase | 预计步骤 | 预计文件数 |
|-------|----------|-----------|
| Phase 1 | 6 步（提取→分类→编写→审核→完善→定稿） | 1 |
| Phase 2 | 6 步（提取→分析→定义→编写→审核→定稿） | 1 |
| Phase 3 | 4 步（索引→更新 rules→建议清单→验证） | 4 |

## 验证标准

所有字段就绪后，检查：
- [ ] `GLOBAL-CODE-STANDARDS.md` 每条规则有示例代码
- [ ] `ARCHITECTURE-CONSTRAINTS.md` 包含禁止模式黑名单
- [ ] 所有规则标注了强制等级和适用范围
- [ ] `.claude/rules/` 文件正确链接新文档
- [ ] 未引入与现有 `.trellis/spec/` 矛盾的规则