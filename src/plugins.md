# WASM Plugins

> Requires feature: `plugin_runtime`

Nightshade includes a WASM-based plugin system that allows loading and executing WebAssembly modules at runtime. Plugins can spawn entities, manipulate transforms, load assets, and respond to input events.

## Feature Flags

```toml
[dependencies]
nightshade = { version = "...", features = ["plugin_runtime"] }
```

The `plugin_runtime` feature enables the Wasmtime-based runtime and WASI support. The base `plugins` feature provides the shared command/event types for writing plugin guest code. Desktop only.

## Plugin Runtime

### Loading Plugins

```rust
let mut runtime = PluginRuntime::new(PluginRuntimeConfig {
    plugins_path: "plugins/".to_string(),
    ..Default::default()
});

runtime.load_plugin("plugins/my_plugin.wasm");
runtime.load_plugins_from_directory("plugins/");
```

### Running Plugins Each Frame

```rust
fn run_systems(&mut self, world: &mut World) {
    runtime.run_plugins_frame(world);
    runtime.process_pending_commands(world);
}
```

`run_plugins_frame()` calls each plugin's `on_frame()` export. `process_pending_commands()` executes any engine commands the plugins have queued.

## Plugin Lifecycle

Plugins are compiled WASM modules that export specific functions:

| Export | Required | Description |
|--------|----------|-------------|
| `on_init()` | No | Called once when the plugin is loaded |
| `on_frame()` | No | Called every frame |
| `plugin_alloc(size) -> *mut u8` | Yes | Memory allocation for receiving events |
| `plugin_receive_event(ptr, len)` | Yes | Receives serialized events from the engine |

## Engine Commands

Plugins send commands to the engine through a host-provided API:

| Command | Description |
|---------|-------------|
| `SpawnPrimitive` | Create a cube, sphere, cylinder, plane, or cone |
| `DespawnEntity` | Remove an entity |
| `SetEntityPosition` | Set entity world position |
| `SetEntityScale` | Set entity scale |
| `SetEntityRotation` | Set entity rotation |
| `GetEntityPosition` | Request entity position (async) |
| `GetEntityScale` | Request entity scale (async) |
| `GetEntityRotation` | Request entity rotation (async) |
| `SetEntityMaterial` | Set material properties |
| `SetEntityColor` | Set entity color |
| `LoadTexture` | Load a texture by path |
| `LoadPrefab` | Load a glTF prefab |
| `ReadFile` | Read a file from disk |
| `Log` | Print a message to the host console |

### Guest API

From within a plugin:

```rust
use nightshade::plugin::*;

fn on_init() {
    let entity_id = spawn_primitive(Primitive::Cube, 0.0, 1.0, 0.0);
    set_entity_position(entity_id, 5.0, 2.0, 0.0);
    log("Plugin initialized!");
}
```

## Engine Events

Events sent from the engine to plugins:

| Event | Description |
|-------|-------------|
| `FrameStart` | New frame beginning |
| `KeyPressed` / `KeyReleased` | Keyboard input |
| `MouseMoved` | Mouse position change |
| `MouseButtonPressed` / `MouseButtonReleased` | Mouse button input |
| `EntitySpawned` | Entity creation confirmed with host entity ID |
| `FileLoaded` / `TextureLoaded` / `PrefabLoaded` | Async asset load results |
| `Error` | Error notification |

## Entity ID Mapping

Plugins use their own entity ID space. The runtime maintains a bidirectional mapping between plugin entity IDs and host entity IDs. When a plugin spawns an entity, it receives a local ID immediately and gets the real host ID through an `EntitySpawned` event.

## Custom Linker Functions

Extend the plugin API with custom host functions:

```rust
runtime.with_custom_linker(|linker| {
    linker.func_wrap("env", "my_custom_function", |param: i32| -> i32 {
        param * 2
    });
});
```

## Platform Notes

- Desktop only (uses Wasmtime, not available on WASM targets)
- Full WASI P1 support for file I/O within plugins
- Memory-safe communication via postcard serialization
- Automatic cleanup of plugin resources on configurable intervals
