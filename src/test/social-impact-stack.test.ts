
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SocialImpactStack } from '../cdk/social-impact-stack';

describe('SocialImpactStack', () => {
  it('should match the snapshot', () => {
    const app = new cdk.App();
    const stack = new SocialImpactStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    expect(template.toJSON()).toMatchSnapshot();
  });
});
