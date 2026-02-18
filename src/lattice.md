# Lattice Deformation

> **Live Demo:** [Lattice](https://matthewberger.dev/nightshade/lattice)

Lattice deformation (Free-Form Deformation / FFD) deforms meshes by manipulating a grid of control points surrounding the mesh. Vertices are displaced based on trilinear interpolation of the nearest control point displacements, producing smooth spatial warping effects like bending, twisting, tapering, and bulging.

## Enabling Lattice

Add the `lattice` feature:

```toml
nightshade = { git = "...", features = ["engine", "lattice"] }
```

## How Lattice Deformation Works

The Lattice component defines a 3D grid of control points within an axis-aligned bounding box. Each control point has a base position (computed from the grid dimensions and bounds) and a displacement vector. When a mesh vertex needs to be deformed:

1. The vertex's world-space position is converted to UVW coordinates (0-1 range within the lattice bounds)
2. The 8 surrounding control points are looked up from the grid indices
3. The displacement is computed by trilinear interpolation of those 8 control point displacements
4. Vertices outside the lattice bounds are either unaffected (falloff = 0) or smoothly blended based on the falloff distance

The deformation is applied as a morph target on the GPU. The system converts world-space displacements back to local space via the entity's inverse model matrix, creates a `MorphTarget` with per-vertex position offsets, and updates the mesh cache.

## Lattice Component

```rust
pub struct Lattice {
    pub base_points: Vec<Vec3>,
    pub displacements: Vec<Vec3>,
    pub dimensions: [usize; 3],
    pub bounds_min: Vec3,
    pub bounds_max: Vec3,
    pub falloff: f32,
    pub version: u32,
}
```

| Field | Description |
|-------|-------------|
| `base_points` | Undeformed control point positions, computed from bounds and dimensions |
| `displacements` | Per-control-point displacement vectors (initially zero) |
| `dimensions` | Grid resolution as `[x, y, z]` |
| `bounds_min` | Lower corner of the lattice bounding box |
| `bounds_max` | Upper corner of the lattice bounding box |
| `falloff` | Distance beyond lattice bounds where deformation fades to zero (0 = hard cutoff) |
| `version` | Auto-incremented when displacements change, used for dirty detection |

## Creating a Lattice

```rust
use nightshade::ecs::lattice::systems::create_lattice_entity;

let lattice_entity = create_lattice_entity(
    world,
    Vec3::new(-2.0, -2.0, -2.0),
    Vec3::new(2.0, 2.0, 2.0),
    [4, 4, 4],
);
```

This spawns an entity with the `LATTICE` component. The constructor computes base point positions by subdividing the bounding box evenly according to the dimensions. For a 4x4x4 lattice, this creates 64 control points.

With falloff for smooth blending beyond the bounds:

```rust
let lattice = Lattice::new(bounds_min, bounds_max, [4, 4, 4])
    .with_falloff(1.0);
world.set_lattice(lattice_entity, lattice);
```

## Registering Influenced Meshes

```rust
use nightshade::ecs::lattice::systems::register_entity_for_lattice_deformation;

register_entity_for_lattice_deformation(world, mesh_entity, lattice_entity);
```

This adds `LATTICE_INFLUENCED` and `MORPH_WEIGHTS` components to the mesh entity. The `LatticeInfluenced` component stores the lattice entity reference, the last known lattice version, and the last entity position — used to skip re-evaluation when nothing has changed.

## Manipulating Control Points

Displacements are set per-grid-coordinate:

```rust
if let Some(lattice) = world.get_lattice_mut(lattice_entity) {
    lattice.set_displacement(1, 2, 1, Vec3::new(0.0, 0.5, 0.0));
}
```

The `set_displacement` method automatically increments the version counter, which triggers re-evaluation on influenced meshes.

To read the current deformed position (base + displacement):

```rust
let point = lattice.get_point(1, 2, 1);
```

To get the displacement alone:

```rust
let displacement = lattice.get_displacement(1, 2, 1);
```

Reset all displacements to zero:

```rust
lattice.reset_displacements();
```

## Indexing

Control point indices follow x-major ordering: `index = z * (nx * ny) + y * nx + x`. The `get_index` method computes this:

```rust
let index = lattice.get_index(x, y, z);
```

## Deformation System

Call the lattice deformation system each frame to apply updated displacements:

```rust
fn run_systems(&mut self, world: &mut World) {
    lattice_deformation_system(world);
}
```

The system queries all entities with `LATTICE_INFLUENCED | RENDER_MESH | MORPH_WEIGHTS | GLOBAL_TRANSFORM`. For each entity, it checks whether the lattice version or entity position has changed since the last update. If so, it:

1. Reads the mesh vertices from the mesh cache
2. Transforms each vertex position to world space via the entity's global transform
3. Calls `lattice.sample(world_pos)` to get the world-space displacement
4. Converts the displacement back to local space via the inverse model matrix
5. Creates a `MorphTarget` with the per-vertex local-space displacements
6. Updates the mesh cache and marks it dirty for GPU re-upload

## Trilinear Interpolation

The `sample()` method converts a world position to UVW coordinates within the lattice bounds, finds the 8 surrounding control points, and interpolates their displacements:

```
uvw = (world_pos - bounds_min) / (bounds_max - bounds_min)

fx = uvw.x * (nx - 1)    // fractional grid coordinate
x0 = floor(fx)           // lower grid index
tx = fx - x0             // interpolation weight

// Interpolate 8 corners along X, then Y, then Z
d00 = lerp(d000, d100, tx)
d10 = lerp(d010, d110, tx)
d01 = lerp(d001, d101, tx)
d11 = lerp(d011, d111, tx)
d0  = lerp(d00, d10, ty)
d1  = lerp(d01, d11, ty)
result = lerp(d0, d1, tz)
```

For points outside the lattice bounds, the UVW coordinates are clamped to [0, 1] and the displacement is attenuated by the falloff factor. The falloff is computed as `max(0, 1 - normalized_distance / falloff)` where `normalized_distance` is the distance from the point to the clamped position, scaled by the average lattice dimension.

## Common Deformation Effects

### Bend

```rust
fn bend_lattice(world: &mut World, lattice_entity: Entity, amount: f32) {
    if let Some(lattice) = world.get_lattice_mut(lattice_entity) {
        let [nx, ny, nz] = lattice.dimensions;

        for z in 0..nz {
            for y in 0..ny {
                for x in 0..nx {
                    let t = x as f32 / (nx - 1) as f32;
                    let bend = (t * std::f32::consts::PI).sin() * amount;
                    lattice.set_displacement(x, y, z, Vec3::new(0.0, bend, 0.0));
                }
            }
        }
    }
}
```

### Twist

```rust
fn twist_lattice(world: &mut World, lattice_entity: Entity, angle: f32) {
    if let Some(lattice) = world.get_lattice_mut(lattice_entity) {
        let [nx, ny, nz] = lattice.dimensions;
        let bounds_min = lattice.bounds_min;
        let bounds_max = lattice.bounds_max;
        let height = bounds_max.y - bounds_min.y;

        for z in 0..nz {
            for y in 0..ny {
                for x in 0..nx {
                    let base = lattice.base_points[lattice.get_index(x, y, z)];
                    let t = (base.y - bounds_min.y) / height;
                    let twist_angle = t * angle;

                    let new_x = base.x * twist_angle.cos() - base.z * twist_angle.sin();
                    let new_z = base.x * twist_angle.sin() + base.z * twist_angle.cos();

                    lattice.set_displacement(
                        x, y, z,
                        Vec3::new(new_x - base.x, 0.0, new_z - base.z),
                    );
                }
            }
        }
    }
}
```

### Taper

```rust
fn taper_lattice(world: &mut World, lattice_entity: Entity, top_scale: f32) {
    if let Some(lattice) = world.get_lattice_mut(lattice_entity) {
        let [nx, ny, nz] = lattice.dimensions;
        let bounds_min = lattice.bounds_min;
        let bounds_max = lattice.bounds_max;
        let center_x = (bounds_min.x + bounds_max.x) * 0.5;
        let center_z = (bounds_min.z + bounds_max.z) * 0.5;
        let height = bounds_max.y - bounds_min.y;

        for z in 0..nz {
            for y in 0..ny {
                for x in 0..nx {
                    let base = lattice.base_points[lattice.get_index(x, y, z)];
                    let t = (base.y - bounds_min.y) / height;
                    let scale = 1.0 + (top_scale - 1.0) * t;

                    let new_x = center_x + (base.x - center_x) * scale;
                    let new_z = center_z + (base.z - center_z) * scale;

                    lattice.set_displacement(
                        x, y, z,
                        Vec3::new(new_x - base.x, 0.0, new_z - base.z),
                    );
                }
            }
        }
    }
}
```

### Animated Wave

```rust
fn wave_lattice(world: &mut World, lattice_entity: Entity, amplitude: f32, frequency: f32, time: f32) {
    if let Some(lattice) = world.get_lattice_mut(lattice_entity) {
        let [nx, ny, nz] = lattice.dimensions;

        for z in 0..nz {
            for y in 0..ny {
                for x in 0..nx {
                    let base = lattice.base_points[lattice.get_index(x, y, z)];
                    let wave = (base.x * frequency + time).sin() * amplitude;
                    lattice.set_displacement(x, y, z, Vec3::new(0.0, wave, 0.0));
                }
            }
        }
    }
}
```
