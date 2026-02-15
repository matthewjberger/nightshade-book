# Feature Flags

Nightshade uses Cargo feature flags to enable optional functionality. This allows you to include only the features you need, reducing compile times and binary size.

## Default Features

Nightshade defaults to `["engine", "wgpu"]`:

```toml
[dependencies]
nightshade = { git = "https://github.com/matthewjberger/nightshade.git" }
```

This gives you the full engine with the wgpu rendering backend. You only need to specify features explicitly if you want additional optional features or a minimal configuration.

## Aggregate Features

### `engine` (default)

The main engine feature. Includes everything needed for building games.

```toml
nightshade = { git = "...", features = ["engine"] }
```

**Includes:** `runtime`, `assets`, `scene_graph`, `picking`, `file_dialog`, `async_runtime`, `terrain`, `screenshot`, plus rand, rayon, ehttp, futures, and WASM support libraries (js-sys, wasm-bindgen, wasm-bindgen-futures, web-sys).

**Provides:**
- Window creation and event loop
- wgpu rendering backend
- ECS (freecs)
- Transform hierarchy
- Camera systems
- Mesh rendering and GPU instancing
- PBR material system
- Lighting (directional, point, spot) with shadows
- Post-processing (bloom, SSAO, depth of field, tonemapping)
- Procedural atmospheres (sky, clouds, space, nebula)
- glTF/GLB model loading
- Scene save/load
- Input handling (keyboard, mouse, touch)
- Procedural terrain
- Picking (bounding box ray casting)
- File dialogs
- Screenshot capture

### `runtime`

Minimal rendering without asset loading. Use for lightweight apps that don't need glTF/image loading.

```toml
nightshade = { default-features = false, features = ["runtime", "wgpu", "egui"] }
```

**Includes:** `core`, `text`, `behaviors`.

### `full`

Everything in `engine` plus all major optional features.

```toml
nightshade = { git = "...", features = ["full"] }
```

**Includes:** `engine`, `wgpu`, `egui`, `shell`, `audio`, `physics`, `gamepad`, `navmesh`, `scripting`, `fbx`, `lattice`, `sdf_sculpt`, `mosaic`, `plugins`.

## Granular Features

These provide fine-grained control over dependencies:

### `core`

Foundation: ECS (freecs), math (nalgebra, nalgebra-glm), windowing (winit), time (web-time), graph (petgraph), tracing, UUIDs, JSON serialization.

### `text`

3D text rendering using fontdue. Requires `core`.

### `assets`

Asset loading: gltf, image, half, bincode, serde_json, lz4 compression. Requires `core`.

### `scene_graph`

Scene hierarchy system with save/load. Requires `assets`.

### `terrain`

Procedural terrain generation using noise and rand. Requires `core`.

### `file_dialog`

Native file dialogs using rfd and dirs. Requires `core`.

### `async_runtime`

Tokio async runtime for non-blocking operations. Requires `core`.

### `screenshot`

PNG screenshot saving using image.

### `picking`

Ray-based entity picking with bounding box intersection. Trimesh picking requires `physics`.

### `behaviors`

Built-in behavior components and systems.

## Rendering

### `wgpu` (default)

WebGPU-based rendering backend supporting DirectX 12, Metal, Vulkan, and WebGPU.

## Optional Features

### `egui`

Immediate mode GUI framework. Enables `fn ui()` on the State trait.

```toml
nightshade = { git = "...", features = ["egui"] }
```

**Additional Dependencies:** egui, egui_extras, egui-winit, egui-wgpu, egui_tiles

### `shell`

Developer console with command registration. Press backtick to open. Requires `egui`.

```toml
nightshade = { git = "...", features = ["shell"] }
```

### `audio`

Audio playback using Kira.

```toml
nightshade = { git = "...", features = ["audio"] }
```

**Provides:**
- Sound loading (WAV, OGG, MP3, FLAC)
- Sound playback with volume, pitch, panning
- Spatial/3D audio with distance attenuation
- Audio listener and source components
- Looping and one-shot sounds

### `fft`

FFT-based audio analysis for music-reactive applications.

```toml
nightshade = { git = "...", features = ["fft"] }
```

**Provides:**
- Real-time FFT spectral analysis
- Six-band frequency decomposition (sub-bass to highs)
- Beat detection (kick, snare, hi-hat)
- BPM estimation and beat phase tracking
- Spectral features (centroid, flatness, rolloff, flux)
- Onset detection with adaptive thresholding

**Additional Dependencies:** rustfft

### `physics`

Rapier3D physics integration.

```toml
nightshade = { git = "...", features = ["physics"] }
```

**Provides:**
- Rigid body simulation (dynamic, kinematic, static)
- Collider shapes (box, sphere, capsule, cylinder, cone, convex hull, trimesh, heightfield)
- Collision detection
- Character controllers
- Physics interpolation for smooth rendering
- Trimesh picking (when combined with `picking`)

**Additional Dependencies:** rapier3d

### `gamepad`

Gamepad/controller support via gilrs.

```toml
nightshade = { git = "...", features = ["gamepad"] }
```

**Provides:**
- Gamepad detection and hot-plugging
- Button input (face buttons, triggers, bumpers, D-pad)
- Analog stick input with deadzone handling
- Trigger pressure (0.0 - 1.0)
- Rumble/vibration
- Multiple gamepad support

### `navmesh`

AI navigation mesh generation via Recast.

```toml
nightshade = { git = "...", features = ["navmesh"] }
```

**Provides:**
- Navigation mesh generation from world geometry
- A* and Dijkstra pathfinding
- NavMesh agent component with autonomous movement
- Height sampling on navigation mesh
- Debug visualization

**Additional Dependencies:** rerecast, glam

### `scripting`

Rhai scripting runtime for dynamic behavior.

```toml
nightshade = { git = "...", features = ["scripting"] }
```

### `fbx`

FBX model loading using ufbx. Requires `assets`.

```toml
nightshade = { git = "...", features = ["fbx"] }
```

### `lattice`

Lattice deformation system for free-form mesh deformation.

```toml
nightshade = { git = "...", features = ["lattice"] }
```

### `sdf_sculpt`

Signed Distance Field sculpting system.

```toml
nightshade = { git = "...", features = ["sdf_sculpt"] }
```

## Platform Features

### `openxr`

OpenXR VR support. Uses Vulkan backend. Provides `launch_xr()` entry point, VR input (head/hand tracking, controllers), and locomotion.

```toml
nightshade = { git = "...", features = ["openxr"] }
```

**Additional Dependencies:** openxr, ash, wgpu-hal, gpu-allocator

### `steam`

Steamworks integration for achievements, stats, multiplayer, and friends.

```toml
nightshade = { git = "...", features = ["steam"] }
```

**Additional Dependencies:** steamworks, steamworks-sys

### `webview`

Bidirectional IPC for hosting web frontends (Leptos, Yew, etc.) inside a nightshade window.

```toml
nightshade = { git = "...", features = ["webview"] }
```

**Additional Dependencies:** wry, tiny_http, include_dir, wasm-bindgen, js-sys, web-sys

### `mosaic`

Multi-pane desktop application framework built on `egui_tiles`. Provides dockable tile-based layouts, a `Widget` trait for serializable panes, theming with 11 presets, modal dialogs, toast notifications, command palettes, keyboard shortcuts, file dialogs, project save/load, status bars, FPS counters, undo/redo history, clipboard helpers, drag-and-drop support, and a built-in `ViewportWidget` for rendering camera outputs.

Requires `egui`.

```toml
nightshade = { git = "...", features = ["mosaic"] }
```

**Key types:** `Mosaic`, `Widget`, `Pane`, `WidgetContext`, `ViewportWidget`, `ThemeState`, `Modals`, `Toasts`, `StatusBar`, `CommandPalette`, `ShortcutManager`, `History`, `Settings`, `EventLog`, `FpsCounter`, `MosaicConfig`

### `windows-app-icon`

Embed a custom icon into Windows executables at build time.

```toml
nightshade = { git = "...", features = ["windows-app-icon"] }
```

**Additional Dependencies:** winresource, ico, image

## Profiling Features

### `tracing`

Rolling log files and `RUST_LOG` support via tracing-appender.

### `tracy`

Real-time profiling with Tracy. Implies `tracing`.

### `chrome`

Chrome tracing output for `chrome://tracing`. Implies `tracing`.

## Plugin Features

### `plugins`

Guest-side WASM plugin API for creating plugins.

### `plugin_runtime`

WASM plugin hosting via Wasmtime. Requires `assets`.

**Additional Dependencies:** wasmtime, wasmtime-wasi, anyhow

## Terminal Features

### `tui`

Terminal UI framework built on the engine's rendering. Includes `runtime` and `text`.

**Additional Dependencies:** rand

### `terminal`

Crossterm-based terminal applications without the full rendering pipeline.

**Additional Dependencies:** crossterm, rand, freecs

## Other Features

### `mcp`

Model Context Protocol server for AI-driven scene manipulation. Requires `async_runtime` and `behaviors`.

```toml
nightshade = { git = "...", features = ["mcp"] }
```

**Additional Dependencies:** axum, rmcp, schemars

## Feature Combinations

### Minimal Rendering App

```toml
nightshade = { default-features = false, features = ["runtime", "wgpu", "egui"] }
```

Lightweight egui app without asset loading.

### Standard Game

```toml
nightshade = { git = "...", features = ["egui", "physics", "audio", "gamepad"] }
```

Full game features with UI, physics, audio, and gamepad.

### Open World Game

```toml
nightshade = { git = "...", features = [
    "egui",
    "physics",
    "audio",
    "gamepad",
    "navmesh",
] }
```

Everything for large outdoor environments with AI pathfinding.

### VR Game

```toml
nightshade = { git = "...", features = ["openxr", "physics", "audio"] }
```

Virtual reality with physics and audio.

### Music Visualizer

```toml
nightshade = { git = "...", features = ["audio", "fft"] }
```

Audio-reactive visualizations with FFT analysis.

### Desktop Tool

```toml
nightshade = { git = "...", features = ["mosaic", "egui"] }
```

Multi-pane desktop application with dockable widgets.

## Feature Dependencies

Some features have implicit dependencies:

| Feature | Depends On |
|---------|------------|
| `engine` | `runtime`, `assets`, `scene_graph`, `picking`, `terrain`, `file_dialog`, `async_runtime`, `screenshot` |
| `runtime` | `core`, `text`, `behaviors` |
| `full` | `engine`, `wgpu`, `egui`, `shell`, `audio`, `physics`, `gamepad`, `navmesh`, `scripting`, `fbx`, `lattice`, `sdf_sculpt`, `mosaic`, `plugins` |
| `mosaic` | `egui` |
| `shell` | `egui` |
| `fbx` | `assets` |
| `scene_graph` | `assets` |
| `assets` | `core` |
| `text` | `core` |
| `terrain` | `core` |
| `tui` | `runtime`, `text` |
| `plugin_runtime` | `assets` |
| `mcp` | `async_runtime`, `behaviors` |
| `tracy` | `tracing` |
| `chrome` | `tracing` |
| `openxr` | `wgpu` (Vulkan backend) |

## Checking Enabled Features

Use `cfg` attributes for conditional compilation:

```rust
fn initialize(&mut self, world: &mut World) {
    let camera = spawn_camera(world, Vec3::new(5.0, 3.0, 5.0), "Camera".to_string());
    world.resources.active_camera = Some(camera);
    spawn_sun(world);

    #[cfg(feature = "physics")]
    {
        let entity = world.spawn_entities(
            RIGID_BODY | COLLIDER | LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY | RENDER_MESH,
            1,
        )[0];
        world.set_rigid_body(entity, RigidBodyComponent::new_dynamic());
        world.set_collider(entity, ColliderComponent::cuboid(0.5, 0.5, 0.5));
    }

    #[cfg(feature = "audio")]
    {
        let source = world.spawn_entities(AUDIO_SOURCE | LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];
        world.set_audio_source(source, AudioSource::new("music").with_looping(true).playing());
    }
}
```
