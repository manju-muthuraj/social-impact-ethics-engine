# social-impact-ethics-engine
Integrated Social Impact Scoring & Ethical Insights

This project implements a serverless application on AWS to analyze and score the social impact and ethical quality of social media content. It provides a "Social Impact Score" and "Ethical Insights" using AWS Comprehend for text analysis and AWS Rekognition for image moderation.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Deployment to AWS](#deployment-to-aws)
- [Testing the APIs](#testing-the-apis)
  - [1. Authentication (Cognito)](#1-authentication-cognito)
  - [2. Submit Content API (POST /submit)](#2-submit-content-api-post-submit)
  - [3. Get Analysis Results API (GET /results/{postId})](#3-get-analysis-results-api-get-analysis-results-api)
- [Running Tests](#running-tests)

## Architecture Overview
The application uses a serverless architecture on AWS:
- **Amazon Cognito:** For user authentication and authorization.
- **Amazon API Gateway:** Exposes REST endpoints for submitting content and retrieving analysis results.
- **Amazon SQS:** Decouples content submission from analysis, acting as a buffer.
- **AWS Lambda:**
    - `ProcessPostLambda`: Triggered by SQS messages, performs text analysis (Comprehend) and image moderation (Rekognition), calculates a social impact score, and stores results.
    - `GetResultsLambda`: Retrieves analysis results from DynamoDB.
- **Amazon DynamoDB:** Stores the social impact analysis results.
- **AWS Comprehend:** Used for sentiment analysis and key phrase extraction from text.
- **AWS Rekognition:** Used for content moderation on images.
- **AWS CDK:** Used for defining and deploying the infrastructure as code.

## Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js** (LTS version, e.g., 18.x or 20.x)
- **npm** (comes with Node.js)
- **AWS CLI** configured with credentials for an AWS account where you have permissions to deploy resources.
- **AWS CDK CLI**: Install globally using `npm install -g aws-cdk`.

## Local Setup
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/manju-muthuraj/social-impact-ethics-engine.git
    cd social-impact-ethics-engine
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```

## Deployment to AWS
1.  **Bootstrap your AWS environment (one-time setup per AWS account/region):**
    This command deploys a CDK Toolkit staging stack into your AWS account.
    ```bash
    npm run bootstrap
    ```
2.  **Deploy the application:**
    This command will deploy all the AWS resources defined in the CDK stack (Cognito User Pool, API Gateway, SQS Queue, Lambda functions, DynamoDB Table).
    ```bash
    npm run deploy
    ```
    The deployment process might take several minutes. Upon successful completion, the CDK will output the API Gateway endpoint URL and other resource details. Make a note of the API Gateway URL.

## Testing the APIs

This section provides instructions for testing the deployed APIs using both `curl` commands and Postman.

### Using Postman (Recommended)

1.  **Download and Install Postman:**
    If you don't have it, download Postman from [https://www.postman.com/downloads/](https://www.postman.com/downloads/).


2.  **Import Postman Collection:**
    
    a.  Open Postman.
    
    b.  Click on `File > Import`.
    
    c.  Select the `Social Impact Ethics Engine API.postman_collection.json` file from the root of this project.
    
    d.  Postman will create a new collection based on the API definition.


3.  **Configure Environment Variables:**
    
    a.  After deployment, you will get `YOUR_API_GATEWAY_URL`, `YOUR_COGNITO_USER_POOL_CLIENT_ID`, and `YOUR_COGNITO_USER_POOL_ID` from the CDK output.
    
    b.  In Postman, create a new environment (click the gear icon in the top right).
    
    c.  Add the following variables to your environment:
        -   `API_GATEWAY_URL`: Your deployed API Gateway URL (e.g., `https://xxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod`)
        -   `COGNITO_USER_POOL_CLIENT_ID`: Your Cognito User Pool Client ID.
        -   `COGNITO_USER_POOL_ID`: Your Cognito User Pool ID.
    
    d.  Select this new environment as the active environment.


4.  **Authentication (Cognito) in Postman:**
    
    a.  **Sign Up:** You'll need to use the AWS CLI for the initial sign-up and confirmation steps as described in the "Using AWS CLI (Example)" section below.

    
    b.  **Get ID Token:** Once your user is confirmed, you can use a Postman request to get the ID Token.

    -   Create a new `POST` request.
        
        -   **URL:** `https://cognito-idp.<YOUR_AWS_REGION>.amazonaws.com/` (e.g., `https://cognito-idp.us-east-1.amazonaws.com/`)
        
        -   **Headers:**
            -   `Content-Type`: `application/x-amz-json-1.1`
            -   `X-Amz-Target`: `AWSCognitoIdentityProviderService.InitiateAuth`
        
        -   **Body (raw JSON):**
        
            ```json
            {
                "AuthFlow": "USER_PASSWORD_AUTH",
                "AuthParameters": {
                    "USERNAME": "testuser",
                    "PASSWORD": "YourSecurePassword1!"
                },
                "ClientId": "{{COGNITO_USER_POOL_CLIENT_ID}}"
            }
            ```
        
        -   Send the request. The `AuthenticationResult.IdToken` from the response is your `YOUR_ID_TOKEN`.


5.  **Using the Imported Collection:**

    a.  In the imported collection, select the request you want to test (e.g., `GET /upload-url`).

    b.  **Update URL:** The URL should automatically use `{{API_GATEWAY_URL}}` from your environment.

    c.  **Authorization:** Go to the `Authorization` tab, select `Bearer Token` from the `Type` dropdown, and paste your `YOUR_ID_TOKEN` into the `Token` field.
    
    d.  **Send Request:** Execute the request.

### Using AWS CLI (Example)

#### 1. Authentication (Cognito)
Before interacting with the APIs, you need to sign up and sign in to get an authentication token.

a.  **Sign Up:**

```bash
aws cognito-idp sign-up --client-id <YOUR_COGNITO_USER_POOL_CLIENT_ID> --username testuser --password YourSecurePassword1! --user-attributes Name=email,Value=testuser@example.com
```

    
Replace `<YOUR_COGNITO_USER_POOL_CLIENT_ID>` with the Client ID from your deployed Cognito User Pool. You can find this in the AWS Console under Cognito -> User Pools -> Your User Pool -> App integration -> App clients and analytics.

b.  **Confirm User (if auto-verification is not enabled or email is not configured):**
```bash
aws cognito-idp admin-confirm-sign-up --user-pool-id <YOUR_COGNITO_USER_POOL_ID> --username testuser
```
    
Replace `<YOUR_COGNITO_USER_POOL_ID>` with your User Pool ID.

c.  **Sign In:**
```bash
aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id <YOUR_COGNITO_USER_POOL_CLIENT_ID> --auth-parameters USERNAME=testuser,PASSWORD=YourSecurePassword1!
```

This command will return an `AuthenticationResult` object containing an `IdToken` and `AccessToken`. You will use the `IdToken` for authenticating API Gateway requests.

#### 2. Get Pre-Signed S3 Upload URL (GET /upload-url)
This API allows you to obtain a pre-signed URL to directly upload media content to an S3 bucket. This is the first step before submitting a post with media.

-   **Method:** `GET`
-   **Endpoint:** `YOUR_API_GATEWAY_URL/upload-url?fileName=<YOUR_FILE_NAME>&contentType=<YOUR_CONTENT_TYPE>`
-   **Headers:**
    -   `Authorization: Bearer <YOUR_ID_TOKEN>` (from Cognito sign-in)

**Query Parameters:**
-   `fileName`: The desired name of the file in the S3 bucket (e.g., `my-image.jpg`, `videos/my-video.mp4`).
-   `contentType`: The MIME type of the file (e.g., `image/jpeg`, `video/mp4`).


**Example using `curl`:**
```bash
# 1. Get the pre-signed URL


curl -X GET \
  -H "Authorization: Bearer <YOUR_ID_TOKEN>" \
  "YOUR_API_GATEWAY_URL/upload-url?fileName=my-test-image.jpg&contentType=image/jpeg"
```
This will return a JSON object containing `url` (the pre-signed URL) and `fields` (form fields for the upload).

```json
{
  "url": "https://social-impact-media-<ACCOUNT_ID>-<REGION>.s3.amazonaws.com/",
  "fields": {
    "key": "my-test-image.jpg",
    "AWSAccessKeyId": "...",
    "policy": "...",
    "signature": "...",
    "Content-Type": "image/jpeg"
  }
}
```

```bash
# 2. Upload the file using the pre-signed URL (example for an image)
#    Replace <PRE_SIGNED_URL> and <FORM_FIELDS> with values from the previous step.
#    The @/path/to/your/file.jpg should point to your local file.
curl -X POST <PRE_SIGNED_URL> \
  -F "key=<FORM_FIELDS_KEY>" \
  -F "AWSAccessKeyId=<FORM_FIELDS_AWSAccessKeyId>" \
  -F "policy=<FORM_FIELDS_POLICY>" \
  -F "signature=<FORM_FIELDS_SIGNATURE>" \
  -F "Content-Type=<FORM_FIELDS_ContentType>" \
  -F "file=@/path/to/your/local/image.jpg"
```

#### 3. Submit Content API (POST /submit)
This API allows you to submit social media content for analysis. It's integrated with SQS, so the analysis happens asynchronously.

-   **Method:** `POST`
-   **Endpoint:** `YOUR_API_GATEWAY_URL/submit`
-   **Headers:**
    -   `Content-Type: application/json`
    -   `Authorization: Bearer <YOUR_ID_TOKEN>` (from Cognito sign-in)
-   **Body (JSON):**
    ```json
    {
      "postId": "unique-post-id-123",
      "text": "This is a great day! Feeling positive and inclusive.",
      "mediaUrls": ["s3://social-impact-media-<ACCOUNT_ID>-<REGION>/my-test-image.jpg"]
    }
    ```
    **Note:** For `mediaUrls`, you should provide the S3 URI of the media content that was previously uploaded using the `/upload-url` endpoint. The `ProcessPostLambda` will attempt to use Rekognition on this image.

**Example using `curl`:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_ID_TOKEN>" \
  -d '{
        "postId": "my-first-post",
        "userId": "user-123",
        "text": "This is an amazing and positive message for everyone!",
        "mediaUrls": ["s3://social-impact-media-<ACCOUNT_ID>-<REGION>/my-first-image.jpg"]
      }' \
  YOUR_API_GATEWAY_URL/submit
```

#### 4. Get Analysis Results API (GET /results/{postId})
This API allows you to retrieve the analysis results for a previously submitted post.

-   **Method:** `GET`
-   **Endpoint:** `YOUR_API_GATEWAY_URL/results/{postId}`
-   **Headers:**
    -   `Authorization: Bearer <YOUR_ID_TOKEN>` (from Cognito sign-in)

**Example using `curl`:**
```bash
curl -X GET \
  -H "Authorization: Bearer <YOUR_ID_TOKEN>" \
  YOUR_API_GATEWAY_URL/results/my-first-post
```
Replace `my-first-post` with the `postId` you submitted. It might take a few moments for the `ProcessPostLambda` to analyze the content and store the results, so you might need to try fetching the results a few times.


## Running Tests
To run the unit and infrastructure tests locally:
```bash
npm test
```
