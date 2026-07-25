# Egoless Do 服务端部署指南

## 架构

```
                          公网                         内网 Docker
┌──────────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Mobile App   │────▶│  Nginx   │────▶│  Auth API    │────▶│  PocketBase  │
│  (APK)        │     │  :80/443 │     │  (Hono):3000 │     │  (内网):8090  │
└──────────────┘     └──────────┘     └──────┬───────┘     └──────────────┘
                                              │
                                              │ Auth API 内部路由:
                                              │   /api/auth/*     → 认证
                                              │   /api/push       → 推送
                                              │   /api/plan/*     → 计划通知
                                              │   /api/monitoring → Sentry
                                              │   /api/setup      → 初始化
                                              │   /api/* (未匹配)  → 代理到 PocketBase
```

## 前提条件

- VPS 已安装 Docker 和 Docker Compose
- 域名 `egolessdo.freebytes.net` 解析到 VPS 公网 IP
- 已安装 Git

## 部署步骤

### 1. 在 VPS 上克隆项目

```bash
git clone <你的仓库地址> /opt/egoless-do
cd /opt/egoless-do
```

### 2. 创建生产环境配置

```bash
cp .env.example .env.production
```

编辑 `.env.production`，至少填写以下必填项：

```bash
# PocketBase 管理员账号（必须修改）
PB_ADMIN_EMAIL=admin@your-domain.com
PB_ADMIN_PASSWORD=your-strong-password-here

# 加密密钥（32 字符，必须修改）
PB_ENCRYPTION_KEY=your-32-char-encryption-key!!
INTERNAL_SECRET=your-32-char-internal-secret!!

# SMTP 邮件配置（用于验证码发送）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your-email@qq.com
SMTP_PASS=your-smtp-authorization-code

# 外部公开地址（CORS 用）
CORS_ORIGIN=https://egolessdo.freebytes.net
EXPO_PUBLIC_PB_URL=https://egolessdo.freebytes.net
EXPO_PUBLIC_API_URL=https://egolessdo.freebytes.net
```

### 3. 设置 SSL 证书（Let's Encrypt）

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot certonly --nginx -d egolessdo.freebytes.net

# 证书路径：
#   /etc/letsencrypt/live/egolessdo.freebytes.net/fullchain.pem
#   /etc/letsencrypt/live/egolessdo.freebytes.net/privkey.pem
```

### 4. 配置 Nginx（宿主机）

将 `infra/nginx/nginx.conf` 复制到宿主机 Nginx 配置目录，并更新 SSL 路径：

```bash
sudo cp infra/nginx/nginx.conf /etc/nginx/sites-available/egolessdo
sudo ln -sf /etc/nginx/sites-available/egolessdo /etc/nginx/sites-enabled/

# 编辑 SSL 配置
sudo nano /etc/nginx/sites-available/egolessdo
# 取消 SSL 相关注释，填写证书路径和 server_name
```

### 5. 部署服务

```bash
# 使用部署脚本
./infra/scripts/deploy.sh
```

或者手动部署：

```bash
# 停止旧容器
docker compose -f infra/docker/docker-compose.yml down

# 构建并启动
docker compose -f infra/docker/docker-compose.yml --env-file .env.production up -d --build

# 检查状态
docker compose -f infra/docker/docker-compose.yml ps
```

### 6. 验证部署

```bash
# 健康检查
curl https://egolessdo.freebytes.net/healthz

# 验证 PocketBase 代理（通过 Auth API）
curl https://egolessdo.freebytes.net/api/health

# 验证 Auth API
curl https://egolessdo.freebytes.net/api/auth/me
```

### 7. PocketBase 初始化（首次部署）

通过 Auth API 的 setup 端点初始化 PocketBase schema：

```bash
curl -X POST https://egolessdo.freebytes.net/api/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SETUP_SECRET" \
  -d '{"adminEmail": "...", "adminPassword": "..."}'
```

## 安全注意事项

- ✅ PocketBase 仅在内网可访问，不暴露任何端口到公网
- ✅ 所有 API 请求通过 Auth API 代理，单一入口
- ✅ PocketBase 管理后台（/_/）完全不对外暴露
- ✅ 需要配置 SSL（Let's Encrypt）确保 HTTPS
- ❌ 不要将 `.env.production` 提交到 Git
- ❌ 不要使用默认的 admin 密码

## 数据备份

备份脚本已集成在 docker-compose 中，每天凌晨 3 点自动备份：

```bash
# 备份存储在 /opt/backups/pb/
# 保留最近 7 天的备份
```

## 更新

```bash
cd /opt/egoless-do
git pull
docker compose -f infra/docker/docker-compose.yml --env-file .env.production up -d --build
```