# 项目架构分析

## Goal
对 egoless-do 项目进行完整的架构分析，绘制架构全景图，记录关键设计决策和模式，识别架构风险点。

## Requirements

### 分析维度

1. **包结构** — monorepo 结构、包依赖方向、模块边界
   - apps/mobile 和 packages/core 的划分是否合理
   - 是否存在循环依赖或越界引用

2. **数据流** — 数据在 UI → Store → SQLite → Server 之间的流动路径
   - 写入路径：用户操作 → 持久化 → 同步
   - 读取路径：启动恢复 → store → UI
   - 同步路径：增量同步 → 冲突解决 → 全量同步

3. **状态管理** — Zustand store 的设计模式
   - 切片划分方式（20+ 切片）
   - 持久化策略（WriteBatcher + SQLite）
   - 状态一致性和竞态条件

4. **认证与会话** — token 生命周期管理
   - 登录/注册/登出流程
   - token 刷新/轮换/恢复
   - 多设备踢出检测

5. **安全** — 认证、授权、数据传输安全
   - API 鉴权模式
   - 速率限制与账户锁定
   - 敏感数据存储

6. **错误处理** — 分层错误处理策略
   - 网络层错误分类
   - Store 层错误传播
   - UI 层错误展示

7. **部署** — 前后端部署架构
   - PocketBase + API Server + Nginx
   - Docker Compose + Cloudflare Tunnel
   - 移动端 EAS Build

8. **扩展性** — 新增功能的难易程度
   - 新增实体的操作路径
   - 新增认证方式的扩展点
   - 新增 UI 屏幕的模式

## 输出

- `docs/architecture-analysis.md` — 完整架构分析文档
- 包含 ASCII 架构图
- 识别风险点并建议改进方向

## Acceptance Criteria
- [ ] 覆盖 8 个分析维度
- [ ] 每个维度有清晰的架构图
- [ ] 识别出至少 3 个架构风险点
- [ ] 有可执行的改进建议