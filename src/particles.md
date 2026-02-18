# Particle Systems

> **Live Demo:** [Fireworks](https://matthewberger.dev/nightshade/fireworks)

GPU-accelerated particle systems for fire, smoke, fireworks, sparks, and weather effects.

## How Particles Work

Nightshade's particle system is entirely GPU-driven. Up to 1,000,000 particles are simulated and rendered without CPU involvement per frame. The system uses three compute shaders (reset, update, spawn) followed by a render pass, all operating on GPU storage buffers.

### GPU Simulation Pipeline

Each frame executes four stages:

1. **Reset** (1 workgroup) - Clears the alive count and draw command instance count to zero.

2. **Update** (max_particles / 256 workgroups) - For each alive particle:
   - Increment age by `delta_time`
   - If age exceeds lifetime, mark as dead and push index to the free list
   - Apply gravity: `velocity += gravity * delta_time`
   - Apply drag: `velocity *= (1 - drag * delta_time)`
   - Apply turbulence: curl noise computed from `simplex_noise_3d()` with spatial derivatives creates a divergence-free vector field that swirls particles naturally
   - Integrate position: `position += velocity * delta_time`
   - Interpolate size and color between start/end values based on `age / lifetime`
   - Push to alive list and increment draw counter via atomics

3. **Spawn** (one workgroup per emitter, 256 threads each) - Each thread:
   - Atomically decrements the free list to allocate a particle slot
   - Seeds an RNG using `particle_index * 1973 + time * 10000 + spawn_index * 7919 + emitter_index * 6997`
   - Generates a spawn offset based on emitter shape (point, sphere, cone, or box)
   - Applies velocity spread as a random cone angle around the emission direction
   - Samples the color gradient at t=0.15 and t=0.9 for lifetime interpolation endpoints
   - Writes initial position, velocity, color, lifetime, size range, gravity, drag, turbulence, and texture index

4. **Render** - Camera-facing billboard quads using `draw_indirect` with the alive count. The vertex shader generates 6 vertices (2 triangles) per particle using camera right/up basis vectors extracted from the inverse view matrix. The fragment shader applies either procedural shapes or texture sampling.

### Procedural Particle Shapes

The fragment shader generates several built-in shapes mathematically:

| Shape | Algorithm |
|-------|-----------|
| Firework glow | Multiple stacked exponential falloffs (coefficients 120, 40, 15, 6, 2.5) |
| Fire | Vertically stretched (y *= 0.65) with core, flame, and outer glow layers |
| Smoke | Gaussian soft circle (coefficient 4.0) |
| Spark | Tight bright core with steep exponential falloff |
| Star | Cosine-based pointiness with adjustable sharpness |

### Blending Modes

Two render pipelines handle different particle types:
- **Alpha blending** (`SrcAlpha, OneMinusSrcAlpha`) for standard particles like smoke
- **Additive blending** (`SrcAlpha, One`) for emissive particles like fire and sparks, which accumulate brightness and interact with HDR bloom. The additive fragment shader boosts color: `hdr_color + hdr_color^2 * 0.3`

Both pipelines disable depth writes (particles are transparent) but enable depth testing with `GreaterEqual` (reversed-Z).

### Memory Management

Particle slots are managed with a GPU-side free list. Dead particles push their index onto the free list via atomic operations. Spawning particles pop indices off the free list. This lock-free approach handles millions of spawn/death events per second entirely on the GPU.

## Particle Emitter Component

```rust
pub struct ParticleEmitter {
    pub emitter_type: EmitterType,       // Firework, Fire, Smoke, Sparks, Trail
    pub shape: EmitterShape,             // Point, Sphere, Cone, Box
    pub position: Vec3,                  // Local offset from transform
    pub direction: Vec3,                 // Primary emission direction
    pub spawn_rate: f32,                 // Particles per second
    pub burst_count: u32,               // One-time spawn count
    pub particle_lifetime_min: f32,      // Minimum lifetime (seconds)
    pub particle_lifetime_max: f32,      // Maximum lifetime (seconds)
    pub initial_velocity_min: f32,       // Min velocity along direction
    pub initial_velocity_max: f32,       // Max velocity along direction
    pub velocity_spread: f32,            // Cone angle (radians)
    pub gravity: Vec3,                   // Acceleration vector
    pub drag: f32,                       // Velocity damping (0-1)
    pub size_start: f32,                 // Billboard size at birth
    pub size_end: f32,                   // Billboard size at death
    pub color_gradient: ColorGradient,   // Color over lifetime
    pub emissive_strength: f32,          // HDR multiplier for bloom
    pub turbulence_strength: f32,        // Curl noise strength
    pub turbulence_frequency: f32,       // Curl noise scale
    pub texture_index: u32,             // 0 = procedural, 1+ = texture array slot
    pub enabled: bool,
    pub one_shot: bool,                  // Burst once then disable
}
```

## Emitter Shapes

```rust
EmitterShape::Point                             // Spawn from center
EmitterShape::Sphere { radius: 0.5 }           // Random within sphere
EmitterShape::Cone { angle: 0.5, height: 1.0 } // Cone spread
EmitterShape::Box { half_extents: Vec3::new(1.0, 0.1, 1.0) }
```

## Color Gradients

Define how particles change color over their lifetime:

```rust
pub struct ColorGradient {
    pub colors: Vec<(f32, Vec4)>,  // (normalized_time, rgba_color)
}
```

Built-in gradients:

```rust
ColorGradient::fire()       // Yellow -> orange -> red -> black
ColorGradient::smoke()      // Gray with varying alpha
ColorGradient::sparks()     // Bright yellow -> orange -> red
```

## Built-in Presets

The `ParticleEmitter` struct provides 30+ factory methods:

```rust
ParticleEmitter::fire(position)
ParticleEmitter::smoke(position)
ParticleEmitter::sparks(position)
ParticleEmitter::explosion(position)
ParticleEmitter::willow(position)
ParticleEmitter::chrysanthemum(position)
ParticleEmitter::palm_explosion(position, color)
ParticleEmitter::comet_shell(position)
ParticleEmitter::strobe_effect(position)
```

## Creating Emitters

```rust
let entity = world.spawn_entities(
    PARTICLE_EMITTER | LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY,
    1
)[0];

world.set_particle_emitter(entity, ParticleEmitter::fire(Vec3::zeros()));

world.set_local_transform(entity, LocalTransform {
    translation: Vec3::new(0.0, 1.0, 0.0),
    ..Default::default()
});
```

## Custom Emitter

```rust
world.set_particle_emitter(entity, ParticleEmitter {
    emitter_type: EmitterType::Fire,
    shape: EmitterShape::Sphere { radius: 0.1 },
    direction: Vec3::y(),
    spawn_rate: 100.0,
    particle_lifetime_min: 0.3,
    particle_lifetime_max: 0.8,
    initial_velocity_min: 1.0,
    initial_velocity_max: 2.0,
    velocity_spread: 0.3,
    gravity: Vec3::new(0.0, -2.0, 0.0),
    drag: 0.1,
    size_start: 0.15,
    size_end: 0.02,
    color_gradient: ColorGradient::fire(),
    emissive_strength: 3.0,
    turbulence_strength: 0.5,
    turbulence_frequency: 1.0,
    enabled: true,
    ..Default::default()
});
```

## Updating Emitters

The CPU-side update system must run each frame to accumulate spawn counts:

```rust
fn run_systems(&mut self, world: &mut World) {
    update_particle_emitters(world);
}
```

For continuous emitters, this adds `spawn_rate * delta_time` to an accumulator. For one-shot bursts, it sets the spawn count to `burst_count` once.

## Controlling Emitters

```rust
if let Some(emitter) = world.get_particle_emitter_mut(entity) {
    emitter.enabled = false;
    emitter.emissive_strength = 5.0;
}
```

## Custom Particle Textures

Upload textures to the particle texture array (64 slots, 512x512 each):

```rust
world.resources.pending_particle_textures.push(ParticleTextureUpload {
    slot: 1,
    rgba_data: image_bytes,
    width: 512,
    height: 512,
});
```

Set `texture_index` to the slot number (1+) to use a custom texture instead of procedural shapes.

## Capacity

| Limit | Value |
|-------|-------|
| Maximum particles | 1,000,000 |
| Maximum emitters | 512 |
| Texture slots | 64 |
| Texture slot size | 512 x 512 |
| Compute workgroup size | 256 |
