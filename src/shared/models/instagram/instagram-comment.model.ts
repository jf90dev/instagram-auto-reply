import { InstagramUserReference } from "./instagram-webhook-payload.model";

export class InstagramComment {
    id: string;
    text?: string;
    timestamp?: string;
    from?: InstagramUserReference;
    parent_id?: string;
}
