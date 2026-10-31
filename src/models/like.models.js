import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet",
        },
        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

likeSchema.pre("validate", function () {
    const targets = [this.video, this.comment, this.tweet].filter(Boolean);

    if (targets.length !== 1) {
        throw new Error(
            "A like must reference exactly one of video, comment or tweet"
        );
    }
});

// One like per user per target, enforced by the database
["video", "comment", "tweet"].forEach((target) => {
    likeSchema.index(
        { [target]: 1, likedBy: 1 },
        {
            unique: true,
            partialFilterExpression: { [target]: { $exists: true } },
        }
    );
});

export const Like = mongoose.model("Like", likeSchema);
