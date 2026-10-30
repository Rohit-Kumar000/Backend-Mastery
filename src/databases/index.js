import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI, {
        dbName: DB_NAME,
    });

    console.log(
        `MongoDB connected. Host: ${connectionInstance.connection.host}`
    );
};

export default connectDB;
