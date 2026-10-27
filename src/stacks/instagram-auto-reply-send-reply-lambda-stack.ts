import { aws_lambda, aws_logs, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

import { InstagramAutoReplyCommonStackProps } from "./instagram-auto-reply-common-stack";
import { ParameterName } from "../constants/parameter-names.constants";
import { LambdaHelper } from "../helpers/lambda.helper";
import { ParameterStoreHelper } from "../helpers/parameter-store.helper";
import { TaggingHelper } from "../helpers/tagging.helper";
import { SendReplyFunction } from "../lambda/send-reply/send-reply-function";

export interface InstagramAutoReplySendReplyLambdaStackProps extends InstagramAutoReplyCommonStackProps {
    readonly logGroup: aws_logs.ILogGroup;
    readonly lambdaArchitecture?: aws_lambda.Architecture;
    readonly applicationLogLevel?: string;
    readonly instagramGraphApiUrl: string;
}

/**
 * Posts the reply on Instagram.
 */
export class InstagramAutoReplySendReplyLambdaStack extends Stack {
    public readonly sendReplyFunction: aws_lambda.IFunction;

    constructor(scope: Construct, id: string, props: InstagramAutoReplySendReplyLambdaStackProps) {
        super(scope, id, props);

        const sendReplyFunction = new SendReplyFunction(
            this,
            "SendReplyLambdaFunction",
            LambdaHelper.standardOptions({
                functionName: `${props.common.applicationEnvironment}-${props.common.projectName}-SendReply`,
                applicationEnvironment: props.common.applicationEnvironment,
                applicationLogLevel: props.applicationLogLevel,
                architecture: props.lambdaArchitecture,
                logGroup: props.logGroup,
                timeout: Duration.seconds(30),
                environment: {
                    INSTAGRAM_GRAPH_API_URL: props.instagramGraphApiUrl
                }
            })
        );

        sendReplyFunction.addEnvironment(
            "INSTAGRAM_ACCESS_TOKEN_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(this, props.common, ParameterName.instagramAccessToken, sendReplyFunction)
        );
        sendReplyFunction.addEnvironment(
            "INSTAGRAM_USER_ID_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(this, props.common, ParameterName.instagramUserId, sendReplyFunction)
        );

        LambdaHelper.acknowledgeManagedPolicies(sendReplyFunction);

        this.sendReplyFunction = sendReplyFunction;

        TaggingHelper.tagResource(this);
    }
}
