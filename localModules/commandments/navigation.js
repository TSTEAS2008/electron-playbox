//localmodules/commandments/navigation.js
import { isPathSafe, APP_PROTOCOL, servedPaths } from "../appProtocol.js";
import { errorLog } from '../loggers.js';
import { errorResponse, successResponse } from "../sandboxHelpers.js";


export function navigateWindow(urlPath, mainWindow) {

    try {
        if (typeof urlPath !== "string" || !isPathSafe(urlPath, servedPaths.app)) {
            return errorResponse("Invalid URL path");
        }

        const url = `${APP_PROTOCOL}://${urlPath.replace(/^\/+/, "")}`;
        mainWindow?.loadURL(url);
        return successResponse({ url });
    } catch (err) {
        errorLog(`[NAVIGATE] Error: ${err.message}`);
        return errorResponse(err.message);
    }

}
