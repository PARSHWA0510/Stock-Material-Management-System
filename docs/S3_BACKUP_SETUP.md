# S3 Database Backup Setup

**Last Updated:** 2026-01-18  
**Status:** ✅ Automated backup system ready

---

## Overview

This document describes the automated database backup system that:
- Runs every 15 days (1st and 15th of each month at 2:00 AM)
- Creates compressed database backups
- Uploads backups to S3
- Keeps only the latest 5 backups (automatically rotates old ones)
- Uses systemd timer for reliable scheduling

---

## Backup Schedule

Backups run automatically on:
- **1st of each month** at 2:00 AM
- **15th of each month** at 2:00 AM

The timer is persistent - if the system was off during the scheduled time, it will run immediately after boot.

---

## Backup Naming Convention

Backups are named with the following format:
```
database_backup_YYYYMMDD.sql.gz
```

Example:
- `database_backup_20260101.sql.gz` (January 1st backup)
- `database_backup_20260115.sql.gz` (January 15th backup)
- `database_backup_20260201.sql.gz` (February 1st backup)

---

## S3 Storage

### Location
Backups are stored in S3 at:
```
s3://<S3_BUCKET>/database-backups/database_backup_YYYYMMDD.sql.gz
```

### Retention Policy
- **Maximum backups kept:** 5
- **Rotation:** When a new backup is uploaded, if there are more than 5 backups, the oldest ones are automatically deleted

### Example Rotation
If you have backups from:
- Feb 1st
- Feb 15th
- Mar 1st
- Mar 15th
- Apr 1st

When the Apr 15th backup is uploaded, the Feb 1st backup is automatically deleted, keeping only the latest 5.

---

## Setup Instructions

### Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   aws --version
   aws configure
   ```

2. **PostgreSQL client tools installed**
   ```bash
   pg_dump --version
   ```

3. **Environment variables set**
   - `DATABASE_URL` in `~/.env`
   - `S3_BUCKET` in `~/.env` (optional - defaults to `stock-management-database-backups`)

### Installation Steps

1. **SSH into your EC2 instance**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip
   ```

2. **Copy backup scripts to EC2**
   ```bash
   # From your local machine
   scp -i your-key.pem backend/scripts/s3-database-backup.sh ec2-user@your-ec2-ip:~/
   scp -i your-key.pem backend/scripts/setup-s3-backup.sh ec2-user@your-ec2-ip:~/
   ```

3. **Run setup script on EC2**
   ```bash
   # On EC2 instance
   cd ~
   chmod +x setup-s3-backup.sh
   ./setup-s3-backup.sh
   ```

   The setup script will:
   - Install the backup script
   - Create systemd service and timer
   - Enable and start the timer
   - Verify AWS credentials
   - Check configuration

4. **Verify installation**
   ```bash
   # Check timer status
   sudo systemctl status s3-backup.timer
   
   # Check next run time
   sudo systemctl list-timers s3-backup.timer
   ```

---

## Configuration

### Environment Variables

Add to `~/.env` on EC2:

```bash
# Required
DATABASE_URL=postgresql://username:password@localhost:5432/stock_management?schema=public

# Optional (defaults shown)
S3_BUCKET=stock-management-database-backups
S3_REGION=us-east-1
```

### S3 Bucket Setup

If you need to create a new S3 bucket for backups:

```bash
# Create bucket
aws s3 mb s3://stock-management-database-backups --region us-east-1

# Enable versioning (optional but recommended)
aws s3api put-bucket-versioning \
  --bucket stock-management-database-backups \
  --versioning-configuration Status=Enabled

# Set lifecycle policy (optional - for cost optimization)
aws s3api put-bucket-lifecycle-configuration \
  --bucket stock-management-database-backups \
  --lifecycle-configuration file://lifecycle-policy.json
```

Example lifecycle policy (`lifecycle-policy.json`):
```json
{
  "Rules": [
    {
      "Id": "TransitionToGlacier",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

---

## Manual Operations

### Trigger Backup Manually

```bash
# Run backup immediately
sudo systemctl start s3-backup.service

# Check logs
sudo journalctl -u s3-backup.service -f
```

### View Backup Logs

```bash
# View recent logs
sudo journalctl -u s3-backup.service -n 50

# Follow logs in real-time
sudo journalctl -u s3-backup.service -f
```

### List Backups in S3

```bash
# List all backups
aws s3 ls s3://stock-management-database-backups/database-backups/

# With details
aws s3 ls s3://stock-management-database-backups/database-backups/ --human-readable --summarize
```

### Download Backup from S3

```bash
# Download a specific backup
aws s3 cp s3://stock-management-database-backups/database-backups/database_backup_20260101.sql.gz ./

# Decompress
gunzip database_backup_20260101.sql.gz

# Restore (example)
psql -h localhost -U stock_user -d stock_management < database_backup_20260101.sql
```

### Check Timer Status

```bash
# Check if timer is active
sudo systemctl status s3-backup.timer

# List all timers
sudo systemctl list-timers

# Check next run time
sudo systemctl list-timers s3-backup.timer
```

---

## Troubleshooting

### Backup Fails

1. **Check logs**
   ```bash
   sudo journalctl -u s3-backup.service -n 100
   ```

2. **Verify AWS credentials**
   ```bash
   aws sts get-caller-identity
   ```

3. **Verify database connection**
   ```bash
   source ~/.env
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```

4. **Test backup script manually**
   ```bash
   ~/scripts/s3-database-backup.sh
   ```

### Timer Not Running

1. **Check timer status**
   ```bash
   sudo systemctl status s3-backup.timer
   ```

2. **Restart timer**
   ```bash
   sudo systemctl restart s3-backup.timer
   ```

3. **Reload systemd**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart s3-backup.timer
   ```

### S3 Upload Fails

1. **Check S3 bucket exists**
   ```bash
   aws s3 ls s3://stock-management-database-backups/
   ```

2. **Check IAM permissions**
   - Ensure EC2 instance has permissions to:
     - `s3:PutObject` on the bucket
     - `s3:ListBucket` on the bucket
     - `s3:DeleteObject` on the bucket (for rotation)

3. **Check bucket policy**
   ```bash
   aws s3api get-bucket-policy --bucket stock-management-database-backups
   ```

---

## Monitoring

### Check Backup Status

```bash
# View last backup time
sudo journalctl -u s3-backup.service --since "30 days ago" | grep "Backup Process Completed"

# Count backups in S3
aws s3 ls s3://stock-management-database-backups/database-backups/ | wc -l
```

### Set Up Alerts (Optional)

You can set up CloudWatch alarms to notify you if:
- No backup is created within 16 days
- Backup size is unusually small/large
- S3 upload fails

---

## Cost Estimation

### S3 Storage Costs (us-east-1)

- **Standard-IA Storage:** $0.0125 per GB/month
- **Example:** 5 backups × 10 MB each = 50 MB = ~$0.0006/month

### Data Transfer Costs

- **Upload to S3:** Free (within same region)
- **Download:** $0.09 per GB (first 10 TB/month)

**Total estimated cost:** < $0.01/month for typical database sizes

---

## Security Considerations

1. **S3 Bucket Encryption**
   - Enable server-side encryption on the bucket
   ```bash
   aws s3api put-bucket-encryption \
     --bucket stock-management-database-backups \
     --server-side-encryption-configuration '{
       "Rules": [{
         "ApplyServerSideEncryptionByDefault": {
           "SSEAlgorithm": "AES256"
         }
       }]
     }'
   ```

2. **IAM Permissions**
   - Use IAM roles with least privilege
   - Only grant necessary S3 permissions

3. **Backup Access**
   - Restrict S3 bucket access to authorized users only
   - Use bucket policies to limit access

---

## Files Reference

- **Backup Script:** `backend/scripts/s3-database-backup.sh`
- **Setup Script:** `backend/scripts/setup-s3-backup.sh`
- **Systemd Service:** `/etc/systemd/system/s3-backup.service`
- **Systemd Timer:** `/etc/systemd/system/s3-backup.timer`

---

*For questions or issues, check the logs first: `sudo journalctl -u s3-backup.service -f`*

