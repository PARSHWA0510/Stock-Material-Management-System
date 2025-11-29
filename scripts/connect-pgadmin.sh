#!/bin/bash

# Script to create SSH tunnel for pgAdmin connection
# Usage: ./connect-pgadmin.sh

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

# Configuration (load from .env, no hardcoded defaults)
PEM_FILE="${PEM_FILE:-}"
EC2_IP="${EC2_IP:-}"
EC2_USER="${EC2_USER:-ec2-user}"
LOCAL_PORT="${DB_LOCAL_PORT:-5433}"
REMOTE_PORT="${DB_REMOTE_PORT:-5432}"

# Validate required variables
if [ -z "$PEM_FILE" ] || [ -z "$EC2_IP" ]; then
    echo "❌ Error: Required variables not set in .env file"
    echo "   Please create .env file and set: PEM_FILE, EC2_IP"
    exit 1
fi

echo "🔗 Creating SSH tunnel for pgAdmin..."
echo "Local port: $LOCAL_PORT → EC2 PostgreSQL: $REMOTE_PORT"
echo ""
echo "In pgAdmin, use these settings:"
echo "  Host: localhost"
echo "  Port: $LOCAL_PORT"
echo "  Database: stock_management"
echo "  Username: stock_user"
echo "  Password: postgres"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo ""

ssh -i "$PEM_FILE" \
  -L ${LOCAL_PORT}:localhost:${REMOTE_PORT} \
  -N \
  ${EC2_USER}@${EC2_IP}

