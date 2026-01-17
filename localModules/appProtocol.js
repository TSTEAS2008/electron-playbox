//localmodules/appProtocol.js
import { protocol } from "electron";
import path from "path";
import fs from "fs";
import { __basePath } from "./basePath.js";

const APP_PROTOCOL = "app";

protocol.registerSchemesAsPrivileged([
    {
        scheme: APP_PROTOCOL,
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
    sandbox: path.join(__basePath, "frontend", "sandbox"),
    configs: path.join(__basePath, "frontend", "configs"),
    components: path.join(__basePath, "frontend", "components")
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
    protocol.registerFileProtocol(APP_PROTOCOL, (request, callback) => {
        try {
            const url = new URL(request.url);
            let relPath = decodeURIComponent(
                [url.host, url.pathname].join("").replace(/^\/+/, "")
            );

            if (!isPathSafe(relPath, servedPaths.app)) {
                errorLog(`UNSAFE PATH BLOCKED: ${relPath}`);
                return callback({ error: -6 });
            }

            const absPath = path.join(servedPaths.app, relPath);

            debugLog(`Serving: ${absPath}`);

            if (!fs.existsSync(absPath)) {
                errorLog(`FILE NOT FOUND: ${absPath}`);
                return callback({ error: -6 });
            }

            callback({ path: absPath });
        } catch (err) {
            errorLog(`Protocol error: ${err.message}`);
            callback({ error: -2 });
        }
    });
}

export {
    registerAppProtocol,
    isPathSafe,
    APP_PROTOCOL,
    servedPaths,
};
