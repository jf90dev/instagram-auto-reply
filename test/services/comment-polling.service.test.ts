import "reflect-metadata";

import { InstagramGraphClient } from "../../src/shared/clients/instagram-graph.client";
import { StepFunctionsClient } from "../../src/shared/clients/step-functions.client";
import { ReceivedCommentRepository } from "../../src/shared/repositories/received-comment.repository";
import { CommentPollingService } from "../../src/shared/services/comment-polling.service";
import { LoggerService } from "../../src/shared/services/logger.service";

const accountId = "17840000000000000";
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

describe("CommentPollingService", () => {
    const instagramGraphClient = {
        getAccountUserId: jest.fn().mockResolvedValue(accountId),
        getRecentMedia: jest.fn().mockResolvedValue([{ id: "media-1" }, { id: "media-2" }]),
        getMediaComments: jest.fn().mockImplementation(async (mediaId: string) =>
            mediaId === "media-1"
                ? [
                      { id: "seen-comment", text: "Old news", timestamp: minutesAgo(30), from: { id: "user-1" } },
                      { id: "new-comment", text: "Love this", timestamp: minutesAgo(2), from: { id: "user-2" } }
                  ]
                : []
        )
    };
    const stepFunctionsClient = { startExecutionOnce: jest.fn().mockResolvedValue(true) };
    const receivedCommentRepository = {
        findNewCommentIds: jest
            .fn()
            .mockImplementation(async (commentIds: string[]) => commentIds.filter(id => id !== "seen-comment")),
        markAsReceived: jest.fn().mockResolvedValue(undefined)
    };

    const service = new CommentPollingService(
        new LoggerService(),
        instagramGraphClient as unknown as InstagramGraphClient,
        stepFunctionsClient as unknown as StepFunctionsClient,
        receivedCommentRepository as unknown as ReceivedCommentRepository
    );

    // test("starts a reply only for comments that haven't been received before", async () => {
    //     const result = await service.pollComments();

    //     expect(result).toEqual({ postsChecked: 2, recentComments: 2, newComments: 1 });
    //     expect(stepFunctionsClient.startExecutionOnce).toHaveBeenCalledTimes(1);
    //     expect(stepFunctionsClient.startExecutionOnce.mock.calls[0][2]).toMatchObject({
    //         eventId: "comment:new-comment",
    //         mediaId: "media-1",
    //         senderId: "user-2"
    //     });
    //     expect(receivedCommentRepository.markAsReceived).toHaveBeenCalledWith("new-comment");
    //     expect(receivedCommentRepository.markAsReceived).not.toHaveBeenCalledWith("seen-comment");
    // });
});
