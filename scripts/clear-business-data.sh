#!/bin/bash
# ─── 清空 PocketBase 业务数据脚本 ───────────────────────────────
# 保留系统/配置数据：user_profiles, push_tokens, ai_configs, custom_wuxing_maps
# 清空所有业务数据

set -e

PB_URL="${PB_URL:-http://localhost:8090}"
PB_ADMIN_EMAIL="${PB_ADMIN_EMAIL:-admin@example.com}"
PB_ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-}"

if [ -z "$PB_ADMIN_PASSWORD" ]; then
  echo "❌ 请设置 PB_ADMIN_PASSWORD 环境变量"
  exit 1
fi

echo "🚀 开始清空 PocketBase 业务数据..."

# 1. 获取管理员 token
echo "📝 获取管理员 token..."
TOKEN=$(curl -s -X POST "${PB_URL}/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"${PB_ADMIN_EMAIL}\",\"password\":\"${PB_ADMIN_PASSWORD}\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 获取管理员 token 失败"
  exit 1
fi

echo "✓ 获取 token 成功"

# 2. 定义要清空的业务集合
BUSINESS_COLLECTIONS=(
  "habits"
  "reflections"
  "fasting_sessions"
  "food_entries"
  "checkin_records"
  "meditation_history"
  "exercise_entries"
  "plans"
  "plan_items"
  "plan_item_checkins"
  "grace_history"
  "daily_custom_todos"
  "daily_todo_history"
  "thought_trails"
  "trail_notes"
  "reflection_links"
  "checkin_reviews"
  "body_goals"
  "body_plans"
  "weight_records"
  "body_checkins"
  "sleep_records"
  "give_entries"
  "eating_motivations"
  "visions"
  "vision_practices"
  "dedications"
  "mantra_defs"
  "mantra_sessions"
  "sutra_reading_sessions"
  "fear_entries"
  "courage_entries"
  "fear_achievements"
  "zhiguan_sessions"
  "breath_records"
  "published_minds"
)

# 3. 清空每个集合
TOTAL_DELETED=0
for collection in "${BUSINESS_COLLECTIONS[@]}"; do
  echo -n "🗑  清空 ${collection}..."
  
  # 获取记录数量
  COUNT=$(curl -s "${PB_URL}/api/collections/${collection}/records?perPage=1" \
    -H "Authorization: Bearer ${TOKEN}" \
    | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
  
  if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
    echo " (空)"
    continue
  fi
  
  # 删除所有记录（分批删除，每批 100 条）
  DELETED=0
  while true; do
    RECORDS=$(curl -s "${PB_URL}/api/collections/${collection}/records?perPage=100" \
      -H "Authorization: Bearer ${TOKEN}" \
      | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$RECORDS" ]; then
      break
    fi
    
    for id in $RECORDS; do
      curl -s -X DELETE "${PB_URL}/api/collections/${collection}/records/${id}" \
        -H "Authorization: Bearer ${TOKEN}" > /dev/null
      DELETED=$((DELETED + 1))
    done
  done
  
  echo " ✓ 删除 ${DELETED} 条记录"
  TOTAL_DELETED=$((TOTAL_DELETED + DELETED))
done

echo ""
echo "✅ 清空完成！共删除 ${TOTAL_DELETED} 条业务数据"
echo ""
echo "📋 保留的系统/配置数据："
echo "  - user_profiles (用户资料)"
echo "  - push_tokens (推送令牌)"
echo "  - ai_configs (AI 配置)"
echo "  - custom_wuxing_maps (自定义五行配置)"
