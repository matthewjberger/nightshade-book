# Terrain

> **Live Demo:** [Terrain](https://matthewberger.dev/nightshade/terrain)

Nightshade supports procedural terrain generation with noise-based heightmaps, physics collision, and PBR materials.

## How Terrain Works

Terrain in Nightshade is a regular mesh generated from a noise-based heightmap. The engine creates a grid of vertices at configurable resolution, samples a noise function at each vertex to determine its height, computes per-vertex normals from the surrounding triangle faces, and registers the result in the mesh cache. The terrain entity is then rendered through the standard mesh pipeline with full PBR material support, shadow casting, and physics collision.

### Mesh Generation Pipeline

The `generate_terrain_mesh` function builds the terrain in four steps:

1. **Vertex generation** - Creates a grid of `resolution_x * resolution_z` vertices. The grid is centered at the origin, with X coordinates ranging from `-width/2` to `+width/2` and Z from `-depth/2` to `+depth/2`. Each vertex's Y coordinate is sampled from the noise function and multiplied by `height_scale`. UV coordinates are computed as the normalized grid position multiplied by `uv_scale`, controlling how textures tile across the surface.

2. **Index generation** - Creates two triangles per grid cell with counter-clockwise winding order. For a cell at grid position `(x, z)`, the two triangles use indices `[top_left, bottom_left, top_right]` and `[top_right, bottom_left, bottom_right]`. Total indices: `(resolution_x - 1) * (resolution_z - 1) * 6`.

3. **Normal calculation** - Per-vertex normals are accumulated from the face normals of all adjacent triangles. Each face normal is computed from the cross product of two triangle edges. After accumulation, normals are normalized to unit length.

4. **Bounding volume** - An OBB (Oriented Bounding Box) is computed from the min/max heights, used for frustum culling during rendering.

### Noise Sampling

The terrain uses the `noise` crate with four algorithms:

| NoiseType | Algorithm | Character |
|-----------|-----------|-----------|
| `Perlin` | Fbm<Perlin> | Smooth rolling hills |
| `Simplex` | Fbm<OpenSimplex> | Similar to Perlin, fewer directional artifacts |
| `Billow` | Billow<Perlin> | Rounded, cloud-like features |
| `RidgedMulti` | RidgedMulti<Perlin> | Sharp ridges, good for mountains |

All types are wrapped in multi-octave fractional Brownian motion (fBm), which layers multiple noise samples at increasing frequency and decreasing amplitude. The `octaves` parameter controls how many layers are added: more octaves add finer detail but cost more to evaluate. `Lacunarity` is the frequency multiplier per octave (default 2.0), and `persistence` is the amplitude multiplier per octave (default 0.5).

### Physics Integration

`spawn_terrain` automatically creates a static rigid body with a heightfield collider. The heightfield shape stores a 2D grid of height values with a scale factor. The height data is transposed from mesh ordering (`z * resolution_x + x`) to heightfield ordering (`z + resolution_z * x`) because Rapier expects column-major layout. The collider has high friction (0.9), no restitution, and all collision groups enabled.

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
    let config = TerrainConfig::new(100.0, 100.0, 64, 64)
        .with_height_scale(10.0)
        .with_frequency(0.02);

    spawn_terrain(world, &config, Vec3::zeros());
}
```

## Terrain Configuration

```rust
pub struct TerrainConfig {
    pub width: f32,           // Terrain width in world units
    pub depth: f32,           // Terrain depth in world units
    pub resolution_x: u32,   // Vertex count along X
    pub resolution_z: u32,   // Vertex count along Z
    pub height_scale: f32,   // Height multiplier for noise values
    pub noise: NoiseConfig,  // Noise generation settings
    pub uv_scale: [f32; 2],  // Texture tiling [u, v]
}
```

### Builder Methods

```rust
let config = TerrainConfig::new(200.0, 200.0, 128, 128)
    .with_height_scale(25.0)
    .with_noise(NoiseConfig {
        noise_type: NoiseType::RidgedMulti,
        frequency: 0.01,
        octaves: 6,
        lacunarity: 2.0,
        persistence: 0.5,
        seed: 42,
    })
    .with_uv_scale([8.0, 8.0]);
```

## Terrain with Material

```rust
let material = Material {
    base_color: [0.3, 0.5, 0.2, 1.0],
    roughness: 0.85,
    metallic: 0.0,
    ..Default::default()
};

spawn_terrain_with_material(world, &config, Vec3::zeros(), material);
```

## Sampling Terrain Height

Query the terrain height at any world position without mesh lookup. This samples the noise function directly:

```rust
let height = sample_terrain_height(x, z, &config);
```

Use this to place objects on the terrain surface:

```rust
fn place_on_terrain(world: &mut World, entity: Entity, x: f32, z: f32, config: &TerrainConfig) {
    let y = sample_terrain_height(x, z, config);

    if let Some(transform) = world.get_local_transform_mut(entity) {
        transform.translation = Vec3::new(x, y, z);
    }
}
```

## Rendering

Terrain is rendered through the standard mesh pipeline (`MeshPass`). It uses the same PBR shader as all other meshes, which means terrain automatically gets:

- Directional and point light shadows (cascaded shadow maps)
- Screen-space ambient occlusion (SSAO)
- Screen-space global illumination (SSGI)
- Image-based lighting (IBL)
- Normal mapping if a normal texture is provided in the material
- Full Cook-Torrance BRDF with metallic-roughness workflow

The mesh is uploaded to GPU vertex and index buffers once at creation time. During rendering, the MeshPass performs frustum culling using the terrain's bounding volume, then draws it with the assigned material's textures bound.

## Entity Components

`spawn_terrain` creates an entity with these components:

| Component | Purpose |
|-----------|---------|
| `NAME` | "Terrain" |
| `LOCAL_TRANSFORM` | Position in world |
| `GLOBAL_TRANSFORM` | Computed world matrix |
| `LOCAL_TRANSFORM_DIRTY` | Triggers transform update |
| `RENDER_MESH` | References cached mesh |
| `MATERIAL_REF` | PBR material |
| `BOUNDING_VOLUME` | OBB for frustum culling |
| `CASTS_SHADOW` | Enabled by default |
| `RIGID_BODY` | Static physics body |
| `COLLIDER` | HeightField shape |
| `VISIBILITY` | Visible by default |
