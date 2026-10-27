import { aws_lambda, aws_logs, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

import { InstagramAutoReplyCommonStackProps } from "./instagram-auto-reply-common-stack";
import { ParameterName } from "../constants/parameter-names.constants";
import { LambdaHelper } from "../helpers/lambda.helper";
import { ParameterStoreHelper } from "../helpers/parameter-store.helper";
import { TaggingHelper } from "../helpers/tagging.helper";
import { GetContextFunction } from "../lambda/get-context/get-context-function";

export interface InstagramAutoReplyGetContextLambdaStackProps extends InstagramAutoReplyCommonStackProps {
    readonly logGroup: aws_logs.ILogGroup;
    readonly lambdaArchitecture?: aws_lambda.Architecture;
    readonly applicationLogLevel?: string;
    readonly instagramGraphApiUrl: string;
    readonly mongoDbDatabaseName: string;
}

/**
 * Applies the reply rules and gathers the post caption, parent comment or earlier messages.
 */
export class InstagramAutoReplyGetContextLambdaStack extends Stack {
    public readonly getContextFunction: aws_lambda.IFunction;

    constructor(scope: Construct, id: string, props: InstagramAutoReplyGetContextLambdaStackProps) {
        super(scope, id, props);

        const getContextFunction = new GetContextFunction(
            this,
            "GetContextLambdaFunction",
            LambdaHelper.standardOptions({
                functionName: `${props.common.applicationEnvironment}-${props.common.projectName}-GetContext`,
                applicationEnvironment: props.common.applicationEnvironment,
                applicationLogLevel: props.applicationLogLevel,
                architecture: props.lambdaArchitecture,
                logGroup: props.logGroup,
                timeout: Duration.seconds(30),
                environment: {
                    INSTAGRAM_GRAPH_API_URL: props.instagramGraphApiUrl,
                    MONGODB_DATABASE_NAME: props.mongoDbDatabaseName
                }
            })
        );

        getContextFunction.addEnvironment(
            "INSTAGRAM_ACCESS_TOKEN_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(this, props.common, ParameterName.instagramAccessToken, getContextFunction)
        );
        getContextFunction.addEnvironment(
            "INSTAGRAM_USER_ID_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(this, props.common, ParameterName.instagramUserId, getContextFunction)
        );
        getContextFunction.addEnvironment(
            "MONGODB_URI_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(this, props.common, ParameterName.mongoDbUri, getContextFunction)
        );

        LambdaHelper.acknowledgeManagedPolicies(getContextFunction);

        this.getContextFunction = getContextFunction;

        TaggingHelper.tagResource(this);
    }
}
