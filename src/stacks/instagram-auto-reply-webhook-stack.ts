import { aws_lambda, aws_logs, aws_stepfunctions, CfnOutput, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

import { InstagramAutoReplyCommonStackProps } from "./instagram-auto-reply-common-stack";
import { ParameterName } from "../constants/parameter-names.constants";
import { LambdaHelper } from "../helpers/lambda.helper";
import { ParameterStoreHelper } from "../helpers/parameter-store.helper";
import { TaggingHelper } from "../helpers/tagging.helper";
import { ReceiveWebhookFunction } from "../lambda/receive-webhook/receive-webhook-function";

export interface InstagramAutoReplyWebhookStackProps extends InstagramAutoReplyCommonStackProps {
    readonly logGroup: aws_logs.ILogGroup;
    readonly lambdaArchitecture?: aws_lambda.Architecture;
    readonly applicationLogLevel?: string;
    readonly stateMachine: aws_stepfunctions.IStateMachine;
    /** Caps concurrent webhook invocations. Leave unset if the account's concurrency quota is low. */
    readonly reservedConcurrentExecutions?: number;
}

/**
 * The public endpoint Meta calls: a Lambda function URL. It has no IAM auth because Meta can't
 * sign AWS requests; every POST is authenticated by its X-Hub-Signature-256 HMAC instead, and
 * every GET by the verify token.
 */
export class InstagramAutoReplyWebhookStack extends Stack {
    public readonly receiveWebhookFunction: aws_lambda.IFunction;

    constructor(scope: Construct, id: string, props: InstagramAutoReplyWebhookStackProps) {
        super(scope, id, props);

        const receiveWebhookFunction = new ReceiveWebhookFunction(this, "ReceiveWebhookLambdaFunction", {
            ...LambdaHelper.standardOptions({
                functionName: `${props.common.applicationEnvironment}-${props.common.projectName}-ReceiveWebhook`,
                applicationEnvironment: props.common.applicationEnvironment,
                applicationLogLevel: props.applicationLogLevel,
                architecture: props.lambdaArchitecture,
                logGroup: props.logGroup,
                // Meta expects an answer within a few seconds and retries otherwise.
                timeout: Duration.seconds(10),
                environment: {
                    STATE_MACHINE_ARN: props.stateMachine.stateMachineArn
                }
            }),
            reservedConcurrentExecutions: props.reservedConcurrentExecutions
        });

        receiveWebhookFunction.addEnvironment(
            "INSTAGRAM_APP_SECRET_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(this, props.common, ParameterName.instagramAppSecret, receiveWebhookFunction)
        );
        receiveWebhookFunction.addEnvironment(
            "INSTAGRAM_VERIFY_TOKEN_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(
                this,
                props.common,
                ParameterName.instagramVerifyToken,
                receiveWebhookFunction
            )
        );

        props.stateMachine.grantStartExecution(receiveWebhookFunction);

        const webhookUrl = receiveWebhookFunction.addFunctionUrl({
            authType: aws_lambda.FunctionUrlAuthType.NONE
        });

        LambdaHelper.acknowledgeManagedPolicies(receiveWebhookFunction);

        new CfnOutput(this, "WebhookUrl", {
            description: "Callback URL to enter in the Meta app's Instagram webhook settings",
            value: webhookUrl.url
        });

        this.receiveWebhookFunction = receiveWebhookFunction;

        TaggingHelper.tagResource(this);
    }
}
