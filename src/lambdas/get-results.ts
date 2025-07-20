
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';

const dynamoDbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);

const tableName = process.env.TABLE_NAME;

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  const postId = event.pathParameters?.postId;

  if (!postId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing postId' }),
    };
  }

  try {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: tableName,
      Key: { postId },
    }));

    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Results not found' }),
      };
    }

    if (Item.status === "IN_PROGRESS") {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Analysis in progress', postId: Item.postId, status: Item.status }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(Item),
    };
  } catch (error) {
    console.error('Error fetching results from DynamoDB:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
