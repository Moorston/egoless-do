#!/bin/bash

# ─── egoless-do 部署脚本 ────────────────────────────────────────
set -e

echo "🚀 开始部署 egoless-do..."

# 检查环境配置
if [ ! -f .env.production ]; then
    echo "❌ 未找到 .env.production 文件"
    echo "请先复制 .env.production 并填写配置："
    echo "  cp .env.production .env"
    exit 1
fi

# 加载环境变量
source .env.production

# 停止旧容器
echo "⏹  停止旧容器..."
docker compose down

# 拉取最新镜像
echo "📥 拉取最新镜像..."
docker compose pull

# 构建 Web 应用
echo "🔨 构建 Web 应用..."
docker compose build --no-cache web

# 启动服务
echo "▶️  启动服务..."
docker compose --env-file .env.production up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 服务状态："
docker compose ps

# 检查健康状态
echo ""
echo "🏥 健康检查："
if curl -s http://localhost:8090/api/health > /dev/null; then
    echo "  ✅ PocketBase: 正常"
else
    echo "  ❌ PocketBase: 异常"
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo "  ✅ Web 应用: 正常"
else
    echo "  ❌ Web 应用: 异常"
fi

echo ""
echo "🎉 部署完成！"
echo ""
echo "访问地址："
echo "  - Web 应用: http://localhost:3000"
echo "  - PocketBase: http://localhost:8090"
echo "  - PocketBase 管理: http://localhost:8090/_/"
echo ""
echo "如需配置域名和 SSL，请修改 nginx/nginx.conf"
