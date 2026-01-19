#!/bin/bash

# Setup AWS EventBridge Rules for EC2 Instance Start/Stop Schedule
# Schedule: Start at 10 AM IST, Stop at 8 PM IST

set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

# Configuration
INSTANCE_ID="${EC2_INSTANCE_ID:-i-00f04b3d51b4651c0}"
REGION="${S3_REGION:-us-east-1}"

# Time conversions (IST to UTC)
# IST = UTC + 5:30
# 10:00 AM IST = 04:30 UTC
# 08:00 PM IST = 14:30 UTC
START_TIME="04:30"  # 10 AM IST
STOP_TIME="14:30"   # 8 PM IST

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Setting Up EC2 Instance Scheduler ===${NC}"
echo ""

# Validate
if [ -z "$INSTANCE_ID" ]; then
    echo -e "${RED}Error: EC2_INSTANCE_ID not set in .env${NC}"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Instance ID: $INSTANCE_ID"
echo "  Region: $REGION"
echo "  Start Time: 10:00 AM IST (04:30 UTC)"
echo "  Stop Time: 08:00 PM IST (14:30 UTC)"
echo ""

# Check if rules already exist
START_RULE="ec2-start-${INSTANCE_ID}"
STOP_RULE="ec2-stop-${INSTANCE_ID}"

echo -e "${YELLOW}Step 1: Creating EventBridge Rules...${NC}"

# Create start rule (10 AM IST = 04:30 UTC)
echo "Creating start rule..."
aws events put-rule \
    --name "$START_RULE" \
    --schedule-expression "cron(30 4 * * ? *)" \
    --state ENABLED \
    --description "Start EC2 instance at 10 AM IST (04:30 UTC)" \
    --region "$REGION" \
    > /dev/null 2>&1 || {
    echo -e "${YELLOW}Rule may already exist, updating...${NC}"
    aws events put-rule \
        --name "$START_RULE" \
        --schedule-expression "cron(30 4 * * ? *)" \
        --state ENABLED \
        --description "Start EC2 instance at 10 AM IST (04:30 UTC)" \
        --region "$REGION"
}

# Create stop rule (8 PM IST = 14:30 UTC)
echo "Creating stop rule..."
aws events put-rule \
    --name "$STOP_RULE" \
    --schedule-expression "cron(30 14 * * ? *)" \
    --state ENABLED \
    --description "Stop EC2 instance at 8 PM IST (14:30 UTC)" \
    --region "$REGION" \
    > /dev/null 2>&1 || {
    echo -e "${YELLOW}Rule may already exist, updating...${NC}"
    aws events put-rule \
        --name "$STOP_RULE" \
        --schedule-expression "cron(30 14 * * ? *)" \
        --state ENABLED \
        --description "Stop EC2 instance at 8 PM IST (14:30 UTC)" \
        --region "$REGION"
}

echo -e "${GREEN}✅ Rules created${NC}"
echo ""

echo -e "${YELLOW}Step 2: Adding EC2 Start/Stop Permissions...${NC}"

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create IAM role for EventBridge (if needed)
ROLE_NAME="EventBridge-EC2-Scheduler-Role"
POLICY_NAME="EventBridge-EC2-Scheduler-Policy"

# Check if role exists
if ! aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
    echo "Creating IAM role..."
    
    # Create trust policy (allow both EventBridge and Lambda)
    cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "events.amazonaws.com",
          "lambda.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        > /dev/null

    # Create policy
    cat > /tmp/scheduler-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:StartInstances",
        "ec2:StopInstances",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/${INSTANCE_ID}",
        "arn:aws:logs:${REGION}:${ACCOUNT_ID}:*"
      ]
    }
  ]
}
EOF

    # Create and attach policy
    POLICY_ARN=$(aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document file:///tmp/scheduler-policy.json \
        --query 'Policy.Arn' --output text)

    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn "$POLICY_ARN"

    echo -e "${GREEN}✅ IAM role created${NC}"
else
    echo -e "${GREEN}✅ IAM role already exists${NC}"
fi

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

echo ""
echo -e "${YELLOW}Step 3: Creating Lambda Functions...${NC}"

# Lambda function names
START_FUNCTION="ec2-start-${INSTANCE_ID}"
STOP_FUNCTION="ec2-stop-${INSTANCE_ID}"

# Create zip files for Lambda functions
echo "Creating Lambda deployment packages..."

# Start function
cat > /tmp/start_lambda.py << 'PYEOF'
import boto3
import json

def lambda_handler(event, context):
    ec2 = boto3.client('ec2')
    instance_id = event.get('instance_id', '${INSTANCE_ID}')
    
    try:
        response = ec2.start_instances(InstanceIds=[instance_id])
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Successfully started instance {instance_id}',
                'response': response
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': f'Error starting instance: {str(e)}'
            })
        }
PYEOF

# Replace instance ID in the function
sed -i.bak "s/\${INSTANCE_ID}/${INSTANCE_ID}/g" /tmp/start_lambda.py

# Stop function
cat > /tmp/stop_lambda.py << 'PYEOF'
import boto3
import json

def lambda_handler(event, context):
    ec2 = boto3.client('ec2')
    instance_id = event.get('instance_id', '${INSTANCE_ID}')
    
    try:
        response = ec2.stop_instances(InstanceIds=[instance_id])
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Successfully stopped instance {instance_id}',
                'response': response
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': f'Error stopping instance: {str(e)}'
            })
        }
PYEOF

# Replace instance ID in the function
sed -i.bak "s/\${INSTANCE_ID}/${INSTANCE_ID}/g" /tmp/stop_lambda.py

# Create zip files
cd /tmp
zip -q start_lambda.zip start_lambda.py
zip -q stop_lambda.zip stop_lambda.py

# Create Lambda functions
echo "Creating start Lambda function..."
if aws lambda get-function --function-name "$START_FUNCTION" --region "$REGION" &>/dev/null; then
    echo "Function exists, updating code..."
    aws lambda update-function-code \
        --function-name "$START_FUNCTION" \
        --zip-file fileb://start_lambda.zip \
        --region "$REGION" > /dev/null
else
    aws lambda create-function \
        --function-name "$START_FUNCTION" \
        --runtime python3.11 \
        --role "$ROLE_ARN" \
        --handler start_lambda.lambda_handler \
        --zip-file fileb://start_lambda.zip \
        --timeout 30 \
        --description "Start EC2 instance at 10 AM IST" \
        --region "$REGION" > /dev/null
fi

echo "Creating stop Lambda function..."
if aws lambda get-function --function-name "$STOP_FUNCTION" --region "$REGION" &>/dev/null; then
    echo "Function exists, updating code..."
    aws lambda update-function-code \
        --function-name "$STOP_FUNCTION" \
        --zip-file fileb://stop_lambda.zip \
        --region "$REGION" > /dev/null
else
    aws lambda create-function \
        --function-name "$STOP_FUNCTION" \
        --runtime python3.11 \
        --role "$ROLE_ARN" \
        --handler stop_lambda.lambda_handler \
        --zip-file fileb://stop_lambda.zip \
        --timeout 30 \
        --description "Stop EC2 instance at 8 PM IST" \
        --region "$REGION" > /dev/null
fi

# Update IAM role policy to include Lambda execution
cat > /tmp/lambda-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:StartInstances",
        "ec2:StopInstances",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/${INSTANCE_ID}",
        "arn:aws:logs:${REGION}:${ACCOUNT_ID}:*"
      ]
    }
  ]
}
EOF

POLICY_ARN=$(aws iam list-policies --scope Local --query "Policies[?PolicyName=='${POLICY_NAME}'].Arn" --output text)
if [ -n "$POLICY_ARN" ]; then
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document file:///tmp/lambda-policy.json \
        --set-as-default \
        > /dev/null 2>&1 || true
fi

echo -e "${GREEN}✅ Lambda functions created${NC}"
echo ""

echo -e "${YELLOW}Step 4: Adding Targets to Rules...${NC}"

START_FUNCTION_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${START_FUNCTION}"
STOP_FUNCTION_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${STOP_FUNCTION}"

# Add start target
echo "Adding start target..."
aws events put-targets \
    --rule "$START_RULE" \
    --targets "Id"="1","Arn"="${START_FUNCTION_ARN}" \
    --region "$REGION" \
    > /dev/null 2>&1 || {
    aws events remove-targets --rule "$START_RULE" --ids "1" --region "$REGION" 2>/dev/null || true
    aws events put-targets \
        --rule "$START_RULE" \
        --targets "Id"="1","Arn"="${START_FUNCTION_ARN}" \
        --region "$REGION"
}

# Add Lambda permission for EventBridge
aws lambda add-permission \
    --function-name "$START_FUNCTION" \
    --statement-id "allow-eventbridge-start" \
    --action "lambda:InvokeFunction" \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${START_RULE}" \
    --region "$REGION" \
    > /dev/null 2>&1 || true

# Add stop target
echo "Adding stop target..."
aws events put-targets \
    --rule "$STOP_RULE" \
    --targets "Id"="1","Arn"="${STOP_FUNCTION_ARN}" \
    --region "$REGION" \
    > /dev/null 2>&1 || {
    aws events remove-targets --rule "$STOP_RULE" --ids "1" --region "$REGION" 2>/dev/null || true
    aws events put-targets \
        --rule "$STOP_RULE" \
        --targets "Id"="1","Arn"="${STOP_FUNCTION_ARN}" \
        --region "$REGION"
}

# Add Lambda permission for EventBridge
aws lambda add-permission \
    --function-name "$STOP_FUNCTION" \
    --statement-id "allow-eventbridge-stop" \
    --action "lambda:InvokeFunction" \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${STOP_RULE}" \
    --region "$REGION" \
    > /dev/null 2>&1 || true

echo -e "${GREEN}✅ Targets added${NC}"
echo ""

# Cleanup temp files
rm -f /tmp/trust-policy.json /tmp/scheduler-policy.json

echo -e "${GREEN}=== ✅ Setup Complete ===${NC}"
echo ""
echo -e "${YELLOW}Schedule Summary:${NC}"
echo "  📅 Start: Daily at 10:00 AM IST (04:30 UTC)"
echo "  📅 Stop:  Daily at 08:00 PM IST (14:30 UTC)"
echo ""
echo -e "${YELLOW}Rules Created:${NC}"
echo "  - $START_RULE"
echo "  - $STOP_RULE"
echo ""
echo -e "${YELLOW}To verify:${NC}"
echo "  aws events list-rules --name-prefix ec2-"
echo ""
echo -e "${YELLOW}To disable:${NC}"
echo "  aws events disable-rule --name $START_RULE"
echo "  aws events disable-rule --name $STOP_RULE"

