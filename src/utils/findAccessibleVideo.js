import { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { ApiError } from "./apiError.js";

// Unpublished videos are only visible to their owner
const findAccessibleVideo = async (videoId, userId) => {
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId).select("owner isPublished");

    if (!video || (!video.isPublished && !video.owner?.equals(userId))) {
        throw new ApiError(404, "Video not found");
    }

    return video;
};

export { findAccessibleVideo };
