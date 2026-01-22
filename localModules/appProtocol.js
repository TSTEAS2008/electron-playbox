//localmodules/appProtocol.js
import { protocol } from "electron";
import path from "path";
import fs from "fs";
import { __basePath, __appDataPath } from "./basePath.js";

const STATIC_PROTOCOL = "static";
const DYNAMIC_PROTOCOL = "dynamic";

protocol.registerSchemesAsPrivileged([
    {
        scheme: STATIC_PROTOCOL,
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            stream: true,
            bypassCSP: false,
        },
    },
    {
        scheme: DYNAMIC_PROTOCOL,
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            stream: true,
            bypassCSP: false,
        },
    },
]);

const servedPaths = {
    root: __basePath,
    app: path.join(__basePath, "frontend"),
    playbox: path.join(__appDataPath, "playbox"),
    configs: path.join(__basePath, "frontend", "configs"),
    components: path.join(__basePath, "frontend", "components"),
    // New base paths for protocol handlers
    static: path.join(__basePath, "frontend"),
    dynamic: __appDataPath
};

function isPathSafe(relativePath, baseDir) {
    try {
        if (typeof relativePath !== "string") return false;
        if (relativePath.includes("..")) return false;
        if (path.isAbsolute(relativePath)) return false;

        const resolved = path.resolve(baseDir, relativePath);
        const normalizedBase = path.resolve(baseDir);
        return resolved.startsWith(normalizedBase + path.sep) || resolved === normalizedBase;
    } catch {
        return false;
    }
}

// Add parameters for debug/error logging
function registerAppProtocol(debugLog = console.log, errorLog = console.error) {
    // Register static:// protocol
    protocol.registerFileProtocol(STATIC_PROTOCOL, (request, callback) => {
        try {
            const url = new URL(request.url);
            let relPath = decodeURIComponent(
                [url.host, url.pathname].join("").replace(/^\/+/, "")
            );

            if (!isPathSafe(relPath, servedPaths.static)) {
                errorLog(`UNSAFE PATH BLOCKED (static): ${relPath}`);
                return callback({ error: -6 });
            }

            const absPath = path.join(servedPaths.static, relPath);

            debugLog(`Serving (static): ${absPath}`);

            if (!fs.existsSync(absPath)) {
                errorLog(`FILE NOT FOUND (static): ${absPath}`);
                return callback({ error: -6 });
            }

            callback({ path: absPath });
        } catch (err) {
            errorLog(`Protocol error (static): ${err.message}`);
            callback({ error: -2 });
        }
    });

    // Register dynamic:// protocol
    protocol.registerFileProtocol(DYNAMIC_PROTOCOL, (request, callback) => {
        try {
            const url = new URL(request.url);
            let relPath = decodeURIComponent(
                [url.host, url.pathname].join("").replace(/^\/+/, "")
            );

            if (!isPathSafe(relPath, servedPaths.dynamic)) {
                errorLog(`UNSAFE PATH BLOCKED (dynamic): ${relPath}`);
                return callback({ error: -6 });
            }

            const absPath = path.join(servedPaths.dynamic, relPath);

            debugLog(`Serving (dynamic): ${absPath}`);

            if (!fs.existsSync(absPath)) {
                errorLog(`FILE NOT FOUND (dynamic): ${absPath}`);
                return callback({ error: -6 });
            }

            callback({ path: absPath });
        } catch (err) {
            errorLog(`Protocol error (dynamic): ${err.message}`);
            callback({ error: -2 });
        }
    });
}

export {
    registerAppProtocol,
    isPathSafe,
    STATIC_PROTOCOL,
    DYNAMIC_PROTOCOL,
    servedPaths,
};
