# Grass System

GPU-accelerated grass rendering with wind, interaction, and LOD support.

## Enabling Grass

Grass requires the `grass` feature:

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
    pub blades_per_patch: u32,        // Grass density (default: 64)
    pub patch_size: f32,              // Size of each patch (default: 8.0)
    pub stream_radius: f32,           // Radius around camera to render (default: 200.0)
    pub unload_radius: f32,           // Distance to unload patches (default: 220.0)
    pub max_loaded_patches: usize,    // Maximum loaded patches (default: 4096)
    pub wind_strength: f32,           // Wind intensity (default: 1.0)
    pub wind_frequency: f32,          // Wind oscillation speed (default: 1.0)
    pub wind_direction: [f32; 2],     // Wind XZ direction (default: [1.0, 0.0])
    pub interaction_radius: f32,      // Player interaction radius (default: 1.0)
    pub interaction_strength: f32,    // Bending strength (default: 1.0)
    pub interactors_enabled: bool,    // Enable grass bending (default: true)
    pub cast_shadows: bool,           // Cast shadows (default: true)
    pub receive_shadows: bool,        // Receive shadows (default: true)
    pub lod_distances: [f32; 4],      // LOD transition distances
    pub lod_density_scales: [f32; 4], // Density at each LOD level
}
```

### Configuration Builder

```rust
let config = GrassConfig::default()
    .with_density(128)
    .with_wind(1.5, 2.0)
    .with_wind_direction(1.0, 0.5)
    .with_shadows(true, true)
    .with_stream_radius(250.0);

spawn_grass_region(world, config);
```

## Grass Species

Define visual characteristics of grass types:

```rust
pub struct GrassSpecies {
    pub name: String,
    pub blade_width: f32,
    pub blade_height_min: f32,
    pub blade_height_max: f32,
    pub blade_curvature: f32,
    pub base_color: [f32; 4],
    pub tip_color: [f32; 4],
    pub sss_color: [f32; 4],         // Subsurface scattering
    pub sss_intensity: f32,
    pub specular_power: f32,
    pub specular_strength: f32,
    pub density_scale: f32,
}
```

### Preset Species

```rust
// Short, dense lawn grass
let meadow = GrassSpecies::meadow();

// Tall field grass
let tall = GrassSpecies::tall();

// Very short grass
let short = GrassSpecies::short();

// Colorful flowers mixed with grass
let flowers = GrassSpecies::flowers();
```

## Multi-Species Grass

Mix multiple grass types:

```rust
let entity = spawn_grass_region(world, config);

add_grass_species(world, entity, GrassSpecies::meadow(), 0.6);
add_grass_species(world, entity, GrassSpecies::flowers(), 0.4);
```

Or set all at once:

```rust
set_grass_species(
    world,
    entity,
    vec![GrassSpecies::meadow(), GrassSpecies::tall(), GrassSpecies::flowers()],
    vec![0.5, 0.3, 0.2],
);
```

## Grass Region Builder

```rust
let region = GrassRegion::new()
    .with_config(config)
    .with_species(GrassSpecies::meadow(), 0.6)
    .with_species(GrassSpecies::flowers(), 0.4)
    .with_bounds(
        Vec3::new(-500.0, -10.0, -500.0),
        Vec3::new(500.0, 100.0, 500.0)
    )
    .with_terrain(terrain_config);

let entity = world.spawn_entities(GRASS_REGION, 1)[0];
world.set_grass_region(entity, region);
```

## Wind Control

```rust
// Set wind strength and frequency
set_grass_wind(world, entity, 1.5, 2.0);

// Set wind direction (XZ plane)
set_grass_wind_direction(world, entity, 1.0, 0.5);
```

## Grass Interaction

Entities can bend grass when walking through it:

```rust
// Spawn a dedicated interactor
let interactor = spawn_grass_interactor(world, 1.0, 1.0);

// Or attach to an existing entity (like the player)
attach_grass_interactor(world, player_entity, 1.0, 1.0);
```

### GrassInteractor Component

```rust
pub struct GrassInteractor {
    pub radius: f32,    // Area of effect
    pub strength: f32,  // Bending intensity
}
```

### Enable/Disable Interaction

```rust
enable_grass_interactors(world, grass_entity, false);
```

## Terrain Integration

Integrate grass with procedural terrain:

```rust
let terrain_config = TerrainConfig {
    height_scale: 50.0,
    noise_frequency: 0.01,
    ..Default::default()
};

let region = GrassRegion::new()
    .with_config(GrassConfig::default())
    .with_terrain(terrain_config);
```

## LOD System

Grass automatically reduces density at distance:

```rust
let config = GrassConfig {
    lod_distances: [20.0, 50.0, 100.0, 200.0],
    lod_density_scales: [1.0, 0.6, 0.3, 0.1],
    ..Default::default()
};
```

| LOD Level | Distance | Density |
|-----------|----------|---------|
| 0 | 0-20m | 100% |
| 1 | 20-50m | 60% |
| 2 | 50-100m | 30% |
| 3 | 100-200m | 10% |

## Controlling Grass

```rust
// Enable/disable
enable_grass(world, entity, false);

// Change density
set_grass_density(world, entity, 256);

// Toggle shadows
set_grass_shadows(world, entity, false, true);
```

## Custom Species

```rust
let wheat = GrassSpecies {
    name: "Wheat".to_string(),
    blade_width: 0.03,
    blade_height_min: 0.8,
    blade_height_max: 1.2,
    blade_curvature: 0.6,
    base_color: [0.76, 0.70, 0.50, 1.0],
    tip_color: [0.85, 0.78, 0.55, 1.0],
    sss_color: [1.0, 0.9, 0.7, 1.0],
    sss_intensity: 0.3,
    specular_power: 32.0,
    specular_strength: 0.2,
    density_scale: 0.8,
};

add_grass_species(world, entity, wheat, 1.0);
```

## Rendering Details

The grass system uses:

- **GPU Instancing**: Up to 500,000 grass blades
- **Compute Culling**: GPU frustum culling for visibility
- **Indirect Rendering**: Dynamic draw calls based on visibility
- **7-Vertex Blades**: Triangle strips for curved grass shapes
- **Bend Mapping**: 128x128 texture tracks interaction bending
- **Subsurface Scattering**: Light transmission through blades
- **Kajiya-Kay Specular**: Anisotropic hair-like specularity

## Performance Tips

| Setting | Performance Impact |
|---------|-------------------|
| `blades_per_patch` | High - reduce for better FPS |
| `stream_radius` | High - smaller = less grass |
| `lod_density_scales` | Medium - aggressive LOD helps |
| `cast_shadows` | Medium - disable if not needed |
| `interactors_enabled` | Low - compute shader cost |

## Example: Meadow Scene

```rust
fn setup_meadow(world: &mut World) {
    let config = GrassConfig::default()
        .with_density(96)
        .with_wind(0.8, 1.2)
        .with_stream_radius(150.0);

    let entity = spawn_grass_region(world, config);

    add_grass_species(world, entity, GrassSpecies::meadow(), 0.5);
    add_grass_species(world, entity, GrassSpecies::short(), 0.3);
    add_grass_species(world, entity, GrassSpecies::flowers(), 0.2);

    attach_grass_interactor(world, player, 1.2, 0.8);
}
```
