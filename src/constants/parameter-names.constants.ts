/**
 * SSM Parameter Store parameters the application reads, relative to /<Environment>/<Project>/.
 * They are created by hand in each AWS account (SecureString, except the user id) before the
 * first deployment, and by the localstack:setup task locally.
 */
export class ParameterName {
    static readonly instagramAccessToken = "Instagram/AccessToken";
    static readonly instagramUserId = "Instagram/UserId";
    static readonly anthropicApiKey = "Anthropic/ApiKey";
    static readonly mongoDbUri = "MongoDb/Uri";
}
