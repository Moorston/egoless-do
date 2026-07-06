# API 文档

> 自动生成于 2026-07-06

## 概述

egoless-do API 服务基于 Hono 框架，提供认证、数据同步、推送通知等功能。

## 基础信息

- **Base URL**: `https://egolessdo.freebytes.net` (生产) / `http://localhost:3000` (开发)
- **认证**: Bearer Token (JWT)
- **Content-Type**: `application/json`

## 认证 API

### POST /api/auth/register
注册新用户

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "用户名"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "refreshToken": "refresh_token",
  "expiresAt": 1234567890,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "用户名"
  }
}
```

### POST /api/auth/login
用户登录

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** 同注册

### POST /api/auth/refresh
刷新 Token

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "token": "new_jwt_token",
  "refreshToken": "new_refresh_token",
  "expiresAt": 1234567890
}
```

### POST /api/auth/logout
登出（需要认证）

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true
}
```

### GET /api/auth/me
获取当前用户信息（需要认证）

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "用户名"
}
```

## 数据同步 API

### POST /api/sync/push
推送本地变更到服务器（需要认证）

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "changes": [
    {
      "entity": "habit",
      "entityId": "habit_id",
      "operation": "upsert",
      "payload": { "id": "habit_id", "name": "Exercise" },
      "changedFields": ["name"]
    }
  ]
}
```

**Response:**
```json
{
  "serverTime": 1234567890,
  "applied": [
    {
      "entityId": "habit_id",
      "success": true
    }
  ]
}
```

### GET /api/sync/pull
从服务器拉取变更（需要认证）

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `since` (optional): 上次同步时间戳

**Response:**
```json
{
  "data": {
    "habits": [...],
    "reflections": [...]
  },
  "serverTime": 1234567890
}
```

## 推送通知 API

### POST /api/push/register
注册推送 Token（需要认证）

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "token": "expo_push_token",
  "platform": "ios"
}
```

### POST /api/push/send
发送推送通知（内部使用）

**Request Body:**
```json
{
  "userId": "user_id",
  "title": "提醒标题",
  "body": "提醒内容"
}
```

## 计划通知 API

### POST /api/plan/notify
发送计划提醒（内部使用）

**Request Body:**
```json
{
  "planId": "plan_id",
  "userId": "user_id",
  "message": "计划提醒内容"
}
```

## 监控 API

### POST /api/monitoring/sentry
Sentry tunnel 端点

用于绕过广告拦截器，将 Sentry 事件转发到 Sentry 服务器。

## 错误响应

所有 API 错误响应格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 常见错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-----------|------|
| `INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 |
| `TOKEN_EXPIRED` | 401 | Token 已过期 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `EMAIL_ALREADY_EXISTS` | 409 | 邮箱已注册 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求过于频繁 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

## 限流

- 认证 API: 10 请求/分钟
- 数据同步 API: 60 请求/分钟
- 其他 API: 30 请求/分钟
