import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import serverlessExpress from 'serverless-express';
import app from './app';

// Create the Lambda handler
const handler = serverlessExpress({ app });

export { handler };
