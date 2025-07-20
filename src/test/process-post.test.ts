
import { handler } from '../lambdas/process-post';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ComprehendClient, DetectSentimentCommand, DetectKeyPhrasesCommand } from '@aws-sdk/client-comprehend';
import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';
import { mockClient } from 'aws-sdk-client-mock';
import { SQSEvent, SQSRecord } from 'aws-lambda';

const ddbMock = mockClient(DynamoDBDocumentClient);
const comprehendMock = mockClient(ComprehendClient);
const rekognitionMock = mockClient(RekognitionClient);

describe('ProcessPost Lambda', () => {
  beforeEach(() => {
    ddbMock.reset();
    comprehendMock.reset();
    rekognitionMock.reset();
  });

  it('should process a text-only post and store the result', async () => {
    comprehendMock.on(DetectSentimentCommand).resolves({ Sentiment: 'POSITIVE' });
    comprehendMock.on(DetectKeyPhrasesCommand).resolves({ KeyPhrases: [{ Text: 'test' }] });
    ddbMock.on(PutCommand).resolves({});

    const event: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({ postId: '123', text: 'This is a test' }),
        } as SQSRecord,
      ],
    };

    await handler(event, {} as any, {} as any);

    expect(ddbMock.calls().length).toBe(1);
    const putCommand = ddbMock.call(0).firstArg as PutCommand;
    expect(putCommand.input.Item!.sentiment).toBe('POSITIVE');
    expect(putCommand.input.Item!.socialImpactScore).toBe(70);
  });

  it('should process a post with an image and store the result', async () => {
    comprehendMock.on(DetectSentimentCommand).resolves({ Sentiment: 'NEGATIVE' });
    comprehendMock.on(DetectKeyPhrasesCommand).resolves({ KeyPhrases: [] });
    rekognitionMock.on(DetectModerationLabelsCommand).resolves({ ModerationLabels: [{ Name: 'Hate Speech' }] });
    ddbMock.on(PutCommand).resolves({});

    const event: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({ postId: '456', text: 'This is bad', mediaUrls: ['s3://bucket/key'] }),
        } as SQSRecord,
      ],
    };

    await handler(event, {} as any, {} as any);

    expect(ddbMock.calls().length).toBe(1);
    const putCommand = ddbMock.call(0).firstArg as PutCommand;
    expect(putCommand.input.Item!.sentiment).toBe('NEGATIVE');
    expect(putCommand.input.Item!.socialImpactScore).toBe(0);
    expect(putCommand.input.Item!.ethicalInsights).toEqual(['Hate Speech']);
  });
});
