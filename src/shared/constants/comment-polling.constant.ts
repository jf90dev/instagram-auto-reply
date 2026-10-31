/** How many of the account's latest posts each polling run checks for comments. */
export const POSTS_TO_CHECK = 10;
/** Comments per post each run reads (newest first); a busier post's older comments are missed. */
export const COMMENTS_PER_POST = 50;
/**
 * Comments older than this are ignored, so the first run (or a run after a long outage) doesn't
 * reply to a backlog of old comments.
 */
export const COMMENT_LOOKBACK_HOURS = 24;
