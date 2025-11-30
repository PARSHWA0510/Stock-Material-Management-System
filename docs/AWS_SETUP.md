# 🏗️ AWS Infrastructure Setup - Complete Guide

This document explains the complete AWS infrastructure setup for the Stock Material Management System, how everything works together, and how to maintain it.

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              CloudFront Distribution (Frontend)              │
│  Domain: www.dharaelectricals.com/stock-management          │
│  Certificate: ACM (us-east-1)                               │
│  Origin: S3 Bucket (Static Website)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              CloudFront Distribution (API)                   │
│  Domain: api.dharaelectricals.com                            │
│  Certificate: ACM (us-east-1)                                │
│  Origin: EC2 Instance (Port 3001)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    EC2 Instance (t2.micro)                  │
│  - Backend API (Docker, Port 3001)                          │
│  - PostgreSQL Database (Docker, Port 5432)                  │
│  - Public IP: 3.233.213.242                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Components Breakdown

### 1. **Frontend Infrastructure**

#### **S3 Bucket** (`stock-management-frontend-773827705954`)
- **Purpose**: Hosts static frontend files (HTML, CSS, JS)
- **Region**: `us-east-1`
- **Configuration**:
  - Static website hosting enabled
  - Public read access
  - Files deployed to `/stock-management/` subpath
- **Deployment**: Files are synced to S3 with proper cache headers

#### **CloudFront Distribution (Frontend)**
- **Domain**: `www.dharaelectricals.com` and `dharaelectricals.com`
- **Path**: `/stock-management/*`
- **SSL Certificate**: ACM certificate (wildcard: `*.dharaelectricals.com`)
- **Origin**: S3 bucket website endpoint
- **Features**:
  - HTTPS redirect
  - Custom error responses (403/404 → 200 with index.html)
  - CDN caching
  - Subpath routing (handled by S3 structure)

#### **Route 53 / DNS Provider (GoDaddy)**
- **A Record**: `@` → CloudFront distribution (frontend)
- **CNAME Record**: `www` → CloudFront distribution (frontend)
- **CNAME Record**: `api` → CloudFront distribution (API)

---

### 2. **Backend Infrastructure**

#### **EC2 Instance**
- **Type**: `t2.micro` (Free tier eligible)
- **OS**: Amazon Linux 2023
- **Public IP**: `3.233.213.242`
- **Public DNS**: `ec2-3-233-213-242.compute-1.amazonaws.com`
- **Services Running**:
  - **Backend API**: Docker container on port 3001
  - **PostgreSQL**: Docker container on port 5432
- **Security Group**:
  - SSH (22) from your IP
  - Custom TCP (3001) from CloudFront IPs
  - PostgreSQL (5432) from localhost only

#### **CloudFront Distribution (API)**
- **Domain**: `api.dharaelectricals.com`
- **SSL Certificate**: Same ACM certificate (wildcard)
- **Origin**: EC2 public DNS name on port 3001
- **Configuration**:
  - HTTPS to HTTP (CloudFront → EC2)
  - CORS headers forwarded
  - No caching for API requests
  - All HTTP methods allowed

#### **PostgreSQL Database**
- **Container**: Docker container on EC2
- **Port**: 5432 (internal only)
- **Database**: `stock_management`
- **User**: `stock_user`
- **Connection**: Only accessible from EC2 instance

---

### 3. **SSL Certificate (ACM)**

- **Region**: `us-east-1` (required for CloudFront)
- **Domains**:
  - `dharaelectricals.com`
  - `*.dharaelectricals.com` (wildcard for subdomains)
- **Status**: Issued and validated
- **Usage**: Both CloudFront distributions use this certificate

---

## 🔄 How It Works

### **User Request Flow**

1. **User visits**: `https://www.dharaelectricals.com/stock-management/login`
2. **DNS Resolution**: GoDaddy/Route 53 resolves to CloudFront distribution
3. **CloudFront (Frontend)**:
   - Validates SSL certificate
   - Checks cache for static assets
   - If not cached, fetches from S3 bucket
   - Returns HTML/CSS/JS to browser
4. **Frontend Loads**: React app initializes
5. **API Calls**: Frontend makes requests to `https://api.dharaelectricals.com/api/*`
6. **CloudFront (API)**:
   - Validates SSL certificate
   - Forwards request to EC2 instance (HTTP on port 3001)
   - EC2 backend processes request
   - Response flows back through CloudFront to browser

### **CORS Configuration**

The backend CORS is configured to:
- Allow requests from `dharaelectricals.com` domains
- Return the actual `Origin` header (not `*`) when `credentials: true`
- Forward necessary headers through CloudFront
- Handle preflight OPTIONS requests

---

## 📁 File Structure & Configuration

### **Frontend Configuration**

**`frontend/vite.config.ts`**:
```typescript
base: process.env.VITE_BASE_PATH || '/stock-management/'
```

**`frontend/src/App.tsx`**:
```typescript
const basePath = import.meta.env.VITE_BASE_PATH || '/stock-management';
<Router basename={basePath}>
```

**`frontend/.env.production`**:
```
VITE_BASE_PATH=/stock-management
VITE_API_BASE_URL=https://api.dharaelectricals.com/api
```

### **Backend Configuration**

**`backend/src/index.ts`**:
- CORS configured to allow `dharaelectricals.com` domains
- Returns actual origin (not `*`) for credentials
- Handles OPTIONS preflight requests

**EC2 `.env` file**:
```
DATABASE_URL=postgresql://stock_user:password@localhost:5432/stock_management
CORS_ORIGIN=https://www.dharaelectricals.com,https://dharaelectricals.com,https://api.dharaelectricals.com
PORT=3001
```

---

## 🛠️ Maintenance & Operations

### **Deploying Frontend Updates**

```bash
# Using redeploy script (recommended)
./scripts/redeploy.sh frontend --subpath stock-management

# Or manual deployment
cd frontend
npm install
npm run build
# Then sync to S3 manually if needed
```

**What happens**:
1. Frontend builds with base path `/stock-management`
2. Files are uploaded to `s3://bucket/stock-management/`
3. CloudFront cache can be invalidated (optional)

### **Deploying Backend Updates**

```bash
# Option 1: Using redeploy script (recommended)
./scripts/redeploy.sh backend --update-cors

# Option 2: Manual
cd backend
tar -czf ../backend.tar.gz --exclude=node_modules --exclude=dist .
scp -i ~/.ssh/key.pem backend.tar.gz ec2-user@3.233.213.242:~/
# Then SSH and rebuild Docker container
```

**What happens**:
1. Backend code is packaged and transferred to EC2
2. Docker container is rebuilt
3. Old container is stopped and removed
4. New container starts with updated code
5. CORS configuration is updated if `--update-cors` flag is used

### **Updating CORS Configuration**

```bash
# Via redeploy script
./scripts/redeploy.sh backend --update-cors

# Or manually on EC2
ssh -i ~/.ssh/key.pem ec2-user@3.233.213.242
# Edit ~/.env file
# Restart Docker container
docker restart stock-backend
```

### **Adding Subdomains to CloudFront**

If you need to add additional subdomains to your CloudFront distribution:

1. **Via AWS Console**:
   - Go to CloudFront → Your distribution → General tab
   - Click "Edit" → Add domain to "Alternate domain names (CNAMEs)"
   - Save changes (takes 15-20 minutes to deploy)

2. **Via AWS CLI**:
   ```bash
   # Get current config
   aws cloudfront get-distribution-config --id E139J8TNQ7OOE7 > dist-config.json
   
   # Edit JSON to add subdomain to Aliases.Items array
   # Then update:
   aws cloudfront update-distribution \
     --id E139J8TNQ7OOE7 \
     --if-match ETAG \
     --distribution-config file://dist-config.json
   ```

### **Invalidating CloudFront Cache**

```bash
# Frontend cache
aws cloudfront create-invalidation \
  --distribution-id E139J8TNQ7OOE7 \
  --paths "/*"

# API cache (rarely needed)
aws cloudfront create-invalidation \
  --distribution-id E2UD1YRMPDWISO \
  --paths "/api/*"
```

### **Managing EC2 Instance**

```bash
# Start EC2 instance
./scripts/start-ec2.sh

# Stop EC2 instance
./scripts/stop-ec2.sh

# Connect to database (via SSH tunnel)
./scripts/connect-pgadmin.sh
```

---

## 🔐 Security Configuration

### **SSL/TLS**
- ✅ HTTPS enforced via CloudFront
- ✅ ACM certificate (wildcard) covers all subdomains
- ✅ TLS 1.2+ required

### **CORS**
- ✅ Only `dharaelectricals.com` domains allowed
- ✅ Credentials enabled (cookies/auth tokens)
- ✅ Preflight requests handled

### **Network Security**
- ✅ EC2 security group restricts access
- ✅ PostgreSQL only accessible from EC2
- ✅ Backend API behind CloudFront (not directly exposed)

### **Environment Variables**
- ✅ Sensitive data in `.env` files (not committed)
- ✅ Database credentials secured
- ✅ API keys stored securely

---

## 📊 Environment Variables Reference

### **Project Root `.env`**
```bash
# AWS Configuration
S3_BUCKET=stock-management-frontend-773827705954
S3_REGION=us-east-1
CERT_ARN=arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID
DOMAIN=dharaelectricals.com
SUBPATH=stock-management

# EC2 Configuration
EC2_IP=3.233.213.242
EC2_USER=ec2-user
PEM_FILE=/path/to/your-key.pem

# CloudFront Distribution IDs
FRONTEND_DIST_ID=E139J8TNQ7OOE7
API_DIST_ID=E2UD1YRMPDWISO

# API Domain
API_DOMAIN=api.dharaelectricals.com
```

### **Frontend `.env.production`**
```bash
VITE_BASE_PATH=/stock-management
VITE_API_BASE_URL=https://api.dharaelectricals.com/api
```

### **EC2 `.env` (on server)**
```bash
DATABASE_URL=postgresql://stock_user:PASSWORD@localhost:5432/stock_management
CORS_ORIGIN=https://www.dharaelectricals.com,https://dharaelectricals.com,https://api.dharaelectricals.com
PORT=3001
NODE_ENV=production
```

---

## 🐛 Troubleshooting

### **Frontend Issues**

**Problem**: 404 errors on routes
- **Solution**: Check S3 deployment has files in `/stock-management/` subpath
- **Check**: Verify `VITE_BASE_PATH` is set correctly

**Problem**: CSS/JS not loading
- **Solution**: Rebuild frontend and redeploy
- **Check**: Verify CloudFront cache is invalidated

**Problem**: Mixed content warnings
- **Solution**: Ensure all API calls use HTTPS (`https://api.dharaelectricals.com`)

### **Backend Issues**

**Problem**: CORS errors
- **Solution**: Update CORS configuration on EC2
- **Check**: Verify `CORS_ORIGIN` in EC2 `.env` includes your domain
- **Check**: Backend returns actual origin (not `*`) when credentials enabled

**Problem**: API timeout
- **Solution**: Check EC2 instance is running
- **Check**: Verify security group allows CloudFront IPs
- **Check**: Docker container is running

**Problem**: Database connection errors
- **Solution**: Check PostgreSQL container is running
- **Check**: Verify `DATABASE_URL` in EC2 `.env`

### **CloudFront Issues**

**Problem**: Distribution not updating
- **Solution**: Wait 15-20 minutes for deployment
- **Check**: Verify distribution status in AWS Console

**Problem**: SSL certificate errors
- **Solution**: Verify certificate is in `us-east-1` region
- **Check**: Certificate status is "Issued"

---

## 📝 Key Scripts Reference

### **Deployment Scripts**

| Script | Purpose | Usage |
|--------|---------|-------|
| `redeploy.sh` | Main deployment script | `./scripts/redeploy.sh [frontend\|backend\|all] [--subpath PATH] [--update-cors]` |

### **Management Scripts**

| Script | Purpose | Usage |
|--------|---------|-------|
| `start-ec2.sh` | Start EC2 instance | `./scripts/start-ec2.sh` |
| `stop-ec2.sh` | Stop EC2 instance | `./scripts/stop-ec2.sh` |
| `connect-pgadmin.sh` | Connect to database | `./scripts/connect-pgadmin.sh` |

---

## 🔄 Update Workflow

### **Typical Update Process**

1. **Make code changes** (frontend or backend)
2. **Test locally**
3. **Deploy**:
   ```bash
   # Frontend update
   ./scripts/redeploy.sh frontend --subpath stock-management
   
   # Backend update
   ./scripts/redeploy.sh backend --update-cors
   
   # Both
   ./scripts/redeploy.sh all --subpath stock-management --update-cors
   ```
4. **Verify**:
   - Frontend: Visit `https://www.dharaelectricals.com/stock-management/login`
   - API: Check browser console for API calls
   - Database: Verify data integrity

---

## 💰 Cost Estimate

- **EC2 t2.micro**: Free tier (750 hours/month) or ~$8.50/month
- **S3 Storage**: ~$0.023/GB/month (minimal for static files)
- **S3 Requests**: ~$0.0004/1000 requests
- **CloudFront**: First 1TB free, then ~$0.085/GB
- **Route 53**: $0.50/hosted zone/month + $0.40/million queries
- **ACM**: Free
- **Data Transfer**: Varies by usage

**Estimated Total**: ~$10-20/month for low-medium traffic

---

## ✅ Current Status

- ✅ Frontend deployed to S3 with subpath structure
- ✅ CloudFront distribution (frontend) configured with HTTPS
- ✅ CloudFront distribution (API) configured with HTTPS
- ✅ SSL certificate issued and validated
- ✅ DNS configured (GoDaddy)
- ✅ Backend running on EC2 with Docker
- ✅ PostgreSQL database running on EC2
- ✅ CORS properly configured
- ✅ All routes working: `https://www.dharaelectricals.com/stock-management/*`

---

## 📚 Additional Resources

- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [AWS Certificate Manager](https://docs.aws.amazon.com/acm/)

---

## 🎯 Quick Reference

**Frontend URL**: `https://www.dharaelectricals.com/stock-management/login`  
**API URL**: `https://api.dharaelectricals.com/api`  
**EC2 IP**: `3.233.213.242`  
**S3 Bucket**: `stock-management-frontend-773827705954`  
**Frontend CloudFront ID**: `E139J8TNQ7OOE7`  
**API CloudFront ID**: `E2UD1YRMPDWISO`

---

*Last Updated: Current setup as of deployment*  
*All infrastructure is operational and tested*

