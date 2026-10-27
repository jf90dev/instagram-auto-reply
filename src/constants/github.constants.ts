/**
 * The GitHub repository and environment the deploy workflow runs in. The deploy role only trusts
 * OIDC tokens issued for this repository and environment.
 */
export const GitHub = {
    repository: "your-org/instagram-auto-reply",
    /**
     * The start of the OIDC token's `sub` claim, everything before `:environment:<env>`. Read it from
     * `gh api repos/<owner>/<repo>/actions/oidc/customization/sub` (`sub_claim_prefix`). With
     * GitHub's immutable subject it includes the owner and repository ids, so a renamed or
     * re-created repository with the same name can't assume the role.
     */
    oidcSubjectPrefix: "repo:your-org/instagram-auto-reply",
    deployEnvironment: "Prod"
};
