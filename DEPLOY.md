# egoless-do 部署指南

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 域名（可选）

## 快速部署

### 1. 配置环境变量

```bash
# 复制环境配置
cp .env.production .env

# 编辑配置
vim .env
```

必须修改的配置：
- `PB_ADMIN_PASSWORD`: PocketBase 管理员密码
- `SMTP_PASS`: 邮件发送密码
- `NEXT_PUBLIC_POCKETBASE_URL`: 你的域名或服务器 IP

### 2. 执行部署

```bash
# 添加执行权限
chmod +x deploy.sh

# 运行部署
./deploy.sh
```

### 3. 初始化 PocketBase

首次部署后，访问 `http://your-domain.com:8090/_/` 进入 PocketBase 管理后台：

1. 使用配置的管理员账号登录
2. 导入 schema：Settings → Import collections → 选择 `backend/pb_schema.json`
3. 配置邮件：Settings → Mail settings

## 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Web 应用 | 3000 | Next.js 前端 |
| PocketBase | 8090 | 数据库 API |
| Nginx | 80/443 | 反向代理 |

## 常用命令

```bash
# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新部署
git pull
docker-compose build --no-cache
docker-compose up -d
```

## 配置域名

### 1. 修改 Nginx 配置

编辑 `nginx/nginx.conf`，将 `your-domain.com` 替换为你的域名。

### 2. 配置 SSL（推荐）

```bash
# 创建 SSL 目录
mkdir -p nginx/ssl

# 放置证书文件
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

取消 `nginx.conf` 中 SSL 相关注释。

### 3. 重启 Nginx

```bash
docker-compose restart nginx
```

## Mobile App 配置

打包 Mobile App 时设置生产环境 API：

```bash
cd apps/mobile

# Android
EXPO_PUBLIC_API_URL=https://your-domain.com npx eas-cli build --platform android --profile preview

# iOS
EXPO_PUBLIC_API_URL=https://your-domain.com npx eas-cli build --platform ios --profile preview
```

## 故障排查

### PocketBase 无法启动

```bash
# 检查日志
docker-compose logs pocketbase

# 检查数据目录权限
ls -la pb_data
```

### Web 应用无法连接 PocketBase

```bash
# 检查网络
docker network ls
docker network inspect egoless-do_egoless-net

# 测试连接
docker exec egoless-do-web curl http://pocketbase:8090/api/health
```

### 邮件发送失败

1. 检查 SMTP 配置
2. 确认邮箱服务商已开启 SMTP 服务
3. 检查防火墙是否允许 465 端口
