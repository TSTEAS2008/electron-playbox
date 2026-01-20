// preload.js
const { contextBridge, ipcRenderer } = require("electron");

// Helper function for safe IPC calls with consistent error handling
const call = async (channel, args) => {
    try {
        const result = await ipcRenderer.invoke(channel, args);
        return { success: true, data: result };
    } catch (err) {
        console.error(`[IPC ERROR: ${channel}]`, err);
        return { success: false, message: err.message };
    }
};

contextBridge.exposeInMainWorld("api", {
    // 1) Clear playbox or a specific folder
    clearPlaybox: (folder = "all") =>
    call("clear-playbox", { folder }),

    // 2) Prepare playbox (given a config file)
    preparePlaybox: (configPath) =>
    call("prepare-playbox", { configPath }),

    // 3) Assemble playbox (given a config file)
    assemblePlaybox: (configPath) =>
    call("assemble-playbox", { configPath }),

    // 4) Start an external or Node app
    startApp: (appPath) =>
    call("start-app", { appPath }),

    // 5) Kill a running app by PID
    killApp: (pid) =>
    call("kill-app", { pid }),

    // 6) List currently running apps (returns { pids, count })
    listApps: () =>
    call("list-apps"),

    // 7) Navigate the main window (in-app)
    navigate: (urlPath) =>
    call("navigate", urlPath),
});
