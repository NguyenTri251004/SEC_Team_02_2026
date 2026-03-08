#!/bin/bash
# Database backup script for IMS
# Usage: ./backup.sh
# Cron example (daily at 2AM): 0 2 * * * /path/to/backup.sh

set -euo pipefail

BACKUP_DIR="./backups"
CONTAINER_NAME="ims-postgres"
DB_USER="${POSTGRES_USER:-ims_admin}"
DB_NAME="${POSTGRES_DB:-ims_production}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of ${DB_NAME}..."

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup saved to ${BACKUP_FILE} ($(du -h "$BACKUP_FILE" | cut -f1))"

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "[$(date)] Cleaned up backups older than ${KEEP_DAYS} days"
