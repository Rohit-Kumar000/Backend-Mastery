import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const TEMP_DIR = "./public/temp";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // Cloudinary free plan video limit

fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP_DIR),
    filename: (req, file, cb) => {
        const extension = path
            .extname(file.originalname)
            .toLowerCase()
            .replace(/[^.a-z0-9]/g, "");
        cb(
            null,
            `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`
        );
    },
});

const fileFilter = (req, file, cb) => {
    const expectedType = file.fieldname === "videoFile" ? "video/" : "image/";

    if (!file.mimetype.startsWith(expectedType)) {
        return cb(
            new ApiError(
                400,
                `${file.fieldname} must be ${expectedType === "video/" ? "a video" : "an image"} file`
            )
        );
    }

    cb(null, true);
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: 2 },
});
