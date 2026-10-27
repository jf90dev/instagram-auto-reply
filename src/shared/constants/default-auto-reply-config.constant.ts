import { AutoReplyConfig } from "../models/auto-reply/auto-reply-config.model";

/**
 * Used for any field the `auto_reply` config document leaves out. Review mode means nothing is
 * sent until the account owner switches the mode to auto.
 */
export const DEFAULT_AUTO_REPLY_CONFIG: AutoReplyConfig = {
    isEnabled: true,
    mode: "review",
    replyToComments: true,
    replyToMessages: true,
    maxRepliesPerUserPerDay: 3,
    brandVoice:
        "@themanualformen shares lessons from books on discipline, character and becoming a better man. " +
        "Replies sound like a calm, direct older brother: warm, short and specific to what the person said. " +
        "Plain words, no hashtags, no hype, at most one emoji. Never preachy, never salesy.",
    allowedLinks: []
};
