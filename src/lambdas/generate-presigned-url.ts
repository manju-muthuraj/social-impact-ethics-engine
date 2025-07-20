import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const s3Client = new S3Client({});
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const bucketName = process.env.MEDIA_BUCKET_NAME;
  if (!bucketName) {
    console.error("MEDIA_BUCKET_NAME environment variable is not set.");
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error: Media bucket not configured.",
      }),
    };
  }

  const fileName = event.queryStringParameters?.fileName;
  const contentType = event.queryStringParameters?.contentType;

  if (!fileName || !contentType) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing fileName or contentType query parameter",
      }),
    };
  }

  try {
    const presignedPost = await createPresignedPost(s3Client, {
      Bucket: bucketName,
      Key: fileName,
      Expires: 3600, // 1 hour
      Fields: {
        "Content-Type": contentType,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify(presignedPost),
    };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
