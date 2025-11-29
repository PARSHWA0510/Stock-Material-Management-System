#!/bin/bash

# EC2 Start Script - Starts EC2 instance and ensures services are running
# Usage: ./start-ec2.sh

set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Configuration (load from .env, no hardcoded defaults)
EC2_IP="${EC2_IP:-}"
EC2_USER="${EC2_USER:-ec2-user}"
PEM_FILE="${PEM_FILE:-}"
INSTANCE_ID="${EC2_INSTANCE_ID:-}"  # Will be fetched automatically if not set
MAX_WAIT_TIME=300  # Maximum wait time for instance to be ready (5 minutes)

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
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting EC2 Instance and Services...${NC}"
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

# Function to wait for SSH to be available
wait_for_ssh() {
    echo -e "${YELLOW}⏳ Waiting for SSH to be available...${NC}"
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if ssh -i "$PEM_FILE" \
            -o ConnectTimeout=5 \
            -o StrictHostKeyChecking=no \
            -o BatchMode=yes \
            "${EC2_USER}@${EC2_IP}" \
            "echo 'SSH ready'" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ SSH is available${NC}"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 10
    done
    
    echo ""
    echo -e "${RED}❌ SSH not available after ${max_attempts} attempts${NC}"
    return 1
}

# Function to ensure services are running
ensure_services_running() {
    echo -e "${YELLOW}🔧 Ensuring services are running...${NC}"
    
    ssh -i "$PEM_FILE" "${EC2_USER}@${EC2_IP}" << 'EOF'
        set -e
        
        echo "1. Starting Docker service..."
        sudo systemctl start docker
        sudo systemctl enable docker
        echo "✅ Docker service started"
        
        echo ""
        echo "2. Starting PostgreSQL service..."
        sudo systemctl start postgresql-15 2>/dev/null || sudo systemctl start postgresql 2>/dev/null || echo "⚠️  PostgreSQL might already be running"
        sudo systemctl enable postgresql-15 2>/dev/null || sudo systemctl enable postgresql 2>/dev/null || true
        echo "✅ PostgreSQL service started"
        
        echo ""
        echo "3. Checking Docker container..."
        if docker ps -a --format '{{.Names}}' | grep -q "^stock-backend$"; then
            if ! docker ps --format '{{.Names}}' | grep -q "^stock-backend$"; then
                echo "Starting stock-backend container..."
                docker start stock-backend
                echo "✅ Container started"
            else
                echo "✅ Container already running"
            fi
        else
            echo "⚠️  Container 'stock-backend' does not exist"
            echo "   You may need to build and run it manually"
        fi
        
        echo ""
        echo "4. Starting systemd service (if exists)..."
        if systemctl list-unit-files | grep -q stock-backend.service; then
            sudo systemctl start stock-backend.service 2>/dev/null || echo "⚠️  Service might already be running"
            sudo systemctl enable stock-backend.service 2>/dev/null || true
            echo "✅ Systemd service started"
        else
            echo "ℹ️  Systemd service not found (this is okay)"
        fi
        
        echo ""
        echo "5. Waiting for container to be healthy..."
        sleep 5
        
        if docker ps --format '{{.Names}}' | grep -q "^stock-backend$"; then
            echo "Checking container health..."
            for i in {1..12}; do
                if docker exec stock-backend node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" 2>/dev/null; then
                    echo "✅ Container is healthy"
                    break
                fi
                if [ $i -eq 12 ]; then
                    echo "⚠️  Container health check timeout (container might still be starting)"
                else
                    echo "   Waiting for health check... ($i/12)"
                    sleep 5
                fi
            done
        fi
        
        echo ""
        echo "6. Service Status Summary:"
        echo "   Docker: $(systemctl is-active docker)"
        echo "   PostgreSQL: $(systemctl is-active postgresql-15 2>/dev/null || systemctl is-active postgresql 2>/dev/null || echo 'unknown')"
        if docker ps --format '{{.Names}}' | grep -q "^stock-backend$"; then
            echo "   Backend Container: Running"
            docker ps --filter "name=stock-backend" --format "   Status: {{.Status}}"
        else
            echo "   Backend Container: Not running"
        fi
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Services started successfully${NC}"
    else
        echo -e "${RED}❌ Error starting services${NC}"
        return 1
    fi
}

# Function to verify backend is accessible
verify_backend() {
    echo -e "${YELLOW}🔍 Verifying backend is accessible...${NC}"
    
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f -o /dev/null "http://${EC2_IP}:3001/health" 2>/dev/null; then
            echo -e "${GREEN}✅ Backend is accessible at http://${EC2_IP}:3001${NC}"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo "   Attempt $attempt/$max_attempts..."
        sleep 5
    done
    
    echo -e "${YELLOW}⚠️  Backend health check failed (might still be starting)${NC}"
    echo "   You can check manually: curl http://${EC2_IP}:3001/health"
    return 1
}

# Main execution
echo -e "${YELLOW}Step 1: Getting EC2 instance information...${NC}"
get_instance_id

echo -e "${YELLOW}Step 2: Checking instance state...${NC}"
STATE=$(check_instance_state)

if [ "$STATE" == "running" ]; then
    echo -e "${GREEN}Instance is already running${NC}"
    echo ""
    ensure_services_running
    verify_backend
    exit 0
fi

if [ "$STATE" == "stopping" ]; then
    echo -e "${YELLOW}Instance is stopping. Please wait...${NC}"
    aws ec2 wait instance-stopped --instance-ids "$INSTANCE_ID"
    STATE="stopped"
fi

if [ "$STATE" != "stopped" ]; then
    echo -e "${RED}❌ Instance is in ${STATE} state. Cannot proceed.${NC}"
    exit 1
fi

echo -e "${YELLOW}Instance is stopped. Starting...${NC}"
echo ""

# Start EC2 instance
echo -e "${YELLOW}Step 3: Starting EC2 instance...${NC}"
aws ec2 start-instances --instance-ids "$INSTANCE_ID" > /dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start EC2 instance${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Start command sent to EC2 instance${NC}"
echo ""

# Wait for instance to be running
echo -e "${YELLOW}Step 4: Waiting for instance to be running...${NC}"
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"
echo -e "${GREEN}✅ Instance is running${NC}"
echo ""

# Wait for SSH
wait_for_ssh
echo ""

# Ensure services are running
ensure_services_running
echo ""

# Verify backend
verify_backend
echo ""

echo -e "${GREEN}✅ EC2 instance and services are ready!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "   Instance ID: ${INSTANCE_ID}"
echo "   Instance IP: ${EC2_IP}"
echo "   Backend URL: http://${EC2_IP}:3001/api"
if [ ! -z "$S3_BUCKET" ] && [ ! -z "$S3_REGION" ]; then
    echo "   Frontend URL: http://${S3_BUCKET}.s3-website-${S3_REGION}.amazonaws.com"
fi
echo ""

