#!/bin/bash

echo "🚀 Stock Material Management System - Deployment Script"
echo "======================================================"

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository. Please initialize git first."
    exit 1
fi

echo "📋 Deployment Checklist:"
echo "1. ✅ Code is ready for production"
echo "2. ✅ Backend configured for Render"
echo "3. ✅ Frontend configured for Vercel"
echo "4. ✅ Environment variables documented"
echo ""

echo "🔧 Next Steps:"
echo ""
echo "BACKEND DEPLOYMENT (Render):"
echo "1. Push code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Prepare for production deployment'"
echo "   git push origin main"
echo ""
echo "2. Go to https://render.com and:"
echo "   - Create new Web Service"
echo "   - Connect your GitHub repository"
echo "   - Select the backend folder"
echo "   - Set build command: npm run build"
echo "   - Set start command: npm start"
echo "   - Add environment variables (see DEPLOYMENT.md)"
echo "   - Create PostgreSQL database"
echo ""
echo "3. After backend deployment:"
echo "   - Note the backend URL (e.g., https://your-app.onrender.com)"
echo "   - Run database migrations in Render console"
echo "   - Run: npm run db:seed:prod"
echo ""
echo "FRONTEND DEPLOYMENT (Vercel):"
echo "1. Go to https://vercel.com and:"
echo "   - Import your GitHub repository"
echo "   - Set root directory to 'frontend'"
echo "   - Add environment variable:"
echo "     VITE_API_BASE_URL=https://your-backend-url.onrender.com/api"
echo "   - Deploy"
echo ""
echo "2. After frontend deployment:"
echo "   - Update backend CORS_ORIGIN to your Vercel URL"
echo "   - Redeploy backend"
echo ""

echo "📚 For detailed instructions, see DEPLOYMENT.md"
echo "🎉 Happy deploying!"
