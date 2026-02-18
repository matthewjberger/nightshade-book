# Resources

Resources are global singletons stored in `world.resources`. Unlike components (which are per-entity), each resource type exists exactly once in the world.

## Accessing Resources

All resources are accessed through `world.resources`:

```rust
fn run_systems(&mut self, world: &mut World) {
    let dt = world.resources.window.timing.delta_time;

    if world.resources.input.keyboard.is_key_pressed(KeyCode::Space) {
        self.jump();
    }

    world.resources.graphics.bloom_enabled = true;
}
```

## Resource Catalog

### Time & Window

| Resource | Type | Description |
|----------|------|-------------|
| `window` | `Window` | Window handle, timing, and display info |
| `secondary_windows` | `SecondaryWindows` | Multi-window state |
| `window.timing` | `WindowTiming` | Frame timing: `delta_time`, `frames_per_second`, `uptime_milliseconds` |

### Input

| Resource | Type | Description |
|----------|------|-------------|
| `input` | `Input` | Keyboard, mouse, and gamepad state |
| `input.keyboard` | `Keyboard` | Key states, `is_key_pressed()`, `is_key_just_pressed()` |
| `input.mouse` | `Mouse` | Position, delta, button state, scroll |

### Graphics

| Resource | Type | Description |
|----------|------|-------------|
| `graphics` | `Graphics` | All rendering settings |
| `graphics.atmosphere` | `Atmosphere` | Sky type (None, Color, Sky) |
| `graphics.bloom_enabled` | `bool` | Bloom toggle |
| `graphics.ssao_enabled` | `bool` | SSAO toggle |
| `graphics.color_grading` | `ColorGrading` | Tonemapping, exposure, contrast |

### Caches

| Resource | Type | Description |
|----------|------|-------------|
| `mesh_cache` | `MeshCache` | Loaded mesh data by name |
| `material_registry` | `MaterialRegistry` | Registered materials |
| `texture_cache` | `TextureCache` | GPU textures |
| `animation_cache` | `AnimationCache` | Animation clip data |
| `prefab_cache` | `PrefabCache` | Loaded prefab templates |
| `text_cache` | `TextCache` | Font atlas and glyph data |

### Scene

| Resource | Type | Description |
|----------|------|-------------|
| `active_camera` | `Option<Entity>` | Currently rendering camera |
| `children_cache` | `HashMap<Entity, Vec<Entity>>` | Parent-to-children mapping |
| `entity_names` | `HashMap<String, Entity>` | Name-to-entity lookup |
| `transform_dirty_entities` | `Vec<Entity>` | Entities needing transform propagation |

### Simulation

| Resource | Type | Feature |
|----------|------|---------|
| `physics` | `PhysicsWorld` | `physics` |
| `audio` | `AudioEngine` | `audio` |
| `navmesh` | `NavMeshWorld` | always |

### Communication

| Resource | Type | Description |
|----------|------|-------------|
| `event_bus` | `EventBus` | Message passing between systems |
| `command_queue` | `Vec<WorldCommand>` | Deferred GPU/scene operations |

### Platform

| Resource | Type | Feature |
|----------|------|---------|
| `xr` | `XrResources` | `openxr` |
| `steam` | `SteamResources` | `steam` |
| `script_runtime` | `ScriptRuntime` | `scripting` |
| `sdf_world` | `SdfWorld` | `sdf_sculpt` |

## Conditional Resources

Some resources are only available when their feature flag is enabled:

```rust
#[cfg(feature = "physics")]
{
    world.resources.physics.gravity = Vec3::new(0.0, -9.81, 0.0);
}

#[cfg(feature = "audio")]
{
    world.resources.audio.master_volume = 0.8;
}
```

## World Commands

Operations that require GPU access or must be deferred are queued as commands:

```rust
world.queue_command(WorldCommand::LoadTexture {
    name: "my_texture".to_string(),
    rgba_data: texture_bytes,
    width: 256,
    height: 256,
});

world.queue_command(WorldCommand::DespawnRecursive { entity });
world.queue_command(WorldCommand::LoadHdrSkybox { hdr_data });
world.queue_command(WorldCommand::CaptureScreenshot { path: None });
```

Commands are processed during the render phase when GPU access is available.
