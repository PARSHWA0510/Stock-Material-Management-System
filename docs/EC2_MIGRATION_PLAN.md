# 🚀 EC2 Migration Plan: t3.micro → t4g.micro

Complete step-by-step guide to migrate from t3.micro (x86_64) to t4g.micro (ARM64) EC2 instance to reduce costs.

## 📋 Overview

**Current Setup:**
- Instance Type: t3.micro (x86_64)
- Storage: 5GB EBS
- Elastic IP: Attached
- Services: Docker containers (Backend API + PostgreSQL)
- CloudFront: API distribution pointing to EC2
- SSL: ACM certificates (no certbot needed)

**Target Setup:**
- Instance Type: t4g.micro (ARM64) - **~40% cheaper**
- Storage: 5GB EBS
- Elastic IP: Reassigned to new instance
- Services: Same Docker containers
- CloudFront: Updated to point to new instance
- SSL: Same ACM certificates (no changes needed)

**Estimated Cost Savings:** ~$5-6/month (from ~$13/month to ~$7-8/month)

---

## ⚠️ Important Notes

1. **Zero Downtime Strategy**: We'll set up the new instance first, test everything, then switch over
2. **Database Safety**: Full backup before migration, restore on new instance
3. **No SSL Certificate Changes**: ACM certificates work with any instance, no certbot needed
4. **ARM64 Compatibility**: Docker images need to support ARM64 (most official images do)

---

## 📝 Prerequisites

Before starting, ensure you have:
- [ ] AWS CLI configured with appropriate permissions
- [ ] SSH key pair access
- [ ] Current EC2 instance ID and Elastic IP allocation ID
- [ ] CloudFront distribution IDs (from `.env` or AWS Console)
- [ ] Database backup location identified
- [ ] Access to update CloudFront origin settings

---

## 🔄 Migration Steps

### Phase 1: Preparation & Backup

#### Step 1.1: Document Current Configuration

```bash
# On your local machine, document current setup
# Check your .env file for:
# - EC2_IP (current instance IP)
# - EC2_INSTANCE_ID (if set)
# - ELASTIC_IP_ALLOCATION_ID (if you have it)
# - FRONTEND_DIST_ID
# - API_DIST_ID
```

**Action Items:**
- [ ] Note current EC2 instance ID
- [ ] Note Elastic IP allocation ID (AWS Console → EC2 → Elastic IPs)
- [ ] Note CloudFront API distribution ID
- [ ] Note current security group ID

#### Step 1.2: Create Full Database Backup

```bash
# SSH into current instance
ssh -i $PEM_FILE ec2-user@$EC2_IP

# Create backup directory
mkdir -p ~/migration-backup
cd ~/migration-backup

# Backup database from Docker container
docker exec stock-backend sh -c 'pg_dump $DATABASE_URL' > database_backup_$(date +%Y%m%d_%H%M%S).sql

# Also backup .env file
cp ~/.env ~/migration-backup/.env.backup

# Verify backup
ls -lh ~/migration-backup/

# Exit SSH
exit
```

**Action Items:**
- [ ] Database backup created and verified
- [ ] .env file backed up
- [ ] Backup file size noted (for transfer verification)

#### Step 1.3: Download Backup to Local Machine

```bash
# From local machine
scp -i $PEM_FILE ec2-user@$EC2_IP:~/migration-backup/* ~/migration-backups/
```

**Action Items:**
- [ ] Backup files downloaded locally
- [ ] Verify backup file integrity

---

### Phase 2: Create New t4g.micro Instance

#### Step 2.1: Get Current Security Group Configuration

```bash
# Get security group ID from current instance
aws ec2 describe-instances \
  --instance-ids $CURRENT_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' \
  --output text
```

**Action Items:**
- [ ] Note security group ID(s)
- [ ] Review security group rules (SSH, port 3001, etc.)

#### Step 2.2: Launch New t4g.micro Instance

**Via AWS Console:**
1. Go to EC2 → Launch Instance
2. **Name**: `stock-management-backend-t4g` (or similar)
3. **AMI**: Amazon Linux 2023 (ARM64) - **IMPORTANT: Must be ARM64**
4. **Instance Type**: t4g.micro
5. **Key Pair**: Select your existing key pair
6. **Network Settings**: 
   - Select same VPC as current instance
   - Select same security group(s)
   - Auto-assign Public IP: Enable (temporarily)
7. **Storage**: 
   - Root volume: 8GB (minimum, can expand later)
   - **DO NOT** attach additional volumes yet
8. **Advanced Details** (optional):
   - User data: Leave empty (we'll run setup script)
9. Click "Launch Instance"

**Via AWS CLI:**
```bash
# Get subnet ID from current instance
SUBNET_ID=$(aws ec2 describe-instances \
  --instance-ids $CURRENT_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].SubnetId' \
  --output text)

# Get security group ID
SG_ID=$(aws ec2 describe-instances \
  --instance-ids $CURRENT_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

# Get latest Amazon Linux 2023 ARM64 AMI
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-*-arm64" "Name=state,Values=available" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text)

# Launch instance
aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t4g.micro \
  --key-name YOUR_KEY_NAME \
  --subnet-id $SUBNET_ID \
  --security-group-ids $SG_ID \
  --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":8,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=stock-management-backend-t4g}]'
```

**Action Items:**
- [ ] New instance launched
- [ ] Note new instance ID
- [ ] Note new instance public IP (temporary)
- [ ] Wait for instance to be in "running" state

#### Step 2.3: Wait for Instance to be Ready

```bash
# Get new instance ID
NEW_INSTANCE_ID="i-xxxxxxxxxxxxx"  # Replace with actual ID

# Wait for running state
aws ec2 wait instance-running --instance-ids $NEW_INSTANCE_ID

# Get new instance IP
NEW_INSTANCE_IP=$(aws ec2 describe-instances \
  --instance-ids $NEW_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "New instance IP: $NEW_INSTANCE_IP"
```

**Action Items:**
- [ ] Instance is running
- [ ] SSH access verified
- [ ] Note new instance IP

---

### Phase 3: Setup New Instance

#### Step 3.1: Run EC2 Setup Script

```bash
# SSH into new instance
ssh -i $PEM_FILE ec2-user@$NEW_INSTANCE_IP

# Download and run setup script
cd ~
wget https://raw.githubusercontent.com/YOUR_REPO/main/backend/ec2-setup.sh
# OR copy from local:
# scp -i $PEM_FILE backend/ec2-setup.sh ec2-user@$NEW_INSTANCE_IP:~/

chmod +x ec2-setup.sh
./ec2-setup.sh

# Log out and log back in for Docker group changes
exit
ssh -i $PEM_FILE ec2-user@$NEW_INSTANCE_IP
```

**Action Items:**
- [ ] Setup script completed successfully
- [ ] Docker installed and working
- [ ] PostgreSQL installed (if needed for direct access)
- [ ] User added to docker group

#### Step 3.2: Setup PostgreSQL Database (Docker)

```bash
# On new instance
# Start PostgreSQL container (will be part of docker-compose later)
# For now, we'll set it up when we restore the database

# Create data directory
sudo mkdir -p /data/postgres
sudo chown ec2-user:ec2-user /data/postgres
```

**Action Items:**
- [ ] Data directory created
- [ ] Permissions set correctly

#### Step 3.3: Restore Database Backup

```bash
# On new instance, first start a temporary PostgreSQL container
docker run -d \
  --name temp-postgres \
  -e POSTGRES_USER=stock_user \
  -e POSTGRES_PASSWORD=stock_password \
  -e POSTGRES_DB=stock_management \
  -v /data/postgres:/var/lib/postgresql/data \
  postgres:15-alpine

# Wait for PostgreSQL to be ready
sleep 10

# Copy backup file to new instance (from local machine)
# scp -i $PEM_FILE ~/migration-backups/database_backup_*.sql ec2-user@$NEW_INSTANCE_IP:~/

# Restore database
docker exec -i temp-postgres psql -U stock_user -d stock_management < ~/database_backup_*.sql

# Verify restore
docker exec temp-postgres psql -U stock_user -d stock_management -c "\dt"

# Stop temporary container (we'll use docker-compose later)
docker stop temp-postgres
docker rm temp-postgres
```

**Action Items:**
- [ ] Database backup restored
- [ ] Tables verified
- [ ] Sample data checked

#### Step 3.4: Copy Environment Configuration

```bash
# On new instance
# Copy .env backup and edit with new instance details
cp ~/migration-backup/.env.backup ~/.env

# Edit .env file (use nano or vi)
nano ~/.env

# Update if needed:
# - DATABASE_URL (should be same if using same credentials)
# - CORS_ORIGIN (should be same)
# - PORT (should be same: 3001)
# - JWT_SECRET (should be same)
# - NODE_ENV=production
```

**Action Items:**
- [ ] .env file configured
- [ ] All environment variables verified

#### Step 3.5: Deploy Backend Code

```bash
# From local machine, update .env temporarily with new instance IP
# Create a backup of current .env
cp .env .env.backup

# Temporarily update EC2_IP in .env
# Edit .env: EC2_IP=$NEW_INSTANCE_IP

# Deploy backend
./scripts/redeploy.sh backend --update-cors

# Restore original .env (we'll switch back later)
# cp .env.backup .env
```

**Action Items:**
- [ ] Backend code deployed
- [ ] Docker container built and running
- [ ] Health check passes: `curl http://$NEW_INSTANCE_IP:3001/health`

---

### Phase 4: Testing & Verification

#### Step 4.1: Test Backend API

```bash
# Test health endpoint
curl http://$NEW_INSTANCE_IP:3001/health

# Test API endpoint
curl http://$NEW_INSTANCE_IP:3001/api/health

# Test database connection (via API)
curl http://$NEW_INSTANCE_IP:3001/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

**Action Items:**
- [ ] Health endpoint responds
- [ ] API endpoints working
- [ ] Database queries working
- [ ] Authentication working

#### Step 4.2: Verify Database Integrity

```bash
# SSH into new instance
ssh -i $PEM_FILE ec2-user@$NEW_INSTANCE_IP

# Connect to database
docker exec -it stock-backend sh -c 'psql $DATABASE_URL'

# Run some verification queries
SELECT COUNT(*) FROM "Company";
SELECT COUNT(*) FROM "Material";
SELECT COUNT(*) FROM "User";
-- Add more as needed

\q
```

**Action Items:**
- [ ] Record counts match old instance
- [ ] Critical data verified
- [ ] No errors in database

#### Step 4.3: Test Full Application Flow

```bash
# Update local .env temporarily to point to new instance
# Test frontend can connect to new backend
# (You may need to update CORS temporarily or use direct IP)

# Or test via CloudFront after updating origin (next step)
```

**Action Items:**
- [ ] Frontend can connect to backend
- [ ] Login works
- [ ] Data loads correctly
- [ ] No CORS errors

---

### Phase 5: Switch Over (Cutover)

#### Step 5.1: Reassign Elastic IP to New Instance

```bash
# Get Elastic IP allocation ID
# AWS Console → EC2 → Elastic IPs → Find your IP → Note Allocation ID
ELASTIC_IP_ALLOCATION_ID="eipalloc-xxxxxxxxx"  # Replace

# Release from old instance (if associated)
aws ec2 describe-addresses \
  --allocation-ids $ELASTIC_IP_ALLOCATION_ID \
  --query 'Addresses[0].AssociationId' \
  --output text

# If associated, disassociate first
ASSOCIATION_ID=$(aws ec2 describe-addresses \
  --allocation-ids $ELASTIC_IP_ALLOCATION_ID \
  --query 'Addresses[0].AssociationId' \
  --output text)

if [ ! -z "$ASSOCIATION_ID" ] && [ "$ASSOCIATION_ID" != "None" ]; then
  aws ec2 disassociate-address --association-id $ASSOCIATION_ID
fi

# Associate with new instance
aws ec2 associate-address \
  --allocation-id $ELASTIC_IP_ALLOCATION_ID \
  --instance-id $NEW_INSTANCE_ID

# Verify
NEW_ELASTIC_IP=$(aws ec2 describe-instances \
  --instance-ids $NEW_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "New instance now has IP: $NEW_ELASTIC_IP"
```

**Action Items:**
- [ ] Elastic IP reassigned
- [ ] New instance has the Elastic IP
- [ ] Old instance no longer has Elastic IP

#### Step 5.2: Update CloudFront Origin

**Important**: CloudFront API distribution needs to point to new instance.

**Via AWS Console:**
1. Go to CloudFront → Distributions
2. Select your API distribution (ID: `$API_DIST_ID`)
3. Go to "Origins" tab
4. Edit the origin pointing to EC2
5. Update "Origin Domain" to new instance's public DNS:
   - Format: `ec2-XX-XX-XX-XX.compute-1.amazonaws.com`
   - Or use Elastic IP's DNS name
6. Save changes
7. Wait for deployment (15-20 minutes)

**Via AWS CLI:**
```bash
# Get current distribution config
aws cloudfront get-distribution-config \
  --id $API_DIST_ID > /tmp/cloudfront-config.json

# Extract ETag
ETAG=$(cat /tmp/cloudfront-config.json | jq -r '.ETag')

# Get distribution config (without ETag)
cat /tmp/cloudfront-config.json | jq '.DistributionConfig' > /tmp/dist-config.json

# Get new instance public DNS
NEW_INSTANCE_DNS=$(aws ec2 describe-instances \
  --instance-ids $NEW_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicDnsName' \
  --output text)

# Update origin domain in config
# (You'll need to edit the JSON file manually or use jq)
# Origin domain should be: $NEW_INSTANCE_DNS

# Update distribution
aws cloudfront update-distribution \
  --id $API_DIST_ID \
  --if-match $ETAG \
  --distribution-config file:///tmp/dist-config.json

# Wait for deployment
aws cloudfront wait distribution-deployed --id $API_DIST_ID
```

**Action Items:**
- [ ] CloudFront origin updated
- [ ] Distribution deployment completed
- [ ] Verified new origin is active

#### Step 5.3: Update Local Configuration

```bash
# Update .env file with new instance details
# Edit .env:
# EC2_IP=$NEW_ELASTIC_IP  (or new instance IP)
# EC2_INSTANCE_ID=$NEW_INSTANCE_ID
```

**Action Items:**
- [ ] .env file updated
- [ ] Scripts will now use new instance

#### Step 5.4: Final Testing

```bash
# Test via CloudFront (after deployment)
curl https://api.dharaelectricals.com/api/health

# Test full application
# Visit: https://www.dharaelectricals.com/stock-management/login
# Try logging in, navigating, creating records, etc.
```

**Action Items:**
- [ ] API accessible via CloudFront
- [ ] Frontend can connect
- [ ] All features working
- [ ] No errors in browser console
- [ ] Database operations working

---

### Phase 6: Cleanup Old Instance

#### Step 6.1: Final Verification (Wait 24-48 hours)

**Before deleting old instance, wait and monitor:**
- [ ] No errors in application logs
- [ ] All users can access system
- [ ] Database operations normal
- [ ] No performance issues

**Action Items:**
- [ ] Monitor for at least 24 hours
- [ ] Keep old instance stopped (not terminated) during monitoring

#### Step 6.2: Stop Old Instance

```bash
# Stop old instance (don't terminate yet)
aws ec2 stop-instances --instance-ids $CURRENT_INSTANCE_ID

# Wait for stopped
aws ec2 wait instance-stopped --instance-ids $CURRENT_INSTANCE_ID
```

**Action Items:**
- [ ] Old instance stopped
- [ ] Verified new instance still working

#### Step 6.3: Create Final Backup from Old Instance (Optional)

```bash
# If you want one more backup before deletion
# Start old instance temporarily
aws ec2 start-instances --instance-ids $CURRENT_INSTANCE_ID
aws ec2 wait instance-running --instance-ids $CURRENT_INSTANCE_ID

# Get old instance IP (temporary)
OLD_IP=$(aws ec2 describe-instances \
  --instance-ids $CURRENT_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

# Create backup
ssh -i $PEM_FILE ec2-user@$OLD_IP \
  "docker exec stock-backend sh -c 'pg_dump \$DATABASE_URL' > /tmp/final_backup.sql"

# Download backup
scp -i $PEM_FILE ec2-user@$OLD_IP:/tmp/final_backup.sql ~/migration-backups/

# Stop instance again
aws ec2 stop-instances --instance-ids $CURRENT_INSTANCE_ID
```

**Action Items:**
- [ ] Final backup created (optional)
- [ ] Backup downloaded

#### Step 6.4: Terminate Old Instance

```bash
# **WARNING**: This is irreversible!
# Make sure you have:
# - All backups
# - New instance working perfectly
# - No need for old instance

# Terminate old instance
aws ec2 terminate-instances --instance-ids $CURRENT_INSTANCE_ID

# Wait for termination
aws ec2 wait instance-terminated --instance-ids $CURRENT_INSTANCE_ID

echo "✅ Old instance terminated"
```

**Action Items:**
- [ ] Old instance terminated
- [ ] Verified termination in AWS Console
- [ ] Cost savings confirmed

---

## 📊 Post-Migration Checklist

- [ ] New instance running smoothly
- [ ] All services operational
- [ ] Database accessible and data intact
- [ ] API endpoints working via CloudFront
- [ ] Frontend connecting successfully
- [ ] No CORS errors
- [ ] SSL certificates working (ACM)
- [ ] Elastic IP assigned to new instance
- [ ] CloudFront updated and deployed
- [ ] Old instance terminated
- [ ] Cost monitoring shows reduction
- [ ] Documentation updated

---

## 🔧 Troubleshooting

### Issue: Docker images not compatible with ARM64

**Solution:**
- Most official images (node, postgres) support ARM64
- If custom images, rebuild for ARM64:
  ```bash
  docker buildx build --platform linux/arm64 -t image-name .
  ```

### Issue: Database restore fails

**Solution:**
- Check PostgreSQL version compatibility
- Verify backup file integrity
- Check Docker container logs

### Issue: CloudFront not updating

**Solution:**
- Wait 15-20 minutes for deployment
- Check distribution status in AWS Console
- Verify origin domain is correct

### Issue: CORS errors after migration

**Solution:**
- Update CORS_ORIGIN in .env on new instance
- Restart Docker container
- Verify CloudFront forwarding headers

---

## 💰 Cost Comparison

**Before (t3.micro):**
- EC2: ~$8.50/month (on-demand)
- EBS: ~$0.50/month (5GB)
- Elastic IP: Free (when attached)
- **Total: ~$9/month**

**After (t4g.micro):**
- EC2: ~$6.50/month (on-demand) - **~24% cheaper**
- EBS: ~$0.50/month (5GB)
- Elastic IP: Free (when attached)
- **Total: ~$7/month**

**Savings: ~$2/month (~$24/year)**

*Note: Actual costs may vary based on usage, data transfer, and region*

---

## 📝 Notes

1. **No Certbot Needed**: You're using ACM certificates, not certbot. ACM certificates work with any instance and don't need to be regenerated.

2. **ARM64 Compatibility**: t4g.micro uses ARM64 architecture. Most Docker images support it, but verify your specific images.

3. **Database Migration**: We're using pg_dump/pg_restore which is architecture-agnostic.

4. **Zero Downtime**: With proper planning, you can achieve near-zero downtime by:
   - Setting up new instance while old one runs
   - Testing thoroughly before cutover
   - Quick Elastic IP reassignment
   - CloudFront deployment (15-20 min, but cached responses work)

5. **Rollback Plan**: Keep old instance stopped (not terminated) for 1-2 weeks as rollback option.

---

## ✅ Success Criteria

Migration is successful when:
- ✅ New instance running t4g.micro
- ✅ All services operational
- ✅ Database data intact
- ✅ Application fully functional
- ✅ CloudFront serving from new instance
- ✅ Old instance terminated
- ✅ Cost reduction confirmed

---

*Last Updated: Migration Plan Created*
*Estimated Migration Time: 2-4 hours (excluding monitoring period)*

