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
    // 1) Clear sandbox or a specific folder
    clearSandbox: (folder = "all") =>
    call("clear-sandbox", { folder }),

    // 2) Prepare sandbox (given a config file)
    prepareSandbox: (configPath) =>
    call("prepare-sandbox", { configPath }),

    // 3) Assemble sandbox (given a config file)
    assembleSandbox: (configPath) =>
    call("assemble-sandbox", { configPath }),

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
