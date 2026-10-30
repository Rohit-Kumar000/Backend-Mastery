import "./loadEnv.js";
import connectDB from "./databases/index.js";
import { app } from "./app.js";
import { validateEnv } from "./utils/validateEnv.js";

const startServer = async () => {
    try {
        validateEnv();
        await connectDB();

        const port = process.env.PORT || 8000;
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();
