import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { trimString } from "../utils/trimString.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-z0-9_.]{3,30}$/;
const MIN_PASSWORD_LENGTH = 8;
const SAFE_USER_FIELDS = "-password -refreshToken";

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
};

const getPassword = (value) => (typeof value === "string" ? value : "");

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access and refresh tokens"
        );
    }
};

// Uploads a new image for the given user field and removes the previous one from Cloudinary
const replaceUserImage = async (req, res, field, label) => {
    const localPath = req.file?.path;

    if (!localPath) {
        throw new ApiError(400, `${label} file is missing`);
    }

    const uploaded = await uploadOnCloudinary(localPath);

    if (!uploaded?.secure_url) {
        throw new ApiError(500, `Error while uploading ${label.toLowerCase()}`);
    }

    const previousUrl = req.user[field];

    let user;
    try {
        user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { [field]: uploaded.secure_url } },
            { new: true }
        ).select(SAFE_USER_FIELDS);
    } catch (error) {
        await deleteFromCloudinary(uploaded.secure_url);
        throw error;
    }

    await deleteFromCloudinary(previousUrl);

    return res
        .status(200)
        .json(new ApiResponse(200, user, `${label} updated successfully`));
};

const registerUser = asyncHandler(async (req, res) => {
    const fullName = trimString(req.body?.fullName);
    const email = trimString(req.body?.email).toLowerCase();
    const username = trimString(req.body?.username).toLowerCase();
    const password = getPassword(req.body?.password);

    if (!fullName || !email || !username || !password) {
        throw new ApiError(
            400,
            "fullName, email, username and password are required"
        );
    }

    if (!EMAIL_REGEX.test(email)) {
        throw new ApiError(400, "Invalid email address");
    }

    if (!USERNAME_REGEX.test(username)) {
        throw new ApiError(
            400,
            "Username must be 3-30 characters and contain only letters, numbers, underscores or dots"
        );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new ApiError(
            400,
            `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
        );
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const [avatar, coverImage] = await Promise.all([
        uploadOnCloudinary(avatarLocalPath),
        uploadOnCloudinary(coverImageLocalPath),
    ]);

    if (!avatar?.secure_url) {
        await deleteFromCloudinary(coverImage?.secure_url);
        throw new ApiError(500, "Failed to upload avatar");
    }

    let createdUser;
    try {
        const user = await User.create({
            fullName,
            username,
            email,
            password,
            avatar: avatar.secure_url,
            coverImage: coverImage?.secure_url || "",
        });

        createdUser = await User.findById(user._id).select(SAFE_USER_FIELDS);
    } catch (error) {
        await Promise.all([
            deleteFromCloudinary(avatar.secure_url),
            deleteFromCloudinary(coverImage?.secure_url),
        ]);
        throw error;
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, createdUser, "User registered successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const email = trimString(req.body?.email).toLowerCase();
    const username = trimString(req.body?.username).toLowerCase();
    const password = getPassword(req.body?.password);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    const user = await User.findOne({
        $or: [username && { username }, email && { email }].filter(Boolean),
    });

    // Same response for unknown user and wrong password to avoid account enumeration
    if (!user || !(await user.isPasswordCorrect(password))) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(SAFE_USER_FIELDS);

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $unset: { refreshToken: 1 },
    });

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        trimString(req.body?.refreshToken) || req.cookies?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    let decodedToken;

    try {
        decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    } catch (error) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(decodedToken._id);

    if (!user || incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or already used");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken },
                "Access token refreshed"
            )
        );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const oldPassword = getPassword(req.body?.oldPassword);
    const newPassword = getPassword(req.body?.newPassword);

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "oldPassword and newPassword are required");
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
        throw new ApiError(
            400,
            `New password must be at least ${MIN_PASSWORD_LENGTH} characters long`
        );
    }

    if (oldPassword === newPassword) {
        throw new ApiError(
            400,
            "New password must be different from the old password"
        );
    }

    const user = await User.findById(req.user._id);

    if (!(await user.isPasswordCorrect(oldPassword))) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const fullName = trimString(req.body?.fullName);
    const email = trimString(req.body?.email).toLowerCase();

    if (!fullName && !email) {
        throw new ApiError(400, "Provide at least one of fullName or email");
    }

    const updates = {};

    if (fullName) updates.fullName = fullName;

    if (email) {
        if (!EMAIL_REGEX.test(email)) {
            throw new ApiError(400, "Invalid email address");
        }

        const emailTaken = await User.exists({
            email,
            _id: { $ne: req.user._id },
        });

        if (emailTaken) {
            throw new ApiError(409, "Email is already in use");
        }

        updates.email = email;
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
    ).select(SAFE_USER_FIELDS);

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        );
});

const updateUserAvatar = asyncHandler(async (req, res) =>
    replaceUserImage(req, res, "avatar", "Avatar")
);

const updateUserCoverImage = asyncHandler(async (req, res) =>
    replaceUserImage(req, res, "coverImage", "Cover image")
);

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const username = trimString(req.params.username).toLowerCase();

    if (!username) {
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: { username },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                channelsSubscribedToCount: { $size: "$subscribedTo" },
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
                coverImage: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                createdAt: 1,
            },
        },
    ]);

    if (!channel.length) {
        throw new ApiError(404, "Channel does not exist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User channel fetched successfully"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(req.user._id) },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
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
                        $addFields: { owner: { $first: "$owner" } },
                    },
                ],
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0]?.watchHistory ?? [],
                "Watch history fetched successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
