import { aws_iam, aws_ssm } from "aws-cdk-lib";
import { Construct } from "constructs";

import { InstagramAutoReplyCommonProps } from "../stacks/instagram-auto-reply-common-stack";

export class ParameterStoreHelper {
    static parameterName(common: InstagramAutoReplyCommonProps, name: string): string {
        return `/${common.applicationEnvironment}/${common.projectName}/${name}`;
    }

    /**
     * Imports an existing parameter by name and lets the grantee read it. CloudFormation can't
     * create SecureString parameters, so they are never created by the project. They are
     * encrypted with the AWS-managed aws/ssm key, whose key policy already allows decryption
     * through SSM for principals in the account.
     */
    static grantRead(
        scope: Construct,
        common: InstagramAutoReplyCommonProps,
        name: string,
        grantee: aws_iam.IGrantable
    ): string {
        const parameterName = ParameterStoreHelper.parameterName(common, name);
        const parameter = aws_ssm.StringParameter.fromSecureStringParameterAttributes(
            scope,
            `${name.replace(/\//g, "")}Parameter`,
            { parameterName: parameterName }
        );
        parameter.grantRead(grantee);
        return parameterName;
    }
}
