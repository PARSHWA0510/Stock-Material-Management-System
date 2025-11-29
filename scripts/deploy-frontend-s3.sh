#!/bin/bash

# Frontend S3 Deployment Script
# Usage: ./deploy-frontend-s3.sh [bucket-name] [region]

set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Configuration (with defaults)
BUCKET_NAME=${1:-"${S3_BUCKET:-stock-management-frontend}"}
REGION=${2:-"${S3_REGION:-us-east-1}"}

echo "🚀 Deploying Frontend to S3"
echo "============================"
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    echo "   Visit: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if bucket exists
if ! aws s3 ls "s3://$BUCKET_NAME" 2>&1 > /dev/null; then
    echo "⚠️  Bucket '$BUCKET_NAME' does not exist or is not accessible."
    echo "   Please create it first in AWS Console or run:"
    echo "   aws s3 mb s3://$BUCKET_NAME --region $REGION"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REply =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build failed! dist directory not found."
    exit 1
fi

echo "📤 Uploading to S3..."
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
    --delete \
    --region "$REGION" \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "*.html"

# Upload HTML files with no cache
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
    --delete \
    --region "$REGION" \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your frontend is available at:"
echo "   http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo ""
echo "💡 To set up CloudFront distribution, see AWS_DEPLOYMENT.md"

