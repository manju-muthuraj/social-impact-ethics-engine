#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SocialImpactStack } from './social-impact-stack';

const app = new cdk.App();
new SocialImpactStack(app, 'SocialImpactStack', {
  env: { region: 'us-east-1' },
});