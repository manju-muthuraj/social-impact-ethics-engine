# Gemini Code Assistant Context

This document provides context for the Gemini Code Assistant to understand the "Social Impact Ethics Engine" project.

## Project Overview

The Social Impact Ethics Engine is a serverless application built on AWS that analyzes text and image content to generate a "social impact score" and provide ethical insights. Users can submit content, and the engine will process it asynchronously to evaluate sentiment, detect key phrases, and identify potentially harmful content in images.

## High-Level Architecture

The application uses the following AWS services:

-   **Amazon API Gateway:** Provides RESTful endpoints for submitting content and retrieving analysis results.
-   **Amazon Cognito:** Handles user authentication and authorizes API requests.
-   **Amazon SQS (Simple Queue Service):** Decouples the initial content submission from the backend processing. New analysis requests are sent as messages to an SQS queue.
-   **AWS Lambda:**
    -   A **`process-post`** function is triggered by new messages in the SQS queue. It orchestrates the analysis using Comprehend and Rekognition and stores the results.
    -   A **`get-results`** function retrieves analysis results from DynamoDB.
    -   A **`generate-presigned-url`** function creates a secure, temporary URL for clients to upload media files directly to S3.
-   **Amazon DynamoDB:** A NoSQL database used to store the analysis results, indexed by a unique `postId`.
-   **Amazon S3:** Stores uploaded media files (images) for analysis.
-   **Amazon Comprehend:** Used for Natural Language Processing (NLP) to analyze text for sentiment and key phrases.
-   **Amazon Rekognition:** Used to detect moderation labels (e.g., violence, hate symbols) in images.
-   **AWS CDK (Cloud Development Kit):** The entire infrastructure is defined as code using TypeScript and the CDK.

## Assistant Coding Guidelines

*   **Idiomatic Code:** Write all new code in a style that is idiomatic and consistent with the language standard. Before writing code, analyze the surrounding files to understand established patterns, naming conventions, and architectural choices. Strive to make your contributions blend in seamlessly.
*   **Verify Frameworks:** Never assume a library or framework is available. Before using one, verify it is already an established part of the project by checking `package.json`, existing imports, and surrounding code.
*   **Style & Structure:** Mimic the style (formatting, naming), structure, framework choices, typing, and architectural patterns of existing code in the project.
*   **Idiomatic Changes:** When editing, understand the local context (imports, functions/classes) to ensure your changes integrate naturally and idiomatically.
*   **Comments:** Add code comments sparingly. Focus on *why* something is done, especially for complex logic, rather than *what* is done. Only add high-value comments if necessary for clarity or if requested by the user. Do not edit comments that are separate from the code you are changing. *NEVER* talk to the user or describe your changes through comments.
* **Proactiveness:** Fulfill the user's request thoroughly, including reasonable, directly implied follow-up actions.
* **Confirm Ambiguity/Expansion:** Do not take significant actions beyond the clear scope of the request without confirming with the user. If asked *how* to do something, explain first, don't just do it.
* **Path Construction:** Before using any file system tool (e.g., ${ReadFileTool.Name}' or '${WriteFileTool.Name}'), you must construct the full absolute path for the file_path argument. Always combine the absolute path of the project's root directory with the file's path relative to the root. For example, if the project root is /path/to/project/ and the file is foo/bar/baz.txt, the final path you must use is /path/to/project/foo/bar/baz.txt. If the user provides a relative path, you must resolve it against the root directory to create an absolute path.
* **Do Not revert changes:** Do not revert changes to the codebase unless asked to do so by the user. Only revert changes made by you if they have resulted in an error or if the user has explicitly asked you to revert the changes.

## Key NPM Scripts

The `package.json` file contains several important scripts for managing the project:

- `npm install`: Installs all project dependencies.
- `npm run build`: Compiles all TypeScript source code (including CDK and lambdas) and bundles the lambda functions using `esbuild`.
- `npm test`: Runs the unit tests for the project using Jest.
- `npm run deploy`: Deploys the entire application stack to your configured AWS account. It automatically synthesizes the CloudFormation template, builds the code, and executes the deployment.
- `npm run bootstrap`: (Run once per AWS account/region) Prepares the AWS environment for CDK deployments.

## Development Workflow

1.  **Initial Setup:**

    - Ensure you have Node.js, the AWS CLI, and Docker installed and configured.
    - Clone the repository.
    - Run `npm install` to download dependencies.
    - If this is your first time using CDK in this AWS account/region, run `npm run bootstrap`.

2.  **Making Changes:**

    - Modify the lambda function code in `src/lambdas/`.
    - Modify the infrastructure definition in `src/cdk/social-impact-stack.ts`.
    - Add or update unit tests in `src/test/`.

3.  **Building:**

    - Run `npm run build` to compile your changes.

4.  **Testing:**

    - After making any code modifications, run the full test suite using `npm test` to ensure your changes haven't introduced any regressions.
    - If you add new features or change existing logic, add corresponding new tests to maintain coverage.

5.  **Deploying:**
    - Run `npm run deploy` to deploy your changes to AWS. The command will output the API endpoint URL upon completion.

---

_This document is intended for the Gemini Code Assistant. Last updated: 2025-07-30_
