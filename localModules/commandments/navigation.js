//localmodules/commandments/navigation.js
import { isPathSafe, STATIC_PROTOCOL, DYNAMIC_PROTOCOL, servedPaths } from "../appProtocol.js";
import { errorLog } from '../loggers.js';
import { errorResponse, successResponse } from "../playboxHelpers.js";


export function navigateWindow(args, mainWindow) {
    const { urlPath, protocol = 'dynamic' } = typeof args === 'string' ? { urlPath: args } : args;

    try {
        const targetProtocol = protocol === 'static' ? STATIC_PROTOCOL : DYNAMIC_PROTOCOL;
        const basePath = protocol === 'static' ? servedPaths.static : servedPaths.dynamic;

        if (typeof urlPath !== "string" || !isPathSafe(urlPath, basePath)) {
            return errorResponse("Invalid URL path");
        }

        const url = `${targetProtocol}://${urlPath.replace(/^\/+/, "")}`;
        mainWindow?.loadURL(url);
        return successResponse({ url });
    } catch (err) {
        errorLog(`[NAVIGATE] Error: ${err.message}`);
        return errorResponse(err.message);
    }

}
