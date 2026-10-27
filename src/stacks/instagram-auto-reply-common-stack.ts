import { aws_logs, aws_sqs, Duration, RemovalPolicy, Stack, StackProps, Validations } from "aws-cdk-lib";
import { Construct } from "constructs";

import { TaggingHelper } from "../helpers/tagging.helper";

export interface InstagramAutoReplyCommonProps {
    readonly projectName: string;
    readonly applicationEnvironment: string;
    readonly cloudwatchLogGroupName: string;
}

export interface InstagramAutoReplyCommonStackProps extends StackProps {
    readonly common: InstagramAutoReplyCommonProps;
}

/**
 * Stateful resources shared by every other stack in the project.
 * Consumers receive these via props rather than CloudFormation exports.
 */
export class InstagramAutoReplyCommonStack extends Stack {
    public readonly logGroup: aws_logs.ILogGroup;
    public readonly failedReplyQueue: aws_sqs.IQueue;

    constructor(scope: Construct, id: string, props: InstagramAutoReplyCommonStackProps) {
        super(scope, id, props);

        const resourcePrefix = `${props.common.applicationEnvironment}-${props.common.projectName}`;

        this.logGroup = new aws_logs.LogGroup(this, "InstagramAutoReplyLogGroup", {
            logGroupName: props.common.cloudwatchLogGroupName,
            retention: aws_logs.RetentionDays.THREE_MONTHS,
            removalPolicy: RemovalPolicy.DESTROY
        });

        // The state machine sends executions that failed here, with their input and error, for a
        // person to inspect. Nothing consumes it automatically.
        const failedReplyQueue = new aws_sqs.Queue(this, "FailedReplyQueue", {
            queueName: `${resourcePrefix}-FailedReplyQueue`,
            retentionPeriod: Duration.days(14),
            enforceSSL: true
        });

        Validations.of(failedReplyQueue).acknowledge({
            id: "AwsSolutions-SQS3",
            reason: "This queue is itself the dead end for failed executions: nothing consumes it, so it needs no dead-letter queue."
        });

        this.failedReplyQueue = failedReplyQueue;

        TaggingHelper.tagResource(this);
    }
}
