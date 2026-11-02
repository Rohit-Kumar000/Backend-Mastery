import fs from "fs";

const removeFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error("Failed to remove temp file:", error.message);
    }
};

// Accepts req.file, an array of files, or the object produced by multer's upload.fields()
const removeTempFiles = (files) => {
    if (!files) return;

    const list = Array.isArray(files)
        ? files
        : files.path
          ? [files]
          : Object.values(files).flat();

    list.forEach((file) => removeFile(file?.path));
};

export { removeFile, removeTempFiles };
