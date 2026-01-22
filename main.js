//main.js
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";

import { __basePath } from "./localModules/basePath.js";
import { registerAppProtocol, APP_PROTOCOL } from "./localModules/appProtocol.js";
import { debugLog, errorLog, loggerSetup } from './localModules/loggers.js';

import { clearPlaybox, preparePlaybox, assemblePlaybox } from "./localModules/commandments/playbox.js";
import { startApp, killApp, listApps, killAllChildren, children } from "./localModules/commandments/processControl.js";
import { navigateWindow } from "./localModules/commandments/navigation.js";
import { endSession } from "./localModules/commandments/endSession.js";

let mainWindow;
async function createWindow() {
    mainWindow = new BrowserWindow({
        fullscreen: true,
        frame: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__basePath, "preload.js"),
        },
    });

    //mainWindow.setAspectRatio(16 / 9);
    await mainWindow.loadURL(`${APP_PROTOCOL}://launcher/menu.html`);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

//log setup section
loggerSetup({
    processInfo: {
        execPath: process.execPath,
        resourcesPath: process.resourcesPath
    },
    appPath: app.getAppPath()
});

//The 7 commandments: [clear playbox], [prepare playbox], [assemble playbox], [start app], [list apps], [navigate]
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
    registerAppProtocol(debugLog, errorLog);
    await createWindow();
    debugLog("[LIFECYCLE] Window created and ready");
});
