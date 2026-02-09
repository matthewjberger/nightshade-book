# Troubleshooting

Common issues and their solutions.

## Compilation Errors

### "feature `X` is not enabled"

You're using a feature that isn't enabled in your `Cargo.toml`. Add the required feature:

```toml
nightshade = { git = "...", features = ["engine", "wgpu", "physics", "audio"] }
```

See [Feature Flags](appendix-features.md) for the complete list.

### "cannot find function `spawn_cube_at`"

Import the prelude:

```rust
use nightshade::prelude::*;
```

### "the trait `State` is not implemented"

Ensure your game struct implements all required methods:

```rust
impl State for MyGame {
    fn title(&self) -> &str { "My Game" }
    fn initialize(&mut self, world: &mut World) {}
    fn run_systems(&mut self, world: &mut World) {}
}
```

### "nalgebra_glm vs glam conflict"

Nightshade uses `nalgebra_glm` exclusively. Don't mix with `glam`:

```rust
// Correct
use nalgebra_glm::Vec3;

// Wrong - will cause type mismatches
use glam::Vec3;
```

## Runtime Errors

### "No suitable adapter found"

Your GPU doesn't support the required graphics API.

**Windows:**
- Update graphics drivers
- Install Vulkan Runtime from https://vulkan.lunarg.com/
- Try forcing DX12: `WGPU_BACKEND=dx12 ./game.exe`

**Linux:**
- Install Vulkan drivers: `sudo apt install mesa-vulkan-drivers`
- Verify with `vulkaninfo`

**macOS:**
- Ensure macOS 10.13+ (Metal required)
- Check System Report > Graphics for Metal support

### "Entity not found"

You're accessing an entity that was despawned or never existed:

```rust
// Check entity exists before access
if world.has_entity(entity) {
    if let Some(transform) = world.get_local_transform(entity) {
        // Safe to use
    }
}
```

### "Texture not found"

The texture path is incorrect or the file doesn't exist:

```rust
// Paths are relative to the executable
load_gltf(world, "assets/models/character.glb");  // Correct
load_gltf(world, "/home/user/game/assets/models/character.glb");  // Avoid absolute paths
```

### Physics objects fall through floor

Common causes:

1. **Missing collider on floor:**
```rust
add_collider(world, floor, ColliderShape::Box {
    half_extents: Vec3::new(50.0, 0.5, 50.0),
});
```

2. **Objects spawned inside each other:**
```rust
// Spawn above the floor, not at y=0
transform.translation = Vec3::new(0.0, 2.0, 0.0);
```

3. **High velocity causing tunneling:**
```rust
// Enable CCD for fast objects
let mut body = RigidBodyComponent::new_dynamic();
body.ccd_enabled = true;
world.set_rigid_body(entity, body);
```

### Animation not playing

1. **Check animation name exists:**
```rust
if let Some(player) = world.get_animation_player_mut(entity) {
    // List available animations
    for name in player.available_animations() {
        println!("Animation: {}", name);
    }
}
```

2. **Call update each frame:**
```rust
fn run_systems(&mut self, world: &mut World) {
    update_animation_players(world, dt);
}
```

3. **Animation player is on child entity:**
```rust
// glTF animations are often on child nodes
for child in world.get_children(model_root) {
    if let Some(player) = world.get_animation_player_mut(child) {
        player.play("idle");
    }
}
```

### No audio output

1. **Load sound before playing:**
```rust
load_sound(world, "shoot", "assets/audio/shoot.wav");
play_sound(world, "shoot");
```

2. **Check audio feature is enabled:**
```toml
nightshade = { git = "...", features = ["engine", "wgpu", "audio"] }
```

3. **Verify file format:** Supported formats are WAV, OGG, MP3, FLAC.

## Performance Issues

### Low frame rate

1. **Check entity count:**
```rust
println!("Entities: {}", world.entity_count());
```

2. **Disable expensive effects:**
```rust
world.resources.graphics.ssao_enabled = false;
world.resources.graphics.bloom_enabled = false;
```

3. **Reduce shadow quality:**
```rust
world.resources.graphics.shadow_map_size = 1024; // Default is 2048
```

4. **Use simpler colliders:**
```rust
// Prefer boxes/spheres over trimesh
add_collider(world, entity, ColliderShape::Box { ... });
```

### Memory usage high

1. **Despawn unused entities:**
```rust
world.despawn_entities(&[entity]);
```

2. **Unload unused textures:**
```rust
world.resources.texture_cache.clear_unused();
```

3. **Use smaller textures for distant objects.**

### Stuttering / hitching

1. **Avoid allocations in run_systems:**
```rust
// Bad - allocates every frame
let entities: Vec<Entity> = world.query_entities(LOCAL_TRANSFORM).collect();

// Good - iterate directly
for entity in world.query_entities(LOCAL_TRANSFORM) {
    // ...
}
```

2. **Preload assets in initialize:**
```rust
fn initialize(&mut self, world: &mut World) {
    load_gltf(world, "assets/models/enemy.glb");
    load_sound(world, "explosion", "assets/audio/explosion.wav");
}
```

## Visual Issues

### Objects are black

Missing or incorrect lighting:

```rust
spawn_sun(world);
world.resources.graphics.ambient_intensity = 0.1;
```

### Objects are too bright / washed out

Adjust exposure and tonemapping:

```rust
world.resources.graphics.exposure = 1.0;
world.resources.graphics.tonemap_method = TonemapMethod::Aces;
```

### Textures look wrong

1. **Normal maps inverted:** Some tools export Y-flipped normals. Check your export settings.

2. **sRGB vs Linear:** Base color textures should be sRGB. Normal/metallic/roughness should be linear.

3. **Texture coordinates flipped:** glTF uses top-left origin. Some models may need UV adjustment.

### Z-fighting (flickering surfaces)

Surfaces too close together:

```rust
// Increase near plane
camera.near = 0.1;  // Instead of 0.01

// Or separate surfaces more
floor_transform.translation.y = 0.0;
decal_transform.translation.y = 0.01;  // Slight offset
```

## WebAssembly Issues

### "WebGPU not supported"

- Use Chrome 113+ or Edge 113+
- Firefox requires enabling `dom.webgpu.enabled` in about:config
- Safari support is limited

### Assets fail to load

WASM can't access the filesystem. Serve assets via HTTP:

```html
<script>
// Assets must be fetched, not loaded from disk
fetch('assets/model.glb')
    .then(response => response.arrayBuffer())
    .then(data => { /* use data */ });
</script>
```

### Performance worse than native

Expected. WebGPU has overhead. Reduce quality settings:

```rust
#[cfg(target_arch = "wasm32")]
{
    world.resources.graphics.ssao_enabled = false;
    world.resources.graphics.shadow_map_size = 512;
}
```

## Getting Help

If your issue isn't listed here:

1. Check the [GitHub Issues](https://github.com/matthewjberger/nightshade/issues)
2. Search existing issues for similar problems
3. Create a new issue with:
   - Nightshade version
   - Platform (OS, GPU)
   - Minimal code to reproduce
   - Error message or screenshot
