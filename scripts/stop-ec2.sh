#!/bin/bash

# EC2 Stop Script - Gracefully stops services before stopping EC2 instance
# Usage: ./stop-ec2.sh

set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

# Configuration (load from .env, no hardcoded defaults)
EC2_IP="${EC2_IP:-}"
EC2_USER="${EC2_USER:-ec2-user}"
PEM_FILE="${PEM_FILE:-}"
INSTANCE_ID="${EC2_INSTANCE_ID:-}"  # Will be fetched automatically if not set

# Validate required variables
if [ -z "$PEM_FILE" ] || [ -z "$EC2_IP" ]; then
    echo "❌ Error: Required variables not set in .env file"
    echo "   Please create .env file and set: PEM_FILE, EC2_IP"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping EC2 Instance Gracefully...${NC}"
echo ""

# Function to get instance ID from IP
get_instance_id() {
    if [ -z "$INSTANCE_ID" ]; then
        echo -e "${YELLOW}Finding EC2 instance ID from IP ${EC2_IP}...${NC}"
        INSTANCE_ID=$(aws ec2 describe-instances \
            --filters "Name=ip-address,Values=${EC2_IP}" \
            --query 'Reservations[0].Instances[0].InstanceId' \
            --output text 2>/dev/null || echo "")
        
        if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" == "None" ]; then
            # Try by private IP
            INSTANCE_ID=$(aws ec2 describe-instances \
                --filters "Name=private-ip-address,Values=${EC2_IP}" \
                --query 'Reservations[0].Instances[0].InstanceId' \
                --output text 2>/dev/null || echo "")
        fi
    fi
    
    if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" == "None" ]; then
        echo -e "${RED}❌ Could not find EC2 instance ID. Please set INSTANCE_ID manually.${NC}"
        echo "   You can find it in AWS Console or set it in this script."
        exit 1
    fi
    
    echo -e "${GREEN}Found instance: ${INSTANCE_ID}${NC}"
}

# Function to check if instance is running
check_instance_state() {
    STATE=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text 2>/dev/null || echo "unknown")
    
    echo "$STATE"
}

# Function to gracefully stop Docker container
stop_docker_container() {
    echo -e "${YELLOW}📦 Stopping Docker container gracefully...${NC}"
    
    ssh -i "$PEM_FILE" "${EC2_USER}@${EC2_IP}" << 'EOF'
        # Check if container exists and is running
        if docker ps -a --format '{{.Names}}' | grep -q "^stock-backend$"; then
            if docker ps --format '{{.Names}}' | grep -q "^stock-backend$"; then
                echo "Stopping stock-backend container..."
                docker stop stock-backend
                echo "✅ Container stopped"
            else
                echo "ℹ️  Container already stopped"
            fi
        else
            echo "ℹ️  Container does not exist"
        fi
        
        # Stop systemd service if it exists
        if systemctl is-active --quiet stock-backend.service 2>/dev/null; then
            echo "Stopping systemd service..."
            sudo systemctl stop stock-backend.service
            echo "✅ Service stopped"
        fi
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker container stopped successfully${NC}"
    else
        echo -e "${RED}⚠️  Warning: Could not connect to EC2 to stop container${NC}"
        echo "   Container will be stopped when instance stops"
    fi
}

# Function to create optional database backup
create_backup() {
    read -p "Create database backup before stopping? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}💾 Creating database backup...${NC}"
        
        ssh -i "$PEM_FILE" "${EC2_USER}@${EC2_IP}" << 'EOF'
            BACKUP_DIR="/data/backups"
            mkdir -p "$BACKUP_DIR"
            DATE=$(date +%Y%m%d_%H%M%S)
            
            # Try to backup from container
            if docker ps -a --format '{{.Names}}' | grep -q "^stock-backend$"; then
                echo "Creating backup from Docker container..."
                docker exec stock-backend sh -c 'pg_dump $DATABASE_URL' > "$BACKUP_DIR/pre-stop-backup_$DATE.sql" 2>/dev/null || \
                echo "⚠️  Could not backup from container (might be stopped)"
            fi
            
            # Also try direct PostgreSQL backup
            if command -v pg_dump &> /dev/null; then
                echo "Creating direct PostgreSQL backup..."
                source ~/.env 2>/dev/null || true
                if [ ! -z "$DATABASE_URL" ]; then
                    pg_dump "$DATABASE_URL" > "$BACKUP_DIR/pre-stop-backup-direct_$DATE.sql" 2>/dev/null || \
                    echo "⚠️  Direct backup failed"
                fi
            fi
            
            echo "✅ Backup attempt completed"
            ls -lh "$BACKUP_DIR"/pre-stop-backup* 2>/dev/null || echo "No backup files created"
EOF
        
        echo -e "${GREEN}✅ Backup process completed${NC}"
    fi
}

# Main execution
echo -e "${YELLOW}Step 1: Getting EC2 instance information...${NC}"
get_instance_id

echo -e "${YELLOW}Step 2: Checking instance state...${NC}"
STATE=$(check_instance_state)

if [ "$STATE" == "stopped" ] || [ "$STATE" == "stopping" ]; then
    echo -e "${YELLOW}ℹ️  Instance is already ${STATE}${NC}"
    exit 0
fi

if [ "$STATE" != "running" ]; then
    echo -e "${RED}❌ Instance is in ${STATE} state. Cannot proceed.${NC}"
    exit 1
fi

echo -e "${GREEN}Instance is running${NC}"
echo ""

# Stop Docker container gracefully
stop_docker_container
echo ""

# Optional backup
create_backup
echo ""

# Stop EC2 instance
echo -e "${YELLOW}Step 3: Stopping EC2 instance...${NC}"
aws ec2 stop-instances --instance-ids "$INSTANCE_ID" > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Stop command sent to EC2 instance${NC}"
    echo ""
    echo -e "${YELLOW}Waiting for instance to stop...${NC}"
    
    # Wait for instance to stop
    aws ec2 wait instance-stopped --instance-ids "$INSTANCE_ID"
    
    echo -e "${GREEN}✅ EC2 instance stopped successfully${NC}"
    echo ""
    echo -e "${YELLOW}💡 To start the instance again, run:${NC}"
    echo "   ./start-ec2.sh"
else
    echo -e "${RED}❌ Failed to stop EC2 instance${NC}"
    exit 1
fi

