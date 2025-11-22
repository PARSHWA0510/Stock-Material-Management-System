#!/bin/bash

# AWS Deployment Script for Stock Management Backend
# This script deploys the backend to AWS Lambda + API Gateway + Aurora Serverless

set -e

echo "🚀 Starting AWS deployment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

# Navigate to terraform directory
cd terraform

# Initialize Terraform
echo "📦 Initializing Terraform..."
terraform init

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo "⚠️  terraform.tfvars not found. Creating from example..."
    cp terraform.tfvars.example terraform.tfvars
    echo "📝 Please edit terraform.tfvars with your actual values before continuing."
    echo "   - Set a secure database password"
    echo "   - Set a secure JWT secret"
    exit 1
fi

# Plan Terraform deployment
echo "📋 Planning Terraform deployment..."
terraform plan

# Ask for confirmation
read -p "Do you want to proceed with the deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

# Apply Terraform
echo "🏗️  Deploying infrastructure..."
terraform apply -auto-approve

# Get API Gateway URL
API_URL=$(terraform output -raw api_gateway_url)
echo "✅ Infrastructure deployed successfully!"
echo "🌐 API Gateway URL: $API_URL"

# Navigate back to project root
cd ..

# Build Lambda package
echo "📦 Building Lambda package..."
npm run build:lambda

# Create deployment package
echo "📦 Creating deployment package..."
cd dist
zip -r ../aws-deploy/lambda.zip . -x "*.map" "*.d.ts"
cd ..

# Update Lambda function code
echo "🔄 Updating Lambda function code..."
aws lambda update-function-code \
    --function-name stock-management-api \
    --zip-file fileb://aws-deploy/lambda.zip

echo "✅ Lambda function updated successfully!"

# Run database migrations
echo "🗄️  Running database migrations..."
DATABASE_URL=$(cd aws-deploy/terraform && terraform output -raw database_endpoint)
echo "Database endpoint: $DATABASE_URL"

# Set environment variables for migration
export DATABASE_URL="postgresql://postgres:$(grep db_password aws-deploy/terraform/terraform.tfvars | cut -d'"' -f2)@$DATABASE_URL:5432/stockmanagement?schema=public"

# Run migrations using Prisma
npx prisma migrate deploy

echo "✅ Database migrations completed!"

# Seed the database
echo "🌱 Seeding database..."
npm run db:seed:prod

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - API Gateway URL: $API_URL"
echo "   - Lambda Function: stock-management-api"
echo "   - Database: Aurora Serverless PostgreSQL"
echo ""
echo "🔧 Next steps:"
echo "   1. Update your frontend to use: $API_URL"
echo "   2. Test the API endpoints"
echo "   3. Monitor costs in AWS Console"
