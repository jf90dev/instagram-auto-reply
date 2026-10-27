/**
 * reply: Claude wrote a reply that can be sent.
 * skip: nothing worth replying to (spam, emoji-only, a reply would add nothing).
 * escalate: a person should look at it (hostile, sensitive, a complaint, or the reply failed a check).
 */
export type ReplyDecision = "reply" | "skip" | "escalate";
