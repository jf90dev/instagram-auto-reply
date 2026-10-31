import { App, AspectPriority, Aspects, aws_lambda, Duration, Validations } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";

import { LocalStackCompatibilityAspect } from "./localstack-compatibility.aspect";
import { AwsAccount } from "../constants/aws-account.constants";
import { AwsRegion } from "../constants/aws-region.constants";
import { ExternalService } from "../constants/external-services.constants";
import { InstagramAutoReplyStage } from "../stage/instagram-auto-reply-stage";

/**
 * The LocalStack app: the same Stage as src/main.ts with local settings. Only ever run through
 * cdklocal (the localstack:* tasks).
 */
const app = new App();

Validations.of(app).addPlugins(new AwsSolutionsChecks(app, { verbose: true }));

// Lambdas reach the docker-compose services by container name (LAMBDA_DOCKER_NETWORK).
const mockoonUrl = "http://mockoon:3001";

const localStage = new InstagramAutoReplyStage(app, "Local", {
    env: { account: AwsAccount.localstack, region: AwsRegion.localstack },
    // LocalStack runs Lambda on x86_64; AWS environments use the ARM_64 default.
    lambdaArchitecture: aws_lambda.Architecture.X86_64,
    common: {
        projectName: "InstagramAutoReply",
        applicationEnvironment: "Local",
        cloudwatchLogGroupName: "/Local/InstagramAutoReply"
    },
    instagram: { graphApiUrl: `${mockoonUrl}/instagram` },
    claude: { model: ExternalService.claudeModel, anthropicBaseUrl: `${mockoonUrl}/anthropic` },
    mongoDb: { databaseName: ExternalService.mongoDbDatabaseName },
    pollComments: { pollInterval: Duration.minutes(5) },
    getContext: {},
    generateReply: {},
    sendReply: {},
    recordOutcome: {}
});

// Aspects don't cross Stage boundaries, so this goes on the stage, not the app.
Aspects.of(localStage).add(new LocalStackCompatibilityAspect(), { priority: AspectPriority.MUTATING });

app.synth();
