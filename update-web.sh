#!/bin/bash

# ─── egoless-do Web 服务更新脚本 ──────────────────────────────────
# 用法: ./update-web.sh [--no-cache]
#   --no-cache: 强制完整构建（不使用 Docker 缓存）
set -e

echo "========================================"
echo "  egoless-do Web 服务更新"
echo "========================================"

# 检查环境配置
if [ ! -f .env.production ]; then
    echo "❌ 未找到 .env.production 文件"
    exit 1
fi

source .env.production

# ─── 1. 拉取最新代码 ─────────────────────────────────────────────
echo ""
echo "📥 拉取最新代码..."
git pull

# ─── 2. 构建 Web 应用 ────────────────────────────────────────────
echo ""
echo "🔨 构建 Web 应用..."
BUILD_FLAG=""
if [ "$1" = "--no-cache" ]; then
    BUILD_FLAG="--no-cache"
    echo "  模式: 完整构建（无缓存）"
else
    echo "  模式: 增量构建（使用缓存）"
fi

docker compose build $BUILD_FLAG web

# ─── 3. 重启 Web 服务（不停 PocketBase）─────────────────────────
echo ""
echo "🔄 重启 Web 服务..."
docker compose up -d --no-deps web

# ─── 4. 健康检查 ────────────────────────────────────────────────
echo ""
echo "⏳ 等待服务启动..."
sleep 8

echo ""
echo "📊 健康检查："
WEB_OK=false
PB_OK=false

if curl -s http://localhost:8090/api/health > /dev/null 2>&1; then
    echo "  ✅ PocketBase: 正常"
    PB_OK=true
else
    echo "  ⚠️  PocketBase: 未响应（可能未运行）"
fi

for i in 1 2 3; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|301\|302"; then
        echo "  ✅ Web 应用: 正常 (尝试 $i)"
        WEB_OK=true
        break
    fi
    echo "  ⏳ Web 应用启动中... (尝试 $i/3)"
    sleep 3
done

if [ "$WEB_OK" = false ]; then
    echo "  ❌ Web 应用: 异常"
    echo ""
    echo "查看日志: docker compose logs -f web"
fi

# ─── 5. 清理旧镜像 ──────────────────────────────────────────────
echo ""
echo "🧹 清理未使用的 Docker 镜像..."
docker image prune -f

echo ""
echo "========================================"
if [ "$WEB_OK" = true ]; then
    echo "✅ Web 服务更新完成！"
else
    echo "⚠️  Web 服务更新完成，但健康检查异常"
fi
echo "========================================"
echo "  日志: docker compose logs -f web"
echo "  重启: docker compose restart web"
