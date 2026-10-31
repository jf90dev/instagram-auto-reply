import { InstagramUserReference } from "./instagram-user-reference.model";

export class InstagramMessage {
    id: string;
    message?: string;
    created_time: string;
    from: InstagramUserReference;
}

export class InstagramConversation {
    id: string;
    messages?: { data: InstagramMessage[] };
}

export class InstagramConversationList {
    data: { id: string }[];
}
