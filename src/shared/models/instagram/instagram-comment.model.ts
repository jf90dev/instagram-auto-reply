import { InstagramUserReference } from "./instagram-user-reference.model";

export class InstagramComment {
    id: string;
    text?: string;
    timestamp?: string;
    from?: InstagramUserReference;
    parent_id?: string;
    replies?: { data: InstagramComment[] };
}

export class InstagramCommentList {
    data: InstagramComment[];
}
