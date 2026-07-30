# ADR-002: 为什么选 PocketBase

## 状态
已接受（2026-07-29）

## 背景
需要为应用选择后端 BaaS，支持用户认证、数据存储、实时同步、文件存储。

## 决策
使用 **PocketBase** 作为后端（自托管 Go 单二进制）。

## 理由

| 因素 | PocketBase | Supabase | Firebase | Appwrite |
|------|-----------|----------|----------|----------|
| **自托管** | ✅ 单二进制 | ❌ 仅云 | ❌ 仅云 | ✅ Docker |
| **成本** | 免费 ✅ | 免费 tier | 免费 tier | 免费 |
| **隐私** | 数据自主 ✅ | 数据在云端 | 数据在云端 | 数据自主 |
| **实时** | SSE ✅ | Realtime | Firestore | Realtime |
| **认证** | 内置 JWT ✅ | GoTrue | Firebase Auth | 内置 |
| **存储** | 本地文件 ✅ | S3 | Cloud Storage | 本地/Docker |
| **Hook** | JS ✅ | Edge Functions | Cloud Functions | Functions |

**关键优势**:
1. **单二进制部署**：`pocketbase.exe serve`，零依赖
2. **JS Hook 系统**：`pb_hooks/` 目录，同步逻辑用 JS 编写
3. **SQLite 存储**：单文件数据库，备份简单
4. **零成本**：无云服务费用

## 后果

### 正面
- 数据完全自主（符合"独立修行"理念）
- 部署简单（单文件 + Docker）
- 成本低（无云服务费用）
- 同步协议可控（自研 sync hook）

### 负面
- 生态小于 Firebase/Supabase
- 无内置 CDN（需自建 Nginx）
- 社区较小（文档有限）

## 参考资料
- [PocketBase 官方文档](https://pocketbase.io/docs/)
- [本项目后端架构](../architecture/sync-protocol.md)
