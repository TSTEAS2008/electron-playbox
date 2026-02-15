# Electron Playbox

**A complete application runtime for desktop software.**

Desktop applications are built wrong. They're monolithic bundles where immutable code, mutable state, runtime assembly, and process management are tangled together. Every app reinvents these primitives poorly.

Electron Playbox provides the foundational architecture that desktop applications should have had from the beginning: a coherent system of protocols, process primitives, component composition, and capability-based APIs that work together as a unified runtime.

This isn't a framework. It's not a boilerplate. It's a substrate - the missing layer between Electron and your application that gives you OS-level rigor for building desktop software.

## What You Get

**Protocol Layer:**
- `static://` - Immutable application code (bundled, read-only)
- `dynamic://` - Runtime state and assembly (writable, persistent)

**Process Primitives:**
- Spawn and manage child processes (.exe, .js) with proper lifecycle
- Read/from process streams with buffered IPC
- Clean shutdown with automatic cleanup

**Component System:**
- Declarative assembly from reusable components
- Configuration-driven application building
- Zero-component, single-component, or multi-component modes

**Capability API:**
Nine focused operations that handle everything:
1. Clear playbox
2. Prepare playbox structure
3. Assemble components
4. Start processes
5. Kill processes
6. List active processes
7. Navigate protocols
8. Read process output
9. End session

**The entire system is coherent.** Each piece reinforces the others. The protocols enable clean separation. The playbox enables runtime assembly. The process primitives enable system integration. The API surface is minimal and complete.

## Why This Architecture

**Current approach:**
```
app.asar (everything bundled together)
├── Mixed UI code and business logic
├── Hardcoded configurations
├── Ad-hoc userData management
└── Fragile child process handling
```

**Electron Playbox:**
```
static://     (immutable, shipped code)
├── Component library
├── Assembly configurations
└── Launcher logic

dynamic://    (mutable, runtime state)
├── playbox/  (assembled applications, ephemeral)
└── logs/     (process and error logs)
```

Clean boundaries. Clear data flow. Proper separation of concerns.

## Quick Start

### Installation

```bash
npm install
```

### Basic Usage

```javascript
// Navigate between protocols
await window.api.navigate("launcher/menu.html", "static");
await window.api.navigate("playbox/game.html", "dynamic");

// Assemble application from components
await window.api.clearPlaybox();
await window.api.preparePlaybox("myapp.json");
await window.api.assemblePlaybox("myapp.json");

// Manage processes
const { data } = await window.api.startApp("apps/game.exe");
console.log(`Started PID: ${data.pid}`);

const output = await window.api.readApp(data.pid);
const text = atob(output.data.stdout);
console.log("Process output:", text);

await window.api.killApp(data.pid);

// Clean shutdown
await window.api.endSession();
```

### Component Assembly

Configs define how to build applications from reusable components:

```json
{
  "apps": [
    {
      "output": "apps/game.html",
      "components": ["header.html", "game-canvas.html", "footer.html"],
      "componentPath": "game"
    }
  ],
  "scripts": [
    {
      "output": "game.js",
      "components": ["engine.js", "physics.js", "renderer.js"],
      "componentPath": "game"
    }
  ]
}
```

**Assembly behavior (automatic):**
- 0 components → empty file
- 1 component → direct copy
- 2+ components → concatenation

## Complete API

All methods return `{ success: boolean, data?: any, message?: string }`

### Playbox Operations
- `clearPlaybox(folder?)` - Reset environment
- `preparePlaybox(configPath)` - Create structure from config
- `assemblePlaybox(configPath)` - Build files from components

### Process Control
- `startApp(appPath, protocol?)` - Launch .exe, .js or extensionless (unix binary)
- `killApp(pid)` - Terminate process
- `listApps()` - Get active processes
- `readApp(pid)` - Read buffered stdout/stderr (base64)

### Navigation
- `navigate(urlPath, protocol?)` - Load page via protocol

### Session
- `endSession()` - Clear playbox and quit

See [API.md](API.md) for complete documentation.

## Architecture

```
electron-playbox/
├── main.js                    # Runtime entry
├── preload.js                 # API bridge
├── frontend/                  # static:// protocol root
│   ├── components/            # Reusable pieces
│   ├── configs/               # Assembly definitions
│   └── launcher/              # Application entry point
├── localModules/
│   ├── appProtocol.js         # Protocol handlers
│   ├── basePath.js            # Path resolution
│   ├── loggers.js             # Logging primitives
│   ├── playboxHelpers.js      # Assembly utilities
│   ├── window.js              # Window management
│   └── commandments/          # Nine core operations
└── [userData]/                # dynamic:// protocol root
    ├── playbox/               # Runtime assembly (ephemeral)
    ├── logs/                  # Process logs
    └── [data]/                # Persistent state
```

## Protocol Architecture

### `static://` → Immutable Application Code
- Source components for assembly
- Configuration definitions
- Launcher and core UI
- Read-only, ships with installation

### `dynamic://` → Mutable Runtime State
- Assembled applications (playbox)
- User data and settings
- Process logs
- Writable, persists across sessions

The playbox (`userData/playbox/`) is the deployment target - ephemeral runtime assemblies cleared by `endSession()`. Everything else in userData persists.

## Real-World Usage

**This architecture works for:**
- Simple single-purpose applications (clean separation still matters)
- Simple games (keeps logic out of the renderer)
- Complex multi-tool suites (VSCode-scale applications)
- Multi-tenant platforms (different assemblies per user)
- Educational software (progressive feature unlocking)
- Gaming platforms (launcher + games sharing engine)
- Creative tools (multiple apps sharing renderers)

**Works with any frontend:**
- React, Vue, Angular, Svelte
- Three.js, Babylon.js, PixiJS
- Plain HTML/CSS/JS
- Whatever you want - it's just protocols and process management

**Advanced patterns:**
- WebSocket server connection to random port via `startApp("server.js")` + `readApp()`
- Native tool integration via child process spawning
- Hot-swappable UIs without rebuilding
- Component reuse across different configurations

## Security Model

- Path validation prevents directory traversal
- `static://` confined to install directory
- `dynamic://` confined to userData
- Context isolation enabled
- Node integration disabled in renderer
- Capability-based IPC (only exposed methods available)
- Child processes with `.js` run with full Node.js access - validate inputs

## Running & Packaging

```bash
# Development
npm run raw

# Package
npm run package-windows --appname=MyApp
npm run package-linux --appname=MyApp
npm run package-mac-x64 --appname=MyApp
npm run package-mac-arm64 --appname=MyApp
```

## Philosophy

Desktop applications need the same architectural rigor as operating systems: clean separation of concerns, well-defined primitives, capability-based security, and coherent abstractions.

Electron Playbox provides those primitives. The protocols handle data flow. The playbox handles deployment. The process management handles system integration. The component system handles composition. The API surface is minimal and complete.

Everything else is just your application code.

## License

MIT

## Author

TSTEAS2008
