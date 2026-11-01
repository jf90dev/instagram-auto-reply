# instagram-auto-reply

Claude-written replies to comments and direct messages on the @themanualformen Instagram account.
AWS serverless application (CDK v2, TypeScript), managed by [projen](https://projen.io).

Two Lambdas pass comments and messages to the state machine:

- **ReceiveWebhook** – Meta calls it (a public function URL, `WebhookUrl` output of the Webhook
  stack) for every new comment and direct message. It checks the `X-Hub-Signature-256` signature,
  ignores the account's own comments and messages, starts one execution per comment or message, and
  marks comments as received.
- **PollComments** – an EventBridge rule runs it on a schedule (interval in `src/main.ts`) as a
  safety net for missed webhook deliveries. It reads the latest 50 comments (with their replies) on
  the account's 10 latest posts, ignores the account's own replies and anything older than 24
  hours, and starts an execution for each comment not yet in the
  `themanualformen.received_comments` collection. The limits are in
  `src/shared/constants/comment-polling.constant.ts`.

Both name the execution from the comment or message id, so a comment the webhook and the poller
both see, or that Meta delivers twice, is replied to once. The state machine runs:

1. **GetContext** – applies the hard rules (kill switch, channel switches, own account, daily
   limit per person, Instagram's 24 hour messaging window) and fetches the post caption and parent
   comment, or the earlier messages of the conversation.
2. **GenerateReply** – asks Claude (`claude-opus-5-5`, structured output) to `reply`, `skip` or
   `escalate`. Refusals, unapproved links and over-long replies become escalations.
3. **SendReply** – only in `auto` mode: posts the comment reply or direct message.
4. **RecordOutcome** – stores the result (`sent`, `draft`, `escalated` or `skipped`) in the
   `themanualformen.replies` MongoDB collection.

A failed execution sends its input and error to the `FailedReplyQueue` SQS queue.

### Configuration without a deployment

The `auto_reply` document of the `themanualformen.config` collection overrides the defaults in
`src/shared/constants/default-auto-reply-config.constant.ts`:

```json
{
  "_id": "auto_reply",
  "isEnabled": true,
  "mode": "review",
  "replyToComments": true,
  "replyToMessages": true,
  "maxRepliesPerUserPerDay": 3,
  "brandVoice": "…",
  "allowedLinks": []
}
```

`review` mode stores Claude's replies as drafts; switch to `auto` to send them.

### Parameters

Each AWS account needs these SSM parameters before the first deployment (the stacks import them,
CloudFormation can't create SecureString values):

| Parameter | Type |
|---|---|
| `/Prod/InstagramAutoReply/Instagram/AppSecret` | SecureString |
| `/Prod/InstagramAutoReply/Instagram/VerifyToken` | SecureString |
| `/Prod/InstagramAutoReply/Instagram/AccessToken` | SecureString |
| `/Prod/InstagramAutoReply/Instagram/UserId` | String |
| `/Prod/InstagramAutoReply/Anthropic/ApiKey` | SecureString |
| `/Prod/InstagramAutoReply/MongoDb/Uri` | SecureString |

Locally, `localstack:setup` creates them with placeholder values, and Mockoon stubs the Instagram
and Claude APIs.

## projen

`.projenrc.ts` is the source of truth for `package.json`, `tsconfig*.json`, `cdk.json`, the eslint and
prettier config, `.gitignore`, the tasks and the GitHub workflows. Edit it and run `npx projen`.
Never edit the generated files by hand: the build fails if they drift.

## Structure

```
.projenrc.ts                    # Project definition (deps, tasks, workflows, lint, tests)
src/main.ts                     # AWS app: Prod stage + GitHub deploy role stack
src/local/                      # LocalStack app and setup stack (cdklocal only)
src/stage/                      # Stage: the single place stacks are created and wired
src/stacks/                     # One stack per component (*-stack.ts)
src/lambda/<name>/              # <name>.lambda.ts handlers; projen generates <name>-function.ts
src/shared/                     # Clients, services and models shared by every component
src/step-functions/             # ASL definitions (JSONata)
src/constants/ src/helpers/     # Accounts, regions, tags, GitHub settings, helpers
dev/environment/                # docker-compose (LocalStack, MongoDB, Mockoon) + seed/stub files
test/                           # CDK assertion tests (run in the build)
test/localstack/                # Integration tests against LocalStack (run separately)
```

## Local development

Prerequisites: Docker, Node 24+, AWS CLI v2 and the `LOCALSTACK_AUTH_TOKEN` environment variable.

```
npm ci
npx projen build                          # compile, synth (with cdk-nag), assertion tests, lint
npx projen localstack:start               # environment up, bootstrap, setup stack, deploy the Local stage
npx projen test:localstack                # integration tests against LocalStack
npx projen localstack:update:<component>  # clean redeploy of one stack after a change
npx projen localstack:down
```

Mockoon serves stub HTTP APIs on `http://localhost:3001` from
`dev/environment/setup/mockoon/test-api.json`. MongoDB listens on `localhost:27017`.

## Deployment

The `deploy` workflow builds and deploys the `Prod` stage on every push to `main`, using GitHub
OIDC (no stored AWS keys). One-time setup, done by a person with access to the account:

1. In `src/constants/github.constants.ts`, set `repository` to this repository and
   `oidcSubjectPrefix` to the `sub_claim_prefix` printed by
   `gh api repos/<owner>/<repo>/actions/oidc/customization/sub` (e.g.`gh api repos/jf90dev/instagram-auto-reply/actions/oidc/customization/sub` ). Repositories using GitHub's
   immutable subject need the `repo:<owner>@<id>/<repo>@<id>` form.
2. Bootstrap the account: `npx cdk bootstrap aws://<account>/<region>`.
3. Deploy the deploy role: `npx cdk deploy InstagramAutoReplyGitHubDeployRoleStack`. If the account
   already has a GitHub OIDC provider, pass its ARN as `githubOidcProviderArn` first.
4. In GitHub, create the `Prod` environment (add required reviewers if deploys need approval) and
   set its `AWS_DEPLOY_ROLE_ARN` variable to the role ARN from step 3.
5. Protect `main` so changes arrive through reviewed pull requests.

Other workflows projen generates: `build` (pull requests: build, and fail if generated files
drifted), `pull-request-lint` (PR titles must be conventional commits) and `upgrade` (weekly
dependency upgrade PR). `build` and `upgrade` need a `PROJEN_GITHUB_TOKEN` secret, a token that can
push branches and open pull requests.
