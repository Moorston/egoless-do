# 用户资料页增强：数据持久化、密码重置、座右铭迁移

## Goal

增强 ProfileScreen：确认数据持久化完整性、增加已登录用户的密码修改功能、优化座右铭布局位置。

## 调研结论

### 需求1: 数据持久化 — 代码分析结论：链路正确，无需修改

我追踪了 avatar、weight、height 的完整数据流：

**写入路径**: 
```
updateUserProfile({avatar, weight, height})
→ createProfileSlice.updateUserProfile()
→ adapter.persistChange('profile', 'self', updated) 
→ customToRow: 所有字段序列化为 JSON → SQLite user_profiles.data
→ SyncEngine 推送到 PocketBase (PB hook 存储到 data JSON 字段)
```

**读取路径**:
```
用户登录 → initialSync (从 PB 拉取到 SQLite) 
→ flushWrites (写入本地未刷新的变更)
→ rehydrateFromDb → rowToProfile (=SCHEMAS.profile.customRowToEntity)
→ 解析 data JSON → 返回所有字段 → useAppStore.setState()
```

经过逐层代码审计（`entitySchemas.ts` profile schema、`mergeEngine.ts` profile 合并逻辑、`PB hook exportRecord`、`SyncRehydrationManager.rehydrateFromDb`、`rowMappers.ts`），avatar、weight、height 在每个环节都被正确保留。

**结论：链路没有问题。** 如实际仍有不同步情况，建议排查具体设备/环境的同步日志。

### 需求2: 密码重置（已登录改密）— 需全栈实现

### 需求3: 座右铭迁移 — 需调整 UI

## Requirements

### R1: 后端 — 新增 change-password 端点
- `POST /api/auth/change-password`
- 需 Bearer token 鉴权（使用现有 `verifyAuth`）
- Request: `{ currentPassword, newPassword }`
- 用 PocketBase `authWithPassword` 验证当前密码
- 更新 PocketBase 用户密码 + `password_changed_at`
- 黑名单当前 token + 吊销所有 refresh token
- 响应: `{ ok: true, message: "密码修改成功，请重新登录" }`

### R2: 前端 Core — 新增 apiChangePassword
- `packages/core/src/auth.ts` 新增 `apiChangePassword(token, currentPassword, newPassword)` 函数

### R3: 前端 ProfileScreen — 修改密码模态框
- 用户资料卡片底部增加"修改密码"按钮
- 点击弹出模态框，包含：
  - 当前密码输入框
  - 新密码输入框（含强度提示）  
  - 确认新密码输入框
  - 提交按钮
- 成功：Alert 提示 → 导航到 Login 页面
- 使用现有 `validatePassword()` 做前端密码强度校验

### R4: 座右铭迁移
- 从 Journey 卡片移至顶部用户资料卡片
- 位于昵称/邮箱下方
- 保持可编辑功能（点击编辑、保存、取消）

## Acceptance Criteria

- [ ] 后端 `POST /api/auth/change-password` 端点在鉴权后正常工作
- [ ] 旧密码错误时返回 401
- [ ] 新密码不符合强度时返回 400
- [ ] 成功后 token 和 refresh token 被吊销
- [ ] 前端 ProfileScreen 有"修改密码"入口
- [ ] 密码修改成功弹窗提示"请重新登录"并跳转到 Login
- [ ] 座右铭显示在顶部资料卡片内
- [ ] 座右铭编辑功能正常

## Out of Scope

- 不需要修改现有 SyncEngine 或数据持久化逻辑（profile 已同步）
- 不需要修改现有 reset-password 端点