# 🚀 AWS Quick Start Guide

Quick reference for deploying to AWS. For detailed instructions, see [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md).

## Prerequisites Checklist

- [ ] AWS Account created
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] SSH key pair created for EC2
- [ ] Domain name (optional)

---

## Frontend: S3 Deployment (5 minutes)

### 1. Create S3 Bucket
- **Via Console**: AWS Console → S3 → Create bucket
- **Via CLI**: `aws s3 mb s3://stock-management-frontend --region us-east-1`

### 2. Enable Static Website Hosting
- AWS Console → S3 → Your bucket → Properties
- Static website hosting → Enable
- Index document: `index.html`
- Error document: `index.html`

### 3. Set Bucket Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::stock-management-frontend/*"
  }]
}
```

### 4. Deploy

**Option A: Via AWS Console (No CLI needed)**
1. Build: `cd frontend && npm run build`
2. Upload: S3 Console → Upload → Select all files from `dist/` folder

**Option B: Via AWS CLI**
1. **Get AWS Access Keys** (if not done):
   - AWS Console → Your username → Security credentials → Create access key
2. **Configure CLI**: `aws configure` (enter Access Key ID and Secret)
3. **Deploy**:
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://stock-management-frontend/ --delete
```

**Note**: PEM files are for EC2 SSH access, NOT for S3. S3 uses AWS Access Keys for CLI.

**Frontend URL**: `http://stock-management-frontend.s3-website-us-east-1.amazonaws.com`

---

## Backend: EC2 Deployment (15 minutes)

### 1. Launch EC2 Instance
- **AMI**: Amazon Linux 2023
- **Type**: t2.micro (Free tier)
- **Storage**: 8GB root + 5GB data volume
- **Security Group**: 
  - SSH (22) from My IP
  - Custom TCP (3001) from 0.0.0.0/0

### 2. SSH and Setup
```bash
ssh -i your-key.pem ec2-user@YOUR-EC2-IP

# Run setup script
wget https://raw.githubusercontent.com/your-repo/main/backend/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh

# Log out and back in for Docker group
exit
ssh -i your-key.pem ec2-user@YOUR-EC2-IP
```

### 3. Mount 5GB Volume
```bash
# Find volume (usually /dev/xvdf or /dev/nvme1n1)
lsblk

# Format and mount
sudo mkfs -t xfs /dev/xvdf
sudo mkdir /data
sudo mount /dev/xvdf /data
echo '/dev/xvdf /data xfs defaults,nofail 0 2' | sudo tee -a /etc/fstab
sudo chown ec2-user:ec2-user /data
```

### 4. Setup PostgreSQL
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE stock_management;
CREATE USER stock_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE stock_management TO stock_user;
\q
```

```bash
# Configure PostgreSQL
sudo vi /var/lib/pgsql/15/data/postgresql.conf
# Set: listen_addresses = '*'

sudo vi /var/lib/pgsql/15/data/pg_hba.conf
# Add: host    all    all    0.0.0.0/0    md5

sudo systemctl restart postgresql-15
```

### 5. Build and Run Docker Container

**Option A: Build on EC2**
```bash
# Transfer code
# On local machine:
cd backend
tar -czf backend.tar.gz --exclude=node_modules --exclude=dist .
scp -i your-key.pem backend.tar.gz ec2-user@YOUR-EC2-IP:/home/ec2-user/

# On EC2:
tar -xzf backend.tar.gz
cd backend
docker build -t stock-backend:latest .
```

**Option B: Use ECR** (Recommended)
```bash
# On local machine:
aws ecr create-repository --repository-name stock-backend --region us-east-1
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR-ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

cd backend
docker build -t stock-backend .
docker tag stock-backend:latest YOUR-ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/stock-backend:latest
docker push YOUR-ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/stock-backend:latest

# On EC2:
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR-ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker pull YOUR-ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/stock-backend:latest
```

### 6. Run Container
```bash
docker run -d \
  --name stock-backend \
  --restart unless-stopped \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://stock_user:your-password@localhost:5432/stock_management?schema=public" \
  -e JWT_SECRET="your-super-secret-jwt-key" \
  -e PORT=3001 \
  -e NODE_ENV=production \
  -e CORS_ORIGIN="http://stock-management-frontend.s3-website-us-east-1.amazonaws.com" \
  stock-backend:latest
```

### 7. Run Migrations
```bash
docker exec -it stock-backend npx prisma migrate deploy
docker exec -it stock-backend npm run db:seed:prod
```

### 8. Update Frontend API URL
```bash
# On local machine
cd frontend
echo "VITE_API_BASE_URL=http://YOUR-EC2-IP:3001/api" > .env.production
npm run build
aws s3 sync dist/ s3://stock-management-frontend/ --delete
```

---

## Verify Deployment

1. **Frontend**: Visit S3 website endpoint
2. **Backend Health**: `curl http://YOUR-EC2-IP:3001/health`
3. **API Test**: `curl http://YOUR-EC2-IP:3001/api`

---

## Common Commands

```bash
# View logs
docker logs -f stock-backend

# Restart backend
docker restart stock-backend

# Database backup
pg_dump -U stock_user stock_management > /data/backup.sql

# Update application
docker stop stock-backend
docker rm stock-backend
# Rebuild and run (see step 5-6)
```

---

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Use strong JWT_SECRET
- [ ] Restrict PostgreSQL port (5432) to EC2 security group only
- [ ] Consider using Application Load Balancer with HTTPS
- [ ] Set up CloudFront for frontend HTTPS
- [ ] Enable CloudWatch monitoring
- [ ] Set up automated backups

---

## Cost Estimate

- **EC2 t2.micro**: Free (12 months) / ~$8.50/month after
- **S3**: Free tier / ~$0.023/GB/month after
- **EBS 5GB**: ~$0.50/month
- **Data Transfer**: First 1GB free / $0.09/GB after

**Total**: ~$0.50-2/month (free tier) / ~$10-15/month (after free tier)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't access backend | Check security group, verify port 3001 is open |
| Database connection error | Verify PostgreSQL is running, check DATABASE_URL |
| CORS errors | Update CORS_ORIGIN with correct frontend URL |
| Container won't start | Check logs: `docker logs stock-backend` |
| Out of memory | t2.micro has 1GB RAM, consider upgrading or optimizing |

---

## Next Steps

1. Set up CloudFront for HTTPS frontend
2. Configure Application Load Balancer for backend
3. Set up Route 53 for custom domain
4. Enable CloudWatch monitoring
5. Set up automated backups
6. Configure CI/CD pipeline

For detailed instructions, see [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md).

