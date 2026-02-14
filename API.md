# API Reference

Complete documentation for the Electron Playbox API. All methods are accessed via `window.api` in the renderer process.

## Response Format

Every API call returns a Promise that resolves to:

```typescript
{
  success: boolean;
  data?: any;        // Present on success
  message?: string;  // Present on failure
}
```

## Playbox Management

### `clearPlaybox(folder?)`

Clears the playbox directory or a specific subfolder.

**Parameters:**
- `folder` (string, optional) - Folder name to clear, or `"all"` to clear everything. Default: `"all"`

**Returns:**
```javascript
{ success: true, data: { message: "Playbox fully cleared." } }
```

**Examples:**

```javascript
// Clear entire playbox
const result = await window.api.clearPlaybox();
// or
await window.api.clearPlaybox("all");

// Clear specific folder
await window.api.clearPlaybox("apps");
await window.api.clearPlaybox("scripts");
```

**Security:** Only folders within `userData/playbox/` can be cleared.

---

### `preparePlaybox(configPath)`

Creates the folder structure defined in a config file and clears existing contents.

**Parameters:**
- `configPath` (string, required) - Path to config file relative to `frontend/configs/`

**Returns:**
```javascript
{
  success: true,
  data: { prepared: ["apps", "scripts", "styles"] }
}
```

**Example:**

```javascript
const result = await window.api.preparePlaybox("mygame.json");
if (result.success) {
  console.log("Prepared folders:", result.data.prepared);
}
```

**Config Requirements:**
- Must exist in `frontend/configs/`
- Must be valid JSON
- Folder names become top-level keys
- Each folder contains an array of file definitions

---

### `assemblePlaybox(configPath)`

Assembles files from components according to the config file. Assembly behavior is automatically inferred from the number of components.

**Parameters:**
- `configPath` (string, required) - Path to config file relative to `frontend/configs/`

**Returns:**
```javascript
{
  success: true,
  data: { message: "Playbox assembly complete." }
}
```

**Example:**

```javascript
// Full playbox setup workflow
await window.api.clearPlaybox();
await window.api.preparePlaybox("game.json");
const result = await window.api.assemblePlaybox("game.json");

if (result.success) {
  console.log("Playbox ready!");
}
```

**Assembly Behavior (automatic based on component count):**
- **0 components**: Creates an empty file
- **1 component**: Copies the single component file as-is
- **2+ components**: Concatenates all components into one file

**Config Structure:**

```json
{
  "folderName": [
    {
      "output": "path/to/file.ext",
      "components": ["component1.js", "component2.js"],
      "componentPath": "source/folder"
    }
  ]
}
```

**Fields:**
- `output` (required) - Full path including subdirectories and filename (e.g., `"apps/game/index.html"`)
- `components` (required) - Array of component filenames to use (can be empty)
- `componentPath` (optional) - Subdirectory within `frontend/components/` where components are located (default: `""`)

**Examples:**

```json
{
  "apps": [
    {
      "output": "game/index.html",
      "components": ["header.html", "game.html", "footer.html"],
      "componentPath": "game"
    }
  ],
  "scripts": [
    {
      "output": "engine.js",
      "components": ["core.js", "physics.js", "render.js"]
    },
    {
      "output": "config.json",
      "components": ["default-config.json"]
    },
    {
      "output": "placeholder.txt",
      "components": []
    }
  ]
}
```

This config will:
- Concatenate 3 HTML files from `components/game/` into `playbox/apps/game/index.html`
- Concatenate 3 JS files from `components/` into `playbox/scripts/engine.js`
- Copy single file from `components/` to `playbox/scripts/config.json`
- Create empty file at `playbox/scripts/placeholder.txt`

**Path Handling:**
- `output` can include subdirectories (e.g., `"levels/level1/map.json"`)
- Directories are created automatically
- `componentPath` navigates within `frontend/components/` only

**Validation:**
- Rejects configs with unknown fields (only `output`, `components`, `componentPath` allowed)
- All paths validated against directory traversal
- Component files must exist or assembly will fail

---

## Process Control

### `startApp(args)`

Launches an external executable or Node.js script as a child process.

**Parameters:**
- `args` (object, required)
  - `appPath` (string, required) - Path to executable/script relative to protocol base
  - `protocol` (string, optional) - Either `"static"` or `"dynamic"`. Default: `"static"`

**Returns:**
```javascript
{
  success: true,
  data: {
    pid: 12345,
    launched: "game.exe"
  }
}
```

**Supported File Types:**
- `.exe` - Windows executables
- `.js` - Node.js scripts (launched with `ELECTRON_RUN_AS_NODE`)
- ` ` (no extension) - Unix executables

**Examples:**
```javascript
// Launch Windows executable from install directory (static://)
const result = await window.api.startApp("apps/launcher.exe");
console.log(`Launcher started with PID: ${result.data.pid}`);

// Launch from userData (dynamic://)
await window.api.startApp("playbox/apps/game.exe", "dynamic");

// Launch Node.js script from static
await window.api.startApp("scripts/server.js");

// Check for errors
const launch = await window.api.startApp("invalid.exe");
if (!launch.success) {
  console.error(launch.message); // "File does not exist"
}
```

**Protocol Selection:**
- `static://` (default) - Launch from install directory (`frontend/`)
  - Use for: bundled executables, scripts shipped with the app
- `dynamic://` - Launch from userData
  - Use for: runtime-assembled apps, user-specific executables

**Behavior:**
- Process stdout/stderr buffered in memory for reading via `readApp()`
- Working directory: `frontend/`
- Auto-cleanup on exit
- Tracked in internal process map

**Security:** Paths validated to prevent access outside respective protocol base directories.

---

### `killApp(pid)`

Terminates a running child process.

**Parameters:**
- `pid` (number, required) - Process ID returned from `startApp()`

**Returns:**
```javascript
{
  success: true,
  data: { message: "Process 12345 killed" }
}
```

**Example:**

```javascript
const app = await window.api.startApp("playbox/apps/game.exe");
const pid = app.data.pid;

// Later...
const result = await window.api.killApp(pid);
if (result.success) {
  console.log("App terminated");
}
```

**Notes:**
- Sends `SIGTERM` to process and all children (using `tree-kill`)
- Automatically removes from tracked processes
- Fails if PID not found or already exited

---

### `listApps()`

Returns all currently running child processes.

**Parameters:** None

**Returns:**
```javascript
{
  success: true,
  data: {
    pids: [12345, 12346, 12347],
    count: 3
  }
}
```

**Example:**

```javascript
const apps = await window.api.listApps();
console.log(`Running ${apps.data.count} processes:`);
apps.data.pids.forEach(pid => console.log(`  - PID ${pid}`));

// Kill all apps
for (const pid of apps.data.pids) {
  await window.api.killApp(pid);
}
```

---

### `readApp(pid)`

Reads and clears all buffered output from a child process. This is an atomic operation that returns exactly what has been written since the last read.

**Parameters:**
- `pid` (number, required) - Process ID of the running child process

**Returns:**
```javascript
{
  success: true,
  data: {
    pid: 12345,
    stdout: "base64-encoded-data",
    stderr: "base64-encoded-data",
    stdoutBytes: 1024,
    stderrBytes: 0
  }
}
```

**Examples:**

```javascript
// Start a process
const app = await window.api.startApp("scripts/data-processor.js", "static");
const pid = app.data.pid;

// Poll for output
setInterval(async () => {
  const output = await window.api.readApp(pid);
  
  if (output.success) {
    // Decode base64 to get actual text
    const stdout = atob(output.data.stdout);
    const stderr = atob(output.data.stderr);
    
    if (stdout) console.log("Process output:", stdout);
    if (stderr) console.error("Process errors:", stderr);
  }
}, 1000);

// One-time read
const result = await window.api.readApp(12345);
if (result.success) {
  const text = atob(result.data.stdout);
  console.log(`Read ${result.data.stdoutBytes} bytes:`, text);
}
```

**Behavior:**
- **Atomic operation**: Reads and clears buffers in one step, preventing race conditions
- **Base64 encoding**: Output is base64-encoded for safe IPC transmission
- **Accumulates output**: Buffers all stdout/stderr since last read (or since process start)
- **Thread-safe**: Multiple simultaneous reads won't corrupt data

**Use Cases:**
- Polling process output for real-time display
- Reading completion status from long-running processes
- Debugging child process behavior
- Inter-process communication via stdout/stderr

**Decoding Base64:**
```javascript
// Browser/renderer process
const decoded = atob(base64String);

// Node.js (if processing in main)
const decoded = Buffer.from(base64String, 'base64').toString('utf-8');
```

**Notes:**
- Buffers are cleared after reading - calling `readApp()` twice in a row will return empty data on the second call unless the process wrote more output
- If process doesn't exist or has no buffers, returns error
- Binary output is preserved through base64 encoding

---

## Navigation

### `navigate(args)`

Loads a new page in the main window using either `static://` or `dynamic://` protocol.

**Parameters:**
- `args` (object or string)
  - If string: treated as `urlPath` with default protocol (`dynamic`)
  - If object:
    - `urlPath` (string, required) - Path relative to protocol base
    - `protocol` (string, optional) - Either `"static"` or `"dynamic"`. Default: `"dynamic"`

**Returns:**
```javascript
{
  success: true,
  data: { url: "dynamic://playbox/game.html" }
}
```

**Examples:**

```javascript
// Navigate to static menu (from install directory)
await window.api.navigate("launcher/menu.html", "static");

// Navigate to dynamic content (from userData)
await window.api.navigate("playbox/game.html");
// or with explicit protocol
await window.api.navigate("playbox/game.html", "dynamic");

// Shorthand string format (uses default dynamic://)
await window.api.navigate("playbox/apps/game.html");

// Navigate with path handling
await window.api.navigate("levels/level1.html", "dynamic");
await window.api.navigate("/settings/audio.html", "static"); // Leading slash removed
```

**Protocol Mapping:**
- `static://` → `frontend/` (install directory)
  - Use for: launcher UI, menus, settings pages
  - Read-only, shipped with the app
- `dynamic://` → `userData/` (app data directory)
  - Use for: assembled playbox content, runtime-generated files, user data
  - Writable, persists between sessions

**Security:**
- Validates path against directory traversal
- `static://` can only access `frontend/`
- `dynamic://` can only access userData directory
- Automatically prefixes with appropriate protocol

---

## Session Management

### `endSession()`

Ends the current session by clearing the playbox and quitting the application.

**Parameters:** None

**Returns:**
```javascript
{
  success: true,
  data: { message: "Session ended" }
}
```

**Example:**

```javascript
// End session cleanly
const result = await window.api.endSession();
// Application will quit after clearing playbox
```

**Behavior:**
1. Clears entire playbox directory (same as `clearPlaybox("all")`)
2. Initiates application shutdown
3. All child processes are automatically killed during shutdown via the `before-quit` handler
4. Logs are preserved until next app start

**Use Cases:**
- Clean exit from application
- Reset environment between sessions
- Logout or session timeout handlers

**Notes:**
- This method will cause the application to quit
- All running child processes will be terminated
- Even if playbox clearing fails, the app will still quit
- Logs all cleanup steps for debugging

---

## Error Handling

All methods use consistent error response format:

```javascript
const result = await window.api.clearPlaybox("../../../../etc/passwd");
// { success: false, message: "Invalid folder path." }

const result = await window.api.startApp("nonexistent.exe");
// { success: false, message: "File does not exist" }

const result = await window.api.killApp(99999);
// { success: false, message: "Invalid or unknown PID" }

const result = await window.api.readApp(99999);
// { success: false, message: "Unknown PID or process has no output buffers" }
```

**Best Practice:**

```javascript
async function setupGame() {
  try {
    const clear = await window.api.clearPlaybox();
    if (!clear.success) {
      throw new Error(clear.message);
    }

    const prepare = await window.api.preparePlaybox("game.json");
    if (!prepare.success) {
      throw new Error(prepare.message);
    }

    const assemble = await window.api.assemblePlaybox("game.json");
    if (!assemble.success) {
      throw new Error(assemble.message);
    }

    await window.api.navigate("playbox/apps/game.html");
  } catch (err) {
    console.error("Setup failed:", err.message);
    alert("Failed to load game: " + err.message);
  }
}
```

---

## Complete Workflow Example

Typical usage pattern for loading a playboxed application:

```javascript
async function loadApplication(configName) {
  // 1. Clear previous playbox
  await window.api.clearPlaybox();

  // 2. Set up folder structure
  const prep = await window.api.preparePlaybox(`${configName}.json`);
  if (!prep.success) {
    console.error("Failed to prepare:", prep.message);
    return;
  }

  // 3. Assemble files from components
  const asm = await window.api.assemblePlaybox(`${configName}.json`);
  if (!asm.success) {
    console.error("Failed to assemble:", asm.message);
    return;
  }

  // 4. Navigate to the assembled app (in dynamic:// userData)
  await window.api.navigate({ 
    urlPath: `playbox/${configName}/index.html`,
    protocol: "dynamic"
  });

  // 5. Optionally launch helper processes from dynamic playbox
  const server = await window.api.startApp({ `playbox/${configName}/server.js`, "dynamic"});
  
  // 6. Monitor process output
  if (server.success) {
    const checkOutput = async () => {
      const output = await window.api.readApp(server.data.pid);
      if (output.success && output.data.stdoutBytes > 0) {
        const text = atob(output.data.stdout);
        console.log("Server says:", text);
      }
    };
    setInterval(checkOutput, 1000);
  }
}

// Usage
document.querySelector("#launch-game").addEventListener("click", () => {
  loadApplication("game");
});

// Clean exit
document.querySelector("#exit-button").addEventListener("click", async () => {
  await window.api.endSession();
});
```

---

## Logging

All API operations are logged automatically:

**process.log:**
- API calls and responses
- Child process stdout/stderr
- Process lifecycle events

**error.log:**
- API errors
- Child process errors
- Fatal failures

Logs are cleared on app start and written to [userData]/logs
