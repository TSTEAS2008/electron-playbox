// localModules/commandments/processControl.js
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import kill from "tree-kill";
import { debugLog, errorLog } from "../loggers.js";
import { servedPaths, isPathSafe } from "../appProtocol.js";
import { successResponse, errorResponse } from "../sandboxHelpers.js";

/**
 * Internal children Map is private to this module.
 * Exposed killAllChildren returns an async function to allow main.js to call it.
 */
export const children = new Map();

/**
 * startApp(args) -> { appPath }
 */
export async function startApp(args = {}) {
    const { appPath } = args;
    try {
        if (!appPath || typeof appPath !== "string") {
            return errorResponse("Invalid appPath");
        }

        if(!isPathSafe(appPath, servedPaths.app)) {
            return errorResponse("Path outside allowed app directory.");
        }

        const absolute = path.isAbsolute(appPath) ? appPath : path.join(servedPaths.app, appPath);

        if (!fs.existsSync(absolute)) {
            return errorResponse("File does not exist");
        }

        const ext = path.extname(absolute).toLowerCase();
        let child;
        const spawnCwd = servedPaths.app;

        if (ext === ".js") {
            debugLog(`[JS] Launching: ${absolute}`);
            child = spawn(process.execPath, [absolute], {
                cwd: spawnCwd,
                stdio: ["ignore", "pipe", "pipe"],
                shell: false,
                env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
            });

        } else if (ext === ".exe" || ext === "") {
            debugLog(`[BINARY] Launching: ${absolute}`);
            child = spawn(absolute, [], {
                cwd: spawnCwd,
                stdio: ["ignore", "pipe", "pipe"],
                shell: false,
            });

        } else {
            return errorResponse(`Unsupported file type: ${ext}`);
        }

        children.set(child.pid, child);

        child.stdout?.on("data", (data) => {
            debugLog(`[OUT ${child.pid}] ${data.toString().trim()}`);
        });
        child.stderr?.on("data", (data) => {
            debugLog(`[ERR ${child.pid}] ${data.toString().trim()}`);
        });

        child.once("exit", (code, signal) => {
            debugLog(`[EXIT] PID ${child.pid} exited with code ${code}, signal ${signal}`);
            children.delete(child.pid);
        });

        child.once("error", (err) => {
            errorLog(`[ERROR] PID ${child.pid} error: ${err.message}`);
            children.delete(child.pid);
        });

        debugLog(`[SPAWNED] PID: ${child.pid}, File: ${path.basename(appPath)}`);

        return successResponse({ pid: child.pid, launched: path.basename(appPath) });
    } catch (err) {
        errorLog(`[FATAL] start-app error: ${err?.message ?? err}`);
        return errorResponse(err?.message ?? "start-app failed");
    }
}

/**
 * killApp(args) -> { pid }
 */
export async function killApp(args = {}) {
    const { pid } = args;
    try {
        if (typeof pid !== "number" || !children.has(pid)) {
            return errorResponse("Invalid or unknown PID");
        }

        const child = children.get(pid);
        return await new Promise((resolve) => {
            kill(child.pid, "SIGTERM", (err) => {
                if (err) {
                    errorLog(`[KILL-APP] Failed to kill PID ${pid}: ${err.message}`);
                    resolve(errorResponse(`Failed to kill process: ${err.message}`));
                } else {
                    debugLog(`[KILL-APP] Successfully killed PID ${pid}`);
                    children.delete(pid);
                    resolve(successResponse({ message: `Process ${pid} killed` }));
                }
            });
        });
    } catch (err) {
        errorLog(`[KILL-APP] Error: ${err?.message ?? err}`);
        return errorResponse(err?.message ?? "kill-app failed");
    }
}

/**
 * listApps() -> { pids, count }
 */
export async function listApps() {
    try {
        const running = Array.from(children.keys());
        return successResponse({ pids: running, count: running.length });
    } catch (err) {
        errorLog(`[LIST-APPS] Error: ${err?.message ?? err}`);
        return errorResponse(err?.message ?? "list-apps failed");
    }
}

/**
 * killAllChildren() -> performs cleanup; used by main.js during shutdown
 */
export async function killAllChildren() {
    if (children.size === 0) return;

    debugLog(`[CLEANUP] Killing ${children.size} child processes`);

    const killPromises = Array.from(children.keys()).map(
        (pid) =>
        new Promise((resolve) => {
            kill(pid, "SIGTERM", (err) => {
                if (err) {
                    errorLog(`[CLEANUP] Failed to kill PID ${pid}: ${err.message}`);
                } else {
                    debugLog(`[CLEANUP] Killed PID ${pid}`);
                }
                resolve();
            });
        })
    );

    await Promise.all(killPromises);

    // small safety: clear map
    children.clear();
    debugLog("[CLEANUP] All child processes terminated (or attempted)");
}
