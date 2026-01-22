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

**Security:** Only folders within `frontend/playbox/` can be cleared.

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
- Must contain `defaultAssembly` boolean field
- Folder names become top-level keys

---

### `assemblePlaybox(configPath)`

Assembles files from components according to the config file.

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

**Assembly Behavior:**
- If `assembly: true` (or `defaultAssembly: true`): Concatenates components into one file
- If `assembly: false`: Copies single component as-is
- Creates output directories recursively

**Config Structure:**

```json
{
  "defaultAssembly": true,
  "folderName": [
    {
      "output": "filename.ext",
      "outputPath": "subfolder/path",
      "components": ["component1.js", "component2.js"],
      "componentPath": "source/folder",
      "assembly": true
    }
  ]
}
```

**Fields:**
- `output` - Output filename
- `outputPath` - Subdirectory within playbox folder (optional, default: `""`)
- `components` - Array of component files to use
- `componentPath` - Source folder within `frontend/components/` (optional, default: `""`)
- `assembly` - Override `defaultAssembly` for this file (optional)

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
const result = await window.api.startApp({ appPath: "apps/launcher.exe" });
console.log(`Launcher started with PID: ${result.data.pid}`);

// Launch from playbox in appData (dynamic://)
await window.api.startApp({ 
  appPath: "playbox/apps/game.exe", 
  protocol: "dynamic" 
});

// Launch Node.js script from static
await window.api.startApp({ appPath: "scripts/server.js" });

// Check for errors
const launch = await window.api.startApp({ appPath: "invalid.exe" });
if (!launch.success) {
  console.error(launch.message); // "File does not exist"
}
```

**Protocol Selection:**
- `static://` (default) - Launch from install directory
  - Use for: bundled executables, scripts shipped with the app
- `dynamic://` - Launch from appData
  - Use for: runtime-assembled apps, user-specific executables

**Behavior:**
- Process stdout/stderr logged to `process.log`
- Working directory: `frontend/` (for static) or appData (for dynamic)
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
await window.api.navigate({ urlPath: "launcher/menu.html", protocol: "static" });

// Navigate to dynamic playbox content (from appData)
await window.api.navigate({ urlPath: "playbox/game.html" });
// or with explicit protocol
await window.api.navigate({ urlPath: "playbox/game.html", protocol: "dynamic" });

// Shorthand string format (uses default dynamic://)
await window.api.navigate("playbox/apps/game.html");

// Navigate with path handling
await window.api.navigate({ urlPath: "levels/level1.html", protocol: "dynamic" });
await window.api.navigate({ urlPath: "/settings/audio.html", protocol: "static" }); // Leading slash removed
```

**Protocol Selection:**
- `static://` - For files in the install directory (`frontend/`)
  - Use for: launcher UI, menus, settings pages
  - Read-only, shipped with the app
- `dynamic://` - For files in appData (`playbox/`)
  - Use for: assembled playbox content, runtime-generated files
  - Writable, user-specific data

**Security:**
- Validates path against directory traversal
- `static://` can only access `frontend/`
- `dynamic://` can only access appData directory
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

  // 4. Navigate to the assembled app (in dynamic:// appData)
  await window.api.navigate({ 
    urlPath: `playbox/${configName}/index.html`,
    protocol: "dynamic"
  });

  // 5. Optionally launch helper processes from dynamic playbox
  await window.api.startApp({ 
    appPath: `playbox/${configName}/server.js`,
    protocol: "dynamic"
  });
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

Logs are cleared on app start and written to project root.
