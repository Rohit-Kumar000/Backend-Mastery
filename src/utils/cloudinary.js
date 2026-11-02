import { v2 as cloudinary } from "cloudinary";
import { removeFile } from "./files.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// Uploads a local file and always removes it from disk afterwards
const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) return null;

    try {
        return await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
    } catch (error) {
        console.error("Cloudinary upload failed:", error.message);
        return null;
    } finally {
        removeFile(localFilePath);
    }
};

// Extracts public id and resource type from a delivery URL
const parseCloudinaryUrl = (url) => {
    if (typeof url !== "string") return null;

    const match = url.match(/\/(image|video|raw)\/upload\/(.+)$/);
    if (!match) return null;

    const [, resourceType, rest] = match;
    const path = rest.split("?")[0].replace(/^v\d+\//, "");
    const publicId =
        resourceType === "raw" ? path : path.replace(/\.[^/.]+$/, "");

    return { publicId: decodeURIComponent(publicId), resourceType };
};

// Best-effort cleanup: never throws, so it is safe to call inside error paths
const deleteFromCloudinary = async (url) => {
    const asset = parseCloudinaryUrl(url);
    if (!asset) return false;

    try {
        await cloudinary.uploader.destroy(asset.publicId, {
            resource_type: asset.resourceType,
            invalidate: true,
        });
        return true;
    } catch (error) {
        console.error("Cloudinary delete failed:", error.message);
        return false;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary, parseCloudinaryUrl };
