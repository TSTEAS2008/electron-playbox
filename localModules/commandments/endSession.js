//localmodules/commandments/endSession.js
import { app } from "electron";
import { clearPlaybox } from "./playbox.js";
import { debugLog, errorLog } from "../loggers.js";
import { successResponse, errorResponse } from "../playboxHelpers.js";

/**
 * End the session: clear playbox and quit the app
 */
export async function endSession() {
    try {
        debugLog("[END-SESSION] Starting session cleanup...");
        
        // Clear the entire playbox (sandbox)
        const clearResult = await clearPlaybox({ folder: "all" });
        
        if (!clearResult.success) {
            errorLog(`[END-SESSION] Failed to clear playbox: ${clearResult.message}`);
            // Continue anyway - we still want to quit
        } else {
            debugLog("[END-SESSION] Playbox cleared successfully");
        }
        
        // Quit the app (this will trigger the before-quit handler in main.js
        // which will kill all child processes automatically)
        debugLog("[END-SESSION] Initiating app quit...");
        app.quit();
        
        return successResponse({ message: "Session ended" });
    } catch (err) {
        errorLog(`[END-SESSION] Error: ${err?.message ?? err}`);
        // Still try to quit even if there was an error
        app.quit();
        return errorResponse(err?.message ?? "end-session failed");
    }
}
