import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Comment } from "../models/comment.models.js";
import { Like } from "../models/like.models.js";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { trimString } from "../utils/trimString.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary.js";

const ALLOWED_SORT_FIELDS = ["createdAt", "views", "duration", "title"];

// Escapes user input so it can be safely used inside a RegExp
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Get all videos (search, sort, pagination)
const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId,
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const match = {};

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid user id");
        }
        match.owner = new mongoose.Types.ObjectId(userId);
    }

    // unpublished videos are visible only to their owner
    const isOwnChannel = userId && userId === req.user._id.toString();
    if (!isOwnChannel) {
        match.isPublished = true;
    }

    if (typeof query === "string" && query.trim()) {
        const regex = new RegExp(escapeRegex(query.trim()), "i");
        match.$or = [{ title: regex }, { description: regex }];
    }

    const sortField = ALLOWED_SORT_FIELDS.includes(sortBy)
        ? sortBy
        : "createdAt";
    const sortOrder = sortType === "asc" ? 1 : -1;

    const videosAggregate = Video.aggregate([
        { $match: match },
        { $sort: { [sortField]: sortOrder, _id: sortOrder } },
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
    ]);

    const videos = await Video.aggregatePaginate(videosAggregate, {
        page: pageNumber,
        limit: limitNumber,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

// Publish a video (upload video + thumbnail to cloudinary)
const publishAVideo = asyncHandler(async (req, res) => {
    const title = trimString(req.body?.title);
    const description = trimString(req.body?.description);

    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Video file and thumbnail are required");
    }

    const [videoFile, thumbnail] = await Promise.all([
        uploadOnCloudinary(videoLocalPath),
        uploadOnCloudinary(thumbnailLocalPath),
    ]);

    const removeUploads = () =>
        Promise.all([
            deleteFromCloudinary(videoFile?.secure_url),
            deleteFromCloudinary(thumbnail?.secure_url),
        ]);

    if (!videoFile?.secure_url || !thumbnail?.secure_url) {
        await removeUploads();
        throw new ApiError(500, "Failed to upload video or thumbnail");
    }

    let video;
    try {
        video = await Video.create({
            videoFile: videoFile.secure_url,
            thumbnail: thumbnail.secure_url,
            title,
            description,
            duration: videoFile.duration || 0,
            owner: req.user._id,
        });
    } catch (error) {
        await removeUploads();
        throw error;
    }

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video published successfully"));
});

// Get video by id (also counts the view and adds it to watch history)
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const result = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
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
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    {
                        $addFields: {
                            subscribersCount: { $size: "$subscribers" },
                            isSubscribed: {
                                $in: [req.user._id, "$subscribers.subscriber"],
                            },
                        },
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                likesCount: { $size: "$likes" },
                isLiked: { $in: [req.user._id, "$likes.likedBy"] },
            },
        },
        {
            $project: {
                likes: 0,
            },
        },
    ]);

    const video = result[0];

    // unpublished videos are visible only to their owner
    if (
        !video ||
        (!video.isPublished &&
            video.owner?._id.toString() !== req.user._id.toString())
    ) {
        throw new ApiError(404, "Video not found");
    }

    await Promise.all([
        Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } }),
        User.findByIdAndUpdate(req.user._id, {
            $addToSet: { watchHistory: videoId },
        }),
    ]);

    video.views += 1;

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video fetched successfully"));
});

// Update video details (title, description, thumbnail)
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const title = trimString(req.body?.title);
    const description = trimString(req.body?.description);
    const thumbnailLocalPath = req.file?.path;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    if (!title && !description && !thumbnailLocalPath) {
        throw new ApiError(
            400,
            "Provide at least one of title, description or thumbnail"
        );
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this video");
    }

    const previousThumbnail = video.thumbnail;
    let newThumbnailUrl;

    if (title) video.title = title;
    if (description) video.description = description;

    if (thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        if (!thumbnail?.secure_url) {
            throw new ApiError(500, "Failed to upload thumbnail");
        }

        newThumbnailUrl = thumbnail.secure_url;
        video.thumbnail = newThumbnailUrl;
    }

    try {
        await video.save();
    } catch (error) {
        await deleteFromCloudinary(newThumbnailUrl);
        throw error;
    }

    if (newThumbnailUrl) {
        await deleteFromCloudinary(previousThumbnail);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video updated successfully"));
});

// Delete video (and everything attached to it)
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this video");
    }

    const commentIds = await Comment.distinct("_id", { video: videoId });

    await Promise.all([
        Video.findByIdAndDelete(videoId),
        Comment.deleteMany({ video: videoId }),
        Like.deleteMany({
            $or: [{ video: videoId }, { comment: { $in: commentIds } }],
        }),
        Playlist.updateMany(
            { videos: videoId },
            { $pull: { videos: videoId } }
        ),
        User.updateMany(
            { watchHistory: videoId },
            { $pull: { watchHistory: videoId } }
        ),
    ]);

    await Promise.all([
        deleteFromCloudinary(video.videoFile),
        deleteFromCloudinary(video.thumbnail),
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, { videoId }, "Video deleted successfully"));
});

// Toggle publish / unpublish
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "You are not allowed to change publish status of this video"
        );
    }

    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isPublished: video.isPublished },
                video.isPublished
                    ? "Video published successfully"
                    : "Video unpublished successfully"
            )
        );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
