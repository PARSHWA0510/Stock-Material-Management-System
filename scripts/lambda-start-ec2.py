import boto3
import json
import os

def lambda_handler(event, context):
    """
    Lambda function to start EC2 instance
    """
    ec2 = boto3.client('ec2')
    
    # Get instance ID from environment variable, event, or function name
    instance_id = os.environ.get('INSTANCE_ID') or event.get('instance_id') or context.function_name.split('-')[-1]
    
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

