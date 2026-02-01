# Terrain

Nightshade supports procedural terrain generation with LOD and tessellation.

## Enabling Terrain

Terrain requires the `terrain` feature:

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "terrain"] }
```

## Basic Terrain

```rust
use nightshade::ecs::terrain::*;

fn initialize(&mut self, world: &mut World) {
    let config = TerrainConfig::default();
    spawn_terrain(world, config, Vec3::zeros());
}
```

## Terrain Configuration

```rust
pub struct TerrainConfig {
    pub chunk_size: f32,         // Size of each terrain chunk
    pub view_distance: u32,      // How many chunks to render
    pub patches_per_chunk: u32,  // Subdivision level
    pub max_tessellation: u32,   // Maximum tessellation level
    pub min_tessellation: u32,   // Minimum tessellation level
    pub height_scale: f32,       // Vertical scale
    pub noise_frequency: f32,    // Noise detail frequency
    pub noise_octaves: u32,      // Noise layers
    pub lod_distances: [f32; 5], // LOD transition distances
}

impl Default for TerrainConfig {
    fn default() -> Self {
        Self {
            chunk_size: 64.0,
            view_distance: 8,
            patches_per_chunk: 8,
            max_tessellation: 16,
            min_tessellation: 1,
            height_scale: 50.0,
            noise_frequency: 0.01,
            noise_octaves: 6,
            lod_distances: [50.0, 150.0, 400.0, 800.0, 1600.0],
        }
    }
}
```

## Terrain with Custom Material

```rust
let snow_material = Material {
    base_color: [0.95, 0.97, 1.0, 1.0],
    roughness: 0.85,
    metallic: 0.0,
    ..Default::default()
};

spawn_terrain_with_material(world, config, Vec3::zeros(), snow_material);
```

## Sampling Terrain Height

Get the terrain height at any position:

```rust
fn get_ground_height(config: &TerrainConfig, x: f32, z: f32) -> f32 {
    sample_terrain_height(x, z, config)
}

// Place object on terrain
fn place_on_terrain(world: &mut World, entity: Entity, x: f32, z: f32, config: &TerrainConfig) {
    let y = sample_terrain_height(x, z, config);

    if let Some(transform) = world.get_local_transform_mut(entity) {
        transform.translation = Vec3::new(x, y, z);
    }
}
```

## Terrain Physics

Add collision to terrain:

```rust
fn add_terrain_collision(world: &mut World, config: &TerrainConfig) {
    // Generate heightfield data
    let resolution = 64;
    let mut heights = Vec::new();

    for z in 0..resolution {
        let mut row = Vec::new();
        for x in 0..resolution {
            let world_x = (x as f32 / resolution as f32) * config.chunk_size;
            let world_z = (z as f32 / resolution as f32) * config.chunk_size;
            row.push(sample_terrain_height(world_x, world_z, config));
        }
        heights.push(row);
    }

    // Create heightfield collider
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | COLLIDER_COMPONENT,
        1
    )[0];

    world.set_collider(entity, ColliderComponent {
        shape: ColliderShape::Heightfield {
            heights,
            scale: Vec3::new(config.chunk_size, 1.0, config.chunk_size),
        },
        handle: None,
    });
}
```

## Custom Terrain Pass

For advanced terrain rendering:

```rust
impl State for TerrainDemo {
    fn configure_render_graph(
        &mut self,
        graph: &mut RenderGraph<World>,
        device: &wgpu::Device,
        surface_format: wgpu::TextureFormat,
        resources: RenderResources,
    ) {
        let terrain_pass = TerrainPass::new(
            device,
            self.config.clone(),
            wgpu::TextureFormat::Rgba16Float,
        );

        graph
            .pass(Box::new(terrain_pass))
            .slot("color", resources.scene_color)
            .slot("depth", resources.depth);
    }
}
```

## Chunk Management

Terrain chunks load/unload based on camera position:

```rust
pub struct ChunkManager {
    loaded_chunks: HashMap<(i32, i32), Entity>,
    config: TerrainConfig,
}

impl ChunkManager {
    fn update(&mut self, world: &mut World, camera_pos: Vec3) {
        let chunk_x = (camera_pos.x / self.config.chunk_size) as i32;
        let chunk_z = (camera_pos.z / self.config.chunk_size) as i32;

        // Load nearby chunks
        for dz in -self.config.view_distance as i32..=self.config.view_distance as i32 {
            for dx in -self.config.view_distance as i32..=self.config.view_distance as i32 {
                let key = (chunk_x + dx, chunk_z + dz);
                if !self.loaded_chunks.contains_key(&key) {
                    self.load_chunk(world, key);
                }
            }
        }

        // Unload distant chunks
        self.loaded_chunks.retain(|&(cx, cz), entity| {
            let dist = ((cx - chunk_x).abs().max((cz - chunk_z).abs())) as u32;
            if dist > self.config.view_distance + 1 {
                world.despawn(*entity);
                false
            } else {
                true
            }
        });
    }
}
```

## LOD System

Terrain automatically adjusts detail based on distance:

```rust
// LOD levels are determined by distance from camera
// lod_distances[0] = highest detail
// lod_distances[4] = lowest detail

let config = TerrainConfig {
    lod_distances: [50.0, 150.0, 400.0, 800.0, 1600.0],
    max_tessellation: 16,
    min_tessellation: 1,
    ..Default::default()
};
```

## Wireframe Toggle

Debug terrain with wireframe:

```rust
use std::sync::atomic::{AtomicBool, Ordering};

static WIREFRAME: AtomicBool = AtomicBool::new(false);

fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: KeyState) {
    if state == KeyState::Pressed && key == KeyCode::KeyT {
        let current = WIREFRAME.load(Ordering::Relaxed);
        WIREFRAME.store(!current, Ordering::Relaxed);
    }
}
```
