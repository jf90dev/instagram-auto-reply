import { App } from "aws-cdk-lib";

import { SetupStack } from "./set-up-stack";
import { AwsAccount } from "../constants/aws-account.constants";
import { AwsRegion } from "../constants/aws-region.constants";

const app = new App();

new SetupStack(app, "SetUpStack", { env: { account: AwsAccount.localstack, region: AwsRegion.localstack } });

app.synth();
