# 🚀 Deployment Guide

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
