// localModules/commandments/processControl.js
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import kill from "tree-kill";
import { debugLog, errorLog } from "../loggers.js";
import { servedPaths, isPathSafe } from "../appProtocol.js";
import { successResponse, errorResponse } from "../playboxHelpers.js";

/**
 * Internal children Map is private to this module.
 * Exposed killAllChildren returns an async function to allow main.js to call it.
 */
export const children = new Map();

/**
 * Buffer storage for child process output.
 * Key: PID, Value: { stdout: Buffer[], stderr: Buffer[] }
 */
const outputBuffers = new Map();

/**
 * startApp(args) -> { appPath }
 */
export async function startApp(args = {}) {
    let appPath, protocol;

    if (typeof args === 'string') {
        appPath = args;
        protocol = 'static';
    } else {
        ({ appPath, protocol = 'static' } = args);
    }

    try {
        if (!appPath || typeof appPath !== "string") {
            return errorResponse("Invalid appPath");
        }

        const basePath = protocol === 'dynamic' ? servedPaths.dynamic : servedPaths.static;

        if(!isPathSafe(appPath, basePath)) {
            return errorResponse("Path outside allowed app directory.");
        }

        const absolute = path.isAbsolute(appPath) ? appPath : path.join(basePath, appPath);

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

        // Initialize output buffers for this child
        outputBuffers.set(child.pid, { stdout: [], stderr: [] });

        child.stdout?.on("data", (data) => {
            // Store the data buffer
            outputBuffers.get(child.pid).stdout.push(Buffer.from(data));
            debugLog(`[OUT ${child.pid}] ${data.toString().trim()}`);
        });
        child.stderr?.on("data", (data) => {
            // Store the data buffer
            outputBuffers.get(child.pid).stderr.push(Buffer.from(data));
            debugLog(`[ERR ${child.pid}] ${data.toString().trim()}`);
        });

        child.once("exit", (code, signal) => {
            debugLog(`[EXIT] PID ${child.pid} exited with code ${code}, signal ${signal}`);
            children.delete(child.pid);
            outputBuffers.delete(child.pid);
        });

        child.once("error", (err) => {
            errorLog(`[ERROR] PID ${child.pid} error: ${err.message}`);
            children.delete(child.pid);
            outputBuffers.delete(child.pid);
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
export async function killApp(args) {
    const pid = typeof args === 'number' ? args : args.pid;
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
 * readApp(args) -> { pid, stdout, stderr, stdoutBytes, stderrBytes }
 * Atomically reads and clears all buffered output from a child process.
 * Returns exactly what has been written so far, with no race conditions.
 */
export async function readApp(args) {
    const pid = typeof args === 'number' ? args : args.pid;
    try {
        if (typeof pid !== "number") {
            return errorResponse("Invalid PID");
        }

        if (!outputBuffers.has(pid)) {
            return errorResponse("Unknown PID or process has no output buffers");
        }

        const buffers = outputBuffers.get(pid);

        // Atomically extract and clear the buffer arrays
        // This prevents race conditions with ongoing writes
        const stdoutChunks = buffers.stdout.splice(0);
        const stderrChunks = buffers.stderr.splice(0);

        // Concatenate all chunks into single buffers
        const stdoutBuffer = stdoutChunks.length > 0 ? Buffer.concat(stdoutChunks) : Buffer.alloc(0);
        const stderrBuffer = stderrChunks.length > 0 ? Buffer.concat(stderrChunks) : Buffer.alloc(0);

        // Convert to base64 for safe transmission over IPC
        const stdoutBase64 = stdoutBuffer.toString('base64');
        const stderrBase64 = stderrBuffer.toString('base64');

        debugLog(`[READ-APP] PID ${pid}: Read ${stdoutBuffer.length} stdout bytes, ${stderrBuffer.length} stderr bytes`);

        return successResponse({
            pid,
            stdout: stdoutBase64,
            stderr: stderrBase64,
            stdoutBytes: stdoutBuffer.length,
            stderrBytes: stderrBuffer.length,
        });
    } catch (err) {
        errorLog(`[READ-APP] Error: ${err?.message ?? err}`);
        return errorResponse(err?.message ?? "read-app failed");
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
