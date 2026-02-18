# Grass System

> **Live Demo:** [Grass](https://matthewberger.dev/nightshade/grass)

GPU-accelerated grass rendering with wind animation, character interaction, LOD, and subsurface scattering.

## How Grass Rendering Works

The grass system renders up to 500,000 blades using a multi-stage compute + render pipeline. Each blade is a 7-vertex triangle strip generated in the vertex shader from per-instance data stored in GPU storage buffers.

### Rendering Pipeline

Each frame executes five stages:

1. **Interaction update** (compute, 16x16 workgroups) - Updates a 128x128 bend map texture from interactor positions. Each texel stores an XZ displacement vector. Interactors (player, NPCs) apply force based on proximity with smooth falloff. Velocity influences strength: `strength * (1 + velocity_length * 0.3)`. Previous-frame bend values decay at a configurable rate, creating persistent trails. Double-buffered (ping-pong) to avoid read-write hazards.

2. **Bend sampling** (compute, instances/256 workgroups) - Each grass instance samples the bend map at its world position to get an XZ displacement vector, stored in the instance buffer's `bend` field.

3. **Reset** (compute, 1 workgroup) - Atomically resets the indirect draw command's instance count to zero.

4. **Culling** (compute, instances/256 workgroups) - Each blade is tested against the camera frustum using its center position plus a radius. Blades outside the frustum are discarded. Distance-based LOD selects a density scale from 4 configurable thresholds. Statistical culling uses a hash of the instance ID: `hash(id) > density_scale` skips the blade. Surviving blades are appended to a visible index buffer via atomic operations, capped at 200,000.

5. **Render** - Triangle strip rendering using indirect draw with the culled instance count. Each blade generates 7 vertices: 2 base (wide), 2 mid (narrowing), 2 upper (narrower), 1 tip point. The vertex shader applies width narrowing and curvature per segment, rotates around the Y-axis using the instance's random rotation, displaces by wind and interaction bend, and outputs a height factor for color interpolation.

### Blade Geometry

Each blade is a curved triangle strip with width tapering from base to tip:

```
    *          (tip, 1 vertex)
   / \
  /   \        (upper, 2 vertices)
 /     \
|       |      (mid, 2 vertices)
|       |
|_______|      (base, 2 vertices)
```

Curvature is applied per-segment by offsetting vertices forward based on their height squared, creating a natural forward lean.

### Wind Animation

Wind uses multi-layered sine waves in the vertex shader:

- **Base wave**: `sin(position.x * frequency + time * speed)` at the configured strength
- **Gust layer**: Higher frequency oscillation layered on top

Wind displacement scales with the square of the blade's height factor, so the base stays anchored while the tip sways. The `wind_direction` vector controls the primary direction on the XZ plane.

### Interaction Bend

The bend map is a 128x128 `RG32Float` storage texture covering the grass region. When an interactor (entity with `GrassInteractor` component) moves through the grass:

1. The compute shader samples each texel's distance to each interactor
2. Within the interactor's radius, a smooth-step falloff function computes a bend direction away from the interactor
3. The bend accumulates with the existing value (from previous frames)
4. A decay rate gradually returns the bend to zero, creating a visible recovery trail

In the vertex shader, the bend displacement is applied with quadratic falloff based on height: the base barely moves while the tip receives full displacement.

### Kajiya-Kay Specular

The fragment shader implements **Kajiya-Kay anisotropic specular** lighting, originally developed for hair rendering. Instead of computing a standard Phong or GGX specular highlight, it uses the blade's tangent direction to produce elongated highlights that run perpendicular to the blade direction, mimicking how light reflects off thin strands.

### Subsurface Scattering

Light passing through grass blades creates a bright rim when the sun is behind the blade relative to the camera. The fragment shader computes a subsurface scattering contribution based on the dot product between the view direction and the negated sun direction, with edge fade for natural falloff. The `sss_color` and `sss_intensity` per-species parameters control the appearance.

### Distance Fade

Blades beyond 180m begin alpha fading, reaching full transparency at 200m (smoothstep). Blade tips also have a separate fade (smoothstep 0.9-1.0 of the height factor) for soft tip transparency.

## Enabling Grass

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "grass"] }
```

## Basic Grass Region

```rust
use nightshade::ecs::grass::*;

fn initialize(&mut self, world: &mut World) {
    let config = GrassConfig::default();
    spawn_grass_region(world, config);
}
```

## Grass Configuration

```rust
pub struct GrassConfig {
    pub blades_per_patch: u32,        // Density (default: 64)
    pub patch_size: f32,              // Patch size (default: 8.0)
    pub stream_radius: f32,           // Render distance (default: 200.0)
    pub unload_radius: f32,           // Unload distance (default: 220.0)
    pub wind_strength: f32,           // Wind intensity (default: 1.0)
    pub wind_frequency: f32,          // Wind speed (default: 1.0)
    pub wind_direction: [f32; 2],     // XZ direction (default: [1.0, 0.0])
    pub interaction_radius: f32,      // Player interaction radius (default: 1.0)
    pub interaction_strength: f32,    // Bending strength (default: 1.0)
    pub interactors_enabled: bool,    // Enable grass bending (default: true)
    pub cast_shadows: bool,           // Shadow casting (default: true)
    pub receive_shadows: bool,        // Shadow receiving (default: true)
    pub lod_distances: [f32; 4],      // LOD thresholds
    pub lod_density_scales: [f32; 4], // Density at each LOD
}
```

## Grass Species

Define visual characteristics:

```rust
pub struct GrassSpecies {
    pub blade_width: f32,
    pub blade_height_min: f32,
    pub blade_height_max: f32,
    pub blade_curvature: f32,
    pub base_color: [f32; 4],
    pub tip_color: [f32; 4],
    pub sss_color: [f32; 4],        // Subsurface scattering color
    pub sss_intensity: f32,
    pub specular_power: f32,         // Kajiya-Kay exponent
    pub specular_strength: f32,
    pub density_scale: f32,
}
```

### Preset Species

```rust
GrassSpecies::meadow()   // Short, dense lawn
GrassSpecies::tall()     // Tall field grass
GrassSpecies::short()    // Very short grass
GrassSpecies::flowers()  // Colorful flowers mixed with grass
```

## Multi-Species Grass

```rust
let entity = spawn_grass_region(world, config);

add_grass_species(world, entity, GrassSpecies::meadow(), 0.6);
add_grass_species(world, entity, GrassSpecies::flowers(), 0.4);
```

## Wind Control

```rust
set_grass_wind(world, entity, 1.5, 2.0);
set_grass_wind_direction(world, entity, 1.0, 0.5);
```

## Grass Interaction

```rust
attach_grass_interactor(world, player_entity, 1.0, 1.0);
```

Or spawn a standalone interactor:

```rust
let interactor = spawn_grass_interactor(world, 1.0, 1.0);
```

## LOD System

Statistical density culling reduces blade count at distance:

| LOD Level | Default Distance | Default Density |
|-----------|-----------------|-----------------|
| 0 | 0-20m | 100% |
| 1 | 20-50m | 60% |
| 2 | 50-100m | 30% |
| 3 | 100-200m | 10% |

Transitions are smooth because culling uses a per-instance hash compared against the density threshold. No popping artifacts.

## Shadow Casting

Grass uses a separate shadow depth shader (`grass_shadow_depth.wgsl`) that generates simplified blades (fixed curvature 0.3) with the same wind animation, projected into light space. This shader writes only depth, no color.

## Capacity

| Limit | Value |
|-------|-------|
| Maximum blades | 500,000 |
| Maximum visible per frame | 200,000 |
| Vertices per blade | 7 (triangle strip) |
| Maximum species | 8 |
| Maximum interactors | 16 |
| Heightmap resolution | 256 x 256 |
| Bend map resolution | 128 x 128 |
