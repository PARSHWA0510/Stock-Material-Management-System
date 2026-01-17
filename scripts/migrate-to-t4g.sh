#!/bin/bash

# EC2 Migration Helper Script: t3.micro → t4g.micro
# This script helps automate parts of the migration process
# Usage: ./scripts/migrate-to-t4g.sh [step]
# Steps: backup, launch, setup, restore, test, switch, cleanup

set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

# Configuration
CURRENT_INSTANCE_ID="${EC2_INSTANCE_ID:-}"
CURRENT_EC2_IP="${EC2_IP:-}"
EC2_USER="${EC2_USER:-ec2-user}"
PEM_FILE="${PEM_FILE:-}"
ELASTIC_IP_ALLOCATION_ID="${ELASTIC_IP_ALLOCATION_ID:-}"
API_DIST_ID="${API_DIST_ID:-}"
BACKUP_DIR="$PROJECT_DIR/migration-backups"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Validate required variables
if [ -z "$PEM_FILE" ] || [ -z "$CURRENT_EC2_IP" ]; then
    echo -e "${RED}❌ Error: Required variables not set in .env file${NC}"
    echo "   Please set: PEM_FILE, EC2_IP"
    exit 1
fi

# Function to get current instance ID
get_current_instance_id() {
    if [ -z "$CURRENT_INSTANCE_ID" ]; then
        echo -e "${YELLOW}Finding current EC2 instance ID...${NC}"
        CURRENT_INSTANCE_ID=$(aws ec2 describe-instances \
            --filters "Name=ip-address,Values=${CURRENT_EC2_IP}" \
            --query 'Reservations[0].Instances[0].InstanceId' \
            --output text 2>/dev/null || echo "")
        
        if [ -z "$CURRENT_INSTANCE_ID" ] || [ "$CURRENT_INSTANCE_ID" == "None" ]; then
            echo -e "${RED}❌ Could not find instance ID. Please set EC2_INSTANCE_ID in .env${NC}"
            exit 1
        fi
    fi
    echo -e "${GREEN}Current instance ID: ${CURRENT_INSTANCE_ID}${NC}"
}

# Step 1: Backup current database
step_backup() {
    echo -e "${BLUE}📦 Step 1: Creating Database Backup${NC}"
    echo ""
    
    get_current_instance_id
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    echo -e "${YELLOW}Creating backup on EC2 instance...${NC}"
    ssh -i "$PEM_FILE" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "${EC2_USER}@${CURRENT_EC2_IP}" << 'EOF'
        set -e
        mkdir -p ~/migration-backup
        cd ~/migration-backup
        
        echo "Backing up database..."
        BACKUP_FILE="database_backup_$(date +%Y%m%d_%H%M%S).sql"
        
        # Get DATABASE_URL from backend container
        DB_URL=$(docker exec stock-backend printenv DATABASE_URL 2>/dev/null || echo "")
        
        if [ -z "$DB_URL" ]; then
            # Try from .env file
            source ~/.env 2>/dev/null || true
            DB_URL="$DATABASE_URL"
        fi
        
        if [ -z "$DB_URL" ]; then
            echo "❌ ERROR: Could not find DATABASE_URL!"
            exit 1
        fi
        
        # Extract password from DATABASE_URL
        DB_PASS=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        
        # Use temporary postgres container to backup via host network
        echo "Creating backup using temporary postgres container..."
        docker run --rm --network host \
            -e PGPASSWORD="$DB_PASS" \
            postgres:15-alpine \
            pg_dump -h localhost -p 5432 -U stock_user stock_management > "$BACKUP_FILE"
        
        # Verify backup was created
        if [ -s "$BACKUP_FILE" ]; then
            echo "✅ Database backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
        else
            echo "❌ ERROR: Database backup failed!"
            exit 1
        fi
        
        echo "Backing up .env file..."
        cp ~/.env ~/migration-backup/.env.backup 2>/dev/null || echo "⚠️  .env file not found"
        
        echo ""
        echo "Backup files:"
        ls -lh ~/migration-backup/
EOF
    
    echo -e "${YELLOW}Downloading backup files...${NC}"
    scp -i "$PEM_FILE" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "${EC2_USER}@${CURRENT_EC2_IP}:~/migration-backup/*" \
        "$BACKUP_DIR/" 2>/dev/null || {
        echo -e "${RED}❌ Failed to download backups${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Backup completed and downloaded to: $BACKUP_DIR${NC}"
    ls -lh "$BACKUP_DIR/"
}

# Step 2: Launch new t4g.micro instance
step_launch() {
    echo -e "${BLUE}🚀 Step 2: Launching New t4g.micro Instance${NC}"
    echo ""
    
    get_current_instance_id
    
    # Get current instance details
    echo -e "${YELLOW}Getting current instance configuration...${NC}"
    SUBNET_ID=$(aws ec2 describe-instances \
        --instance-ids "$CURRENT_INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].SubnetId' \
        --output text)
    
    SG_ID=$(aws ec2 describe-instances \
        --instance-ids "$CURRENT_INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
        --output text)
    
    KEY_NAME=$(aws ec2 describe-instances \
        --instance-ids "$CURRENT_INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].KeyName' \
        --output text)
    
    echo "Subnet ID: $SUBNET_ID"
    echo "Security Group ID: $SG_ID"
    echo "Key Name: $KEY_NAME"
    echo ""
    
    # Get latest Amazon Linux 2023 ARM64 AMI
    echo -e "${YELLOW}Finding latest Amazon Linux 2023 ARM64 AMI...${NC}"
    AMI_ID=$(aws ec2 describe-images \
        --owners amazon \
        --filters "Name=name,Values=al2023-ami-*-arm64" "Name=state,Values=available" \
        --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
        --output text)
    
    if [ -z "$AMI_ID" ] || [ "$AMI_ID" == "None" ]; then
        echo -e "${RED}❌ Could not find ARM64 AMI${NC}"
        exit 1
    fi
    
    echo "AMI ID: $AMI_ID"
    echo ""
    
    read -p "Launch new t4g.micro instance? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted"
        exit 0
    fi
    
    echo -e "${YELLOW}Launching instance...${NC}"
    LAUNCH_RESULT=$(aws ec2 run-instances \
        --image-id "$AMI_ID" \
        --instance-type t4g.micro \
        --key-name "$KEY_NAME" \
        --subnet-id "$SUBNET_ID" \
        --security-group-ids "$SG_ID" \
        --associate-public-ip-address \
        --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":8,"VolumeType":"gp3"}}]' \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=stock-management-backend-t4g}]" \
        --output json)
    
    NEW_INSTANCE_ID=$(echo "$LAUNCH_RESULT" | jq -r '.Instances[0].InstanceId')
    
    if [ -z "$NEW_INSTANCE_ID" ] || [ "$NEW_INSTANCE_ID" == "null" ]; then
        echo -e "${RED}❌ Failed to launch instance${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Instance launched: $NEW_INSTANCE_ID${NC}"
    echo ""
    echo -e "${YELLOW}Waiting for instance to be running...${NC}"
    aws ec2 wait instance-running --instance-ids "$NEW_INSTANCE_ID"
    
    # Get new instance IP
    NEW_INSTANCE_IP=$(aws ec2 describe-instances \
        --instance-ids "$NEW_INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    echo -e "${GREEN}✅ Instance is running${NC}"
    echo "New Instance ID: $NEW_INSTANCE_ID"
    echo "New Instance IP: $NEW_INSTANCE_IP"
    echo ""
    echo -e "${YELLOW}⚠️  Save these values:${NC}"
    echo "   NEW_INSTANCE_ID=$NEW_INSTANCE_ID"
    echo "   NEW_INSTANCE_IP=$NEW_INSTANCE_IP"
    echo ""
    echo "Add to .env file:"
    echo "   NEW_EC2_INSTANCE_ID=$NEW_INSTANCE_ID"
    echo "   NEW_EC2_IP=$NEW_INSTANCE_IP"
}

# Step 3: Setup new instance
step_setup() {
    echo -e "${BLUE}⚙️  Step 3: Setting Up New Instance${NC}"
    echo ""
    
    NEW_INSTANCE_IP="${NEW_EC2_IP:-}"
    if [ -z "$NEW_INSTANCE_IP" ]; then
        read -p "Enter new instance IP: " NEW_INSTANCE_IP
    fi
    
    echo -e "${YELLOW}Waiting for SSH to be available...${NC}"
    for i in {1..30}; do
        if ssh -i "$PEM_FILE" \
            -o ConnectTimeout=5 \
            -o StrictHostKeyChecking=no \
            -o BatchMode=yes \
            "${EC2_USER}@${NEW_INSTANCE_IP}" \
            "echo 'SSH ready'" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ SSH is available${NC}"
            break
        fi
        echo -n "."
        sleep 5
    done
    echo ""
    
    echo -e "${YELLOW}Copying setup script...${NC}"
    scp -i "$PEM_FILE" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$PROJECT_DIR/backend/ec2-setup.sh" \
        "${EC2_USER}@${NEW_INSTANCE_IP}:~/"
    
    echo -e "${YELLOW}Running setup script...${NC}"
    ssh -i "$PEM_FILE" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "${EC2_USER}@${NEW_INSTANCE_IP}" << 'EOF'
        chmod +x ~/ec2-setup.sh
        ./ec2-setup.sh
EOF
    
    echo -e "${GREEN}✅ Setup script completed${NC}"
    echo -e "${YELLOW}⚠️  You may need to log out and log back in for Docker group changes${NC}"
}

# Step 4: Restore database
step_restore() {
    echo -e "${BLUE}💾 Step 4: Restoring Database${NC}"
    echo ""
    
    NEW_INSTANCE_IP="${NEW_EC2_IP:-}"
    if [ -z "$NEW_INSTANCE_IP" ]; then
        read -p "Enter new instance IP: " NEW_INSTANCE_IP
    fi
    
    # Find backup file
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/database_backup_*.sql 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ No backup file found in $BACKUP_DIR${NC}"
        exit 1
    fi
    
    echo "Using backup: $BACKUP_FILE"
    echo ""
    
    echo -e "${YELLOW}Copying backup to new instance...${NC}"
    scp -i "$PEM_FILE" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$BACKUP_FILE" \
        "${EC2_USER}@${NEW_INSTANCE_IP}:~/database_backup.sql"
    
    echo -e "${YELLOW}Setting up temporary PostgreSQL container...${NC}"
    ssh -i "$PEM_FILE" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "${EC2_USER}@${NEW_INSTANCE_IP}" << 'EOF'
        set -e
        
        # Create data directory
        sudo mkdir -p /data/postgres
        sudo chown ec2-user:ec2-user /data/postgres
        
        # Start temporary PostgreSQL
        docker run -d \
          --name temp-postgres \
          -e POSTGRES_USER=stock_user \
          -e POSTGRES_PASSWORD=stock_password \
          -e POSTGRES_DB=stock_management \
          -v /data/postgres:/var/lib/postgresql/data \
          postgres:15-alpine
        
        echo "Waiting for PostgreSQL to be ready..."
        sleep 15
        
        echo "Restoring database..."
        docker exec -i temp-postgres psql -U stock_user -d stock_management < ~/database_backup.sql
        
        echo "Verifying restore..."
        docker exec temp-postgres psql -U stock_user -d stock_management -c "\dt" || true
        
        echo "Stopping temporary container..."
        docker stop temp-postgres
        docker rm temp-postgres
        
        echo "✅ Database restored"
EOF
    
    echo -e "${GREEN}✅ Database restore completed${NC}"
}

# Step 5: Deploy backend
step_deploy() {
    echo -e "${BLUE}🚀 Step 5: Deploying Backend to New Instance${NC}"
    echo ""
    
    NEW_INSTANCE_IP="${NEW_EC2_IP:-}"
    if [ -z "$NEW_INSTANCE_IP" ]; then
        read -p "Enter new instance IP: " NEW_INSTANCE_IP
    fi
    
    # Temporarily update .env
    OLD_EC2_IP="$CURRENT_EC2_IP"
    export EC2_IP="$NEW_INSTANCE_IP"
    
    echo -e "${YELLOW}Deploying backend...${NC}"
    "$SCRIPT_DIR/redeploy.sh" backend --update-cors
    
    # Restore original IP
    export EC2_IP="$OLD_EC2_IP"
    
    echo -e "${GREEN}✅ Backend deployed${NC}"
    echo ""
    echo -e "${YELLOW}Testing health endpoint...${NC}"
    sleep 10
    if curl -s -f "http://${NEW_INSTANCE_IP}:3001/health" > /dev/null; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed (might still be starting)${NC}"
    fi
}

# Step 6: Switch Elastic IP and CloudFront
step_switch() {
    echo -e "${BLUE}🔄 Step 6: Switching Elastic IP and CloudFront${NC}"
    echo ""
    
    NEW_INSTANCE_ID="${NEW_EC2_INSTANCE_ID:-}"
    if [ -z "$NEW_INSTANCE_ID" ]; then
        read -p "Enter new instance ID: " NEW_INSTANCE_ID
    fi
    
    if [ -z "$ELASTIC_IP_ALLOCATION_ID" ]; then
        echo -e "${YELLOW}Finding Elastic IP allocation ID...${NC}"
        ELASTIC_IP_ALLOCATION_ID=$(aws ec2 describe-addresses \
            --filters "Name=instance-id,Values=${CURRENT_INSTANCE_ID}" \
            --query 'Addresses[0].AllocationId' \
            --output text)
        
        if [ -z "$ELASTIC_IP_ALLOCATION_ID" ] || [ "$ELASTIC_IP_ALLOCATION_ID" == "None" ]; then
            echo -e "${RED}❌ Could not find Elastic IP. Please set ELASTIC_IP_ALLOCATION_ID in .env${NC}"
            exit 1
        fi
    fi
    
    echo "Elastic IP Allocation ID: $ELASTIC_IP_ALLOCATION_ID"
    echo ""
    
    read -p "Reassign Elastic IP to new instance? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Disassociate from old instance
        ASSOCIATION_ID=$(aws ec2 describe-addresses \
            --allocation-ids "$ELASTIC_IP_ALLOCATION_ID" \
            --query 'Addresses[0].AssociationId' \
            --output text)
        
        if [ ! -z "$ASSOCIATION_ID" ] && [ "$ASSOCIATION_ID" != "None" ]; then
            echo -e "${YELLOW}Disassociating from old instance...${NC}"
            aws ec2 disassociate-address --association-id "$ASSOCIATION_ID"
        fi
        
        # Associate with new instance
        echo -e "${YELLOW}Associating with new instance...${NC}"
        aws ec2 associate-address \
            --allocation-id "$ELASTIC_IP_ALLOCATION_ID" \
            --instance-id "$NEW_INSTANCE_ID"
        
        sleep 5
        NEW_ELASTIC_IP=$(aws ec2 describe-instances \
            --instance-ids "$NEW_INSTANCE_ID" \
            --query 'Reservations[0].Instances[0].PublicIpAddress' \
            --output text)
        
        echo -e "${GREEN}✅ Elastic IP reassigned${NC}"
        echo "New instance IP: $NEW_ELASTIC_IP"
    fi
    
    # Update CloudFront
    if [ ! -z "$API_DIST_ID" ]; then
        echo ""
        read -p "Update CloudFront origin? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}⚠️  CloudFront update requires manual steps${NC}"
            echo "See migration plan document for detailed instructions"
            echo "Distribution ID: $API_DIST_ID"
        fi
    fi
}

# Main
STEP="${1:-help}"

case "$STEP" in
    backup)
        step_backup
        ;;
    launch)
        step_launch
        ;;
    setup)
        step_setup
        ;;
    restore)
        step_restore
        ;;
    deploy)
        step_deploy
        ;;
    switch)
        step_switch
        ;;
    help|*)
        echo "EC2 Migration Helper: t3.micro → t4g.micro"
        echo ""
        echo "Usage: $0 [step]"
        echo ""
        echo "Steps:"
        echo "  backup   - Create database backup from current instance"
        echo "  launch   - Launch new t4g.micro instance"
        echo "  setup    - Run setup script on new instance"
        echo "  restore  - Restore database to new instance"
        echo "  deploy   - Deploy backend code to new instance"
        echo "  switch   - Switch Elastic IP and update CloudFront"
        echo ""
        echo "Example:"
        echo "  $0 backup"
        echo "  $0 launch"
        echo ""
        echo "See docs/EC2_MIGRATION_PLAN.md for complete guide"
        ;;
esac

