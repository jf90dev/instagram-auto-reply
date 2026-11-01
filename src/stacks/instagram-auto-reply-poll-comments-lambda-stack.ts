import { aws_events, aws_events_targets, aws_lambda, aws_logs, aws_stepfunctions, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

import { InstagramAutoReplyCommonStackProps } from "./instagram-auto-reply-common-stack";
import { ParameterName } from "../constants/parameter-names.constants";
import { LambdaHelper } from "../helpers/lambda.helper";
import { ParameterStoreHelper } from "../helpers/parameter-store.helper";
import { TaggingHelper } from "../helpers/tagging.helper";
import { PollCommentsFunction } from "../lambda/poll-comments/poll-comments-function";

export interface InstagramAutoReplyPollCommentsLambdaStackProps extends InstagramAutoReplyCommonStackProps {
    readonly logGroup: aws_logs.ILogGroup;
    readonly lambdaArchitecture?: aws_lambda.Architecture;
    readonly applicationLogLevel?: string;
    readonly instagramGraphApiUrl: string;
    readonly mongoDbDatabaseName: string;
    readonly stateMachine: aws_stepfunctions.IStateMachine;
    /** How often to check for new comments. Each run makes about one Graph API call per post checked. */
    readonly pollInterval: Duration;
}

/**
 * Checks the account's latest posts for new comments on a schedule and starts a reply for each.
 */
export class InstagramAutoReplyPollCommentsLambdaStack extends Stack {
    public readonly pollCommentsFunction: aws_lambda.IFunction;

    constructor(scope: Construct, id: string, props: InstagramAutoReplyPollCommentsLambdaStackProps) {
        super(scope, id, props);

        const resourcePrefix = `${props.common.applicationEnvironment}-${props.common.projectName}`;

        const pollCommentsFunction = new PollCommentsFunction(
            this,
            "PollCommentsLambdaFunction",
            LambdaHelper.standardOptions({
                functionName: `${resourcePrefix}-PollComments`,
                applicationEnvironment: props.common.applicationEnvironment,
                applicationLogLevel: props.applicationLogLevel,
                architecture: props.lambdaArchitecture,
                logGroup: props.logGroup,
                timeout: Duration.minutes(2),
                environment: {
                    INSTAGRAM_GRAPH_API_URL: props.instagramGraphApiUrl,
                    MONGODB_DATABASE_NAME: props.mongoDbDatabaseName,
                    STATE_MACHINE_ARN: props.stateMachine.stateMachineArn
                }
            })
        );

        pollCommentsFunction.addEnvironment(
            "INSTAGRAM_ACCESS_TOKEN_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(this, props.common, ParameterName.instagramAccessToken, pollCommentsFunction)
        );
        pollCommentsFunction.addEnvironment(
            "INSTAGRAM_USER_ID_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(this, props.common, ParameterName.instagramUserId, pollCommentsFunction)
        );
        pollCommentsFunction.addEnvironment(
            "MONGODB_URI_PARAMETER_NAME",
            ParameterStoreHelper.grantRead(this, props.common, ParameterName.mongoDbUri, pollCommentsFunction)
        );

        props.stateMachine.grantStartExecution(pollCommentsFunction);

        // new aws_events.Rule(this, "PollCommentsScheduleRule", {
        //     ruleName: `${resourcePrefix}-PollCommentsSchedule`,
        //     description: "Checks the latest Instagram posts for new comments",
        //     schedule: aws_events.Schedule.rate(props.pollInterval),
        //     // A failed run isn't retried: the next scheduled run picks up the same comments.
        //     targets: [new aws_events_targets.LambdaFunction(pollCommentsFunction, { retryAttempts: 0 })]
        // });

        LambdaHelper.acknowledgeManagedPolicies(pollCommentsFunction);

        this.pollCommentsFunction = pollCommentsFunction;

        TaggingHelper.tagResource(this);
    }
}
