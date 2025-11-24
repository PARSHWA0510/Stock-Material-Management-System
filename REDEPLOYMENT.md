# 🔄 Redeployment Guide

Quick guide for redeploying Frontend and Backend after making code changes.

---

## 📋 Prerequisites

- AWS CLI configured on local machine
- SSH access to EC2 instance
- S3 bucket name: `stock-management-frontend-773827705954`
- EC2 IP: `34.239.172.85`
- PEM file path: `/Users/aubergine/Desktop/stock-mgmt/stock-mgmt.pem`

---

## 🎨 Frontend Redeployment

### When to redeploy:
- Any changes to React components, pages, or services
- Changes to frontend configuration
- Updates to API endpoints or service files

### Steps:

#### 1. Update API URL (if needed)
```bash
cd frontend

# Check current API URL
cat .env.production

# Update if backend IP changed
echo "VITE_API_BASE_URL=http://34.239.172.85:3001/api" > .env.production
```

#### 2. Build Frontend
```bash
# Install dependencies (if package.json changed)
npm install

# Build for production
npm run build

# Verify build was successful
ls -la dist/
```

#### 3. Deploy to S3
```bash
# Option A: Using AWS CLI
aws s3 sync dist/ s3://stock-management-frontend-773827705954/ --delete \
  --region us-east-1 \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html"

# Upload HTML files with no cache (for React Router)
aws s3 sync dist/ s3://stock-management-frontend-773827705954/ \
  --delete \
  --region us-east-1 \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html"

# Option B: Using deploy script
./deploy-frontend-s3.sh stock-management-frontend-773827705954 us-east-1
```

#### 4. Verify Deployment
- Visit: `http://stock-management-frontend-773827705954.s3-website-us-east-1.amazonaws.com`
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R) if changes don't appear
- Check browser console for errors

---

## ⚙️ Backend Redeployment

### When to redeploy:
- Changes to backend code (controllers, routes, services)
- Updates to package.json dependencies
- Changes to Dockerfile or docker-entrypoint.sh
- Environment variable changes

### Steps:

#### 1. Transfer Updated Code to EC2

**On Local Machine:**
```bash
cd backend

# Create archive (exclude node_modules, dist, .env)
tar -czf ../backend.tar.gz \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.env \
  --exclude='*.tar.gz' \
  .

# Transfer to EC2
scp -i /Users/aubergine/Desktop/stock-mgmt/stock-mgmt.pem \
  ../backend.tar.gz \
  ec2-user@34.239.172.85:/home/ec2-user/
```

#### 2. On EC2 - Extract and Rebuild

**SSH into EC2:**
```bash
ssh -i /Users/aubergine/Desktop/stock-mgmt/stock-mgmt.pem ec2-user@34.239.172.85
```

**On EC2:**
```bash
# Stop and remove current container
docker stop stock-backend
docker rm stock-backend

# Extract new code
cd ~
tar -xzf backend.tar.gz

# Rebuild Docker image
docker build -t stock-management-backend:latest .

# Run new container
docker run -d \
  --name stock-backend \
  --restart unless-stopped \
  --network host \
  --env-file ~/.env \
  stock-management-backend:latest
```

#### 3. Run Database Migrations (if schema changed)

```bash
# Check if migrations are needed
docker exec -it stock-backend npx prisma migrate status

# Run migrations
docker exec -it stock-backend npx prisma migrate deploy

# If new migrations were created, they'll run automatically
```

#### 4. Verify Backend is Running

```bash
# Check container status
docker ps

# Check logs
docker logs stock-backend

# Test health endpoint
curl http://localhost:3001/health

# Test API endpoint
curl http://localhost:3001/api
```

---

## 🔄 Full Stack Redeployment

When both frontend and backend need updates:

### Quick Script:

**On Local Machine:**
```bash
#!/bin/bash
# Save as redeploy.sh

echo "🔄 Starting Full Stack Redeployment..."

# Frontend
echo "📦 Building Frontend..."
cd frontend
npm run build
aws s3 sync dist/ s3://stock-management-frontend-773827705954/ --delete --region us-east-1
echo "✅ Frontend deployed"

# Backend
echo "📦 Preparing Backend..."
cd ../backend
tar -czf ../backend.tar.gz --exclude=node_modules --exclude=dist --exclude=.env --exclude='*.tar.gz' .
scp -i /Users/aubergine/Desktop/stock-mgmt/stock-mgmt.pem ../backend.tar.gz ec2-user@34.239.172.85:/home/ec2-user/
echo "✅ Backend code transferred"

echo "📝 Next steps on EC2:"
echo "1. ssh -i /Users/aubergine/Desktop/stock-mgmt/stock-mgmt.pem ec2-user@34.239.172.85"
echo "2. docker stop stock-backend && docker rm stock-backend"
echo "3. cd ~ && tar -xzf backend.tar.gz"
echo "4. docker build -t stock-management-backend:latest ."
echo "5. docker run -d --name stock-backend --restart unless-stopped --network host --env-file ~/.env stock-management-backend:latest"
```

---

## 🔧 Common Scenarios

### Scenario 1: Only Frontend Changes
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://stock-management-frontend-773827705954/ --delete --region us-east-1
```

### Scenario 2: Only Backend Code Changes (No DB changes)
```bash
# Transfer and rebuild (see Backend Redeployment section)
# No need to run migrations
```

### Scenario 3: Backend + Database Schema Changes
```bash
# 1. Update Prisma schema locally
# 2. Create migration: npx prisma migrate dev --name your-migration-name
# 3. Transfer code to EC2
# 4. Rebuild Docker image
# 5. Run: docker exec -it stock-backend npx prisma migrate deploy
```

### Scenario 4: Environment Variable Changes

**Backend:**
```bash
# On EC2
nano ~/.env
# Make changes, save

# Restart container
docker restart stock-backend
```

**Frontend:**
```bash
# On local machine
cd frontend
nano .env.production
# Make changes, save

# Rebuild and redeploy
npm run build
aws s3 sync dist/ s3://stock-management-frontend-773827705954/ --delete --region us-east-1
```

### Scenario 5: Package Dependency Updates

**Backend:**
```bash
# Update package.json locally
# Transfer code to EC2
# Rebuild Docker image (will install new dependencies)
```

**Frontend:**
```bash
# Update package.json
npm install
npm run build
aws s3 sync dist/ s3://stock-management-frontend-773827705954/ --delete --region us-east-1
```

---

## 🐛 Troubleshooting

### Frontend not updating on S3
- Clear browser cache (Ctrl+Shift+R)
- Check S3 bucket - verify files were uploaded
- Check CloudFront cache (if using) - may need invalidation

### Backend container won't start
```bash
# Check logs
docker logs stock-backend

# Check if port is in use
sudo netstat -tlnp | grep 3001

# Check environment variables
docker exec stock-backend env | grep DATABASE_URL
```

### Database connection errors
```bash
# Verify PostgreSQL is running
sudo netstat -tlnp | grep 5432

# Test connection from container
docker exec -it stock-backend psql $DATABASE_URL -c "SELECT 1;"
```

### CORS errors
- Verify `CORS_ORIGIN` in `~/.env` includes S3 bucket URL
- Restart backend container after changing CORS_ORIGIN
- Check browser console for exact CORS error message

---

## 📝 Quick Reference Commands

### Frontend
```bash
# Build
cd frontend && npm run build

# Deploy
aws s3 sync dist/ s3://stock-management-frontend-773827705954/ --delete --region us-east-1
```

### Backend
```bash
# Transfer code
cd backend && tar -czf ../backend.tar.gz --exclude=node_modules --exclude=dist --exclude=.env .
scp -i /path/to/pem backend.tar.gz ec2-user@34.239.172.85:/home/ec2-user/

# On EC2 - Rebuild
docker stop stock-backend && docker rm stock-backend
cd ~ && tar -xzf backend.tar.gz
docker build -t stock-management-backend:latest .
docker run -d --name stock-backend --restart unless-stopped --network host --env-file ~/.env stock-management-backend:latest
```

### Database
```bash
# Run migrations
docker exec -it stock-backend npx prisma migrate deploy

# Check migration status
docker exec -it stock-backend npx prisma migrate status
```

---

## 🔐 Security Notes

- Never commit `.env` files to git
- Use strong passwords in production
- Regularly update dependencies
- Keep EC2 security groups restricted
- Use HTTPS (CloudFront) for production

---

## 📞 Quick Help

**EC2 SSH:**
```bash
ssh -i /Users/aubergine/Desktop/stock-mgmt/stock-mgmt.pem ec2-user@34.239.172.85
```

**Check Backend Logs:**
```bash
docker logs -f stock-backend
```

**Check Frontend URL:**
```
http://stock-management-frontend-773827705954.s3-website-us-east-1.amazonaws.com
```

**Backend API:**
```
http://34.239.172.85:3001/api
```

---

**Last Updated:** November 2024

