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
#   - 已创建 superuser（浏览器或命令行）
# ──────────────────────────────────────────────────────────────────

# 不使用 set -e，手动处理错误
PB_CONTAINER="egoless-do-pb"
SCHEMA_FILE="backend/pb_schema_import.json"

# 颜色
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERR]${NC}  $1"; }

# ─── 前置检查 ────────────────────────────────────────────────────

# 1. 容器是否运行
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${PB_CONTAINER}$"; then
  error "PocketBase 容器 '${PB_CONTAINER}' 未运行"
  info "请先启动容器: docker compose -f infra/docker/docker-compose.yml up -d"
  exit 1
fi
info "✓ 容器 ${PB_CONTAINER} 运行中"

# 2. Schema 文件
if [ ! -f "$SCHEMA_FILE" ]; then
  warn "未找到 ${SCHEMA_FILE}，从 pb_schema.json 生成..."
  if [ ! -f "backend/pb_schema.json" ]; then
    error "找不到 backend/pb_schema.json"
    exit 1
  fi
  node -e "
    const fs = require('fs');
    const d = JSON.parse(fs.readFileSync('backend/pb_schema.json', 'utf8'));
    const collections = d._collections.map(c => {
      const {id, ...rest} = c;
      rest.fields.forEach(f => {
        if (f.type === 'autodate') f.type = 'date';
        if (f.maxSize !== undefined) { f.options = { maxSize: f.maxSize }; delete f.maxSize; }
      });
      return rest;
    });
    fs.writeFileSync('${SCHEMA_FILE}', JSON.stringify(collections, null, 2));
    console.log('已生成 ' + collections.length + ' 个集合');
  " || { error "生成 schema 文件失败"; exit 1; }
fi
info "✓ Schema 文件已就绪"

# 3. 读取管理员密码
# 提示用户输入（避免 .env 密码与浏览器创建时不匹配的问题）
echo ""
echo "请输入 PocketBase 超级管理员邮箱（默认: admin@egoless.do）:"
read -r PB_ADMIN_EMAIL
PB_ADMIN_EMAIL="${PB_ADMIN_EMAIL:-admin@egoless.do}"

echo "请输入 PocketBase 超级管理员密码（输入不可见）:"
read -r -s PB_ADMIN_PASSWORD
echo ""

if [ -z "$PB_ADMIN_PASSWORD" ]; then
  error "密码不能为空"
  exit 1
fi

# ─── 导入流程 ────────────────────────────────────────────────────
# 注意：PocketBase 容器未暴露端口到宿主机，需要通过 docker exec 访问

echo ""
info "1/3 登录 PocketBase 获取 token..."

# 在容器内用 curl 登录
LOGIN_CMD="curl -s -X POST http://localhost:8090/api/collections/_superusers/auth-with-password \
  -H 'Content-Type: application/json' \
  -d '{\"identity\":\"${PB_ADMIN_EMAIL}\",\"password\":\"${PB_ADMIN_PASSWORD}\"}'"

LOGIN_RESPONSE=$(docker exec "${PB_CONTAINER}" sh -c "$LOGIN_CMD" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  error "curl 执行失败: $LOGIN_RESPONSE"
  exit 1
fi

# 解析 token
TOKEN=$(echo "$LOGIN_RESPONSE" | node -e "
  process.stdin.on('data', d => {
    try {
      const r = JSON.parse(d);
      if (r.token) { console.log(r.token); }
      else { console.error('登录失败: ' + (r.message || JSON.stringify(r))); process.exit(1); }
    } catch(e) {
      console.error('解析响应失败: ' + d.toString().substring(0, 200));
      process.exit(1);
    }
  });
" 2>&1)

if [ $? -ne 0 ]; then
  error "$TOKEN"
  echo ""
  info "可能的原因："
  info "  - 密码错误（浏览器创建时用的密码和输入的不一致）"
  info "  - 超级管理员未创建"
  info "  - 直接在 PocketBase 后台重置密码，或重新创建:"
  info "    docker exec ${PB_CONTAINER} /usr/local/bin/pocketbase superuser upsert admin@egoless.do '你的密码' --dir /pb/pb_data"
  exit 1
fi

info "   ✓ 登录成功"

# ─── 导入集合 ────────────────────────────────────────────────────
echo ""
info "2/3 导入 schema..."

# 把 schema 文件复制到容器内
docker cp "$SCHEMA_FILE" "${PB_CONTAINER}:/tmp/schema.json" 2>/dev/null || {
  # 如果 docker cp 失败，用 cat 管道
  cat "$SCHEMA_FILE" | docker exec -i "${PB_CONTAINER}" sh -c "cat > /tmp/schema.json"
}

IMPORT_RESPONSE=$(docker exec "${PB_CONTAINER}" sh -c "
  curl -s -X PUT http://localhost:8090/api/collections \
    -H 'Authorization: Bearer ${TOKEN}' \
    -H 'Content-Type: application/json' \
    -d @/tmp/schema.json
" 2>&1)

# 解析导入结果
IMPORT_RESULT=$(echo "$IMPORT_RESPONSE" | node -e "
  process.stdin.on('data', d => {
    try {
      const r = JSON.parse(d);
      if (Array.isArray(r)) {
        console.log('OK:' + r.length);
        r.forEach(c => console.log('  ✓ ' + c.name));
      } else {
        let msg = r.message || JSON.stringify(r);
        // 尝试提取具体哪个集合出错
        if (r.data) {
          const keys = Object.keys(r.data);
          if (keys.length > 0) msg += ' (' + keys.join(', ') + ')';
        }
        console.log('ERR:' + msg);
      }
    } catch(e) {
      console.log('PARSE_ERR:' + d.toString().substring(0, 500));
    }
  });
" 2>&1)

if echo "$IMPORT_RESULT" | grep -q "^OK:"; then
  COUNT=$(echo "$IMPORT_RESULT" | head -1 | cut -d: -f2)
  echo "$IMPORT_RESULT" | grep '  ✓'
  info "✅ 导入成功！共 ${COUNT} 个集合"
else
  ERR_MSG=$(echo "$IMPORT_RESULT" | sed 's/^ERR://')
  error "批量导入失败: ${ERR_MSG}"

  echo ""
  info "尝试逐个创建集合（跳过已存在的）..."

  # 逐个创建
  COLLECTION_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('${SCHEMA_FILE}','utf8')).length)")
  SUCCESS=0
  FAIL=0

  for i in $(seq 0 $((COLLECTION_COUNT - 1))); do
    COLLECTION_JSON=$(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('${SCHEMA_FILE}','utf8'))[${i}]))")

    CREATE_RESPONSE=$(docker exec "${PB_CONTAINER}" sh -c "
      curl -s -X POST http://localhost:8090/api/collections \
        -H 'Authorization: Bearer ${TOKEN}' \
        -H 'Content-Type: application/json' \
        -d '${COLLECTION_JSON}'
    " 2>&1)

    COLLECTION_NAME=$(echo "$COLLECTION_JSON" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).name))")

    if echo "$CREATE_RESPONSE" | node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);process.exit(r.id?0:1)}catch{process.exit(1)}})" 2>/dev/null; then
      echo "  ✓ ${COLLECTION_NAME}"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "  ✗ ${COLLECTION_NAME}: $(echo "$CREATE_RESPONSE" | node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log(r.message)}catch(e){console.log(d.toString().substring(0,80))}})" 2>/dev/null)"
      FAIL=$((FAIL + 1))
    fi
  done

  echo ""
  info "逐个创建完成: ${SUCCESS} 成功, ${FAIL} 失败"
fi

# ─── 验证 ─────────────────────────────────────────────────────────
echo ""
info "3/3 验证集合..."

VERIFY_RESPONSE=$(docker exec "${PB_CONTAINER}" sh -c "
  curl -s http://localhost:8090/api/collections \
    -H 'Authorization: Bearer ${TOKEN}' | node -e \"process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log('总数: ' + (r.totalItems||r.items.length))}catch{console.log('解析失败')}})\"
" 2>&1)

info "$VERIFY_RESPONSE"
echo ""
info "✅ 完成！"