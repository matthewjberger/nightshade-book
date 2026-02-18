# Water

> **Live Demo:** [Water](https://matthewberger.dev/nightshade/water)

Nightshade includes a procedural water system with three rendering paths: ray-marched surface water, mesh-based water with vertex displacement, and volumetric water for waterfalls and mist.

## How Water Rendering Works

### Wave Generation

Water surfaces are animated using multi-octave procedural noise. The `sea_octave` function creates wave-like patterns by combining `abs(sin)` and `abs(cos)` of noise-distorted UV coordinates, then raising the result to a choppiness exponent. Higher choppiness values produce sharper wave peaks.

The height map evaluates 5 octaves of this function. Each octave doubles the frequency and reduces amplitude by 0.22x, while increasing choppiness by 20%. Between octaves, UV coordinates are rotated by a fixed 2x2 matrix `[1.6, 1.2; -1.2, 1.6]` to prevent visible repetition. Two offset directions (`uv + time` and `uv - time`) create coherent wave interference patterns.

### Fresnel Reflections

The water shader computes the Fresnel effect to blend between refraction (seeing into the water) and reflection (seeing the sky):

```
fresnel = pow(1.0 - dot(normal, view_direction), fresnel_power)
```

At steep viewing angles (looking straight down), `fresnel` is near 0 and the water shows its base color. At grazing angles (looking across the surface), `fresnel` approaches 1 and the water reflects the sky. The `fresnel_power` parameter (default 3.0) controls how quickly this transition happens.

Specular sun reflections use a cosine power of 60 for tight, bright highlights on wave crests.

### Three Rendering Paths

**Path 1: Ray-Marched Surface Water** - For bounded water regions without mesh geometry. The fragment shader traces rays from the camera through the 3D height field using `heightmap_tracing()` with 32 march steps and geometric refinement iterations. This produces per-pixel correct reflections and refractions. Supports polygon bounds with soft edge feathering. Limited to 16 simultaneous water regions.

**Path 2: Mesh-Based Water** - For large flat surfaces. The vertex shader applies procedural wave displacement to mesh vertices using the same `water_height()` function. The fragment shader computes normals from height gradients, applies Fresnel-based sky reflection, and adds subsurface scattering: `pow(max(dot(view, -sun_dir), 0.0), 2.0) * 0.2`. More efficient than ray-marching and integrates properly with the depth buffer.

**Path 3: Volumetric Water** - For waterfalls, mist, and cascading water. A per-pixel ray-marching shader traces through SDF-bounded volumes (box, cylinder, or sphere) with up to 64 steps. Three flow types have different density functions:
- **Waterfall**: High vertical stretch with turbulence, top-to-bottom falloff
- **Mist**: Rising motion with horizontal drift, wispy patterns using 3D FBM noise
- **Cascade**: Multiple parallel streams using 3 layered FBM noise functions

Volumetric water is lit with sun shadowing through the volume and foam blending based on accumulated density.

### Vertical Water

For waterfall surfaces, a separate shader (`water_mesh_vertical.wgsl`) displaces vertices along the surface normal instead of the Y-axis. Wave frequency is stretched (2.0x horizontally, 0.5x vertically) to create vertical streaks. Foam patterns are generated from layered noise and blended with the water color.

### Frustum Culling

A compute shader (`water_mesh_culling.wgsl`) tests each water object's bounding sphere against the 6 frustum planes. Culled objects skip rendering entirely. For volumetric water, the bounding sphere is derived from the volume's half-size. Visible instances are appended to an indirect draw buffer via atomic operations.

## Water Component

```rust
pub struct Water {
    pub wave_height: f32,           // Wave amplitude (default: 0.6)
    pub choppy: f32,                // Wave sharpness (default: 4.0, higher = sharper peaks)
    pub speed: f32,                 // Animation speed (default: 0.8)
    pub frequency: f32,             // Wave frequency (default: 0.16, lower = longer waves)
    pub base_height: f32,           // Water level (default: 0.0)
    pub base_color: Vec4,           // Dark water color
    pub water_color: Vec4,          // Light water color
    pub specular_strength: f32,     // Sun reflection intensity (default: 1.0)
    pub fresnel_power: f32,         // Reflection balance (default: 3.0)
    pub edge_feather_distance: f32, // Shore softness (default: 2.0)
    pub is_vertical: bool,          // Waterfall mode
    pub is_volumetric: bool,        // 3D volume mode
    pub volume_shape: VolumeShape,  // Box, Cylinder, or Sphere
    pub volume_flow_type: VolumeFlowType, // Waterfall, Mist, or Cascade
    pub volume_size: Vec3,          // Volume dimensions
    pub flow_direction: Vec2,       // Normalized flow direction
    pub flow_strength: f32,         // Flow intensity
}
```

## Spawning Water

### Planar Water

```rust
let water_entity = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | WATER,
    1
)[0];

world.set_local_transform(water_entity, LocalTransform {
    translation: Vec3::new(0.0, 0.0, 0.0),
    ..Default::default()
});

world.set_water(water_entity, Water {
    wave_height: 0.5,
    speed: 1.0,
    frequency: 0.5,
    choppy: 4.0,
    base_color: Vec4::new(0.0, 0.1, 0.2, 1.0),
    water_color: Vec4::new(0.0, 0.3, 0.5, 1.0),
    fresnel_power: 3.0,
    specular_strength: 1.0,
    edge_feather_distance: 1.0,
    ..Default::default()
});
```

### Volumetric Water (Waterfall)

```rust
world.set_water(waterfall_entity, Water {
    is_volumetric: true,
    volume_shape: VolumeShape::Box,
    volume_flow_type: VolumeFlowType::Waterfall,
    volume_size: Vec3::new(2.0, 10.0, 1.0),
    flow_direction: Vec2::new(0.0, -1.0),
    flow_strength: 2.0,
    base_color: Vec4::new(0.0, 0.15, 0.25, 1.0),
    water_color: Vec4::new(0.1, 0.4, 0.6, 1.0),
    ..Default::default()
});
```

## Wave Parameters

| Parameter | Range | Effect |
|-----------|-------|--------|
| `wave_height` | 0.1-2.0 | Vertical amplitude of waves |
| `choppy` | 1.0-8.0 | Higher = sharper peaks, lower = smooth rounded waves |
| `speed` | 0.1-2.0 | Animation speed (time multiplier) |
| `frequency` | 0.05-0.5 | Lower = longer wavelengths, higher = finer detail |
| `fresnel_power` | 1.0-10.0 | Higher = stronger reflection at grazing angles |
| `specular_strength` | 0.0-2.0 | Sun reflection intensity |

## Dynamic Weather

Water properties can be changed at runtime for weather transitions:

```rust
fn stormy_weather(world: &mut World, water: Entity) {
    if let Some(w) = world.get_water_mut(water) {
        w.wave_height = 3.0;
        w.speed = 2.0;
        w.choppy = 6.0;
    }
}

fn calm_weather(world: &mut World, water: Entity) {
    if let Some(w) = world.get_water_mut(water) {
        w.wave_height = 0.3;
        w.speed = 0.5;
        w.choppy = 2.0;
    }
}
```
