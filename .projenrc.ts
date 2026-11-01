import { awscdk, github, javascript, typescript } from "projen";

import { AwsRegion } from "./src/constants/aws-region.constants";
import { GitHub } from "./src/constants/github.constants";

const projectName = "instagram-auto-reply";

// Pinned third-party actions used by the deploy workflow (projen pins its own).
const actions = {
    checkout: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1", // v7.0.1
    setupNode: "actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1", // v7.1.0
    configureAwsCredentials: "aws-actions/configure-aws-credentials@e1253824e5c10ff9df46874f81ed3ec929e19cfd" // v6.3.0
};

const project = new awscdk.AwsCdkTypeScriptApp({
    name: projectName,
    description: "Claude-written replies to @themanualformen Instagram comments and direct messages",
    defaultReleaseBranch: "main",
    packageManager: javascript.NodePackageManager.NPM,
    projenrcTs: true,
    projenVersion: "0.104.5",
    licensed: false,
    sampleCode: false,
    tsconfig: { compilerOptions: { isolatedModules: true } },
    tsconfigDev: { compilerOptions: { isolatedModules: true } },

    cdkVersion: "2.273.0",
    cdkCliVersion: "2.1145.0",
    constructsVersion: "10.5.1",
    app: "npx tsx src/main.ts",
    runner: typescript.TypeScriptRunner.tsx(),
    requireApproval: awscdk.ApprovalLevel.BROADENING,
    // Every feature flag known to the pinned projen version. Review the cdk.json diff after upgrading projen.
    featureFlags: awscdk.CdkFeatureFlagsV2.ALL,

    lambdaAutoDiscover: true,
    lambdaOptions: {
        runtime: awscdk.LambdaRuntime.NODEJS_24_X,
        bundlingOptions: { sourcemap: true }
    },

    deps: [
        "cdk-nag@^3.0.2",
        "reflect-metadata@^0.2.2",
        "tsyringe@^4.10.0",
        "winston@^3.19.0",
        "@anthropic-ai/sdk@^1.3.0",
        "@aws-sdk/client-sfn@^3.1148.0",
        "@aws-sdk/client-ssm@^3.1157.0",
        "mongodb@^7.7.0"
    ],
    devDeps: [
        "@types/aws-lambda@^8.10.164",
        "@types/node@^24",
        "aws-cdk-local@^3.0.4",
        "tsx@^4.23.15",
        "@aws-sdk/client-lambda@^3.1148.0"
    ],

    prettier: true,
    prettierOptions: {
        settings: {
            printWidth: 120,
            tabWidth: 4,
            singleQuote: false,
            trailingComma: javascript.TrailingComma.NONE,
            arrowParens: javascript.ArrowParens.AVOID,
            endOfLine: javascript.EndOfLine.AUTO
        },
        overrides: [{ files: ["*.json", "*.yml", "*.yaml", "*.md"], options: { tabWidth: 2 } }]
    },

    jestOptions: {
        jestConfig: {
            // LocalStack integration tests need a running environment; run them with `npx projen test:localstack`.
            testPathIgnorePatterns: ["/node_modules/", "<rootDir>/test/localstack/"]
        }
    },

    workflowNodeVersion: "24",
    githubOptions: { mergify: false },
    depsUpgradeOptions: {
        workflowOptions: { schedule: javascript.UpgradeDependenciesSchedule.WEEKLY }
    }
});

// Team standard: strong cross-stack references (exports). CdkFeatureFlagsV2.ALL switches the default
// to weak (Fn::GetStackOutput), which LocalStack can't resolve.
project.cdkConfig.json.addOverride("context.@aws-cdk/core:defaultCrossStackReferences", "strong");

// CDK-specific lint rules (construct constructor signatures, readonly props, no mutable public fields, ...).
project.addDevDeps("eslint-plugin-awscdk@^4.4.3");
project.eslint!.addPlugins("awscdk");
project.eslint!.addExtends("plugin:awscdk/classicRecommended");
// Team standard: stack ids are `<Project><Component>Stack`, so stack names stay unique per account.
project.eslint!.addRules({ "awscdk/no-construct-stack-suffix": "off" });

// --- LocalStack ------------------------------------------------------------------------------
// Every task here talks to LocalStack only: cdklocal for CDK, and the AWS CLI pinned to the
// LocalStack endpoint with the test/test credentials.

// cdklocal sets the LocalStack endpoints itself (and rejects AWS_ENDPOINT_URL without
// AWS_ENDPOINT_URL_S3), so only the AWS CLI calls name the endpoint, explicitly.
const localstackEnv = {
    AWS_ACCESS_KEY_ID: "test",
    AWS_SECRET_ACCESS_KEY: "test",
    AWS_DEFAULT_REGION: AwsRegion.localstack
};
const localstackEndpoint = "http://localhost:4566";
const localApp = '-a "npx tsx src/local/main.ts"';
const composeFile = "dev/environment/docker-compose.yml";

const upLocal = project.addTask("localstack:up", {
    description: "Starts LocalStack, MongoDB and Mockoon (needs LOCALSTACK_AUTH_TOKEN)",
    exec: `docker compose -f ${composeFile} up -d --wait`
});

project.addTask("localstack:down", {
    description: "Stops the local environment and removes its volumes",
    exec: `docker compose -f ${composeFile} down --volumes`
});

const bootstrapLocal = project.addTask("localstack:bootstrap", {
    description: "Bootstraps CDK in LocalStack and grants the bootstrap roles admin (LocalStack enforces IAM)",
    env: localstackEnv
});
bootstrapLocal.exec(`cdklocal bootstrap aws://000000000000/${AwsRegion.localstack}`);
for (const role of ["deploy", "file-publishing", "image-publishing", "lookup", "cfn-exec"]) {
    bootstrapLocal.exec(
        `aws iam attach-role-policy --endpoint-url ${localstackEndpoint} --role-name cdk-hnb659fds-${role}-role-000000000000-${AwsRegion.localstack} --policy-arn arn:aws:iam::aws:policy/AdministratorAccess`
    );
}

const setupLocal = project.addTask("localstack:setup", {
    description: "Deploys the LocalStack stand-ins for external resources",
    env: localstackEnv,
    exec: 'cdklocal deploy -a "npx tsx src/local/set-up-main.ts" --require-approval never'
});
// CloudFormation can't create SecureString parameters, so the stand-ins are created with the AWS CLI.
// Placeholder values only: the Instagram and Anthropic APIs are stubbed by Mockoon.
const localParameters: { [name: string]: { type: string; value: string } } = {
    "Instagram/AppSecret": { type: "SecureString", value: "local-app-secret" },
    "Instagram/VerifyToken": { type: "SecureString", value: "local-verify-token" },
    "Instagram/AccessToken": { type: "SecureString", value: "local-access-token" },
    "Instagram/UserId": { type: "String", value: "17840000000000000" },
    "Anthropic/ApiKey": { type: "SecureString", value: "local-anthropic-api-key" },
    "MongoDb/Uri": { type: "SecureString", value: "mongodb://mongodb:27017" }
};
for (const [name, parameter] of Object.entries(localParameters)) {
    setupLocal.exec(
        `aws ssm put-parameter --endpoint-url ${localstackEndpoint} --name /Local/InstagramAutoReply/${name} --type ${parameter.type} --value ${parameter.value} --overwrite`
    );
}

const deployLocal = project.addTask("localstack:deploy", {
    description: "Deploys every stack of the Local stage to LocalStack",
    env: localstackEnv,
    exec: `cdklocal deploy ${localApp} "Local/*" --require-approval never`
});

project.addTask("localstack:destroy", {
    description: "Destroys every stack of the Local stage in LocalStack",
    env: localstackEnv,
    exec: `cdklocal destroy ${localApp} "Local/*" --force`
});

project.addTask("localstack:diff", {
    description: "Diffs the Local stage against LocalStack",
    env: localstackEnv,
    exec: `cdklocal diff ${localApp} "Local/*"`
});

const startLocal = project.addTask("localstack:start", {
    description: "Starts the local environment and deploys everything to it"
});
startLocal.spawn(upLocal);
startLocal.spawn(bootstrapLocal);
startLocal.spawn(setupLocal);
startLocal.spawn(deployLocal);

// One deploy/destroy/update trio per stack, for fast redeploys of a single component.
const components: { [component: string]: string } = {
    common: "InstagramAutoReplyCommonStack",
    "get-context": "InstagramAutoReplyGetContextLambdaStack",
    "generate-reply": "InstagramAutoReplyGenerateReplyLambdaStack",
    "send-reply": "InstagramAutoReplySendReplyLambdaStack",
    "record-outcome": "InstagramAutoReplyRecordOutcomeLambdaStack",
    "step-functions": "InstagramAutoReplyStepFunctionsStack",
    "poll-comments": "InstagramAutoReplyPollCommentsLambdaStack",
    webhook: "InstagramAutoReplyWebhookStack"
};
for (const [component, stackId] of Object.entries(components)) {
    const deployComponent = project.addTask(`localstack:deploy:${component}`, {
        description: `Deploys ${stackId} to LocalStack`,
        env: localstackEnv,
        exec: `cdklocal deploy ${localApp} Local/${stackId} --exclusively --require-approval never --method=direct`
    });
    const destroyComponent = project.addTask(`localstack:destroy:${component}`, {
        description: `Destroys ${stackId} in LocalStack`,
        env: localstackEnv,
        exec: `cdklocal destroy ${localApp} Local/${stackId} --exclusively --force`
    });
    const updateComponent = project.addTask(`localstack:update:${component}`, {
        description: `Clean redeploy of ${stackId} in LocalStack`
    });
    updateComponent.spawn(destroyComponent);
    updateComponent.spawn(deployComponent);
}

project.addTask("test:localstack", {
    description: "Runs the integration tests against the deployed LocalStack stage",
    exec: 'jest --testPathIgnorePatterns=/node_modules/ --testMatch="**/test/localstack/**/*.test.ts"'
});

// --- Deploy workflow -------------------------------------------------------------------------
// Builds (compile, test, synth) and deploys the synthesized Prod stage on every push to main,
// assuming the GitHub deploy role through OIDC. The role ARN is the AWS_DEPLOY_ROLE_ARN variable
// of the GitHub environment.

// `cdk deploy` only creates and updates the stacks the app still has; a stack removed from the
// Stage would stay deployed. This step deletes every deployed `<Stage>-InstagramAutoReply*` stack
// that is no longer in the synthesized stage. It runs before the deploy (where a stack another
// removed stack still imports from can't go yet, so failures only warn) and after it (where every
// removed stack must go). It assumes the CDK bootstrap deploy role, as `cdk deploy` does, and
// deletes through CloudFormation, which uses the stack's own execution role.
// const pruneRemovedStacksScript = (failOnError: boolean): string =>
//     [
//         "set -euo pipefail",
//         `stage="${GitHub.deployEnvironment}"`,
//         'stack_prefix="${stage}-InstagramAutoReply"',
//         "account=$(aws sts get-caller-identity --query Account --output text)",
//         'deploy_role="arn:aws:iam::${account}:role/cdk-hnb659fds-deploy-role-${account}-${AWS_REGION}"',
//         'credentials=$(aws sts assume-role --role-arn "$deploy_role" --role-session-name prune-removed-stacks --query Credentials --output json)',
//         'export AWS_ACCESS_KEY_ID=$(jq -r .AccessKeyId <<<"$credentials")',
//         'export AWS_SECRET_ACCESS_KEY=$(jq -r .SecretAccessKey <<<"$credentials")',
//         'export AWS_SESSION_TOKEN=$(jq -r .SessionToken <<<"$credentials")',
//         'expected=$(jq -r \'.artifacts[] | select(.type == "aws:cloudformation:stack") | .properties.stackName\' "cdk.out/assembly-${stage}/manifest.json")',
//         // Never prune against an empty or missing synth: that would delete every stack.
//         '[ -n "$expected" ] || { echo "::error::The synthesized ${stage} stage has no stacks"; exit 1; }',
//         'deployed=$(aws cloudformation describe-stacks --query "Stacks[?starts_with(StackName, \'${stack_prefix}\')].StackName" --output text | tr "\\t" "\\n")',
//         "failed=0",
//         "for stack in $deployed; do",
//         '  if grep -qx "$stack" <<<"$expected"; then continue; fi',
//         '  echo "Deleting $stack: no longer part of the ${stage} stage"',
//         '  if aws cloudformation delete-stack --stack-name "$stack" && aws cloudformation wait stack-delete-complete --stack-name "$stack"; then',
//         '    echo "Deleted $stack"',
//         "  else",
//         `    echo "::${failOnError ? "error" : "warning"}::Could not delete $stack yet"`,
//         "    failed=1",
//         "  fi",
//         "done",
//         failOnError ? 'exit "$failed"' : "exit 0"
//     ].join("\n");

const deployWorkflow = project.github!.addWorkflow("deploy");
deployWorkflow.on({ push: { branches: ["main"] }, workflowDispatch: {} });
deployWorkflow.addJobs({
    deploy: {
        name: `Deploy ${GitHub.deployEnvironment}`,
        runsOn: ["ubuntu-latest"],
        environment: GitHub.deployEnvironment,
        concurrency: { group: `deploy-${GitHub.deployEnvironment}`, "cancel-in-progress": false },
        permissions: { contents: github.workflows.JobPermission.READ, idToken: github.workflows.JobPermission.WRITE },
        steps: [
            { name: "Checkout", uses: actions.checkout },
            { name: "Set up Node", uses: actions.setupNode, with: { "node-version": "24", cache: "npm" } },
            { name: "Install dependencies", run: "npm ci" },
            { name: "Build (compile, test, synth)", run: "npx projen build" },
            {
                name: "Configure AWS credentials",
                uses: actions.configureAwsCredentials,
                with: {
                    "role-to-assume": "${{ vars.AWS_DEPLOY_ROLE_ARN }}",
                    "aws-region": AwsRegion.jf,
                    "role-session-name": `${projectName}-deploy`
                }
            },
            // { name: "Delete removed stacks (before deploy)", run: pruneRemovedStacksScript(false) },
            {
                // Change sets: CloudFormation compares each template with the deployed stack and
                // deletes resources that were removed from it.
                name: "Deploy",
                run: `npx cdk deploy --app cdk.out "${GitHub.deployEnvironment}/*" --method=change-set --require-approval never --concurrency 3`
            }
            // { name: "Delete removed stacks (after deploy)", run: pruneRemovedStacksScript(true) }
        ]
    }
});

project.synth();
