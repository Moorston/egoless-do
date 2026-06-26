#!/bin/bash
# ─── PocketBase 备份恢复脚本 ───────────────────────────
# 从备份文件恢复 PocketBase 数据库
# 用法: ./restore-pb.sh <backup-file.zip>
#
# ⚠️ 会停止 PocketBase 容器，恢复后重启

set -euo pipefail

BACKUP_FILE="${1:-}"
PB_CONTAINER="${PB_CONTAINER:-egoless-do-pb}"
PB_DATA_DIR="${PB_DATA_DIR:-./backend/pb_data}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "用法: $0 <backup-file.zip>"
  echo ""
  echo "可用备份:"
  ls -lh /opt/backups/pb/pb_backup_*.zip 2>/dev/null || echo "  (无备份文件)"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: 备份文件不存在: $BACKUP_FILE"
  exit 1
fi

echo "[Restore] ⚠️  即将恢复备份: $BACKUP_FILE"
echo "[Restore] 这将覆盖当前所有数据！"
read -p "确认继续? (y/N) " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || exit 0

# Stop PocketBase
echo "[Restore] Stopping PocketBase..."
docker stop "$PB_CONTAINER" 2>/dev/null || true

# Backup current data (safety)
SAFETY_BACKUP="${PB_DATA_DIR}/data.db.pre-restore.$(date +%Y%m%d_%H%M%S)"
if [[ -f "${PB_DATA_DIR}/data.db" ]]; then
  cp "${PB_DATA_DIR}/data.db" "$SAFETY_BACKUP"
  echo "[Restore] Current DB backed up to: $SAFETY_BACKUP"
fi

# Extract backup
echo "[Restore] Extracting backup..."
TEMP_DIR=$(mktemp -d)
unzip -o "$BACKUP_FILE" -d "$TEMP_DIR"

# Replace data.db
if [[ -f "${TEMP_DIR}/pb_data/data.db" ]]; then
  rm -f "${PB_DATA_DIR}/data.db" "${PB_DATA_DIR}/data.db-wal" "${PB_DATA_DIR}/data.db-shm"
  cp "${TEMP_DIR}/pb_data/data.db" "${PB_DATA_DIR}/data.db"
  echo "[Restore] Database restored"
elif [[ -f "${TEMP_DIR}/data.db" ]]; then
  rm -f "${PB_DATA_DIR}/data.db" "${PB_DATA_DIR}/data.db-wal" "${PB_DATA_DIR}/data.db-shm"
  cp "${TEMP_DIR}/data.db" "${PB_DATA_DIR}/data.db"
  echo "[Restore] Database restored"
else
  echo "[Restore] ERROR: data.db not found in backup"
  rm -rf "$TEMP_DIR"
  exit 1
fi

rm -rf "$TEMP_DIR"

# Start PocketBase
echo "[Restore] Starting PocketBase..."
docker start "$PB_CONTAINER"

echo "[Restore] ✅ 恢复完成"
