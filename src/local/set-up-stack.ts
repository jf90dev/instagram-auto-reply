import { aws_ssm, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface SetupStackProps extends StackProps {}

/**
 * LocalStack stand-ins for resources the project imports but doesn't own (none yet).
 * Export and resource names must match the real ones so the project's imports resolve unchanged.
 * CfnOutput exports are correct here because these resources live outside the project.
 */
export class SetupStack extends Stack {
    constructor(scope: Construct, id: string, props: SetupStackProps) {
        super(scope, id, props);

        // CloudFormation rejects a stack without resources; remove this once a real stand-in exists.
        new aws_ssm.StringParameter(this, "SetUpMarker", {
            parameterName: "/Local/InstagramAutoReply/SetUpStack",
            stringValue: "LocalStack stand-ins deployed"
        });
    }
}
