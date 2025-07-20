
import { handler } from '../lambdas/get-results';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('GetResults Lambda', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('should return 200 with the item if found', async () => {
    const mockItem = { postId: '123', sentiment: 'POSITIVE' };
    ddbMock.on(GetCommand).resolves({ Item: mockItem });

    const event: APIGatewayProxyEvent = {
      pathParameters: { postId: '123' },
    } as any;

    const result = await handler(event, {} as any, () => {});

    expect((result as APIGatewayProxyResult).statusCode).toBe(200);
    expect(JSON.parse((result as APIGatewayProxyResult).body)).toEqual(mockItem);
  });

  it('should return 404 if the item is not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const event: APIGatewayProxyEvent = {
      pathParameters: { postId: '123' },
    } as any;

    const result = await handler(event, {} as any, () => {});

    expect((result as APIGatewayProxyResult).statusCode).toBe(404);
  });

  it('should return 400 if postId is missing', async () => {
    const event: APIGatewayProxyEvent = { pathParameters: {} } as any;

    const result = await handler(event, {} as any, () => {});

    expect((result as APIGatewayProxyResult).statusCode).toBe(400);
  });
});
