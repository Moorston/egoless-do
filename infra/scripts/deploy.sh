#!/bin/bash

# ─── egoless-do 部署脚本 ────────────────────────────────────────
# 用法: ./infra/scripts/deploy.sh
set -euo pipefail

echo "🚀 开始部署 egoless-do..."

# 检查环境配置
if [ ! -f .env.production ]; then
    echo "❌ 未找到 .env.production 文件"
    echo "请先复制 .env.production 并填写配置："
    echo "  cp .env.production .env"
    exit 1
fi

# 安全加载环境变量（set -a 自动导出，避免 source 执行恶意代码）
set -a
. ./.env.production
set +a

COMPOSE_FILE="infra/docker/docker-compose.yml"

# 停止旧容器
echo "⏹  停止旧容器..."
docker compose -f "$COMPOSE_FILE" down

# 拉取最新镜像
echo "📥 拉取最新镜像..."
docker compose -f "$COMPOSE_FILE" pull

# 启动服务
echo "▶️  启动服务..."
docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d

# 等待服务启动（轮询健康检查，最多 60 秒）
echo "⏳ 等待服务启动..."
for i in $(seq 1 12); do
  if curl -sf http://localhost:8090/api/health > /dev/null 2>&1; then
    break
  fi
  sleep 5
done

# 检查服务状态
echo "📊 服务状态："
docker compose -f "$COMPOSE_FILE" ps

# 检查健康状态
echo ""
echo "🏥 健康检查："
if curl -s http://localhost:8090/api/health > /dev/null; then
    echo "  ✅ PocketBase: 正常"
else
    echo "  ❌ PocketBase: 异常"
fi

echo ""
echo "🎉 部署完成！"
echo ""
echo "访问地址："
echo "  - PocketBase: http://localhost:8090"
echo "  - PocketBase 管理: http://localhost:8090/_/"
echo ""
echo "如需配置域名和 SSL，请修改 infra/nginx/nginx.conf"