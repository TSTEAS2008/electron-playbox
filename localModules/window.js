//localModules/window.js
import { BrowserWindow } from "electron";
import path from "path";

import { __basePath } from "./basePath.js";
import { STATIC_PROTOCOL } from "./appProtocol.js";

export let mainWindow;
export async function createWindow() {
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
    await mainWindow.loadURL(`${STATIC_PROTOCOL}://launcher/menu.html`);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
