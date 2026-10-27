import { App, Stack, Validations } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { AwsSolutionsChecks } from "cdk-nag";

import * as cdkJson from "../cdk.json";
import { InstagramAutoReplyStage } from "../src/stage/instagram-auto-reply-stage";

describe("InstagramAutoReplyStage", () => {
    // Load the project's feature flags so the test synthesizes exactly what cdk synth does.
    const app = new App({ context: cdkJson.context });
    Validations.of(app).addPlugins(new AwsSolutionsChecks(app));

    const stage = new InstagramAutoReplyStage(app, "Test", {
        env: { account: "123456789012", region: "eu-west-1" },
        common: {
            projectName: "InstagramAutoReply",
            applicationEnvironment: "Test",
            cloudwatchLogGroupName: "/Test/InstagramAutoReply"
        },
        instagram: { graphApiUrl: "https://graph.instagram.com/v24.0" },
        claude: { model: "claude-opus-5-5" },
        mongoDb: { databaseName: "themanualformen" },
        receiveWebhook: {},
        getContext: {},
        generateReply: {},
        sendReply: {},
        recordOutcome: {}
    });

    const templateFor = (stackId: string) => Template.fromStack(stage.node.findChild(stackId) as Stack);

    test.each([
        ["InstagramAutoReplyGetContextLambdaStack", "GetContext"],
        ["InstagramAutoReplyGenerateReplyLambdaStack", "GenerateReply"],
        ["InstagramAutoReplySendReplyLambdaStack", "SendReply"],
        ["InstagramAutoReplyRecordOutcomeLambdaStack", "RecordOutcome"],
        ["InstagramAutoReplyWebhookStack", "ReceiveWebhook"]
    ])("%s: the %s Lambda defaults to ARM_64 with the project runtime", (stackId, component) => {
        templateFor(stackId).hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: `Test-InstagramAutoReply-${component}`,
            Architectures: ["arm64"],
            Runtime: "nodejs24.x"
        });
    });

    test("GenerateReply uses the configured Claude model and reads only the Anthropic API key", () => {
        const template = templateFor("InstagramAutoReplyGenerateReplyLambdaStack");

        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                Variables: Match.objectLike({
                    CLAUDE_MODEL: "claude-opus-5-5",
                    ANTHROPIC_API_KEY_PARAMETER_NAME: "/Test/InstagramAutoReply/Anthropic/ApiKey"
                })
            }
        });
        template.hasResourceProperties("AWS::IAM::Policy", {
            PolicyDocument: {
                Statement: [
                    Match.objectLike({
                        Resource:
                            "arn:aws:ssm:eu-west-1:123456789012:parameter/Test/InstagramAutoReply/Anthropic/ApiKey"
                    })
                ]
            }
        });
    });

    test("The webhook is a public function URL that can start the state machine", () => {
        const template = templateFor("InstagramAutoReplyWebhookStack");

        template.hasResourceProperties("AWS::Lambda::Url", { AuthType: "NONE" });
        template.hasResourceProperties("AWS::IAM::Policy", {
            PolicyDocument: {
                Statement: Match.arrayWith([Match.objectLike({ Action: "states:StartExecution" })])
            }
        });
        template.hasOutput("WebhookUrl", {});
    });

    test("State machine logs to the shared log group", () => {
        templateFor("InstagramAutoReplyStepFunctionsStack").hasResourceProperties("AWS::StepFunctions::StateMachine", {
            StateMachineName: "Test-InstagramAutoReply-StateMachine",
            LoggingConfiguration: Match.objectLike({ Level: "ALL", IncludeExecutionData: true })
        });
    });

    test("The failed reply queue enforces TLS", () => {
        const template = templateFor("InstagramAutoReplyCommonStack");

        template.hasResourceProperties("AWS::SQS::Queue", { QueueName: "Test-InstagramAutoReply-FailedReplyQueue" });
        template.resourceCountIs("AWS::SQS::QueuePolicy", 1);
    });

    test("The state machine can only invoke the functions themselves, not their versions", () => {
        templateFor("InstagramAutoReplyStepFunctionsStack").hasResourceProperties("AWS::IAM::Policy", {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: "lambda:InvokeFunction",
                        Resource: Array(4).fill({ "Fn::ImportValue": Match.anyValue() })
                    })
                ])
            }
        });
    });

    test("Cross-stack references are strong (LocalStack can't resolve weak Fn::GetStackOutput)", () => {
        const stepFunctionsTemplate = JSON.stringify(templateFor("InstagramAutoReplyStepFunctionsStack").toJSON());
        expect(stepFunctionsTemplate).toContain("Fn::ImportValue");
        expect(stepFunctionsTemplate).not.toContain("Fn::GetStackOutput");
    });

    test("Has no unacknowledged cdk-nag findings (synth throws 'Validation failed' otherwise)", () => {
        expect(() => app.synth()).not.toThrow();
    });
});
