/**
 * What one polling run found: how many posts it checked, how many recent comments from other
 * people it saw, and how many of those were new and started a reply.
 */
export class CommentPollResult {
    postsChecked: number;
    recentComments: number;
    newComments: number;
}
