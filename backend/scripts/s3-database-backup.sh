#!/bin/bash

# Production Database Backup Script for S3
# This script creates a database backup and uploads it to S3
# Keeps only the latest 5 backups (rotates old ones)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/data/backups"
S3_BACKUP_PREFIX="database-backups"
MAX_BACKUPS=5

# Load environment variables
if [ -f ~/.env ]; then
    source ~/.env
fi

# Get S3 bucket from environment or use default
# Note: You can set S3_BUCKET in ~/.env or it will use the default
S3_BUCKET="${S3_BUCKET:-stock-management-database-backups}"
S3_REGION="${S3_REGION:-us-east-1}"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump is not installed"
        exit 1
    fi
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL is not set in ~/.env"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Create backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    log "Backup directory: $BACKUP_DIR"
}

# Extract database connection details from DATABASE_URL
parse_database_url() {
    # DATABASE_URL format: postgresql://user:password@host:port/database?schema=public
    DB_URL="$DATABASE_URL"
    
    # Remove postgresql:// prefix
    DB_URL="${DB_URL#postgresql://}"
    
    # Extract user and password
    DB_USER_PASS="${DB_URL%%@*}"
    DB_USER="${DB_USER_PASS%%:*}"
    DB_PASS="${DB_USER_PASS#*:}"
    
    # Extract host, port, and database
    DB_HOST_PORT_DB="${DB_URL#*@}"
    DB_HOST_PORT="${DB_HOST_PORT_DB%%/*}"
    DB_HOST="${DB_HOST_PORT%%:*}"
    DB_PORT="${DB_HOST_PORT#*:}"
    DB_NAME="${DB_HOST_PORT_DB#*/}"
    DB_NAME="${DB_NAME%%\?*}"
    
    # Default port if not specified
    DB_PORT="${DB_PORT:-5432}"
    
    log "Database: $DB_NAME on $DB_HOST:$DB_PORT (user: $DB_USER)"
}

# Create database backup
create_backup() {
    log "Creating database backup..."
    
    # Generate backup filename with date
    # Format: database_backup_YYYYMMDD.sql
    BACKUP_DATE=$(date +%Y%m%d)
    BACKUP_FILENAME="database_backup_${BACKUP_DATE}.sql"
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
    
    # Create backup using pg_dump
    export PGPASSWORD="$DB_PASS"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        > "$BACKUP_PATH" 2>&1; then
        
        # Compress the backup
        log "Compressing backup..."
        gzip -f "$BACKUP_PATH"
        BACKUP_PATH="${BACKUP_PATH}.gz"
        BACKUP_FILENAME="${BACKUP_FILENAME}.gz"
        
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        log "Backup created successfully: $BACKUP_FILENAME ($BACKUP_SIZE)"
    else
        error "Database backup failed"
        exit 1
    fi
    
    unset PGPASSWORD
}

# Upload backup to S3
upload_to_s3() {
    log "Uploading backup to S3..."
    
    S3_KEY="${S3_BACKUP_PREFIX}/${BACKUP_FILENAME}"
    S3_URI="s3://${S3_BUCKET}/${S3_KEY}"
    
    if aws s3 cp "$BACKUP_PATH" "$S3_URI" \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA \
        --metadata "backup-date=${BACKUP_DATE},database=${DB_NAME}" 2>&1; then
        
        log "Backup uploaded successfully to: $S3_URI"
    else
        error "Failed to upload backup to S3"
        exit 1
    fi
}

# Rotate old backups (keep only MAX_BACKUPS)
rotate_backups() {
    log "Rotating old backups (keeping latest $MAX_BACKUPS)..."
    
    # List all backups in S3, sorted by date (newest first)
    BACKUP_LIST=$(aws s3 ls "s3://${S3_BUCKET}/${S3_BACKUP_PREFIX}/" \
        --region "$S3_REGION" \
        --recursive \
        | grep "database_backup_.*\.sql\.gz$" \
        | sort -r \
        | awk '{print $4}')
    
    if [ -z "$BACKUP_LIST" ]; then
        warn "No existing backups found in S3"
        return
    fi
    
    # Count backups
    BACKUP_COUNT=$(echo "$BACKUP_LIST" | wc -l)
    log "Found $BACKUP_COUNT backup(s) in S3"
    
    # If we have more than MAX_BACKUPS, delete the oldest ones
    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
        DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
        log "Deleting $DELETE_COUNT old backup(s)..."
        
        # Get oldest backups (last in sorted list)
        OLD_BACKUPS=$(echo "$BACKUP_LIST" | tail -n "$DELETE_COUNT")
        
        while IFS= read -r OLD_BACKUP; do
            if [ -n "$OLD_BACKUP" ]; then
                OLD_BACKUP_NAME=$(basename "$OLD_BACKUP")
                log "Deleting old backup: $OLD_BACKUP_NAME"
                aws s3 rm "s3://${S3_BUCKET}/${OLD_BACKUP}" \
                    --region "$S3_REGION" \
                    || warn "Failed to delete: $OLD_BACKUP_NAME"
            fi
        done <<< "$OLD_BACKUPS"
        
        log "Backup rotation completed"
    else
        log "No rotation needed (current count: $BACKUP_COUNT, max: $MAX_BACKUPS)"
    fi
}

# Clean up local backup file (optional - keep for 1 day)
cleanup_local() {
    log "Cleaning up local backup files older than 1 day..."
    find "$BACKUP_DIR" -name "database_backup_*.sql.gz" -mtime +1 -delete 2>/dev/null || true
    log "Local cleanup completed"
}

# Main execution
main() {
    log "=== Starting Database Backup Process ==="
    
    check_prerequisites
    create_backup_dir
    parse_database_url
    create_backup
    upload_to_s3
    rotate_backups
    cleanup_local
    
    log "=== Backup Process Completed Successfully ==="
}

# Run main function
main "$@"

