import { aws_iam, aws_lambda, aws_logs, Duration, Validations } from "aws-cdk-lib";

export interface StandardFunctionOptionsProps {
    readonly functionName: string;
    readonly applicationEnvironment: string;
    readonly logGroup: aws_logs.ILogGroup;
    readonly applicationLogLevel?: string;
    readonly architecture?: aws_lambda.Architecture;
    readonly timeout?: Duration;
    readonly memorySize?: number;
    readonly environment?: { [key: string]: string };
}

export class LambdaHelper {
    /**
     * The project's defaults for the Lambda constructs projen generates from `*.lambda.ts` files.
     * projen fixes the runtime (lambdaOptions in .projenrc.ts) and bundling; this sets the rest.
     */
    static standardOptions(props: StandardFunctionOptionsProps): aws_lambda.FunctionOptions {
        return {
            functionName: props.functionName,
            architecture: props.architecture ?? aws_lambda.Architecture.ARM_64,
            insightsVersion: aws_lambda.LambdaInsightsVersion.VERSION_1_0_135_0,
            timeout: props.timeout ?? Duration.seconds(30),
            memorySize: props.memorySize ?? 256,
            logGroup: props.logGroup,
            environment: {
                APP_ENVIRONMENT: props.applicationEnvironment,
                NODE_OPTIONS: "--enable-source-maps",
                LOG_LEVEL: props.applicationLogLevel ?? "debug",
                ...props.environment
            }
        };
    }

    /**
     * Grants invoke on the function itself only. `IFunction.grantInvoke` also grants `<arn>:*`
     * (every version and alias), which cdk-nag reports as AwsSolutions-IAM5 with a finding id built
     * from the cross-stack export name, so it can't be acknowledged reliably.
     */
    static acknowledgeManagedPolicies(lambdaFunction: aws_lambda.IFunction): void {
        for (const managedPolicy of [
            "service-role/AWSLambdaBasicExecutionRole",
            "CloudWatchLambdaInsightsExecutionRolePolicy"
        ]) {
            Validations.of(lambdaFunction).acknowledge({
                id: `AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/${managedPolicy}]`,
                reason: "AWS-managed minimum for Lambda logging and Lambda Insights metrics."
            });
        }
    }

    static grantInvokeFunction(lambdaFunction: aws_lambda.IFunction, grantee: aws_iam.IGrantable): aws_iam.Grant {
        return aws_iam.Grant.addToPrincipal({
            grantee: grantee,
            actions: ["lambda:InvokeFunction"],
            resourceArns: [lambdaFunction.functionArn]
        });
    }
}
