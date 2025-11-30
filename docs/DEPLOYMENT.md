# 🚀 Deployment Guide

Complete guide for deploying the Stock Material Management System to AWS.

## 📋 Prerequisites

- AWS Account with CLI configured
- SSH key pair for EC2 access
- Environment variables configured (see `.env.example`)

## 🏗️ Architecture

- **Frontend**: AWS S3 (Static Website) + CloudFront (Optional)
- **Backend**: Docker container on EC2 t2.micro
- **Database**: PostgreSQL on EC2

---

## 🎨 Frontend Deployment (S3)

### 1. Create S3 Bucket

```bash
aws s3 mb s3://your-bucket-name --region us-east-1
```

### 2. Enable Static Website Hosting

1. AWS Console → S3 → Your bucket → Properties
2. Static website hosting → Enable
3. Index document: `index.html`
4. Error document: `index.html`

### 3. Set Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::your-bucket-name/*"
  }]
}
```

### 4. Deploy

```bash
# Using redeploy script (recommended)
./scripts/redeploy.sh frontend --subpath stock-management

# Or manually:
cd frontend
npm install
npm run build
# Then sync to S3 manually if needed
```

---

## ⚙️ Backend Deployment (EC2)

### 1. Launch EC2 Instance

- **Instance Type**: t2.micro (Free tier eligible)
- **OS**: Amazon Linux 2023
- **Storage**: 8GB minimum
- **Security Group**: Allow SSH (22), HTTP (3001)

### 2. Setup EC2

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Run setup script
cd ~
wget https://raw.githubusercontent.com/your-repo/main/backend/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh
```

### 3. Install PostgreSQL

```bash
sudo yum install postgresql15-server postgresql15 -y
sudo postgresql-setup --initdb
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15

# Create database
sudo -u postgres psql
CREATE DATABASE stock_management;
CREATE USER stock_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE stock_management TO stock_user;
\q
```

### 4. Deploy Backend Code

```bash
# On local machine - fully automated deployment
./scripts/redeploy.sh backend --update-cors

# This script automatically:
# - Transfers code to EC2
# - Rebuilds Docker container
# - Restarts the service
# - Updates CORS configuration (if --update-cors flag is used)
```

### 5. Run Migrations

```bash
docker exec -it stock-backend npx prisma migrate deploy
docker exec -it stock-backend npm run db:seed:prod
```

---

## 🔄 Redeployment

### Frontend Only

```bash
./scripts/redeploy.sh frontend --subpath stock-management
```

### Backend Only

```bash
./scripts/redeploy.sh backend --update-cors
# Fully automated - no manual steps needed
```

### Both

```bash
./scripts/redeploy.sh all --subpath stock-management --update-cors
```

---

## 🛑 EC2 Management

### Stop EC2 Instance

```bash
./scripts/stop-ec2.sh
```

Gracefully stops Docker container, optionally creates backup, then stops EC2.

### Start EC2 Instance

```bash
./scripts/start-ec2.sh
```

Starts EC2, ensures all services are running, and verifies backend health.

---

## 🔧 Environment Variables

### Root Level (.env)

Create `.env` from `.env.example`:

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:
- `EC2_IP` - Your EC2 instance IP
- `EC2_USER` - EC2 username (usually `ec2-user`)
- `PEM_FILE` - Path to your SSH key file
- `S3_BUCKET` - S3 bucket name
- `S3_REGION` - AWS region

### Backend (.env on EC2)

```bash
DATABASE_URL=postgresql://stock_user:password@localhost:5432/stock_management
JWT_SECRET=your-secret-key
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://your-s3-bucket.s3-website-region.amazonaws.com
```

### Frontend (.env.production)

```bash
VITE_API_BASE_URL=http://your-ec2-ip:3001/api
```

---

## 🐛 Troubleshooting

### Backend Not Accessible

1. Check security group allows port 3001
2. Verify container is running: `docker ps`
3. Check logs: `docker logs stock-backend`
4. Test health: `curl http://localhost:3001/health`

### Frontend Not Updating

1. Clear browser cache (Ctrl+Shift+R)
2. Verify S3 upload: `aws s3 ls s3://your-bucket-name/`
3. Check CloudFront cache (if using)

### Database Connection Issues

1. Verify PostgreSQL is running: `sudo systemctl status postgresql-15`
2. Check connection: `psql -U stock_user -d stock_management`
3. Verify DATABASE_URL in `.env`

---

## 📊 Cost Estimation

- **EC2 t2.micro**: Free tier (750 hours/month for 12 months)
- **S3**: Free tier (5GB storage, 20,000 GET requests)
- **EBS**: ~$0.10/GB/month (after free tier)

**Estimated**: ~$0-5/month on free tier

---

## 🔐 Security Best Practices

- Never commit `.env` files
- Use strong passwords
- Restrict security groups to your IP
- Enable HTTPS with CloudFront
- Regularly update dependencies
- Use IAM roles instead of access keys when possible

---

## 📝 Quick Reference

```bash
# Deploy frontend
./scripts/redeploy.sh frontend

# Deploy backend
./scripts/redeploy.sh backend

# Stop EC2
./scripts/stop-ec2.sh

# Start EC2
./scripts/start-ec2.sh

# Connect to database (pgAdmin tunnel)
./scripts/connect-pgadmin.sh
```

