import { aws_lambda, Duration, Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import {
    InstagramAutoReplyCommonProps,
    InstagramAutoReplyCommonStack
} from "../stacks/instagram-auto-reply-common-stack";
import { InstagramAutoReplyGenerateReplyLambdaStack } from "../stacks/instagram-auto-reply-generate-reply-lambda-stack";
import { InstagramAutoReplyGetContextLambdaStack } from "../stacks/instagram-auto-reply-get-context-lambda-stack";
import { InstagramAutoReplyPollCommentsLambdaStack } from "../stacks/instagram-auto-reply-poll-comments-lambda-stack";
import { InstagramAutoReplyRecordOutcomeLambdaStack } from "../stacks/instagram-auto-reply-record-outcome-lambda-stack";
import { InstagramAutoReplySendReplyLambdaStack } from "../stacks/instagram-auto-reply-send-reply-lambda-stack";
import { InstagramAutoReplyStepFunctionsStack } from "../stacks/instagram-auto-reply-step-functions-stack";
export interface InstagramAutoReplyStageProps extends StageProps {
    readonly common: InstagramAutoReplyCommonProps;
    readonly lambdaArchitecture?: aws_lambda.Architecture;
    readonly instagram: {
        /** Base URL of the Instagram API with Instagram Login, including the version. */
        readonly graphApiUrl: string;
    };
    readonly claude: {
        readonly model: string;
        /** Only set locally, where Mockoon stands in for the Claude API. */
        readonly anthropicBaseUrl?: string;
    };
    readonly mongoDb: {
        readonly databaseName: string;
    };
    readonly pollComments: {
        readonly applicationLogLevel?: string;
        readonly pollInterval: Duration;
    };
    readonly getContext: {
        readonly applicationLogLevel?: string;
    };
    readonly generateReply: {
        readonly applicationLogLevel?: string;
    };
    readonly sendReply: {
        readonly applicationLogLevel?: string;
    };
    readonly recordOutcome: {
        readonly applicationLogLevel?: string;
    };
}

/**
 * One deployable instance of the InstagramAutoReply application. Used by src/main.ts for every AWS
 * environment and by src/local/main.ts for LocalStack, so both deploy the same stacks.
 * Stack ordering comes from the resources passed between stacks via props.
 */
export class InstagramAutoReplyStage extends Stage {
    constructor(scope: Construct, id: string, props: InstagramAutoReplyStageProps) {
        super(scope, id, props);

        const commonStackProperties = { common: props.common };

        const instagramAutoReplyCommonStack = new InstagramAutoReplyCommonStack(this, "InstagramAutoReplyCommonStack", {
            ...commonStackProperties
        });

        const lambdaStackProperties = {
            ...commonStackProperties,
            lambdaArchitecture: props.lambdaArchitecture,
            logGroup: instagramAutoReplyCommonStack.logGroup
        };

        const getContextLambdaStack = new InstagramAutoReplyGetContextLambdaStack(
            this,
            "InstagramAutoReplyGetContextLambdaStack",
            {
                ...lambdaStackProperties,
                ...props.getContext,
                instagramGraphApiUrl: props.instagram.graphApiUrl,
                mongoDbDatabaseName: props.mongoDb.databaseName
            }
        );

        const generateReplyLambdaStack = new InstagramAutoReplyGenerateReplyLambdaStack(
            this,
            "InstagramAutoReplyGenerateReplyLambdaStack",
            {
                ...lambdaStackProperties,
                ...props.generateReply,
                claudeModel: props.claude.model,
                anthropicBaseUrl: props.claude.anthropicBaseUrl
            }
        );

        const sendReplyLambdaStack = new InstagramAutoReplySendReplyLambdaStack(
            this,
            "InstagramAutoReplySendReplyLambdaStack",
            {
                ...lambdaStackProperties,
                ...props.sendReply,
                instagramGraphApiUrl: props.instagram.graphApiUrl
            }
        );

        const recordOutcomeLambdaStack = new InstagramAutoReplyRecordOutcomeLambdaStack(
            this,
            "InstagramAutoReplyRecordOutcomeLambdaStack",
            {
                ...lambdaStackProperties,
                ...props.recordOutcome,
                mongoDbDatabaseName: props.mongoDb.databaseName
            }
        );

        const stepFunctionsStack = new InstagramAutoReplyStepFunctionsStack(
            this,
            "InstagramAutoReplyStepFunctionsStack",
            {
                ...commonStackProperties,
                logGroup: instagramAutoReplyCommonStack.logGroup,
                failedReplyQueue: instagramAutoReplyCommonStack.failedReplyQueue,
                getContextFunction: getContextLambdaStack.getContextFunction,
                generateReplyFunction: generateReplyLambdaStack.generateReplyFunction,
                sendReplyFunction: sendReplyLambdaStack.sendReplyFunction,
                recordOutcomeFunction: recordOutcomeLambdaStack.recordOutcomeFunction
            }
        );

        new InstagramAutoReplyPollCommentsLambdaStack(this, "InstagramAutoReplyPollCommentsLambdaStack", {
            ...lambdaStackProperties,
            applicationLogLevel: props.pollComments.applicationLogLevel,
            pollInterval: props.pollComments.pollInterval,
            instagramGraphApiUrl: props.instagram.graphApiUrl,
            mongoDbDatabaseName: props.mongoDb.databaseName,
            stateMachine: stepFunctionsStack.stateMachine
        });
    }
}
