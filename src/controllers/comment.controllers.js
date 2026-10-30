import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { trimString } from "../utils/trimString.js";
import { findAccessibleVideo } from "../utils/findAccessibleVideo.js";

// Get video comments
const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    await findAccessibleVideo(videoId, req.user._id);

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $sort: { createdAt: -1 },
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                likesCount: { $size: "$likes" },
                isLiked: {
                    $in: [req.user._id, "$likes.likedBy"],
                },
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
            },
        },
    ]);

    const comments = await Comment.aggregatePaginate(commentsAggregate, {
        page: pageNumber,
        limit: limitNumber,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

// Add Comment
const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const content = trimString(req.body?.content);

    if (!content) {
        throw new ApiError(400, "Comment content is required");
    }

    await findAccessibleVideo(videoId, req.user._id);

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment added successfully"));
});

// Update Comment
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const content = trimString(req.body?.content);

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }

    if (!content) {
        throw new ApiError(400, "Comment content is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this comment");
    }

    comment.content = content;
    await comment.save();

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

// Delete Comment
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this comment");
    }

    await Promise.all([
        Comment.findByIdAndDelete(commentId),
        Like.deleteMany({ comment: commentId }),
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(200, { commentId }, "Comment deleted successfully")
        );
});

export { getVideoComments, addComment, updateComment, deleteComment };
