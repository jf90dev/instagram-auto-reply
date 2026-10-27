import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";

import { InstagramAutoReplyCommonStack } from "../src/stacks/instagram-auto-reply-common-stack";

test("InstagramAutoReplyCommonStack creates the application log group", () => {
    const app = new App();
    const stack = new InstagramAutoReplyCommonStack(app, "InstagramAutoReplyCommonStack", {
        env: { account: "123456789012", region: "eu-west-1" },
        common: {
            projectName: "InstagramAutoReply",
            applicationEnvironment: "Dev1",
            cloudwatchLogGroupName: "/Dev1/InstagramAutoReply"
        }
    });

    Template.fromStack(stack).hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: "/Dev1/InstagramAutoReply"
    });
});
