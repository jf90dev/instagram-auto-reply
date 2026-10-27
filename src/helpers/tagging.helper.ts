import { Tags } from "aws-cdk-lib";
import { Construct } from "constructs";

import { AwsTags } from "../constants/aws-tags.constant";

export class TaggingHelper {
    static tagResource(resource: Construct) {
        for (const x in AwsTags) {
            Tags.of(resource).add(x, AwsTags[x]);
        }
    }
}
