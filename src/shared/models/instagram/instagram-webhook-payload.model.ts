export class InstagramUserReference {
    id: string;
    username?: string;
}

export class InstagramCommentChangeValue {
    id: string;
    text?: string;
    from?: InstagramUserReference;
    media?: { id: string; media_product_type?: string };
    parent_id?: string;
}

export class InstagramChange {
    field: string;
    value: InstagramCommentChangeValue;
}

export class InstagramMessagingEvent {
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
        mid: string;
        text?: string;
        is_echo?: boolean;
        is_deleted?: boolean;
    };
}

export class InstagramWebhookEntry {
    id: string;
    time: number;
    changes?: InstagramChange[];
    messaging?: InstagramMessagingEvent[];
}

/**
 * The body Meta posts to the webhook for the `comments` and `messages` subscriptions.
 */
export class InstagramWebhookPayload {
    object: string;
    entry?: InstagramWebhookEntry[];
}
