# 设计文档：用户资料页增强

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    ProfileScreen                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  用户资料卡片 (顶部)                                │   │
│  │  [头像] [昵称] [邮箱] [座右铭 - 迁移至此]          │   │
│  │  [修改密码按钮 - 新增]                             │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  身体数据卡片                                      │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  修行旅程卡片 (移除座右铭)                          │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  账户卡片                                          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 需求2: 修改密码

### 数据流

```
ProfileScreen (点击"修改密码")
  → Modal (输入旧密码 / 新密码 / 确认新密码)
  → apiChangePassword(token, currentPassword, newPassword)
  → POST /api/auth/change-password (Bearer token)
  → 后端验证旧密码 → 更新PB密码 → 黑名单token → 吊销refresh token
  → 响应 { ok: true, message: "密码修改成功，请重新登录" }
  → Alert 提示 → navigate Login
```

### 后端端点

| 项目 | 内容 |
|------|------|
| 方法 | POST |
| 路径 | `/api/auth/change-password` |
| 鉴权 | Bearer token (verifyAuth) |
| Request | `{ currentPassword: string, newPassword: string }` |
| Response | `{ ok: boolean, message: string }` |
| 错误 | 401 (旧密码错误), 400 (密码强度), 429 (限流), 500 (服务端) |

### 后端实现细节

1. `change-password.ts` 新增文件，Hono 框架
2. 使用 `verifyAuth` 中间件验证 token
3. 使用 `getClientIp` + `resetRateLimit` 限流
4. 用 PocketBase `authWithPassword(userId, currentPassword)` 验证旧密码
5. 用 admin PB 更新用户密码 + `password_changed_at`
6. 黑名单当前 token + 吊销所有 refresh token
7. 注册到 `index.ts` 路由

### 前端 Core 层

新增 `apiChangePassword(token, currentPassword, newPassword)` 到 `packages/core/src/auth.ts`

### 前端 UI 层

ProfileScreen 底部新增"修改密码"按钮，点击弹出 Modal：

| 字段 | 类型 | 校验 |
|------|------|------|
| 当前密码 | TextInput (secureTextEntry) | 必填 |
| 新密码 | TextInput (secureTextEntry) | validatePassword() |
| 确认新密码 | TextInput (secureTextEntry) | 与新密码一致 |

## 需求3: 座右铭迁移

### 布局变更

**当前:**
```
Journey 卡片
├── 座右铭 (编辑/显示)
├── 分隔线
└── 统计条目 (加入天数, 连续打卡, ...)
```

**目标:**
```
用户资料卡片
├── 头像
├── 昵称 (可编辑)
├── 邮箱
├── 座右铭 (编辑/显示) ← 迁移至此
└── ...

Journey 卡片
├── 分隔线
└── 统计条目 (加入天数, 连续打卡, ...)
```

### 具体改动

- 从 ProfileScreen 第 366-395 行移除座右铭编辑代码
- 在用户资料卡片内（第 252-257 行，邮箱下方）插入座右铭

## 兼容性

- 不涉及数据库 schema 变更
- 不涉及同步协议变更
- 密码修改后需重新登录，属于预期行为