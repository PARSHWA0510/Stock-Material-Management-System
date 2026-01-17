#!/bin/bash

# Setup Script for S3 Database Backup System
# Run this script on your EC2 instance to set up automated S3 backups

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== S3 Database Backup Setup ===${NC}"
echo ""

# Check if running as ec2-user
if [ "$USER" != "ec2-user" ]; then
    echo -e "${YELLOW}Warning: This script is designed to run as ec2-user${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create scripts directory
echo -e "${YELLOW}Step 1: Creating scripts directory...${NC}"
mkdir -p ~/scripts
echo -e "${GREEN}✅ Scripts directory created${NC}"

# Copy backup script
echo -e "${YELLOW}Step 2: Installing backup script...${NC}"
if [ -f "./s3-database-backup.sh" ]; then
    cp ./s3-database-backup.sh ~/scripts/s3-database-backup.sh
    chmod +x ~/scripts/s3-database-backup.sh
    echo -e "${GREEN}✅ Backup script installed${NC}"
else
    echo -e "${RED}❌ Error: s3-database-backup.sh not found in current directory${NC}"
    echo -e "${YELLOW}Please run this script from the backend/scripts directory${NC}"
    exit 1
fi

# Install systemd service and timer
echo -e "${YELLOW}Step 3: Installing systemd service and timer...${NC}"

# Install service
sudo tee /etc/systemd/system/s3-backup.service > /dev/null << 'EOF'
[Unit]
Description=Stock Management Database Backup to S3
After=network.target postgresql.service

[Service]
Type=oneshot
User=ec2-user
Group=ec2-user
WorkingDirectory=/home/ec2-user
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/ec2-user/scripts/s3-database-backup.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Install timer (runs every 15 days on 1st and 15th at 2:00 AM)
sudo tee /etc/systemd/system/s3-backup.timer > /dev/null << 'EOF'
[Unit]
Description=Run Database Backup to S3 every 15 days
Requires=s3-backup.service

[Timer]
# Run every 15 days at 2:00 AM (1st and 15th of each month)
OnCalendar=*-*-1,15 02:00:00
# If the system was off during the scheduled time, run immediately after boot
Persistent=true
# Randomize the start time by up to 30 minutes to avoid thundering herd
RandomizedDelaySec=1800

[Install]
WantedBy=timers.target
EOF

echo -e "${GREEN}✅ Systemd service and timer installed${NC}"

# Reload systemd
echo -e "${YELLOW}Step 4: Reloading systemd...${NC}"
sudo systemctl daemon-reload
echo -e "${GREEN}✅ Systemd reloaded${NC}"

# Check if S3_BUCKET is set in .env
echo -e "${YELLOW}Step 5: Checking configuration...${NC}"
if [ -f ~/.env ]; then
    if grep -q "^S3_BUCKET=" ~/.env; then
        S3_BUCKET=$(grep "^S3_BUCKET=" ~/.env | cut -d'=' -f2)
        echo -e "${GREEN}✅ S3_BUCKET found in ~/.env: $S3_BUCKET${NC}"
    else
        echo -e "${YELLOW}⚠️  S3_BUCKET not found in ~/.env${NC}"
        echo -e "${YELLOW}   The script will use default: stock-management-database-backups${NC}"
        echo ""
        read -p "Do you want to add S3_BUCKET to ~/.env? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Enter S3 bucket name: " BUCKET_NAME
            echo "S3_BUCKET=$BUCKET_NAME" >> ~/.env
            echo -e "${GREEN}✅ S3_BUCKET added to ~/.env${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  ~/.env file not found${NC}"
    echo -e "${YELLOW}   Please ensure DATABASE_URL is set in ~/.env${NC}"
fi

# Check AWS credentials
echo -e "${YELLOW}Step 6: Checking AWS credentials...${NC}"
if aws sts get-caller-identity &> /dev/null; then
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ AWS credentials configured (Account: $AWS_ACCOUNT)${NC}"
else
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo -e "${YELLOW}   Run: aws configure${NC}"
    exit 1
fi

# Enable and start timer
echo -e "${YELLOW}Step 7: Enabling backup timer...${NC}"
sudo systemctl enable s3-backup.timer
sudo systemctl start s3-backup.timer
echo -e "${GREEN}✅ Backup timer enabled and started${NC}"

# Show timer status
echo ""
echo -e "${YELLOW}Step 8: Checking timer status...${NC}"
sudo systemctl status s3-backup.timer --no-pager -l || true

# Show next run time
echo ""
echo -e "${BLUE}=== Setup Complete ===${NC}"
echo ""
echo -e "${GREEN}✅ S3 Database Backup System installed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next scheduled backup:${NC}"
sudo systemctl list-timers s3-backup.timer --no-pager || true
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  # Check timer status:"
echo "  sudo systemctl status s3-backup.timer"
echo ""
echo "  # Check service logs:"
echo "  sudo journalctl -u s3-backup.service -f"
echo ""
echo "  # Manually trigger backup:"
echo "  sudo systemctl start s3-backup.service"
echo ""
echo "  # List backups in S3:"
echo "  aws s3 ls s3://\${S3_BUCKET:-stock-management-database-backups}/database-backups/"
echo ""
echo -e "${YELLOW}Note:${NC} Backups run automatically on the 1st and 15th of each month at 2:00 AM"
echo -e "${YELLOW}      Only the latest 5 backups are kept in S3${NC}"

