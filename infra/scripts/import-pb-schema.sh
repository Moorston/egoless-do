#!/bin/bash
# ─── PocketBase Schema 导入脚本 ──────────────────────────────────
# 用法: ./infra/scripts/import-pb-schema.sh
#
# 功能：
#   1. 用 superuser 账号登录 PocketBase 获取 token
#   2. 通过 API 导入 backend/pb_schema_import.json
#   3. 显示导入结果
#
# 前置条件：
#   - PocketBase 容器正在运行（egoless-do-pb）
#   - .env 文件中有 PB_ADMIN_EMAIL 和 PB_ADMIN_PASSWORD
#   - 已创建 superuser（浏览器或命令行）
# ──────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── 配置 ────────────────────────────────────────────────────────
PB_CONTAINER="egoless-do-pb"
PB_URL="http://localhost:8090"
SCHEMA_FILE="backend/pb_schema_import.json"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERR]${NC}  $1"; }

# ─── 检查前置条件 ────────────────────────────────────────────────

# 1. 检查容器是否运行
if ! docker ps --format '{{.Names}}' | grep -q "^${PB_CONTAINER}$"; then
  error "PocketBase 容器 '${PB_CONTAINER}' 未运行"
  info "请先启动容器: docker compose -f infra/docker/docker-compose.yml up -d"
  exit 1
fi

# 2. 检查 schema 文件
if [ ! -f "$SCHEMA_FILE" ]; then
  warn "未找到 $SCHEMA_FILE，尝试从 pb_schema.json 生成..."
  if [ -f "backend/pb_schema.json" ]; then
    node -e "
      const fs = require('fs');
      const d = JSON.parse(fs.readFileSync('backend/pb_schema.json', 'utf8'));
      const collections = d._collections.map(c => {
        const {id, ...rest} = c;
        // Fix autodate → date
        rest.fields.forEach(f => {
          if (f.type === 'autodate') f.type = 'date';
          if (f.maxSize !== undefined) {
            f.options = { maxSize: f.maxSize };
            delete f.maxSize;
          }
        });
        return rest;
      });
      fs.writeFileSync('$SCHEMA_FILE', JSON.stringify(collections, null, 2));
      console.log('已生成 ' + collections.length + ' 个集合');
    "
  else
    error "找不到 backend/pb_schema.json"
    exit 1
  fi
fi

# 3. 加载 .env 中的管理员账号
ENV_FILE=".env"
if [ -f "infra/docker/.env" ]; then
  ENV_FILE="infra/docker/.env"
fi

# 从 .env 读取
PB_ADMIN_EMAIL=$(grep -oP 'PB_ADMIN_EMAIL=\K.*' "$ENV_FILE" 2>/dev/null || echo "")
PB_ADMIN_PASSWORD=$(grep -oP 'PB_ADMIN_PASSWORD=\K.*' "$ENV_FILE" 2>/dev/null || echo "")

# 如果 .env 没有，尝试从环境变量
PB_ADMIN_EMAIL="${PB_ADMIN_EMAIL:-${PB_ADMIN_EMAIL_ENV:-}}"
PB_ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-${PB_ADMIN_PASSWORD_ENV:-}}"

if [ -z "$PB_ADMIN_EMAIL" ] || [ -z "$PB_ADMIN_PASSWORD" ]; then
  # 尝试从环境变量读取
  PB_ADMIN_EMAIL="${PB_ADMIN_EMAIL}"
  PB_ADMIN_PASSWORD="${PB_ADMIN_PASSWORD}"
fi

if [ -z "$PB_ADMIN_EMAIL" ] || [ -z "$PB_ADMIN_PASSWORD" ]; then
  error "未找到 PB_ADMIN_EMAIL 和 PB_ADMIN_PASSWORD"
  info "请通过环境变量传入:"
  info "  export PB_ADMIN_EMAIL=admin@egoless.do"
  info "  export PB_ADMIN_PASSWORD=your_password"
  info "  $0"
  exit 1
fi

# ─── 导入流程 ────────────────────────────────────────────────────

info "1/3 登录 PocketBase 获取 token..."

LOGIN_RESPONSE=$(curl -s -X POST "${PB_URL}/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"${PB_ADMIN_EMAIL}\",\"password\":\"${PB_ADMIN_PASSWORD}\"")

TOKEN=$(echo "$LOGIN_RESPONSE" | node -e "
  process.stdin.on('data', d => {
    try {
      const r = JSON.parse(d);
      if (r.token) {
        console.log(r.token);
      } else {
        console.error('登录失败:', r.message || JSON.stringify(r));
        process.exit(1);
      }
    } catch(e) {
      console.error('解析响应失败:', d.toString().substring(0, 200));
      process.exit(1);
    }
  });
" 2>&1)

if [ $? -ne 0 ]; then
  error "$TOKEN"
  info "请确认超级管理员已创建且密码正确:"
  info "  docker exec ${PB_CONTAINER} /usr/local/bin/pocketbase superuser upsert admin@egoless.do '你的密码' --dir /pb/pb_data"
  exit 1
fi

info "   Token 获取成功 ✓"

# ─── 导入集合 ────────────────────────────────────────────────────
info "2/3 导入 schema 文件 ($SCHEMA_FILE)..."

IMPORT_RESPONSE=$(curl -s -X PUT "${PB_URL}/api/collections" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "@${SCHEMA_FILE}" 2>&1)

# 检查导入结果
IMPORT_ERROR=$(echo "$IMPORT_RESPONSE" | node -e "
  process.stdin.on('data', d => {
    try {
      const r = JSON.parse(d);
      // 成功时返回数组，失败时返回 {code, message, data}
      if (Array.isArray(r)) {
        console.log('OK:' + r.length);
      } else {
        console.log('ERR:' + (r.message || JSON.stringify(r)));
      }
    } catch(e) {
      console.log('PARSE_ERR:' + d.toString().substring(0, 300));
    }
  });
" 2>&1)

if echo "$IMPORT_ERROR" | grep -q "^OK:"; then
  COUNT=$(echo "$IMPORT_ERROR" | cut -d: -f2)
  info "✅ 导入成功！共 ${COUNT} 个集合"
else
  ERR_MSG=$(echo "$IMPORT_ERROR" | sed 's/^ERR://')
  error "导入失败: ${ERR_MSG}"

  # 尝试逐个创建（兜底策略）
  warn "尝试逐个创建集合..."
  COLLECTIONS=$(cat "$SCHEMA_FILE")
  echo "$COLLECTIONS" | node -e "
    const fs = require('fs');
    const http = require('http');
    const collections = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
    const token = process.env.TOKEN;
    let success = 0, fail = 0;

    collections.forEach(c => {
      const body = JSON.stringify(c);
      const req = http.request({
        hostname: 'localhost',
        port: 8090,
        path: '/api/collections/',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('  ✓ ' + c.name);
            success++;
          } else {
            console.log('  ✗ ' + c.name + ': ' + data.substring(0, 100));
            fail++;
          }
          if (success + fail === collections.length) {
            console.log('完成: ' + success + ' 成功, ' + fail + ' 失败');
          }
        });
      });
      req.on('error', e => {
        console.log('  ✗ ' + c.name + ': ' + e.message);
        fail++;
        if (success + fail === collections.length) {
          console.log('完成: ' + success + ' 成功, ' + fail + ' 失败');
        }
      });
      req.write(body);
      req.end();
    });
  "
fi

# ─── 验证 ─────────────────────────────────────────────────────────
info "3/3 验证集合..."

COLLECTION_COUNT=$(curl -s "${PB_URL}/api/collections" \
  -H "Authorization: Bearer ${TOKEN}" | \
  node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log(r.totalItems || (r.items||[]).length)}catch{console.log('?')}})" 2>/dev/null || echo "?")

info "当前 PocketBase 集合数: ${COLLECTION_COUNT}"
info "✅ 完成！"