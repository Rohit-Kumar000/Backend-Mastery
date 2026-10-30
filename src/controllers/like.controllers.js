import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { findAccessibleVideo } from "../utils/findAccessibleVideo.js";

const toggleLike = async (field, targetId, userId) => {
    const removed = await Like.findOneAndDelete({
        [field]: targetId,
        likedBy: userId,
    });

    if (removed) {
        return false;
    }

    try {
        await Like.create({ [field]: targetId, likedBy: userId });
    } catch (error) {
        // A concurrent request already created the like (unique index)
        if (error?.code !== 11000) throw error;
    }

    return true;
};

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    await findAccessibleVideo(videoId, req.user._id);

    const isLiked = await toggleLike("video", videoId, req.user._id);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isLiked },
                isLiked
                    ? "Video liked successfully"
                    : "Video unliked successfully"
            )
        );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }

    const commentExists = await Comment.exists({ _id: commentId });

    if (!commentExists) {
        throw new ApiError(404, "Comment not found");
    }

    const isLiked = await toggleLike("comment", commentId, req.user._id);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isLiked },
                isLiked
                    ? "Comment liked successfully"
                    : "Comment unliked successfully"
            )
        );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }

    const tweetExists = await Tweet.exists({ _id: tweetId });

    if (!tweetExists) {
        throw new ApiError(404, "Tweet not found");
    }

    const isLiked = await toggleLike("tweet", tweetId, req.user._id);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isLiked },
                isLiked
                    ? "Tweet liked successfully"
                    : "Tweet unliked successfully"
            )
        );
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const likedVideos = await Like.aggregate([
        {
            // only video likes of the current user
            $match: {
                likedBy: userId,
                video: { $exists: true, $ne: null },
            },
        },
        {
            $sort: { createdAt: -1 },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        // hide unpublished videos unless they belong to the user
                        $match: {
                            $or: [{ isPublished: true }, { owner: userId }],
                        },
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" },
                        },
                    },
                ],
            },
        },
        {
            // drops likes whose video was deleted / is hidden
            $unwind: "$video",
        },
        {
            $project: {
                _id: 0,
                likedAt: "$createdAt",
                video: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideos,
                "Liked videos fetched successfully"
            )
        );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
