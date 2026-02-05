//localmodules/loggers.js

import fs from 'fs';
import path from 'path';
import { __appDataPath } from './basePath.js';

// Setup logging to files (clears on startup)
const logDir = path.join(__appDataPath, 'logs');
export const processLogFile = path.join(logDir, 'process.log');
export const errorLogFile = path.join(logDir, 'error.log');

// Clear log files on startup
export function clearAllLogs() {
    try {
        // Ensure logs directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        fs.writeFileSync(processLogFile, '');
        fs.writeFileSync(errorLogFile, '');
    } catch (err) {
        // Can't do much if we can't write logs
    }
}

export const debugLog = (msg) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${msg}\n`;
    try {
        fs.appendFileSync(processLogFile, logMsg);
    } catch (err) {
        // Silently fail if we can't write to log
    }
};

export const errorLog = (msg) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${msg}\n`;
    try {
        fs.appendFileSync(errorLogFile, logMsg);
    } catch (err) {
        // Silently fail if we can't write to log
    }
};


export function loggerSetup(context = {}) {
    clearAllLogs();

    debugLog(`=== App Started ===`);
    debugLog(`Process log: ${processLogFile}`);
    debugLog(`Error log: ${errorLogFile}`);

    if (context.processInfo) {
        debugLog(`process.execPath: ${context.processInfo.execPath}`);
        debugLog(`process.resourcesPath: ${context.processInfo.resourcesPath}`);
    }
    if (context.appPath) {
        debugLog(`app.getAppPath(): ${context.appPath}`);
    }

    return { debugLog, errorLog }; // return handles if needed elsewhere
}
