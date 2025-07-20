import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as path from "path";
import * as logs from "aws-cdk-lib/aws-logs";
import * as eventsources from "aws-cdk-lib/aws-lambda-event-sources";

export class SocialImpactStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- Cognito User Pool ---
    const userPool = new cognito.UserPool(this, "SocialImpactUserPool", {
      userPoolName: "social-impact-user-pool",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
    });

    // --- Cognito User Pool Client ---
    const userPoolClient = new cognito.UserPoolClient(
      this,
      "SocialImpactUserPoolClient",
      {
        userPool,
        userPoolClientName: "social-impact-api-client",
        generateSecret: false, // Don't generate a client secret for web apps
        authFlows: {
          adminUserPassword: true,
          userSrp: true,
        },
        supportedIdentityProviders: [
          cognito.UserPoolClientIdentityProvider.COGNITO,
        ],
      }
    );

    // --- DynamoDB Table ---
    const resultsTable = new dynamodb.Table(this, "AnalysisResultsTable", {
      tableName: "social-impact-analysis-results",
      partitionKey: { name: "postId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
    });

    // --- SQS Queue ---
    const postQueue = new sqs.Queue(this, "PostAnalysisQueue", {
      queueName: "social-impact-post-analysis-queue",
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    // DLQ for ProcessPostLambda
    const processPostDlq = new sqs.Queue(this, "ProcessPostDLQ", {
      queueName: "social-impact-process-post-dlq",
      retentionPeriod: cdk.Duration.days(7), // Retain messages for 7 days
    });

    // --- S3 Bucket for Media Content ---
    const mediaBucket = new s3.Bucket(this, "MediaContentBucket", {
      bucketName: `social-impact-media-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
      autoDeleteObjects: true, // NOT recommended for production
    });

    // --- Lambda Functions ---
    const processPostLambda = new lambda.Function(this, "ProcessPostLambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "process-post.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist/lambdas")),
      environment: {
        TABLE_NAME: resultsTable.tableName,
        MEDIA_BUCKET_NAME: mediaBucket.bucketName,
      },
      deadLetterQueue: processPostDlq, // Attach DLQ
    });

    const getResultsLambda = new lambda.Function(this, "GetResultsLambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "get-results.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist/lambdas")),
      environment: {
        TABLE_NAME: resultsTable.tableName,
      },
    });

    const generatePresignedUrlLambda = new lambda.Function(
      this,
      "GeneratePresignedUrlLambda",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "generate-presigned-url.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../../dist/lambdas")),
        environment: {
          MEDIA_BUCKET_NAME: mediaBucket.bucketName,
        },
      }
    );

    // --- API Gateway ---
    const logGroup = new logs.LogGroup(this, "SocialImpactApiLogs");
    const api = new apigateway.RestApi(this, "SocialImpactApi", {
      restApiName: "Social Impact API",
      deployOptions: {
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // --- Cognito Authorizer ---
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "CognitoAuthorizer",
      {
        cognitoUserPools: [userPool],
      }
    );

    // Grant permissions
    mediaBucket.grantRead(processPostLambda);
    mediaBucket.grantWrite(generatePresignedUrlLambda);
    resultsTable.grantReadWriteData(processPostLambda);
    resultsTable.grantReadData(getResultsLambda);

    // Grant Comprehend permissions to ProcessPostLambda
    processPostLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["comprehend:DetectSentiment", "comprehend:DetectKeyPhrases"],
        resources: ["*"], // Comprehend actions are not resource-specific
      })
    );

    // Grant Rekognition permissions to ProcessPostLambda
    processPostLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["rekognition:DetectModerationLabels"],
        resources: ["*"], // Rekognition actions are not resource-specific
      })
    );

    postQueue.grantConsumeMessages(processPostLambda);
    processPostLambda.addEventSource(
      new eventsources.SqsEventSource(postQueue)
    );

    // --- API Gateway Endpoints ---

    const submitResource = api.root.addResource("submit");

    const resultsResource = api.root
      .addResource("results")
      .addResource("{postId}");
    const uploadUrlResource = api.root.addResource("upload-url");

    // GET /upload-url endpoint (Lambda integration)
    const uploadUrlLambdaIntegration = new apigateway.LambdaIntegration(
      generatePresignedUrlLambda
    );
    uploadUrlResource.addMethod("GET", uploadUrlLambdaIntegration, {
      authorizer,
    });

    // POST /submit endpoint (SQS integration)
    const sqsIntegrationRole = new iam.Role(this, "SqsIntegrationRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });
    postQueue.grantSendMessages(sqsIntegrationRole);

    const sqsIntegration = new apigateway.AwsIntegration({
      service: "sqs",
      path: postQueue.queueName,
      integrationHttpMethod: "POST",
      options: {
        credentialsRole: sqsIntegrationRole,
        requestParameters: {
          "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`,
        },
        requestTemplates: {
          "application/json": "Action=SendMessage&MessageBody=$input.body",
        },
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": '{"message": "Post submitted for analysis"}',
            },
          },
        ],
      },
    });

    submitResource.addMethod("POST", sqsIntegration, {
      authorizer,
      methodResponses: [{ statusCode: "200" }],
    });

    // GET /results/{postId} endpoint (Lambda integration)

    const lambdaIntegration = new apigateway.LambdaIntegration(
      getResultsLambda
    );

    resultsResource.addMethod("GET", lambdaIntegration, {
      authorizer,
    });

    // --- Stack Outputs ---
    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "The ID of the Cognito User Pool",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "The ID of the Cognito User Pool Client",
    });

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.url,
      description: "The endpoint URL for the API",
      exportName: "ApiEndpoint", // Export the value for cross-stack reference
    });
  }
}
