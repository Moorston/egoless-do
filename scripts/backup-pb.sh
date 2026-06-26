#!/bin/bash
# ─── PocketBase 自动备份脚本 ───────────────────────────
# 使用 PocketBase backup API 安全备份 SQLite 数据库
# 用法: ./backup-pb.sh [--upload]
#
# 环境变量:
#   PB_URL           - PocketBase 地址 (默认 http://localhost:8090)
#   PB_ADMIN_EMAIL   - 管理员邮箱
#   PB_ADMIN_PASSWORD- 管理员密码
#   BACKUP_DIR       - 备份目录 (默认 /opt/backups/pb)
#   BACKUP_KEEP_DAYS - 保留天数 (默认 7)
#   RCLONE_REMOTE    - rclone 远程路径 (可选, 如 r2:egoless-do-backups/)

set -euo pipefail

PB_URL="${PB_URL:-http://localhost:8090}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/pb}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
UPLOAD=false

[[ "${1:-}" == "--upload" ]] && UPLOAD=true

mkdir -p "$BACKUP_DIR"

echo "[Backup] Starting backup at $(date)"

# ── Step 1: Authenticate ────────────────────────────────
TOKEN=$(curl -s -X POST "${PB_URL}/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"${PB_ADMIN_EMAIL}\",\"password\":\"${PB_ADMIN_PASSWORD}\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$TOKEN" ]]; then
  echo "[Backup] ERROR: Failed to authenticate with PocketBase"
  exit 1
fi

# ── Step 2: Download backup ─────────────────────────────
BACKUP_FILE="${BACKUP_DIR}/pb_backup_${DATE}.zip"
HTTP_CODE=$(curl -s -o "$BACKUP_FILE" -w "%{http_code}" \
  -H "Authorization: Bearer ${TOKEN}" \
  "${PB_URL}/api/backup")

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "[Backup] ERROR: Backup API returned HTTP $HTTP_CODE"
  rm -f "$BACKUP_FILE"
  exit 1
fi

FILESIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
echo "[Backup] Downloaded: ${BACKUP_FILE} (${FILESIZE} bytes)"

# ── Step 3: Upload to object storage (optional) ─────────
if $UPLOAD && [[ -n "${RCLONE_REMOTE:-}" ]]; then
  if command -v rclone &>/dev/null; then
    rclone copy "$BACKUP_FILE" "${RCLONE_REMOTE}" --no-traverse
    echo "[Backup] Uploaded to ${RCLONE_REMOTE}"
  else
    echo "[Backup] WARNING: rclone not found, skipping upload"
  fi
fi

# ── Step 4: Cleanup old backups ─────────────────────────
DELETED=$(find "$BACKUP_DIR" -name "pb_backup_*.zip" -mtime +${BACKUP_KEEP_DAYS} -delete -print | wc -l)
if [[ "$DELETED" -gt 0 ]]; then
  echo "[Backup] Cleaned up $DELETED old backups"
fi

echo "[Backup] Completed at $(date)"
