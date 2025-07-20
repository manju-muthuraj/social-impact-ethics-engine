import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  ComprehendClient,
  DetectSentimentCommand,
  DetectKeyPhrasesCommand,
} from "@aws-sdk/client-comprehend";
import {
  RekognitionClient,
  DetectModerationLabelsCommand,
} from "@aws-sdk/client-rekognition";
import { SQSHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { PostContent } from "../models/PostContent";
import { AnalysisResult } from "../models/AnalysisResult";

const dynamoDbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);
const comprehendClient = new ComprehendClient({});
const rekognitionClient = new RekognitionClient({});

const tableName = process.env.TABLE_NAME;

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    try {
      const postContent: PostContent = JSON.parse(record.body);
      const { postId, text, mediaUrls } = postContent;

      let sentimentResult, keyPhrasesResult, moderationLabels;
      let socialImpactScore = 50; // Start with a neutral score

      // 1. Analyze text with Comprehend
      if (text) {
        sentimentResult = await comprehendClient.send(
          new DetectSentimentCommand({ Text: text, LanguageCode: "en" })
        );
        keyPhrasesResult = await comprehendClient.send(
          new DetectKeyPhrasesCommand({ Text: text, LanguageCode: "en" })
        );

        // Adjust score based on sentiment
        if (sentimentResult.Sentiment === "POSITIVE") socialImpactScore += 20;
        if (sentimentResult.Sentiment === "NEGATIVE") socialImpactScore -= 30;
        if (sentimentResult.Sentiment === "MIXED") socialImpactScore -= 10;
      }

      // 2. Analyze images with Rekognition
      if (mediaUrls && mediaUrls.length > 0) {
        // For simplicity, analyze the first image
        let imageUrl = mediaUrls[0];
        if (!imageUrl.startsWith("s3://")) {
          imageUrl = `s3://${process.env.MEDIA_BUCKET_NAME}/${imageUrl}`;
        }
        const [bucket, key] = imageUrl.replace("s3://", "").split("/");
        moderationLabels = await rekognitionClient.send(
          new DetectModerationLabelsCommand({
            Image: { S3Object: { Bucket: bucket, Name: key } },
            MinConfidence: 75,
          })
        );

        // Adjust score based on moderation labels
        if (
          moderationLabels.ModerationLabels &&
          moderationLabels.ModerationLabels.length > 0
        ) {
          socialImpactScore -= 40; // Penalize heavily for moderation labels
        }
      }

      // 3. Simple scoring logic (placeholders)
      const analysisResult: AnalysisResult = {
        postId: postId || uuidv4(),
        sentiment: sentimentResult?.Sentiment || "N/A",
        keyPhrases:
          keyPhrasesResult?.KeyPhrases?.map((p) => p.Text || "") || [],
        inclusivityScore: 0, // Placeholder
        misinformationScore: 0, // Placeholder
        divisivenessScore: 0, // Placeholder
        socialImpactScore: Math.max(0, Math.min(100, socialImpactScore)), // Clamp score between 0 and 100
        ethicalInsights:
          moderationLabels?.ModerationLabels?.map((l) => l.Name || "") || [],
        timestamp: new Date().toISOString(),
      };

      // 4. Store results in DynamoDB
      await ddbDocClient.send(
        new PutCommand({
          TableName: tableName,
          Item: { ...analysisResult, status: "COMPLETED" },
        })
      );

      console.log(`Successfully processed post ${analysisResult.postId}`);
    } catch (error) {
      console.error("Error processing SQS record:", error);
      throw error; // Re-throw the error to send the message to the DLQ
    }
  }
};
