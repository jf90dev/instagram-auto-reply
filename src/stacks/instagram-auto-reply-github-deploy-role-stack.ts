import { aws_iam, Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import { TaggingHelper } from "../helpers/tagging.helper";

export interface InstagramAutoReplyGitHubDeployRoleStackProps extends StackProps {
    readonly projectName: string;
    readonly applicationEnvironment: string;
    /** `owner/repo` of the repository whose workflow may assume the role. */
    readonly githubRepository: string;
    /**
     * The start of the token's `sub` claim (`sub_claim_prefix` from
     * `gh api repos/<owner>/<repo>/actions/oidc/customization/sub`). Repositories using GitHub's
     * immutable subject send `repo:<owner>@<owner id>/<repo>@<repo id>`.
     *
     * @default `repo:<githubRepository>` (GitHub's original subject format)
     */
    readonly githubOidcSubjectPrefix?: string;
    /** The GitHub environment the deploy job runs in. */
    readonly githubEnvironment: string;
    /**
     * ARN of the account's existing GitHub OIDC provider. An account can only have one provider per
     * URL, so pass this when another project already created it.
     *
     * @default - a new provider is created
     */
    readonly githubOidcProviderArn?: string;
}

/**
 * The IAM role the GitHub Actions deploy workflow assumes through OIDC (no long-lived keys).
 * It can only assume the CDK bootstrap roles, which do the actual deployment.
 * Deployed once per account by a person, not by the workflow.
 */
export class InstagramAutoReplyGitHubDeployRoleStack extends Stack {
    public readonly deployRole: aws_iam.IRole;

    constructor(scope: Construct, id: string, props: InstagramAutoReplyGitHubDeployRoleStackProps) {
        super(scope, id, props);

        const githubTokenHost = "token.actions.githubusercontent.com";
        const subjectPrefix = props.githubOidcSubjectPrefix ?? `repo:${props.githubRepository}`;

        const oidcProviderArn =
            props.githubOidcProviderArn ??
            new aws_iam.OidcProviderNative(this, "GitHubOidcProvider", {
                url: `https://${githubTokenHost}`,
                clientIds: ["sts.amazonaws.com"]
            }).oidcProviderArn;

        const deployRole = new aws_iam.Role(this, "GitHubDeployRole", {
            roleName: `${props.applicationEnvironment}-${props.projectName}-GitHubDeploy`,
            description: `Assumed by ${props.githubRepository} (${props.githubEnvironment}) to deploy with the CDK bootstrap roles`,
            maxSessionDuration: Duration.hours(1),
            assumedBy: new aws_iam.WebIdentityPrincipal(oidcProviderArn, {
                StringEquals: {
                    [`${githubTokenHost}:aud`]: "sts.amazonaws.com",
                    [`${githubTokenHost}:sub`]: `${subjectPrefix}:environment:${props.githubEnvironment}`
                }
            })
        });

        const bootstrapRoleArns = ["deploy", "file-publishing", "image-publishing", "lookup"].map(roleType =>
            this.formatArn({
                service: "iam",
                region: "",
                resource: "role",
                resourceName: `cdk-hnb659fds-${roleType}-role-${this.account}-${this.region}`
            })
        );

        deployRole.addToPrincipalPolicy(
            new aws_iam.PolicyStatement({
                actions: ["sts:AssumeRole", "sts:TagSession"],
                resources: bootstrapRoleArns
            })
        );

        this.deployRole = deployRole;

        TaggingHelper.tagResource(this);
    }
}
