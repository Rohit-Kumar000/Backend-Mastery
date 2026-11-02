const REQUIRED_VARS = [
    "MONGODB_URI",
    "ACCESS_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRY",
    "REFRESH_TOKEN_SECRET",
    "REFRESH_TOKEN_EXPIRY",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
];

const MIN_SECRET_LENGTH = 32;

const validateEnv = () => {
    const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());

    if (missing.length) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}`
        );
    }

    if (/<.+>/.test(process.env.MONGODB_URI)) {
        throw new Error(
            "MONGODB_URI still contains a placeholder such as <db_password>. Replace it with real values."
        );
    }

    const weakSecrets = ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"].filter(
        (name) => process.env[name].length < MIN_SECRET_LENGTH
    );

    if (weakSecrets.length) {
        const message = `${weakSecrets.join(", ")} should be at least ${MIN_SECRET_LENGTH} characters long`;

        if (process.env.NODE_ENV === "production") {
            throw new Error(message);
        }
        console.warn(`Warning: ${message}`);
    }
};

export { validateEnv };
