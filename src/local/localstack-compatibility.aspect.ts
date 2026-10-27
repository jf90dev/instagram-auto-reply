import { aws_iam, IAspect, Stack } from "aws-cdk-lib";
import { IConstruct } from "constructs";

interface TrustStatement {
    readonly Principal?: { readonly Service?: string | string[] };
    readonly Condition?: unknown;
}

/**
 * LocalStack-only adjustments, applied by src/local/main.ts and never to the AWS app.
 *
 * aws-cdk-lib adds confused-deputy conditions (aws:SourceArn / aws:SourceAccount) to the trust
 * policy of the role it creates for a state machine. LocalStack doesn't supply those keys when
 * Step Functions assumes the role, so with ENFORCE_IAM every execution fails with
 * Lambda.AccessDenied. Locally, drop the conditions from service-principal trust statements.
 */
export class LocalStackCompatibilityAspect implements IAspect {
    private static readonly servicePrincipals = ["states.amazonaws.com"];

    visit(node: IConstruct): void {
        if (!(node instanceof aws_iam.CfnRole)) {
            return;
        }

        const trustPolicy = Stack.of(node).resolve(node.assumeRolePolicyDocument) as {
            Statement?: TrustStatement[];
        };

        (trustPolicy.Statement ?? []).forEach((statement, index) => {
            const services = [statement.Principal?.Service ?? []].flat();
            const isAffected = services.some(service =>
                LocalStackCompatibilityAspect.servicePrincipals.includes(service)
            );
            if (isAffected && statement.Condition) {
                node.addPropertyDeletionOverride(`AssumeRolePolicyDocument.Statement.${index}.Condition`);
            }
        });
    }
}
