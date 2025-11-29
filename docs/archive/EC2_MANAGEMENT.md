# EC2 Instance Management Guide

This guide explains how to stop and start your EC2 instance gracefully, ensuring all services are properly managed.

## 📋 Scripts Overview

### Local Scripts (Run on your machine)

1. **`stop-ec2.sh`** - Gracefully stops EC2 instance
   - Stops Docker container before shutting down
   - Optionally creates database backup
   - Stops EC2 instance

2. **`start-ec2.sh`** - Starts EC2 instance and ensures services are running
   - Starts EC2 instance
   - Waits for SSH to be available
   - Ensures Docker, PostgreSQL, and backend container are running
   - Verifies backend health

### EC2 Script (Run on EC2 instance)

3. **`backend/ec2-startup.sh`** - Startup script for EC2
   - Can be run manually or added to user-data
   - Ensures all services start on boot

---

## 🛑 Stopping EC2 Instance

### Quick Stop
```bash
./stop-ec2.sh
```

### What it does:
1. Finds your EC2 instance ID
2. Gracefully stops the Docker container
3. Optionally creates a database backup
4. Stops the EC2 instance
5. Waits for instance to fully stop

### Manual Stop (Alternative)
```bash
# Stop container manually
ssh -i /path/to/pem ec2-user@34.239.172.85 "docker stop stock-backend"

# Stop EC2 via AWS CLI
aws ec2 stop-instances --instance-ids i-xxxxxxxxx
```

---

## 🚀 Starting EC2 Instance

### Quick Start
```bash
./start-ec2.sh
```

### What it does:
1. Finds your EC2 instance ID
2. Starts the EC2 instance
3. Waits for instance to be running
4. Waits for SSH to be available
5. Starts Docker service
6. Starts PostgreSQL service
7. Starts the backend Docker container
8. Verifies backend health
9. Shows service status summary

### Manual Start (Alternative)
```bash
# Start EC2 via AWS CLI
aws ec2 start-instances --instance-ids i-xxxxxxxxx

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids i-xxxxxxxxx

# SSH and start services manually
ssh -i /path/to/pem ec2-user@34.239.172.85
sudo systemctl start docker
sudo systemctl start postgresql-15
docker start stock-backend
```

---

## ⚙️ Setting Up Automatic Startup on EC2

To ensure services start automatically when EC2 boots, you have two options:

### Option 1: Use Systemd Service (Recommended)

The systemd service should already be set up from `ec2-setup.sh`. Verify it exists:

```bash
ssh -i /path/to/pem ec2-user@34.239.172.85
systemctl status stock-backend.service
```

If it doesn't exist, create it:

```bash
sudo tee /etc/systemd/system/stock-backend.service > /dev/null << 'EOF'
[Unit]
Description=Stock Management Backend
Requires=docker.service
After=docker.service postgresql-15.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ec2-user
ExecStart=/usr/bin/docker start stock-backend
ExecStop=/usr/bin/docker stop stock-backend
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable stock-backend.service
sudo systemctl daemon-reload
```

### Option 2: Use User Data Script

Add the startup script to EC2 user-data:

1. Go to AWS Console → EC2 → Your Instance
2. Actions → Instance Settings → Edit User Data
3. Add:

```bash
#!/bin/bash
cd /home/ec2-user
if [ -f "ec2-startup.sh" ]; then
    bash ec2-startup.sh
fi
```

Or upload the script and run it manually:

```bash
# On local machine
scp -i /path/to/pem backend/ec2-startup.sh ec2-user@34.239.172.85:/home/ec2-user/

# On EC2
chmod +x ~/ec2-startup.sh
~/ec2-startup.sh
```

### Option 3: Add to Crontab (Simple)

```bash
ssh -i /path/to/pem ec2-user@34.239.172.85
crontab -e

# Add this line to run on boot
@reboot sleep 30 && /home/ec2-user/ec2-startup.sh >> /home/ec2-user/startup.log 2>&1
```

---

## 🔧 Configuration

### Update Scripts Configuration

Edit the scripts to match your setup:

**`stop-ec2.sh` and `start-ec2.sh`:**
```bash
EC2_IP="34.239.172.85"              # Your EC2 IP
EC2_USER="ec2-user"                 # Your EC2 user
PEM_FILE="/path/to/your-key.pem"    # Your PEM file path
INSTANCE_ID=""                      # Leave empty to auto-detect
```

### Finding Your Instance ID

```bash
# By IP address
aws ec2 describe-instances \
    --filters "Name=ip-address,Values=34.239.172.85" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text

# Or list all instances
aws ec2 describe-instances \
    --query 'Reservations[*].Instances[*].[InstanceId,PublicIpAddress,State.Name]' \
    --output table
```

---

## 📊 Checking Service Status

### On EC2 Instance

```bash
ssh -i /path/to/pem ec2-user@34.239.172.85

# Check Docker
sudo systemctl status docker

# Check PostgreSQL
sudo systemctl status postgresql-15

# Check backend container
docker ps | grep stock-backend

# Check backend health
docker exec stock-backend curl http://localhost:3001/health

# View logs
docker logs stock-backend
```

### From Local Machine

```bash
# Check EC2 instance state
aws ec2 describe-instances \
    --instance-ids i-xxxxxxxxx \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text

# Check backend health
curl http://34.239.172.85:3001/health
```

---

## 🐛 Troubleshooting

### Instance Won't Start

1. Check instance state:
   ```bash
   aws ec2 describe-instances --instance-ids i-xxxxxxxxx
   ```

2. Check for errors in AWS Console → EC2 → Instance → Status Checks

3. Verify security groups allow SSH (port 22)

### Services Won't Start

1. SSH into instance and check logs:
   ```bash
   ssh -i /path/to/pem ec2-user@34.239.172.85
   journalctl -u docker -n 50
   journalctl -u postgresql-15 -n 50
   docker logs stock-backend
   ```

2. Check if container exists:
   ```bash
   docker ps -a | grep stock-backend
   ```

3. If container doesn't exist, rebuild it (see REDEPLOYMENT.md)

### Backend Not Accessible

1. Check if container is running:
   ```bash
   docker ps | grep stock-backend
   ```

2. Check container logs:
   ```bash
   docker logs stock-backend
   ```

3. Check security group allows port 3001

4. Verify environment variables:
   ```bash
   docker exec stock-backend env | grep DATABASE_URL
   ```

---

## 💰 Cost Savings

Stopping your EC2 instance when not in use saves money:
- **Running**: ~$0.0116/hour (t2.micro) = ~$8.50/month
- **Stopped**: Only EBS storage costs (~$0.10/GB/month)

**Estimated savings**: ~$8/month if stopped 12 hours/day

---

## 📝 Quick Reference

### Stop EC2
```bash
./stop-ec2.sh
```

### Start EC2
```bash
./start-ec2.sh
```

### Check Status
```bash
aws ec2 describe-instances --instance-ids i-xxxxxxxxx --query 'Reservations[0].Instances[0].State.Name'
```

### SSH to EC2
```bash
ssh -i /path/to/pem ec2-user@34.239.172.85
```

### View Backend Logs
```bash
ssh -i /path/to/pem ec2-user@34.239.172.85 "docker logs stock-backend"
```

---

## 🔐 Security Notes

- Keep your PEM file secure (chmod 400)
- Don't commit PEM files to git
- Use security groups to restrict access
- Regularly update your EC2 instance
- Consider using AWS Systems Manager Session Manager instead of SSH

---

**Last Updated**: November 2024

