import { aws_lambda, aws_logs, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

import { InstagramAutoReplyCommonStackProps } from "./instagram-auto-reply-common-stack";
import { ParameterName } from "../constants/parameter-names.constants";
import { LambdaHelper } from "../helpers/lambda.helper";
import { ParameterStoreHelper } from "../helpers/parameter-store.helper";
import { TaggingHelper } from "../helpers/tagging.helper";
import { GenerateReplyFunction } from "../lambda/generate-reply/generate-reply-function";

export interface InstagramAutoReplyGenerateReplyLambdaStackProps extends InstagramAutoReplyCommonStackProps {
    readonly logGroup: aws_logs.ILogGroup;
    readonly lambdaArchitecture?: aws_lambda.Architecture;
    readonly applicationLogLevel?: string;
    readonly claudeModel: string;
    /** Only set locally, where Mockoon stands in for the Claude API. */
    readonly anthropicBaseUrl?: string;
}

/**
 * Asks Claude whether and how to reply.
 */
export class InstagramAutoReplyGenerateReplyLambdaStack extends Stack {
    public readonly generateReplyFunction: aws_lambda.IFunction;

    constructor(scope: Construct, id: string, props: InstagramAutoReplyGenerateReplyLambdaStackProps) {
        super(scope, id, props);

        const generateReplyFunction = new GenerateReplyFunction(
            this,
            "GenerateReplyLambdaFunction",
            LambdaHelper.standardOptions({
                functionName: `${props.common.applicationEnvironment}-${props.common.projectName}-GenerateReply`,
                applicationEnvironment: props.common.applicationEnvironment,
                applicationLogLevel: props.applicationLogLevel,
                architecture: props.lambdaArchitecture,
                logGroup: props.logGroup,
                // Claude thinks before answering; a reply usually takes a few seconds, rarely a minute.
                timeout: Duration.minutes(3),
                environment: {
                    CLAUDE_MODEL: props.claudeModel,
                    ...(props.anthropicBaseUrl ? { ANTHROPIC_BASE_URL: props.anthropicBaseUrl } : {})
                }
            })
        );

        generateReplyFunction.addEnvironment(
            "ANTHROPIC_API_KEY_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(this, props.common, ParameterName.anthropicApiKey, generateReplyFunction)
        );

        LambdaHelper.acknowledgeManagedPolicies(generateReplyFunction);

        this.generateReplyFunction = generateReplyFunction;

        TaggingHelper.tagResource(this);
    }
}
