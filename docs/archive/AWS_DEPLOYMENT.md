# 🚀 AWS Deployment Guide

Complete step-by-step guide to deploy the Stock Material Management System on AWS.

## Architecture Overview

- **Frontend**: AWS S3 (Static Website Hosting) + CloudFront (Optional)
- **Backend**: Docker container on EC2 t2.micro
- **Database**: PostgreSQL on EC2 (or RDS if preferred)
- **Storage**: 5GB EBS volume for data persistence

---

## Prerequisites

1. AWS Account (Free tier eligible)
2. AWS CLI installed and configured
3. Docker installed locally (for building images)
4. SSH key pair for EC2 access
5. Domain name (optional, for custom domain)

---

## Part 1: Frontend Deployment on S3

### Step 1: Create S3 Bucket

1. Go to **S3 Console** → **Create bucket**
2. **Bucket name**: `stock-management-frontend` (must be globally unique)
3. **Region**: Choose your preferred region (e.g., `us-east-1`)
4. **Block Public Access**: **Uncheck** "Block all public access" (we need public read access)
5. **Bucket Versioning**: Disable (optional)
6. **Default encryption**: Enable (SSE-S3)
7. Click **Create bucket**

### Step 2: Configure S3 Bucket for Static Website Hosting

1. Select your bucket → **Properties** tab
2. Scroll to **Static website hosting**
3. Click **Edit** → **Enable**
4. **Index document**: `index.html`
5. **Error document**: `index.html` (for React Router)
6. Click **Save changes**
7. Note the **Bucket website endpoint** (e.g., `http://stock-management-frontend.s3-website-us-east-1.amazonaws.com`)

### Step 3: Configure Bucket Policy

1. Go to **Permissions** tab → **Bucket policy**
2. Click **Edit** and add this policy (replace `YOUR-BUCKET-NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

3. Click **Save changes**

### Step 4: Build and Upload Frontend

#### Option A: Upload via AWS Console (No CLI needed)

1. **Build the frontend locally**:
```bash
cd frontend
npm install
npm run build
```

2. **Upload via AWS Console**:
   - Go to **S3 Console** → Select your bucket
   - Click **Upload**
   - Drag and drop all files from `frontend/dist/` folder
   - Click **Upload**
   - **Note**: Make sure to upload all files including `index.html` and assets

3. **Verify**: Visit your bucket website endpoint in browser

#### Option B: Upload via AWS CLI (Recommended for automation)

**First, set up AWS CLI credentials:**

1. **Get AWS Access Keys**:
   - Go to **AWS Console** → Click your username (top right) → **Security credentials**
   - Scroll to **Access keys** section
   - Click **Create access key**
   - Choose **Command Line Interface (CLI)**
   - Click **Next** → **Create access key**
   - **Important**: Download the CSV file or copy:
     - **Access Key ID**
     - **Secret Access Key** (shown only once!)

2. **Install AWS CLI** (if not installed):
```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
# Download from: https://awscli.amazonaws.com/AWSCLIV2.msi
```

3. **Configure AWS CLI**:
```bash
aws configure
# Enter your:
# - AWS Access Key ID: [paste your access key]
# - AWS Secret Access Key: [paste your secret key]
# - Default region name: us-east-1 (or your preferred region)
# - Default output format: json
```

4. **Build and upload**:
```bash
cd frontend
npm install
npm run build

# Upload build files
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/ --delete

# Or using the provided script
./deploy-frontend-s3.sh YOUR-BUCKET-NAME us-east-1
```

**Note**: 
- **PEM files** are only for SSH access to EC2 instances, NOT for S3
- **AWS Console** access uses your AWS account login (no PEM needed)
- **AWS CLI** uses Access Keys (not PEM files)

3. **Verify**: Visit your bucket website endpoint in browser

### Step 5: (Optional) Set up CloudFront Distribution

For better performance and HTTPS:

1. Go to **CloudFront** → **Create distribution**
2. **Origin domain**: Select your S3 bucket (website endpoint)
3. **Viewer protocol policy**: Redirect HTTP to HTTPS
4. **Default root object**: `index.html`
5. **Custom error responses**: 
   - 403 → 200 → `/index.html`
   - 404 → 200 → `/index.html`
6. Click **Create distribution**
7. Wait 10-15 minutes for deployment
8. Use CloudFront URL as your frontend URL

---

## Part 2: Backend Deployment on EC2

### Step 1: Launch EC2 Instance

1. Go to **EC2 Console** → **Launch Instance**
2. **Name**: `stock-management-backend`
3. **AMI**: Amazon Linux 2023 (Free tier eligible)
4. **Instance type**: `t2.micro` (Free tier)
5. **Key pair**: Create new or select existing SSH key
6. **Network settings**: 
   - Create security group or use existing
   - **Inbound rules**:
     - SSH (22) from My IP
     - Custom TCP (3001) from Anywhere (0.0.0.0/0) - for API access
7. **Configure storage**: 
   - Root volume: 8 GB (default)
   - **Add volume**: 5 GB gp3 (for database/data)
8. Click **Launch instance**

### Step 2: Attach and Mount EBS Volume (5GB)

1. **Attach volume** (if not attached during launch):
   - EC2 Console → **Volumes** → Select 5GB volume
   - **Actions** → **Attach volume**
   - Select your instance → **Attach**

2. **SSH into EC2**:
```bash
ssh -i your-key.pem ec2-user@YOUR-EC2-PUBLIC-IP
```

3. **Mount the volume**:
```bash
# List available disks
lsblk

# Format the volume (if new, replace /dev/xvdf with your volume)
sudo mkfs -t xfs /dev/xvdf

# Create mount point
sudo mkdir /data

# Mount the volume
sudo mount /dev/xvdf /data

# Make it permanent (add to fstab)
echo '/dev/xvdf /data xfs defaults,nofail 0 2' | sudo tee -a /etc/fstab

# Set permissions
sudo chown ec2-user:ec2-user /data
```

### Step 3: Install Docker on EC2

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install docker -y

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add ec2-user to docker group
sudo usermod -aG docker ec2-user

# Log out and log back in for group changes to take effect
exit
# SSH back in
```

### Step 4: Install PostgreSQL on EC2

```bash
# Install PostgreSQL
sudo yum install postgresql15-server postgresql15 -y

# Check where PostgreSQL was installed
which psql
# Should show: /usr/bin/psql or /usr/pgsql-15/bin/psql

# Find the initdb command
which initdb
# Or locate it:
sudo find /usr -name initdb 2>/dev/null

# Initialize database - Try these methods in order:

# First, check where initdb is located
which initdb
# If it shows /usr/bin/initdb, use Method 2 or 3
# If it shows /usr/pgsql-15/bin/initdb, use Method 1

# Method 1: Use postgresql-setup (if available)
sudo postgresql-setup --initdb

# Method 2: Direct initialization (if initdb is in /usr/bin/)
sudo -u postgres initdb -D /var/lib/pgsql/data

# Method 3: If PostgreSQL data directory doesn't exist, create it first
sudo mkdir -p /var/lib/pgsql/data
sudo chown postgres:postgres /var/lib/pgsql/data
sudo -u postgres initdb -D /var/lib/pgsql/data

# Method 4: Alternative path (if using versioned directory)
sudo mkdir -p /var/lib/pgsql/15/data
sudo chown postgres:postgres /var/lib/pgsql/15/data
sudo -u postgres initdb -D /var/lib/pgsql/15/data

# Verify initialization was successful
ls -la /var/lib/pgsql/15/data
# Should show PostgreSQL configuration files

# Start PostgreSQL
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15

# Check status
sudo systemctl status postgresql-15
```

# Set up database
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE stock_management;
CREATE USER stock_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE stock_management TO stock_user;
\q

# Configure PostgreSQL to accept connections
sudo vi /var/lib/pgsql/15/data/postgresql.conf
# Find and set: listen_addresses = '*'

sudo vi /var/lib/pgsql/15/data/pg_hba.conf
# Add line: host    all             all             0.0.0.0/0               md5

# Restart PostgreSQL
sudo systemctl restart postgresql-15

# Open PostgreSQL port in security group
# EC2 Console → Security Groups → Edit inbound rules
# Add: PostgreSQL (5432) from EC2 security group only (for security)
```

### Step 5: Build and Push Docker Image

**Option A: Build on EC2** (Recommended for t2.micro)

1. **Transfer code to EC2**:
```bash
# On local machine
cd backend
tar -czf backend.tar.gz --exclude=node_modules --exclude=dist .
scp -i your-key.pem backend.tar.gz ec2-user@YOUR-EC2-IP:/home/ec2-user/
```

2. **On EC2**:
```bash
# Extract
tar -xzf backend.tar.gz
cd backend

# Build Docker image
docker build -t stock-management-backend:latest .

# Run container
docker run -d \
  --name stock-backend \
  --restart unless-stopped \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://stock_user:your-secure-password@localhost:5432/stock_management?schema=public" \
  -e JWT_SECRET="your-super-secret-jwt-key-change-this" \
  -e PORT=3001 \
  -e NODE_ENV=production \
  -e CORS_ORIGIN="http://YOUR-S3-BUCKET-ENDPOINT,https://YOUR-CLOUDFRONT-URL" \
  stock-management-backend:latest
```

**Option B: Build locally and push to ECR** (Better for CI/CD)

1. **Create ECR repository**:
```bash
aws ecr create-repository --repository-name stock-management-backend --region us-east-1
```

2. **Build and push**:
```bash
# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR-ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com

# Build
cd backend
docker build -t stock-management-backend .

# Tag
docker tag stock-management-backend:latest YOUR-ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com/stock-management-backend:latest

# Push
docker push YOUR-ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com/stock-management-backend:latest
```

3. **Pull and run on EC2**:
```bash
# Install AWS CLI on EC2
sudo yum install aws-cli -y
aws configure

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR-ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com

# Pull image
docker pull YOUR-ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com/stock-management-backend:latest

# Run (same as Option A)
```

### Step 6: Set Up Environment Variables

Create a `.env` file or use docker-compose:

```bash
# On EC2
cd /home/ec2-user
nano .env
```

Add:
```
DATABASE_URL=postgresql://stock_user:your-secure-password@localhost:5432/stock_management?schema=public
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://YOUR-S3-BUCKET-ENDPOINT,https://YOUR-CLOUDFRONT-URL
```

### Step 7: Run Database Migrations

```bash
# Execute migrations inside container
docker exec -it stock-backend npx prisma migrate deploy

# Seed database (optional)
docker exec -it stock-backend npm run db:seed:prod
```

### Step 8: Update Frontend API URL

1. **Rebuild frontend with new API URL**:
```bash
cd frontend
# Create .env.production file
echo "VITE_API_BASE_URL=http://YOUR-EC2-PUBLIC-IP:3001/api" > .env.production
# Or for CloudFront/ELB: https://your-api-domain.com/api

npm run build
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/ --delete
```

---

## Part 3: Security & Optimization

### 1. Set Up Application Load Balancer (Optional but Recommended)

1. **Create ALB**:
   - EC2 → Load Balancers → Create
   - Type: Application Load Balancer
   - Scheme: Internet-facing
   - Listeners: HTTPS (443) and HTTP (80)
   - Target group: EC2 instance on port 3001

2. **Update CORS_ORIGIN** with ALB DNS name

### 2. Set Up SSL Certificate (HTTPS)

1. **Request certificate in ACM**:
   - Certificate Manager → Request certificate
   - Domain name: `api.yourdomain.com`
   - Validation: DNS or Email

2. **Attach to ALB** or use CloudFront

### 3. Security Group Best Practices

- **Backend**: Only allow 3001 from ALB security group
- **PostgreSQL**: Only allow 5432 from EC2 security group
- **SSH**: Only from your IP

### 4. Set Up Auto-restart for Docker Container

Create a systemd service:

```bash
sudo nano /etc/systemd/system/stock-backend.service
```

```ini
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

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable stock-backend
sudo systemctl start stock-backend
```

---

## Part 4: Monitoring & Maintenance

### 1. View Logs

```bash
# Docker logs
docker logs -f stock-backend

# PostgreSQL logs
sudo tail -f /var/lib/pgsql/15/data/log/postgresql-*.log
```

### 2. Backup Database

```bash
# Create backup script
nano /home/ec2-user/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/data/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U stock_user -d stock_management > $BACKUP_DIR/backup_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

```bash
chmod +x /home/ec2-user/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/ec2-user/backup-db.sh
```

### 3. Update Application

```bash
# Pull latest code
cd /home/ec2-user/backend
git pull  # or transfer new files

# Rebuild and restart
docker stop stock-backend
docker rm stock-backend
docker build -t stock-management-backend:latest .
docker run -d --name stock-backend --restart unless-stopped \
  -p 3001:3001 \
  --env-file /home/ec2-user/.env \
  stock-management-backend:latest

# Run migrations
docker exec -it stock-backend npx prisma migrate deploy
```

---

## Cost Estimation (Free Tier)

- **EC2 t2.micro**: Free for 12 months (750 hours/month)
- **S3**: Free tier includes 5GB storage, 20,000 GET requests
- **EBS 5GB**: ~$0.50/month (after free tier)
- **Data Transfer**: First 1GB free, then $0.09/GB

**Total**: ~$0.50-2/month after free tier expires

---

## Troubleshooting

### Backend not accessible
- Check security group rules
- Verify Docker container is running: `docker ps`
- Check logs: `docker logs stock-backend`

### Database connection errors
- Verify PostgreSQL is running: `sudo systemctl status postgresql-15`
- Check DATABASE_URL format
- Verify pg_hba.conf allows connections

### Frontend API calls failing
- Check CORS_ORIGIN includes frontend URL
- Verify VITE_API_BASE_URL is correct
- Check browser console for CORS errors

---

## Quick Reference Commands

```bash
# Start backend
docker start stock-backend

# Stop backend
docker stop stock-backend

# View logs
docker logs -f stock-backend

# Restart backend
docker restart stock-backend

# Database backup
pg_dump -U stock_user stock_management > backup.sql

# Database restore
psql -U stock_user stock_management < backup.sql
```

---

## Next Steps

1. Set up domain name and Route 53
2. Configure CloudFront for frontend
3. Set up CloudWatch for monitoring
4. Implement automated backups
5. Set up CI/CD pipeline

---

**Need Help?** Check the main DEPLOYMENT.md for additional details.

