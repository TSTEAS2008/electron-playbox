//main.js
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { __basePath } from "./localModules/basePath.js";
import { registerAppProtocol, STATIC_PROTOCOL } from "./localModules/appProtocol.js";
import { debugLog, errorLog, loggerSetup } from './localModules/loggers.js';
import { mainWindow, createWindow } from './localModules/window.js'

import { clearPlaybox, preparePlaybox, assemblePlaybox } from "./localModules/commandments/playbox.js";
import { startApp, killApp, listApps, killAllChildren, children, readApp } from "./localModules/commandments/processControl.js";
import { navigateWindow } from "./localModules/commandments/navigation.js";
import { endSession } from "./localModules/commandments/endSession.js";


//log setup section
loggerSetup({
    processInfo: {
        execPath: process.execPath,
        resourcesPath: process.resourcesPath
    },
    appPath: app.getAppPath()
});

//The 9 commandments: [clear playbox], [prepare playbox], [assemble playbox], [start app], [list apps], [navigate], [end session], [read app]
ipcMain.handle("clear-playbox", async (_e, args) => {
    return clearPlaybox(args);
});
ipcMain.handle("prepare-playbox", async (_e, args) => {
    return preparePlaybox(args);
});
ipcMain.handle("assemble-playbox", async (_e, args) => {
    return assemblePlaybox(args);
});
ipcMain.handle("start-app", async (_e, args) => {
    return startApp(args);
});
ipcMain.handle("kill-app", async (_e, args) => {
    return killApp(args);
});
ipcMain.handle("list-apps", async (_e) => {
    return listApps();
});
ipcMain.handle("navigate", (_e, args) => {
    return navigateWindow(args, mainWindow);
});

ipcMain.handle("end-session", (_e, args) => {
    return endSession();
});

ipcMain.handle("read-app", (_e, args) => {
    return readApp(args);
});

//app related endpoints
app.on("before-quit", async (event) => {
    if (children.size > 0) {
        event.preventDefault();
        await killAllChildren();
        app.quit();
    }
});

app.on("window-all-closed", async () => {
    debugLog("[LIFECYCLE] All windows closed");
    await killAllChildren();

    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
    }
});

// ----- Lifecycle
app.whenReady().then(async () => {
    // Ensure playbox directory exists in appData
    const playboxPath = path.join(app.getPath('userData'), 'playbox');
    if (!fs.existsSync(playboxPath)) {
        fs.mkdirSync(playboxPath, { recursive: true });
        debugLog(`[LIFECYCLE] Created playbox directory: ${playboxPath}`);
    }

    registerAppProtocol(debugLog, errorLog);
    await createWindow();
    debugLog("[LIFECYCLE] Window created and ready");
});
