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

### `startApp(appPath)`

Launches an external executable or Node.js script as a child process.

**Parameters:**
- `appPath` (string, required) - Path to executable/script relative to `frontend/`

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
// Launch Windows executable
const result = await window.api.startApp("playbox/apps/game.exe");
console.log(`Game started with PID: ${result.data.pid}`);

// Launch Node.js script
await window.api.startApp("playbox/scripts/server.js");

// Check for errors
const launch = await window.api.startApp("invalid.exe");
if (!launch.success) {
  console.error(launch.message); // "File does not exist"
}
```

**Behavior:**
- Process stdout/stderr logged to `process.log`
- Working directory: `frontend/`
- Auto-cleanup on exit
- Tracked in internal process map

**Security:** Paths validated to prevent access outside `frontend/`.

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

### `navigate(urlPath)`

Loads a new page in the main window using the `app://` protocol.

**Parameters:**
- `urlPath` (string, required) - Path relative to `frontend/`

**Returns:**
```javascript
{ 
  success: true, 
  data: { url: "app://launcher/menu.html" } 
}
```

**Examples:**

```javascript
// Navigate to menu
await window.api.navigate("launcher/menu.html");

// Navigate to game after setup
await window.api.preparePlaybox("game.json");
await window.api.assemblePlaybox("game.json");
await window.api.navigate("playbox/apps/game.html");

// Navigate with path handling
await window.api.navigate("levels/level1.html");
await window.api.navigate("/settings/audio.html"); // Leading slash removed
```

**Security:**
- Validates path against directory traversal
- Only files in `frontend/` accessible
- Automatically prefixes with `app://` protocol

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
  
  // 4. Navigate to the assembled app
  await window.api.navigate(`playbox/${configName}/index.html`);
  
  // 5. Optionally launch helper processes
  await window.api.startApp(`playbox/${configName}/server.js`);
}

// Usage
document.querySelector("#launch-game").addEventListener("click", () => {
  loadApplication("game");
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
