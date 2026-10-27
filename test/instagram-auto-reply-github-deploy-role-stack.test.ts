import { App, Validations } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { AwsSolutionsChecks } from "cdk-nag";

import { InstagramAutoReplyGitHubDeployRoleStack } from "../src/stacks/instagram-auto-reply-github-deploy-role-stack";

describe("InstagramAutoReplyGitHubDeployRoleStack", () => {
    const app = new App();
    Validations.of(app).addPlugins(new AwsSolutionsChecks(app));
    const stack = new InstagramAutoReplyGitHubDeployRoleStack(app, "InstagramAutoReplyGitHubDeployRoleStack", {
        env: { account: "123456789012", region: "eu-west-1" },
        projectName: "InstagramAutoReply",
        applicationEnvironment: "Prod",
        githubRepository: "your-org/instagram-auto-reply",
        githubEnvironment: "Prod"
    });
    const template = Template.fromStack(stack);

    test("Only the repository's Prod environment can assume the role", () => {
        template.hasResourceProperties("AWS::IAM::Role", {
            RoleName: "Prod-InstagramAutoReply-GitHubDeploy",
            AssumeRolePolicyDocument: {
                Statement: [
                    Match.objectLike({
                        Action: "sts:AssumeRoleWithWebIdentity",
                        Condition: {
                            StringEquals: {
                                "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                                "token.actions.githubusercontent.com:sub":
                                    "repo:your-org/instagram-auto-reply:environment:Prod"
                            }
                        }
                    })
                ]
            }
        });
    });

    test("The role can only assume the CDK bootstrap roles", () => {
        const policies = Object.values(template.findResources("AWS::IAM::Policy"));
        expect(policies).toHaveLength(1);

        const statements = policies[0].Properties.PolicyDocument.Statement;
        expect(statements).toHaveLength(1);
        expect(statements[0].Action).toEqual(["sts:AssumeRole", "sts:TagSession"]);

        const resources = JSON.stringify(statements[0].Resource);
        for (const roleType of ["deploy", "file-publishing", "image-publishing", "lookup"]) {
            expect(resources).toContain(`:role/cdk-hnb659fds-${roleType}-role-123456789012-eu-west-1`);
        }
        expect(statements[0].Resource).toHaveLength(4);
    });

    test("Trusts GitHub's immutable subject when a subject prefix is given", () => {
        const immutableApp = new App();
        const immutableStack = new InstagramAutoReplyGitHubDeployRoleStack(
            immutableApp,
            "InstagramAutoReplyGitHubDeployRoleStack",
            {
                env: { account: "123456789012", region: "eu-west-1" },
                projectName: "InstagramAutoReply",
                applicationEnvironment: "Prod",
                githubRepository: "your-org/instagram-auto-reply",
                githubOidcSubjectPrefix: "repo:your-org@111/instagram-auto-reply@222",
                githubEnvironment: "Prod"
            }
        );

        Template.fromStack(immutableStack).hasResourceProperties("AWS::IAM::Role", {
            AssumeRolePolicyDocument: {
                Statement: [
                    Match.objectLike({
                        Condition: {
                            StringEquals: Match.objectLike({
                                "token.actions.githubusercontent.com:sub":
                                    "repo:your-org@111/instagram-auto-reply@222:environment:Prod"
                            })
                        }
                    })
                ]
            }
        });
    });

    test("Has no unacknowledged cdk-nag findings (synth throws 'Validation failed' otherwise)", () => {
        expect(() => app.synth()).not.toThrow();
    });
});
