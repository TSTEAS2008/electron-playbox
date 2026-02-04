# Electron Playbox

An abstraction layer for Electron that provides a clean, secure API for managing playboxed applications, child processes, and navigation.

## Philosophy

Electron Playbox follows "The 9 Commandments" - a minimal, focused API surface that handles the most common Electron framework needs:

**The 7 Core Commandments:**
1. **Clear Playbox** - Reset your playbox environment
2. **Prepare Playbox** - Set up folder structure from config
3. **Assemble Playbox** - Build files from components
4. **Start App** - Launch external processes or Node.js apps
5. **Kill App** - Terminate running processes
6. **List Apps** - View active child processes
7. **Navigate** - Change window location safely

**Plus 2 Additional Commandments:**
1. **Read App** - Read buffered output from child processes
2. **End Session** - Clear playbox and quit application

## Features

- 🔒 **Secure by default** - Path validation prevents directory traversal
- 📦 **Playbox management** - Component-based file assembly system
- 🎯 **Process control** - Spawn and manage child processes (`.exe`, `.js`)
- 🧭 **Safe navigation** - Custom protocol with validated routing
- 📊 **Process monitoring** - Read stdout/stderr from child processes
- 📝 **Built-in logging** - Automatic process and error logs
- 🧹 **Clean shutdown** - Automatic child process cleanup

## Quick Start

### Installation

```bash
npm install
```

### Basic Usage

```javascript
// In your renderer process (HTML/JS)

// Navigate to a different page (defaults to dynamic://)
await window.api.navigate({ urlPath: "playbox/game.html" });

// Or navigate to static bundled content
await window.api.navigate({ urlPath: "launcher/menu.html", protocol: "static" });

// Clear the entire playbox
const result = await window.api.clearPlaybox();

// Prepare playbox from config
await window.api.preparePlaybox("myapp.json");
await window.api.assemblePlaybox("myapp.json");

// Launch an application (defaults to static://)
const { data } = await window.api.startApp({ appPath: "apps/game.exe" });
console.log(`Started PID: ${data.pid}`);

// Launch from dynamic:// (userData) if needed
await window.api.startApp({ appPath: "playbox/server.js", protocol: "dynamic" });

// Read process output
const output = await window.api.readApp({ pid: data.pid });
if (output.success) {
  const text = atob(output.data.stdout);
  console.log("Process output:", text);
}

// Check running apps
const { data: apps } = await window.api.listApps();
console.log(`Running: ${apps.count} processes`);

// Kill a specific app
await window.api.killApp(data.pid);

// End the session (clear playbox and quit)
await window.api.endSession();
```

### Config File Structure

Configs live in `frontend/configs/` and define how to build your playbox:

```json
{
  "defaultAssembly": true,
  "apps": [
    {
      "output": "game.html",
      "outputPath": "apps",
      "components": ["header.html", "game-canvas.html", "footer.html"],
      "componentPath": "game"
    }
  ],
  "scripts": [
    {
      "output": "game.js",
      "components": ["engine.js", "physics.js", "renderer.js"],
      "componentPath": "game",
      "assembly": true
    }
  ]
}
```

## API Overview

All API methods return a consistent response format:

```javascript
{
  success: true,      // or false
  data: { ... },      // on success
  message: "error"    // on failure
}
```

### Playbox Management

- `clearPlaybox(folder?)` - Clear playbox or specific folder
- `preparePlaybox(configPath)` - Create folder structure from config
- `assemblePlaybox(configPath)` - Build files from components

### Process Control

- `startApp(args)` - Launch .exe or .js files
- `killApp(pid)` - Terminate a specific process
- `listApps()` - Get all running child processes
- `readApp(pid)` - Read buffered stdout/stderr from a process

### Navigation

- `navigate(args)` - Load a new page in the main window

### Session Management

- `endSession()` - Clear playbox and quit application

See [API.md](API.md) for complete documentation with examples.

## Project Structure

```
electron-playbox/
├── main.js                    # Main process entry point
├── preload.js                 # API bridge (contextBridge)
├── frontend/                  # Served via static:// protocol
│   ├── components/            # Reusable HTML/JS/CSS components
│   ├── configs/               # Playbox assembly configs
│   └── launcher/              # Launcher UI files
├── localModules/
│   ├── appProtocol.js         # Custom protocol handlers (static/dynamic)
│   ├── basePath.js            # Path resolution
│   ├── loggers.js             # File logging
│   ├── playboxHelpers.js      # Config validation
│   └── commandments/          # The 9 commandments
│       ├── playbox.js         # Clear, prepare, assemble
│       ├── processControl.js  # Start, kill, list, read
│       ├── navigation.js      # Navigate
│       └── endSession.js      # End session
└── [userData]/                # Served via dynamic:// protocol
    ├── playbox/               # Runtime assembly target (ephemeral)
    ├── logs/                  # Application logs
    └── [any other data]/      # Persistent user/app data
```

## Protocol Architecture

Electron Playbox uses two custom protocols for serving content:

### `static://` → `frontend/` (Install Directory)
- **Read-only** bundled application files
- Source for components to be assembled
- Launcher UI and configs
- Example: `static://launcher/menu.html`

### `dynamic://` → `userData/` (App Data Directory)
- **Writable** runtime content
- Playbox assemblies
- User data and settings
- Any persistent application data
- Example: `dynamic://playbox/game/index.html`

**Key Insight:** The playbox directory (`userData/playbox/`) is where assembled applications are deployed. It's ephemeral (cleared by `endSession()`), while other userData content persists.

## Running & Packaging

```bash
# Development
npm run raw

# Package for your platform
npm run package-windows --appname=MyApp
npm run package-linux --appname=MyApp
npm run package-mac-x64 --appname=MyApp
npm run package-mac-arm64 --appname=MyApp
```

## Security Notes

- All paths are validated against directory traversal attacks
- `static://` serves only files within `frontend/` (install directory)
- `dynamic://` serves only files within `userData/` (app data directory)
- Playbox content lives in `userData/playbox/` with full read/write
- Child processes can be spawned from either `static://` or `dynamic://` paths
- Context isolation enabled, node integration disabled in renderer
- IPC surface is capability-based (only exposed methods available)
- **Important:** Child processes spawned with `.js` extension run with full Node.js system access via `ELECTRON_RUN_AS_NODE=1` - validate what you launch
- **Important:** Process output via `readApp()` is base64-encoded for safe IPC transmission

## Component Assembly System

The assembly system allows building different application configurations from a shared component library:

**Use Cases:**
- Different feature sets per user tier (basic vs professional)
- Multiple applications sharing common components
- A/B testing different UI configurations
- Educational platforms with progressive feature unlocking
- Multi-tenant applications with per-tenant customization

**Example Workflow:**
```javascript
// Educational platform: beginner mode
{
  "defaultAssembly": true,
  "ide": [{
    "output": "editor.js",
    "components": ["core.js", "simple-debugger.js", "help.js"]
  }]
}

// Professional mode
{
  "defaultAssembly": true,
  "ide": [{
    "output": "editor.js",
    "components": ["core.js", "advanced-debugger.js", "profiler.js", "git.js"]
  }]
}
```

Same components, different assemblies. The config determines what gets built.

## Logs

Two log files are created in the application root directory:
- `process.log` - General debug info and process lifecycle
- `error.log` - Error messages and failures

Logs are cleared on each app start. All child process stdout/stderr is also logged here in addition to being buffered for `readApp()`.

## Architecture Insights

**What This System Actually Does:**

Electron Playbox is a platform for building and running desktop applications with:
- **Component-based architecture** - Build apps from reusable components
- **Multi-app runtime** - Multiple applications in one Electron window
- **System integration** - Child process spawning for native tools
- **Persistent + ephemeral storage** - userData for data, playbox for runtime
- **Dynamic assembly** - Apps assembled on-demand from configurations

**Real-World Applications:**
- Development tool suites (IDE, debugger, profiler)
- Enterprise application platforms (different apps per user role)
- Educational platforms (different environments per course level)
- Gaming platforms (launcher + games sharing engine components)
- Creative suites (multiple tools sharing rendering components)

**It's not a kiosk system** - there's nothing preventing you from building VSCode-scale applications here. The playbox is simply the deployment target for your assembled frontend code, while the rest of userData can hold project files, settings, extensions, etc.

## License

MIT

## Author

TSTEAS2008
