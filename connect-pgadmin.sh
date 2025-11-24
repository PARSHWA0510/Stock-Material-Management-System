#!/bin/bash

# Script to create SSH tunnel for pgAdmin connection
# Usage: ./connect-pgadmin.sh

PEM_FILE="/Users/aubergine/Desktop/stock-mgmt/stock-mgmt.pem"
EC2_IP="34.239.172.85"
EC2_USER="ec2-user"
LOCAL_PORT="5433"
REMOTE_PORT="5432"

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

