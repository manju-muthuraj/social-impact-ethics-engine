import { handler } from "../lambdas/generate-presigned-url";
import { S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const s3Mock = mockClient(S3Client);

// Mock the createPresignedPost function
jest.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: jest.fn(() =>
    Promise.resolve({
      url: "https://mock-bucket.s3.amazonaws.com/",
      fields: {
        key: "test-file.jpg",
        "Content-Type": "image/jpeg",
      },
    })
  ),
}));

describe("GeneratePresignedUrl Lambda", () => {
  beforeEach(() => {
    s3Mock.reset();
    process.env.MEDIA_BUCKET_NAME = "test-bucket";
  });

  it("should return 200 with a presigned URL for valid parameters", async () => {
    const event: APIGatewayProxyEvent = {
      queryStringParameters: {
        fileName: "test-file.jpg",
        contentType: "image/jpeg",
      },
    } as any;

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.url).toBeDefined();
    expect(body.fields).toBeDefined();
    expect(body.fields.key).toBe("test-file.jpg");
  });

  it("should return 400 if fileName is missing", async () => {
    const event: APIGatewayProxyEvent = {
      queryStringParameters: {
        contentType: "image/jpeg",
      },
    } as any;

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe(
      "Missing fileName or contentType query parameter"
    );
  });

  it("should return 400 if contentType is missing", async () => {
    const event: APIGatewayProxyEvent = {
      queryStringParameters: {
        fileName: "test-file.jpg",
      },
    } as any;

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe(
      "Missing fileName or contentType query parameter"
    );
  });
});
