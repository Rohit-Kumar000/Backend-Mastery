import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import dotenv from "dotenv";

dotenv.config();

console.log("Cloudinary env check:", {
    cloud_name: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
    api_key: Boolean(process.env.CLOUDINARY_API_KEY),
    api_secret: Boolean(process.env.CLOUDINARY_API_SECRET),
});

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) 
        return null;
    }
};

export {uploadOnCloudinary}

