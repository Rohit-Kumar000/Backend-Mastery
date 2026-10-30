import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get Channel Stats
const getChannelStats = asyncHandler(async (req, res) => {
    const channelId = new mongoose.Types.ObjectId(req.user._id);

    const [videoStats, totalSubscribers, videoIds] = await Promise.all([
        Video.aggregate([
            { $match: { owner: channelId } },
            {
                $group: {
                    _id: null,
                    totalVideos: { $sum: 1 },
                    totalViews: { $sum: "$views" },
                },
            },
        ]),
        Subscription.countDocuments({ channel: channelId }),
        Video.distinct("_id", { owner: channelId }),
    ]);

    const totalLikes = await Like.countDocuments({
        video: { $in: videoIds },
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalVideos: videoStats[0]?.totalVideos || 0,
                totalViews: videoStats[0]?.totalViews || 0,
                totalSubscribers,
                totalLikes,
            },
            "Channel stats fetched successfully"
        )
    );
});

// Get Channel Videos
const getChannelVideos = asyncHandler(async (req, res) => {
    const channelId = new mongoose.Types.ObjectId(req.user._id);

    const videos = await Video.aggregate([
        {
            $match: { owner: channelId },
        },
        {
            $sort: { createdAt: -1 },
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
            $addFields: {
                likesCount: { $size: "$likes" },
            },
        },
        {
            $project: {
                likes: 0,
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(200, videos, "Channel videos fetched successfully")
        );
});

export { getChannelStats, getChannelVideos };
