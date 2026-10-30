import multer from "multer";
import { ApiError } from "../utils/apiError.js";
import { removeTempFiles } from "../utils/files.js";

const notFound = (req, res, next) => {
    next(
        new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`)
    );
};

const toApiError = (err) => {
    if (err instanceof ApiError) return err;

    if (err instanceof multer.MulterError) {
        const message =
            err.code === "LIMIT_FILE_SIZE"
                ? "Uploaded file is too large (max 100 MB)"
                : err.code === "LIMIT_UNEXPECTED_FILE"
                  ? `Unexpected file field: ${err.field}`
                  : err.message;
        return new ApiError(400, message);
    }

    if (err.name === "CastError") {
        return new ApiError(400, `Invalid value for ${err.path}`);
    }

    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors).map((e) => e.message);
        return new ApiError(400, errors[0] || "Validation failed", errors);
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "value";
        return new ApiError(409, `${field} already exists`);
    }

    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        return new ApiError(401, "Invalid or expired token");
    }

    if (err.type === "entity.parse.failed") {
        return new ApiError(400, "Invalid JSON body");
    }

    if (err.type === "entity.too.large") {
        return new ApiError(413, "Request body is too large");
    }

    return new ApiError(500, "Internal server error");
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    removeTempFiles(req.file || req.files);

    if (res.headersSent) {
        return next(err);
    }

    const apiError = toApiError(err);

    if (apiError.statusCode >= 500) {
        console.error(err);
    }

    const body = {
        statusCode: apiError.statusCode,
        data: null,
        message: apiError.message,
        success: false,
        errors: apiError.errors,
    };

    if (process.env.NODE_ENV !== "production" && apiError.statusCode >= 500) {
        body.stack = err.stack;
    }

    res.status(apiError.statusCode).json(body);
};

export { notFound, errorHandler };
