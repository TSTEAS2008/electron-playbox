//main.js
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";

import { __basePath } from "./localModules/basePath.js";
import { registerAppProtocol, APP_PROTOCOL } from "./localModules/appProtocol.js";
import { debugLog, errorLog, loggerSetup } from './localModules/loggers.js';

import { clearSandbox, prepareSandbox, assembleSandbox } from "./localModules/commandments/sandbox.js";
import { startApp, killApp, listApps, killAllChildren, children } from "./localModules/commandments/processControl.js";
import { navigateWindow } from "./localModules/commandments/navigation.js";

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

//The 7 commandments: [clear sandbox], [prepare sandbox], [assemble sandbox], [start app], [list apps], [navigate]
ipcMain.handle("clear-sandbox", async (_e, args) => {
    return clearSandbox(args);
});
ipcMain.handle("prepare-sandbox", async (_e, args) => {
    return prepareSandbox(args);
});
ipcMain.handle("assemble-sandbox", async (_e, args) => {
    return assembleSandbox(args);
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
