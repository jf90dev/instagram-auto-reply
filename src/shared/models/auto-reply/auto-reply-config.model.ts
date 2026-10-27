import { ReplyMode } from "./reply-mode.model";

/**
 * The `auto_reply` document of the config collection. Lets the account owner tune the replies
 * without a deployment.
 */
export class AutoReplyConfig {
    isEnabled: boolean;
    mode: ReplyMode;
    replyToComments: boolean;
    replyToMessages: boolean;
    maxRepliesPerUserPerDay: number;
    brandVoice: string;
    allowedLinks: string[];
}
