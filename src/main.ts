import { App, Validations } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";

import { AwsAccount } from "./constants/aws-account.constants";
import { AwsRegion } from "./constants/aws-region.constants";
import { ExternalService } from "./constants/external-services.constants";
import { GitHub } from "./constants/github.constants";
import { InstagramAutoReplyGitHubDeployRoleStack } from "./stacks/instagram-auto-reply-github-deploy-role-stack";
import { InstagramAutoReplyStage } from "./stage/instagram-auto-reply-stage";

/**
 * The AWS app. The deploy workflow deploys "Prod/*" on every push to main; the GitHub deploy role
 * stack is deployed once by a person before the first workflow run.
 */
const app = new App();

// cdk-nag runs as a CDK policy validation plugin: any unacknowledged finding fails synth (and the build).
Validations.of(app).addPlugins(new AwsSolutionsChecks(app, { verbose: true }));

const prodEnv = { account: AwsAccount.jf, region: AwsRegion.jf };

new InstagramAutoReplyGitHubDeployRoleStack(app, "InstagramAutoReplyGitHubDeployRoleStack", {
    env: prodEnv,
    projectName: "InstagramAutoReply",
    applicationEnvironment: "Prod",
    githubRepository: GitHub.repository,
    githubOidcSubjectPrefix: GitHub.oidcSubjectPrefix,
    githubOidcProviderArn: `arn:aws:iam::${prodEnv.account}:oidc-provider/token.actions.githubusercontent.com`,
    githubEnvironment: GitHub.deployEnvironment
});

new InstagramAutoReplyStage(app, "Prod", {
    env: prodEnv,
    common: {
        applicationEnvironment: "Prod",
        projectName: "InstagramAutoReply",
        cloudwatchLogGroupName: "/Prod/InstagramAutoReply"
    },
    instagram: { graphApiUrl: ExternalService.instagramGraphApiUrl },
    claude: { model: ExternalService.claudeModel },
    mongoDb: { databaseName: ExternalService.mongoDbDatabaseName },
    receiveWebhook: { applicationLogLevel: "info" },
    getContext: { applicationLogLevel: "info" },
    generateReply: { applicationLogLevel: "info" },
    sendReply: { applicationLogLevel: "info" },
    recordOutcome: { applicationLogLevel: "info" }
});

app.synth();
