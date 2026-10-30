import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Check Health
const healthcheck = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                status: "OK",
                uptime: Math.round(process.uptime()),
                timestamp: new Date().toISOString(),
            },
            "Server is up and running"
        )
    );
});

export { healthcheck };
