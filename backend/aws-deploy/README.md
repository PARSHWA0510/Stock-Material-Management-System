# AWS Deployment Guide

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS CLI**: Install and configure AWS CLI
   ```bash
   # Install AWS CLI (macOS)
   brew install awscli
   
   # Configure AWS credentials
   aws configure
   ```
3. **Terraform**: Install Terraform for infrastructure management
   ```bash
   # Install Terraform (macOS)
   brew install terraform
   ```

## Cost Optimization Features

This deployment uses cost-effective AWS services:

- **Aurora Serverless PostgreSQL**: Auto-pauses when not in use (saves ~70% costs)
- **Lambda**: Pay only for actual usage (no idle costs)
- **API Gateway**: Pay per request (very cost-effective for low-medium traffic)

### Estimated Monthly Costs (Low-Medium Usage):
- Aurora Serverless: $15-30/month (with auto-pause)
- Lambda: $1-5/month (depending on requests)
- API Gateway: $1-3/month (depending on requests)
- **Total: ~$20-40/month** (vs $100+ for always-on EC2)

## Deployment Steps

### 1. Configure Environment Variables

```bash
cd backend/aws-deploy/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:
```hcl
aws_region   = "us-east-1"  # Choose your preferred region
project_name = "stock-management"
environment  = "prod"

# Generate secure passwords
db_password = "your-secure-database-password-here"
jwt_secret  = "your-super-secret-jwt-key-here"
```

### 2. Deploy Infrastructure

```bash
cd backend
npm run deploy:aws
```

This script will:
- Deploy AWS infrastructure (VPC, Aurora, Lambda, API Gateway)
- Build and deploy your Lambda function
- Run database migrations
- Seed the database

### 3. Update Frontend Configuration

After deployment, update your frontend to use the new API Gateway URL:

```typescript
// In your frontend service files
const API_BASE_URL = 'https://your-api-gateway-url.amazonaws.com/prod';
```

## Manual Deployment (Alternative)

If you prefer manual deployment:

### 1. Deploy Infrastructure
```bash
cd backend/aws-deploy/terraform
terraform init
terraform plan
terraform apply
```

### 2. Build and Deploy Lambda
```bash
cd backend
npm run build:lambda
cd dist
zip -r ../aws-deploy/lambda.zip . -x "*.map" "*.d.ts"
cd ..

aws lambda update-function-code \
    --function-name stock-management-api \
    --zip-file fileb://aws-deploy/lambda.zip
```

### 3. Run Database Migrations
```bash
# Get database URL from Terraform output
DATABASE_URL=$(cd aws-deploy/terraform && terraform output -raw database_endpoint)

# Set environment variable
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@$DATABASE_URL:5432/stockmanagement?schema=public"

# Run migrations
npx prisma migrate deploy

# Seed database
npm run db:seed:prod
```

## Monitoring and Maintenance

### 1. Monitor Costs
- Check AWS Cost Explorer regularly
- Set up billing alerts
- Monitor Aurora auto-pause behavior

### 2. Monitor Performance
- Check CloudWatch logs for Lambda function
- Monitor Aurora performance metrics
- Set up API Gateway monitoring

### 3. Database Management
```bash
# Connect to database for maintenance
npx prisma studio

# Run migrations
npx prisma migrate deploy

# Reset database (if needed)
npx prisma migrate reset
```

## Troubleshooting

### Common Issues:

1. **Lambda timeout**: Increase timeout in Terraform configuration
2. **Database connection issues**: Check VPC security groups
3. **CORS issues**: Update CORS configuration in your Express app
4. **Cold starts**: Consider provisioned concurrency for critical endpoints

### Useful Commands:

```bash
# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/stock-management"

# Test API Gateway
curl https://your-api-gateway-url.amazonaws.com/prod/health

# Update Lambda environment variables
aws lambda update-function-configuration \
    --function-name stock-management-api \
    --environment Variables='{NODE_ENV=production,JWT_SECRET=your-secret}'
```

## Security Best Practices

1. **Database Security**:
   - Use strong passwords
   - Enable encryption at rest
   - Restrict access via security groups

2. **Lambda Security**:
   - Use least privilege IAM roles
   - Enable VPC for database access
   - Rotate secrets regularly

3. **API Gateway Security**:
   - Enable API key authentication if needed
   - Use HTTPS only
   - Implement rate limiting

## Scaling Considerations

- **Aurora Serverless**: Automatically scales based on demand
- **Lambda**: Scales automatically (up to 1000 concurrent executions)
- **API Gateway**: Handles up to 10,000 requests per second

For high-traffic applications, consider:
- Provisioned concurrency for Lambda
- Aurora Serverless v2 for better performance
- CloudFront for caching
