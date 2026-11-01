import { inject, injectable } from "tsyringe";

import { LoggerService } from "./logger.service";
import { InstagramGraphClient } from "../clients/instagram-graph.client";
import { StepFunctionsClient } from "../clients/step-functions.client";
import { COMMENT_LOOKBACK_HOURS, COMMENTS_PER_POST, POSTS_TO_CHECK } from "../constants/comment-polling.constant";
import { CommentPollHelper } from "../helpers/comment-poll.helper";
import { CommentPollResult } from "../models/auto-reply/comment-poll-result.model";
import { ReplyRequest } from "../models/auto-reply/reply-request.model";
import { ReceivedCommentRepository } from "../repositories/received-comment.repository";

@injectable()
export class CommentPollingService {
    private readonly stateMachineArn = process.env.STATE_MACHINE_ARN!;

    constructor(
        @inject("LoggerService") private logger: LoggerService,
        @inject("InstagramGraphClient") private instagramGraphClient: InstagramGraphClient,
        @inject("StepFunctionsClient") private stepFunctionsClient: StepFunctionsClient,
        @inject("ReceivedCommentRepository") private receivedCommentRepository: ReceivedCommentRepository
    ) {}

    /**
     * Reads the latest comments on the account's latest posts and starts one state machine
     * execution for each comment that hasn't been received before.
     */
    async pollComments(): Promise<CommentPollResult> {
        try {
            const recentComments = await this.getRecentComments();
            const newCommentIds = await this.receivedCommentRepository.findNewCommentIds(
                recentComments.replyRequests.map(request => request.commentId!)
            );
            const newComments = recentComments.replyRequests.filter(request =>
                newCommentIds.includes(request.commentId!)
            );

            for (const newComment of newComments) {
                await this.startReply(newComment);
            }

            this.logger.info(
                `Checked ${recentComments.postsChecked} posts: ${recentComments.replyRequests.length} recent comments, ${newComments.length} new`
            );

            return {
                postsChecked: recentComments.postsChecked,
                recentComments: recentComments.replyRequests.length,
                newComments: newComments.length
            };
        } catch (error) {
            this.logger.errorMessage(`Failed to poll comments: ${error}`);
            throw error;
        }
    }

    private async getRecentComments(): Promise<{ postsChecked: number; replyRequests: ReplyRequest[] }> {
        const accountUserId = await this.instagramGraphClient.getAccountUserId();
        const since = new Date(Date.now() - COMMENT_LOOKBACK_HOURS * 60 * 60 * 1000);
        const recentPosts = await this.instagramGraphClient.getRecentMedia(POSTS_TO_CHECK);
        const replyRequests: ReplyRequest[] = [];

        for (const post of recentPosts) {
            const comments = await this.instagramGraphClient.getMediaComments(post.id, COMMENTS_PER_POST);
            for (const comment of comments) {
                this.logger.info(
                    `Found comment ${comment.id} on post ${post.id} by ${comment.from}: "${comment.text}"`
                );
            }
            replyRequests.push(...CommentPollHelper.toReplyRequests(post.id, comments, accountUserId, since));
        }

        return { postsChecked: recentPosts.length, replyRequests: replyRequests };
    }

    /**
     * Starts the execution before marking the comment as received: if marking fails, the next run
     * passes the comment on again and Step Functions refuses the duplicate execution name.
     */
    private async startReply(request: ReplyRequest): Promise<void> {
        const executionName = CommentPollHelper.toExecutionName(request);
        const isStarted = await this.stepFunctionsClient.startExecutionOnce(
            this.stateMachineArn,
            executionName,
            request
        );

        await this.receivedCommentRepository.markAsReceived(request.commentId!);

        if (isStarted) {
            this.logger.info(`Started ${executionName} for ${request.eventId}`);
        } else {
            this.logger.info(`Skipped ${request.eventId}: already handled by ${executionName}`);
        }
    }
}
