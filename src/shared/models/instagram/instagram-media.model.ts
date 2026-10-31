export class InstagramMedia {
    id: string;
    caption?: string;
    permalink?: string;
    timestamp?: string;
}

export class InstagramMediaList {
    data: InstagramMedia[];
}
