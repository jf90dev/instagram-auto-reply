import * as path from "path";
import { aws_lambda, aws_logs, aws_sqs, aws_stepfunctions, RemovalPolicy, Stack, Validations } from "aws-cdk-lib";
import { Construct } from "constructs";

import { InstagramAutoReplyCommonStackProps } from "./instagram-auto-reply-common-stack";
import { LambdaHelper } from "../helpers/lambda.helper";
import { TaggingHelper } from "../helpers/tagging.helper";

export interface InstagramAutoReplyStepFunctionsStackProps extends InstagramAutoReplyCommonStackProps {
    readonly logGroup: aws_logs.ILogGroup;
    readonly failedReplyQueue: aws_sqs.IQueue;
    readonly getContextFunction: aws_lambda.IFunction;
    readonly generateReplyFunction: aws_lambda.IFunction;
    readonly sendReplyFunction: aws_lambda.IFunction;
    readonly recordOutcomeFunction: aws_lambda.IFunction;
}

/**
 * One execution per comment or direct message: get context, generate a reply, send it (auto
 * mode only) and record the outcome.
 */
export class InstagramAutoReplyStepFunctionsStack extends Stack {
    public readonly stateMachine: aws_stepfunctions.IStateMachine;

    constructor(scope: Construct, id: string, props: InstagramAutoReplyStepFunctionsStackProps) {
        super(scope, id, props);

        const stateMachine = new aws_stepfunctions.StateMachine(this, "InstagramAutoReplyStateMachine", {
            stateMachineName: `${props.common.applicationEnvironment}-${props.common.projectName}-StateMachine`,
            definitionBody: aws_stepfunctions.DefinitionBody.fromFile(
                path.join(__dirname, "../step-functions/instagram-auto-reply.asl.json")
            ),
            definitionSubstitutions: {
                GetContextLambdaFunctionArn: props.getContextFunction.functionArn,
                GenerateReplyLambdaFunctionArn: props.generateReplyFunction.functionArn,
                SendReplyLambdaFunctionArn: props.sendReplyFunction.functionArn,
                RecordOutcomeLambdaFunctionArn: props.recordOutcomeFunction.functionArn,
                FailedReplyQueueUrl: props.failedReplyQueue.queueUrl
            },
            logs: {
                destination: props.logGroup,
                level: aws_stepfunctions.LogLevel.ALL,
                includeExecutionData: true
            },
            removalPolicy: RemovalPolicy.DESTROY
        });

        for (const lambdaFunction of [
            props.getContextFunction,
            props.generateReplyFunction,
            props.sendReplyFunction,
            props.recordOutcomeFunction
        ]) {
            LambdaHelper.grantInvokeFunction(lambdaFunction, stateMachine);
        }
        props.failedReplyQueue.grantSendMessages(stateMachine);

        Validations.of(stateMachine).acknowledge({
            id: "AwsSolutions-SF2",
            reason: "Team standard: no X-Ray tracing. Executions are traced through the shared log group and the ExecutionId correlation id."
        });
        Validations.of(stateMachine).acknowledge({
            id: "AwsSolutions-IAM5[Resource::*]",
            reason: "The CloudWatch Logs delivery actions CDK grants for state machine logging don't support resource-level permissions."
        });

        this.stateMachine = stateMachine;

        TaggingHelper.tagResource(this);
    }
}
