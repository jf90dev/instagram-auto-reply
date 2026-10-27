import { aws_lambda, aws_logs, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

import { InstagramAutoReplyCommonStackProps } from "./instagram-auto-reply-common-stack";
import { ParameterName } from "../constants/parameter-names.constants";
import { LambdaHelper } from "../helpers/lambda.helper";
import { ParameterStoreHelper } from "../helpers/parameter-store.helper";
import { TaggingHelper } from "../helpers/tagging.helper";
import { RecordOutcomeFunction } from "../lambda/record-outcome/record-outcome-function";

export interface InstagramAutoReplyRecordOutcomeLambdaStackProps extends InstagramAutoReplyCommonStackProps {
    readonly logGroup: aws_logs.ILogGroup;
    readonly lambdaArchitecture?: aws_lambda.Architecture;
    readonly applicationLogLevel?: string;
    readonly mongoDbDatabaseName: string;
}

/**
 * Stores what happened to each comment or message in MongoDB.
 */
export class InstagramAutoReplyRecordOutcomeLambdaStack extends Stack {
    public readonly recordOutcomeFunction: aws_lambda.IFunction;

    constructor(scope: Construct, id: string, props: InstagramAutoReplyRecordOutcomeLambdaStackProps) {
        super(scope, id, props);

        const recordOutcomeFunction = new RecordOutcomeFunction(
            this,
            "RecordOutcomeLambdaFunction",
            LambdaHelper.standardOptions({
                functionName: `${props.common.applicationEnvironment}-${props.common.projectName}-RecordOutcome`,
                applicationEnvironment: props.common.applicationEnvironment,
                applicationLogLevel: props.applicationLogLevel,
                architecture: props.lambdaArchitecture,
                logGroup: props.logGroup,
                timeout: Duration.seconds(30),
                environment: {
                    MONGODB_DATABASE_NAME: props.mongoDbDatabaseName
                }
            })
        );

        recordOutcomeFunction.addEnvironment(
            "MONGODB_URI_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(this, props.common, ParameterName.mongoDbUri, recordOutcomeFunction)
        );

        LambdaHelper.acknowledgeManagedPolicies(recordOutcomeFunction);

        this.recordOutcomeFunction = recordOutcomeFunction;

        TaggingHelper.tagResource(this);
    }
}
