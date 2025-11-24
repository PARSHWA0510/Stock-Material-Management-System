# 🚀 Deployment Guide

This guide covers deployment options for the Stock Material Management System.

## 🎯 Recommended: AWS Deployment

For production deployment, we recommend AWS:
- **Frontend**: AWS S3 + CloudFront
- **Backend**: Docker container on EC2 t2.micro
- **Database**: PostgreSQL on EC2

👉 **See [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md) for complete step-by-step instructions.**

### Quick Start (AWS)

1. **Frontend on S3**:
   ```bash
   chmod +x deploy-frontend-s3.sh
   ./deploy-frontend-s3.sh your-bucket-name us-east-1
   ```

2. **Backend on EC2**:
   - Launch EC2 t2.micro instance
   - Run setup script: `./backend/ec2-setup.sh`
   - Build and deploy Docker container
   - See AWS_DEPLOYMENT.md for details

---

## Alternative: Render + Vercel Deployment

## Backend Deployment on Render

### 1. Prepare Backend
- ✅ Updated package.json with production scripts
- ✅ Added `postinstall` script for Prisma generation
- ✅ Added `db:migrate:deploy` for production migrations

### 2. Environment Variables for Render
Create these environment variables in Render dashboard:

```
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### 3. Render Configuration
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18.x or higher

---

## Frontend Deployment on Vercel

### 1. Environment Variables for Vercel
Create these environment variables in Vercel dashboard:

```
VITE_API_BASE_URL=https://your-backend-domain.onrender.com/api
```

### 2. Vercel Configuration
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x or higher

---

## Step-by-Step Deployment

### Backend on Render:
1. Push code to GitHub
2. Connect GitHub repo to Render
3. Create PostgreSQL database on Render
4. Set environment variables
5. Deploy

### Frontend on Vercel:
1. Connect GitHub repo to Vercel
2. Set environment variables
3. Deploy

---

## Database Setup
After backend deployment:
1. Run migrations: `npx prisma migrate deploy`
2. Seed data: `npm run db:seed`
3. Populate stock: `npm run db:populate-stock`

---

## Environment Variables Reference

### Backend (.env)
```bash
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:5173,https://your-frontend-domain.com
```

### Frontend (.env.production)
```bash
VITE_API_BASE_URL=http://your-backend-url:3001/api
# Or for HTTPS: https://your-backend-domain.com/api
```

---

## Docker Deployment

The backend includes a Dockerfile for containerized deployment.

### Build Docker Image
```bash
cd backend
docker build -t stock-management-backend:latest .
```

### Run Docker Container
```bash
docker run -d \
  --name stock-backend \
  --restart unless-stopped \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret" \
  -e PORT=3001 \
  -e NODE_ENV=production \
  -e CORS_ORIGIN="https://your-frontend.com" \
  stock-management-backend:latest
```

### Run Migrations
```bash
docker exec -it stock-backend npx prisma migrate deploy
docker exec -it stock-backend npm run db:seed:prod
```
