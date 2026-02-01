# Feature Flags

Nightshade uses Cargo feature flags to enable optional functionality. This allows you to include only the features you need, reducing compile times and binary size.

## Core Features

### `engine`

The main engine feature. Required for all applications.

```toml
nightshade = { git = "...", features = ["engine"] }
```

**Includes:**
- Window creation and event loop
- wgpu rendering backend
- ECS (freecs)
- Transform hierarchy
- Camera systems
- Mesh rendering
- Material system
- Lighting (directional, point, spot)
- Post-processing (bloom, tonemapping)
- glTF/GLB model loading
- Input handling (keyboard, mouse)
- Timing system

### `physics`

Rapier3D physics integration.

```toml
nightshade = { git = "...", features = ["engine", "physics"] }
```

**Includes:**
- Rigid body simulation (dynamic, kinematic, static)
- Collider shapes (box, sphere, capsule, cylinder, cone, convex hull, trimesh, heightfield)
- Collision detection and callbacks
- Physics joints (fixed, revolute, prismatic, spherical, rope, spring)
- Character controllers
- Raycasting
- Continuous collision detection (CCD)

**Additional Dependencies:** rapier3d

### `audio`

Kira audio engine integration.

```toml
nightshade = { git = "...", features = ["engine", "audio"] }
```

**Includes:**
- Sound loading (WAV, OGG, MP3, FLAC)
- Sound playback with volume, pitch, panning
- Spatial/3D audio
- Audio listener component
- Sound emitter components
- Looping and one-shot sounds
- Sound pooling

**Additional Dependencies:** kira

### `gamepad`

Gamepad/controller support via gilrs.

```toml
nightshade = { git = "...", features = ["engine", "gamepad"] }
```

**Includes:**
- Gamepad detection and hot-plugging
- Button input (face buttons, triggers, bumpers, D-pad)
- Analog stick input with deadzone handling
- Trigger pressure (0.0 - 1.0)
- Rumble/vibration
- Multiple gamepad support

**Additional Dependencies:** gilrs

## Advanced Features

### `terrain`

Procedural terrain generation with LOD.

```toml
nightshade = { git = "...", features = ["engine", "terrain"] }
```

**Includes:**
- Procedural noise-based terrain
- GPU tessellation
- Level-of-detail (LOD) system
- Chunk streaming
- Terrain height sampling
- Custom terrain materials

### `grass`

GPU-accelerated grass rendering.

```toml
nightshade = { git = "...", features = ["engine", "grass"] }
```

**Includes:**
- Instanced grass blades (up to 500,000)
- Wind animation
- Grass interaction/bending
- Multiple grass species
- LOD-based density
- Terrain integration
- Subsurface scattering
- Anisotropic specular

**Requires:** `terrain` feature for terrain integration

### `navmesh`

AI navigation mesh generation via Recast.

```toml
nightshade = { git = "...", features = ["engine", "navmesh"] }
```

**Includes:**
- Navigation mesh generation from geometry
- Pathfinding queries
- NavMesh agent component
- Off-mesh connections (ladders, teleports)
- Area costs/weights
- Dynamic obstacle avoidance

**Additional Dependencies:** recast-rs

### `screenshot`

Screenshot capture functionality.

```toml
nightshade = { git = "...", features = ["engine", "screenshot"] }
```

**Includes:**
- Frame capture to PNG
- Custom resolution screenshots
- HDR capture

## Rendering Features

### `psx`

PlayStation 1-style retro rendering.

```toml
nightshade = { git = "...", features = ["engine", "psx"] }
```

**Includes:**
- Vertex snapping (wobbly vertices)
- Affine texture mapping
- Low-resolution rendering
- Dithering
- Limited color palette

### `ssao`

Screen-space ambient occlusion.

```toml
nightshade = { git = "...", features = ["engine", "ssao"] }
```

**Includes:**
- SSAO render pass
- Configurable radius and intensity
- Blur pass for soft shadows

### `fft`

FFT-based audio analysis for music-reactive applications.

```toml
nightshade = { git = "...", features = ["engine", "audio", "fft"] }
```

**Includes:**
- Real-time FFT spectral analysis
- Six-band frequency decomposition (sub-bass to highs)
- Beat detection (kick, snare, hi-hat)
- BPM estimation and beat phase tracking
- Music structure detection (buildups, drops, breakdowns)
- Spectral features (centroid, flatness, rolloff, flux)
- Onset detection with adaptive thresholding

**Additional Dependencies:** rustfft

**Requires:** `audio` feature

## Feature Combinations

### Minimal Game

```toml
[dependencies]
nightshade = { git = "...", features = ["engine"] }
```

Just rendering and input. Good for simple visualizations.

### Standard Game

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "physics", "audio", "gamepad"] }
```

Full game features without terrain/grass.

### Open World Game

```toml
[dependencies]
nightshade = { git = "...", features = [
    "engine",
    "physics",
    "audio",
    "gamepad",
    "terrain",
    "grass",
    "navmesh",
] }
```

Everything for large outdoor environments.

### Retro Game

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "physics", "psx"] }
```

PlayStation 1-style rendering with physics.

### Music Visualizer

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "audio", "fft"] }
```

Audio-reactive visualizations with FFT analysis.

## Feature Dependencies

Some features have implicit dependencies:

| Feature | Depends On |
|---------|------------|
| `grass` | Optionally uses `terrain` |
| `navmesh` | None |
| `terrain` | None |
| `psx` | None |
| `ssao` | None |
| `audio` | None |
| `physics` | None |
| `gamepad` | None |
| `fft` | Requires `audio` |

## Compile-Time Impact

Features affect compile times and binary sizes:

| Feature | Compile Time | Binary Size |
|---------|-------------|-------------|
| `engine` | Base | Base |
| `physics` | +15-20% | +2-3 MB |
| `audio` | +10-15% | +1-2 MB |
| `gamepad` | +5-10% | +0.5 MB |
| `terrain` | +5% | +0.5 MB |
| `grass` | +5% | +0.5 MB |
| `navmesh` | +10-15% | +1-2 MB |
| `screenshot` | +2% | +0.2 MB |
| `psx` | +2% | +0.1 MB |
| `ssao` | +2% | +0.1 MB |
| `fft` | +5% | +0.5 MB |

## Checking Enabled Features

At runtime, check if features are enabled:

```rust
#[cfg(feature = "physics")]
fn setup_physics(world: &mut World) {
    // Physics-specific code
}

#[cfg(feature = "audio")]
fn setup_audio(world: &mut World) {
    // Audio-specific code
}
```

## Conditional Compilation

Write code that works with or without features:

```rust
fn initialize(&mut self, world: &mut World) {
    spawn_fly_camera(world);
    spawn_directional_light(world, Vec3::new(-1.0, -1.0, -1.0));

    #[cfg(feature = "physics")]
    {
        let cube = spawn_primitive(world, Primitive::Cube);
        add_rigid_body(world, cube, RigidBodyType::Dynamic, 1.0);
        add_collider(world, cube, ColliderShape::Box {
            half_extents: Vec3::new(0.5, 0.5, 0.5),
        });
    }

    #[cfg(feature = "audio")]
    {
        load_sound(world, "music", "assets/audio/background.ogg");
        play_sound(world, "music");
    }

    #[cfg(feature = "terrain")]
    {
        spawn_terrain(world, TerrainConfig::default(), Vec3::zeros());
    }
}
```

## Default Features

Nightshade has no default features. You must explicitly enable what you need:

```toml
# This won't compile - no features enabled
nightshade = { git = "..." }

# This works - engine feature enabled
nightshade = { git = "...", features = ["engine"] }
```

## All Features

Enable everything:

```toml
nightshade = { git = "...", features = [
    "engine",
    "physics",
    "audio",
    "gamepad",
    "terrain",
    "grass",
    "navmesh",
    "screenshot",
    "psx",
    "ssao",
    "fft",
] }
```

This is only recommended for development/experimentation. For release builds, enable only what you need.
