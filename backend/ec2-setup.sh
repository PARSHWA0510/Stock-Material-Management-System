#!/bin/bash

# EC2 Setup Script for Stock Management Backend
# Run this script on your EC2 instance after initial setup

set -e

echo "🚀 Stock Management Backend - EC2 Setup Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root. Use ec2-user.${NC}"
   exit 1
fi

echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
sudo yum update -y

echo -e "${YELLOW}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    sudo yum install docker -y
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed. Please log out and log back in for group changes.${NC}"
else
    echo -e "${GREEN}Docker already installed.${NC}"
fi

echo -e "${YELLOW}Step 3: Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    sudo yum install postgresql15-server postgresql15 -y
    
    # Try multiple initialization methods
    if [ -f /usr/pgsql-15/bin/postgresql-15-setup ]; then
        sudo /usr/pgsql-15/bin/postgresql-15-setup initdb
    elif command -v postgresql-setup &> /dev/null; then
        sudo postgresql-setup --initdb
    else
        # Manual initialization
        sudo mkdir -p /var/lib/pgsql/15/data
        sudo chown postgres:postgres /var/lib/pgsql/15/data
        if [ -f /usr/pgsql-15/bin/initdb ]; then
            sudo -u postgres /usr/pgsql-15/bin/initdb -D /var/lib/pgsql/15/data
        else
            INITDB_PATH=$(sudo find /usr -name initdb 2>/dev/null | head -1)
            if [ -n "$INITDB_PATH" ]; then
                sudo -u postgres $INITDB_PATH -D /var/lib/pgsql/15/data
            else
                echo -e "${RED}Could not find initdb. Please initialize PostgreSQL manually.${NC}"
                echo -e "${YELLOW}Try: sudo -u postgres initdb -D /var/lib/pgsql/data${NC}"
            fi
        fi
    fi
    
    sudo systemctl start postgresql-15
    sudo systemctl enable postgresql-15
    echo -e "${GREEN}PostgreSQL installed.${NC}"
else
    echo -e "${GREEN}PostgreSQL already installed.${NC}"
fi

echo -e "${YELLOW}Step 4: Setting up data directory...${NC}"
if [ ! -d "/data" ]; then
    echo -e "${YELLOW}Creating /data directory...${NC}"
    sudo mkdir -p /data
    sudo chown $USER:$USER /data
    echo -e "${GREEN}Data directory created.${NC}"
else
    echo -e "${GREEN}Data directory already exists.${NC}"
fi

echo -e "${YELLOW}Step 5: Installing AWS CLI...${NC}"
if ! command -v aws &> /dev/null; then
    sudo yum install aws-cli -y
    echo -e "${GREEN}AWS CLI installed.${NC}"
    echo -e "${YELLOW}Run 'aws configure' to set up credentials.${NC}"
else
    echo -e "${GREEN}AWS CLI already installed.${NC}"
fi

echo -e "${YELLOW}Step 6: Creating backup script...${NC}"
cat > /home/$USER/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/data/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
PGPASSWORD="${DB_PASSWORD}" pg_dump -h localhost -U stock_user -d stock_management > $BACKUP_DIR/backup_$DATE.sql
if [ $? -eq 0 ]; then
    echo "Backup created: backup_$DATE.sql"
    # Keep only last 7 days
    find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
else
    echo "Backup failed!"
    exit 1
fi
EOF

chmod +x /home/$USER/backup-db.sh
echo -e "${GREEN}Backup script created at /home/$USER/backup-db.sh${NC}"

echo -e "${YELLOW}Step 7: Creating systemd service for Docker container...${NC}"
sudo tee /etc/systemd/system/stock-backend.service > /dev/null << 'EOF'
[Unit]
Description=Stock Management Backend
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ec2-user
ExecStart=/usr/bin/docker start stock-backend
ExecStop=/usr/bin/docker stop stock-backend
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}Systemd service created.${NC}"

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Log out and log back in for Docker group changes"
echo "2. Set up PostgreSQL database:"
echo "   sudo -u postgres psql"
echo "   CREATE DATABASE stock_management;"
echo "   CREATE USER stock_user WITH PASSWORD 'your-password';"
echo "   GRANT ALL PRIVILEGES ON DATABASE stock_management TO stock_user;"
echo "3. Configure PostgreSQL to accept connections:"
echo "   sudo vi /var/lib/pgsql/15/data/postgresql.conf"
echo "   # Set: listen_addresses = '*'"
echo "   sudo vi /var/lib/pgsql/15/data/pg_hba.conf"
echo "   # Add: host all all 0.0.0.0/0 md5"
echo "   sudo systemctl restart postgresql-15"
echo "4. Create .env file with your configuration"
echo "5. Build and run Docker container (see AWS_DEPLOYMENT.md)"
echo ""
echo -e "${GREEN}For detailed instructions, see AWS_DEPLOYMENT.md${NC}"

