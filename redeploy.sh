#!/bin/bash

# Quick Redeployment Script
# Usage: ./redeploy.sh [frontend|backend|all]

set -e

# Configuration
S3_BUCKET="stock-management-frontend-773827705954"
S3_REGION="us-east-1"
EC2_IP="34.239.172.85"
EC2_USER="ec2-user"
PEM_FILE="/Users/aubergine/Desktop/stock-mgmt/stock-mgmt.pem"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

deploy_frontend() {
    echo -e "${YELLOW}📦 Deploying Frontend...${NC}"
    cd "$PROJECT_DIR/frontend"
    
    echo "Building frontend..."
    npm run build
    
    echo "Uploading to S3..."
    aws s3 sync dist/ "s3://${S3_BUCKET}/" \
        --delete \
        --region "$S3_REGION" \
        --cache-control "public, max-age=31536000, immutable" \
        --exclude "*.html"
    
    aws s3 sync dist/ "s3://${S3_BUCKET}/" \
        --delete \
        --region "$S3_REGION" \
        --cache-control "public, max-age=0, must-revalidate" \
        --include "*.html"
    
    echo -e "${GREEN}✅ Frontend deployed to S3${NC}"
    echo "URL: http://${S3_BUCKET}.s3-website-${S3_REGION}.amazonaws.com"
}

deploy_backend() {
    echo -e "${YELLOW}📦 Preparing Backend...${NC}"
    cd "$PROJECT_DIR/backend"
    
    echo "Creating archive..."
    tar -czf ../backend.tar.gz \
        --exclude=node_modules \
        --exclude=dist \
        --exclude=.env \
        --exclude='*.tar.gz' \
        .
    
    echo "Transferring to EC2..."
    scp -i "$PEM_FILE" \
        ../backend.tar.gz \
        "${EC2_USER}@${EC2_IP}:/home/${EC2_USER}/"
    
    echo -e "${GREEN}✅ Backend code transferred${NC}"
    echo -e "${YELLOW}📝 Next steps on EC2:${NC}"
    echo "1. ssh -i $PEM_FILE ${EC2_USER}@${EC2_IP}"
    echo "2. docker stop stock-backend && docker rm stock-backend"
    echo "3. cd ~ && tar -xzf backend.tar.gz"
    echo "4. docker build -t stock-management-backend:latest ."
    echo "5. docker run -d --name stock-backend --restart unless-stopped --network host --env-file ~/.env stock-management-backend:latest"
}

deploy_all() {
    echo -e "${YELLOW}🚀 Full Stack Redeployment${NC}"
    deploy_frontend
    echo ""
    deploy_backend
}

# Main
case "${1:-all}" in
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
        echo "Usage: $0 [frontend|backend|all]"
        echo "  frontend - Deploy only frontend to S3"
        echo "  backend  - Transfer backend code to EC2 (manual rebuild required)"
        echo "  all      - Deploy both frontend and backend (default)"
        exit 1
        ;;
esac

echo -e "${GREEN}✅ Deployment complete!${NC}"

