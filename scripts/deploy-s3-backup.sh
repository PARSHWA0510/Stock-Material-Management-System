#!/bin/bash

# Deploy S3 Backup System to EC2
# This script copies the backup files to EC2 and runs the setup

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Check required variables
if [ -z "$EC2_IP" ] || [ -z "$PEM_FILE" ] || [ -z "$EC2_USER" ]; then
    echo -e "${RED}Error: Missing required variables in .env${NC}"
    echo "Required: EC2_IP, PEM_FILE, EC2_USER"
    exit 1
fi

echo -e "${BLUE}=== Deploying S3 Backup System to EC2 ===${NC}"
echo ""

# Check if PEM file exists
if [ ! -f "$PEM_FILE" ]; then
    echo -e "${RED}Error: PEM file not found: $PEM_FILE${NC}"
    exit 1
fi

# Check if backup scripts exist
SCRIPT_DIR="backend/scripts"
if [ ! -f "$SCRIPT_DIR/s3-database-backup.sh" ] || [ ! -f "$SCRIPT_DIR/setup-s3-backup.sh" ]; then
    echo -e "${RED}Error: Backup scripts not found in $SCRIPT_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Copying backup scripts to EC2...${NC}"
scp -i "$PEM_FILE" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    "$SCRIPT_DIR/s3-database-backup.sh" \
    "$SCRIPT_DIR/setup-s3-backup.sh" \
    "${EC2_USER}@${EC2_IP}:~/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Scripts copied successfully${NC}"
else
    echo -e "${RED}❌ Failed to copy scripts${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Running setup script on EC2...${NC}"
ssh -i "$PEM_FILE" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    "${EC2_USER}@${EC2_IP}" << 'EOF'
    cd ~
    chmod +x setup-s3-backup.sh
    ./setup-s3-backup.sh
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=== ✅ Deployment Complete ===${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Verify timer is active:"
    echo "   ssh -i $PEM_FILE ${EC2_USER}@${EC2_IP}"
    echo "   sudo systemctl status s3-backup.timer"
    echo ""
    echo "2. Test backup manually:"
    echo "   sudo systemctl start s3-backup.service"
    echo "   sudo journalctl -u s3-backup.service -f"
    echo ""
    echo "3. Check backups in S3:"
    echo "   aws s3 ls s3://\${S3_BUCKET:-stock-management-database-backups}/database-backups/"
else
    echo -e "${RED}❌ Setup failed on EC2${NC}"
    exit 1
fi

