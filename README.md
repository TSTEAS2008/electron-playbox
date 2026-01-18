# Electron Playbox

An abstraction layer for Electron that provides a clean, secure API for managing sandboxed applications, child processes, and navigation.

## Philosophy

Electron Playbox follows "The 7 Commandments" - a minimal, focused API surface that handles the most common Electron framework needs:

1. **Clear Sandbox** - Reset your sandbox environment
2. **Prepare Sandbox** - Set up folder structure from config
3. **Assemble Sandbox** - Build files from components
4. **Start App** - Launch external processes or Node.js apps
5. **Kill App** - Terminate running processes
6. **List Apps** - View active child processes
7. **Navigate** - Change window location safely

## Features

- 🔒 **Secure by default** - Path validation prevents directory traversal
- 📦 **Sandbox management** - Component-based file assembly system
- 🎯 **Process control** - Spawn and manage child processes (`.exe`, `.js`)
- 🧭 **Safe navigation** - Custom protocol with validated routing
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

// Navigate to a different page
await window.api.navigate("launcher/menu.html");

// Clear the entire sandbox
const result = await window.api.clearSandbox();

// Prepare sandbox from config
await window.api.prepareSandbox("myapp.json");
await window.api.assembleSandbox("myapp.json");

// Launch an application
const { data } = await window.api.startApp("sandbox/apps/game.exe");
console.log(`Started PID: ${data.pid}`);

// Check running apps
const { data: apps } = await window.api.listApps();
console.log(`Running: ${apps.count} processes`);

// Kill a specific app
await window.api.killApp(data.pid);
```

### Config File Structure

Configs live in `frontend/configs/` and define how to build your sandbox:

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

### Sandbox Management

- `clearSandbox(folder?)` - Clear sandbox or specific folder
- `prepareSandbox(configPath)` - Create folder structure from config
- `assembleSandbox(configPath)` - Build files from components

### Process Control

- `startApp(appPath)` - Launch .exe or .js files
- `killApp(pid)` - Terminate a specific process
- `listApps()` - Get all running child processes

### Navigation

- `navigate(urlPath)` - Load a new page in the main window

See [API.md](API.md) for complete documentation with examples.

## Project Structure

```
electron-playbox/
├── main.js                    # Main process entry point
├── preload.js                 # API bridge (contextBridge)
├── frontend/                  # Served via app:// protocol
│   ├── components/            # Reusable HTML/JS/CSS components
│   ├── configs/               # Sandbox assembly configs
│   └── sandbox/               # Runtime assembly target
└── localModules/
    ├── appProtocol.js         # Custom protocol handler
    ├── basePath.js            # Path resolution
    ├── loggers.js             # File logging
    ├── sandboxHelpers.js      # Config validation
    └── commandments/          # The 7 commandments
        ├── sandbox.js
        ├── processControl.js
        └── navigation.js
```

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
- Only files within `frontend/` are accessible via `app://` protocol
- Child processes can only be spawned from paths within `frontend/`
- Context isolation and node integration disabled in renderer
- **Note:** Spawned child processes run with full system access—
  validate/trust what you launch

## Logs

Two log files are created in the project root:
- `process.log` - General debug info and process lifecycle
- `error.log` - Error messages and failures

Logs are cleared on each app start.

## License

MIT

## Author

TSTEAS2008
