# Frontend Environment Configuration for AWS Deployment

## Environment Variables

Create a `.env.production` file in your frontend directory:

```bash
# .env.production
VITE_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod/api
```

## Vercel Configuration

Update your `vercel.json` to include environment variables:

```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_API_BASE_URL": "https://your-api-gateway-url.amazonaws.com/prod/api"
  }
}
```

## Manual Update Steps

1. **After AWS deployment**, get your API Gateway URL from Terraform output:
   ```bash
   cd backend/aws-deploy/terraform
   terraform output api_gateway_url
   ```

2. **Update Vercel environment variables**:
   - Go to your Vercel dashboard
   - Navigate to your project settings
   - Add environment variable:
     - Name: `VITE_API_BASE_URL`
     - Value: `https://your-api-gateway-url.amazonaws.com/prod/api`

3. **Redeploy frontend**:
   ```bash
   cd frontend
   vercel --prod
   ```

## Testing

After deployment, test the connection:

```bash
# Test API Gateway health endpoint
curl https://your-api-gateway-url.amazonaws.com/prod/health

# Test from frontend
# Open browser dev tools and check network requests
```

## CORS Configuration

Your backend already includes CORS configuration for Vercel deployment. The AWS API Gateway URL will be automatically added to the allowed origins.
