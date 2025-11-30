#!/bin/bash

# Quick Redeployment Script
# Usage: ./redeploy.sh [frontend|backend|all] [--subpath SUBPATH] [--update-cors]
#   --subpath: Deploy frontend with subpath (e.g., stock-management)
#   --update-cors: Update backend CORS configuration

set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

# Configuration (load from .env, no hardcoded defaults)
S3_BUCKET="${S3_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
EC2_IP="${EC2_IP:-}"
EC2_USER="${EC2_USER:-ec2-user}"
PEM_FILE="${PEM_FILE:-}"
SUBPATH="${SUBPATH:-stock-management}"
UPDATE_CORS=false
DEPLOY_TARGET="all"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --subpath)
            SUBPATH="$2"
            shift 2
            ;;
        --update-cors)
            UPDATE_CORS=true
            shift
            ;;
        frontend|backend|all)
            DEPLOY_TARGET="$1"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate required variables
if [ -z "$PEM_FILE" ] || [ -z "$EC2_IP" ] || [ -z "$S3_BUCKET" ]; then
    echo "❌ Error: Required variables not set in .env file"
    echo "   Please create .env file and set: PEM_FILE, EC2_IP, S3_BUCKET"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

deploy_frontend() {
    echo -e "${YELLOW}📦 Deploying Frontend...${NC}"
    cd "$PROJECT_DIR/frontend"
    
    echo "Installing dependencies..."
    npm install
    
    echo "Building frontend..."
    npm run build
    
    if [ ! -d "dist" ]; then
        echo -e "${RED}❌ Build failed! dist directory not found.${NC}"
        exit 1
    fi
    
    # Handle subpath deployment
    if [ -n "$SUBPATH" ]; then
        echo "Creating subpath structure..."
        mkdir -p dist-temp/$SUBPATH
        cp -r dist/* dist-temp/$SUBPATH/
        SYNC_SOURCE="dist-temp/"
    else
        SYNC_SOURCE="dist/"
    fi
    
    echo "Uploading to S3..."
    # Upload assets with long cache
    aws s3 sync "$SYNC_SOURCE" "s3://${S3_BUCKET}/" \
        --delete \
        --region "$S3_REGION" \
        --cache-control "public, max-age=31536000, immutable" \
        --exclude "*.html"
    
    # Upload HTML files with no cache
    aws s3 sync "$SYNC_SOURCE" "s3://${S3_BUCKET}/" \
        --delete \
        --region "$S3_REGION" \
        --cache-control "public, max-age=0, must-revalidate" \
        --include "*.html"
    
    # Cleanup temp directory if used
    if [ -n "$SUBPATH" ]; then
        rm -rf dist-temp
    fi
    
    echo -e "${GREEN}✅ Frontend deployed to S3${NC}"
    if [ -n "$SUBPATH" ] && [ ! -z "${DOMAIN:-}" ]; then
        echo "URL: https://${DOMAIN}/${SUBPATH}/login"
    else
        echo "URL: http://${S3_BUCKET}.s3-website-${S3_REGION}.amazonaws.com"
    fi
    
    # Invalidate CloudFront if distribution ID is set
    if [ ! -z "${FRONTEND_DIST_ID:-}" ]; then
        echo "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id "$FRONTEND_DIST_ID" \
            --paths "/*" \
            --query 'Invalidation.{Id:Id,Status:Status}' \
            --output json > /dev/null 2>&1 || true
        echo "CloudFront invalidation requested"
    fi
}

update_backend_cors() {
    echo -e "${YELLOW}🔧 Updating Backend CORS Configuration...${NC}"
    
    # Build CORS origins list
    CORS_ORIGINS="https://www.dharaelectricals.com,https://dharaelectricals.com"
    if [ ! -z "${API_DOMAIN:-}" ]; then
        CORS_ORIGINS="${CORS_ORIGINS},https://${API_DOMAIN}"
    fi
    CORS_ORIGINS="${CORS_ORIGINS},http://localhost:5173"
    
    ssh -i "$PEM_FILE" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "${EC2_USER}@${EC2_IP}" << EOF
        # Update .env file with CORS origins
        if [ -f ~/.env ]; then
            # Remove old CORS_ORIGIN if exists
            sed -i '/^CORS_ORIGIN=/d' ~/.env
            
            # Add new CORS origins
            echo "CORS_ORIGIN=${CORS_ORIGINS}" >> ~/.env
            
            echo "✅ CORS updated in .env file"
        else
            echo "❌ .env file not found"
            exit 1
        fi
EOF
    
    echo -e "${GREEN}✅ CORS configuration updated${NC}"
}

deploy_backend() {
    echo -e "${YELLOW}📦 Deploying Backend...${NC}"
    cd "$PROJECT_DIR/backend"
    
    echo "Creating archive..."
    tar -czf /tmp/backend-update.tar.gz \
        --exclude=node_modules \
        --exclude=dist \
        --exclude=.env \
        --exclude='*.tar.gz' \
        --exclude='.git' \
        .
    
    echo "Transferring to EC2..."
    scp -i "$PEM_FILE" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        /tmp/backend-update.tar.gz \
        "${EC2_USER}@${EC2_IP}:/tmp/"
    
    # Update CORS if requested
    if [ "$UPDATE_CORS" = true ]; then
        update_backend_cors
    fi
    
    echo "Rebuilding and restarting backend on EC2..."
    ssh -i "$PEM_FILE" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "${EC2_USER}@${EC2_IP}" << 'EOF'
        set -e
        
        # Extract updated code
        cd /tmp
        tar -xzf backend-update.tar.gz
        
        # Rebuild Docker image
        echo "Rebuilding Docker image..."
        docker build -t stock-management-backend:latest .
        
        # Stop and remove old container
        if docker ps -a --format '{{.Names}}' | grep -q "^stock-backend$"; then
            echo "Stopping old container..."
            docker stop stock-backend
            docker rm stock-backend
        fi
        
        # Run new container
        echo "Starting new container..."
        docker run -d \
            --name stock-backend \
            --restart unless-stopped \
            --network host \
            --env-file ~/.env \
            stock-management-backend:latest
        
        echo "✅ Backend updated and restarted"
        
        # Cleanup
        rm -rf /tmp/backend-update.tar.gz /tmp/src /tmp/package.json /tmp/tsconfig.json /tmp/Dockerfile /tmp/prisma 2>/dev/null || true
EOF
    
    rm -f /tmp/backend-update.tar.gz
    
    echo -e "${GREEN}✅ Backend deployed and restarted${NC}"
    echo -e "${YELLOW}⏳ Wait 1-2 minutes for container to start, then test${NC}"
}

deploy_all() {
    echo -e "${BLUE}🚀 Full Stack Redeployment${NC}"
    deploy_frontend
    echo ""
    deploy_backend
}

# Main
case "$DEPLOY_TARGET" in
    frontend)
        deploy_frontend
        ;;
    backend)
        deploy_backend
        ;;
    all)
        deploy_all
        ;;
    *)
        echo "Usage: $0 [frontend|backend|all] [--subpath SUBPATH] [--update-cors]"
        echo "  frontend   - Deploy only frontend to S3"
        echo "  backend    - Deploy backend to EC2 (automatic rebuild)"
        echo "  all        - Deploy both frontend and backend (default)"
        echo ""
        echo "Options:"
        echo "  --subpath SUBPATH  - Deploy frontend with subpath (default: stock-management)"
        echo "  --update-cors      - Update backend CORS configuration"
        exit 1
        ;;
esac

echo -e "${GREEN}✅ Deployment complete!${NC}"

