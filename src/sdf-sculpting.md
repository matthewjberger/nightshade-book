# SDF Sculpting

> **Live Demo:** [Voxels](https://matthewberger.dev/nightshade/voxels)

Nightshade includes a voxel-based Signed Distance Field (SDF) system for real-time terrain sculpting and procedural geometry. The system stores distance values in a sparse brick map organized as a multi-level clipmap, with edits applied as CSG operations on SDF primitives and re-evaluated on the GPU each frame.

## Enabling SDF

Add the `sdf_sculpt` feature:

```toml
nightshade = { git = "...", features = ["engine", "sdf_sculpt"] }
```

## How the SDF System Works

### Sparse Brick Map

The SDF volume is stored as a sparse grid of bricks. Each brick covers an 8-voxel cube (8x8x8 voxels) with 9x9x9 corner distance samples. The extra corners provide overlap for trilinear interpolation across brick boundaries.

Each `BrickData` stores:

- `distances: [f32; 729]` (9^3 corner samples) — signed distance values at each corner
- `material_ids: [u32; 512]` (8^3 voxel cells) — material index per voxel

A `BrickPointerGrid` maps 3D brick coordinates to atlas slots using a 128x128x128 virtual grid with toroidal wrapping. Unoccupied bricks store -1 (empty). The brick atlas is a 3D texture: 450x450x450 texels on native (360x360x360 on WASM), subdivided into 50x50x50 brick slots of 9 texels each, for a maximum of 125,000 bricks.

### Clipmap LOD

The SDF uses a clipmap with 10 levels of detail (configurable via `SdfWorld::with_config`). Each level doubles the voxel size from the previous:

| Level | Voxel Size | Brick Coverage | Grid Extent |
|-------|-----------|---------------|-------------|
| 0 | 0.125 | 1.0 | 128.0 |
| 1 | 0.25 | 2.0 | 256.0 |
| 2 | 0.5 | 4.0 | 512.0 |
| ... | ... | ... | ... |
| 9 | 64.0 | 512.0 | 65,536.0 |

The clipmap centers on the camera position. When the camera moves, bricks that scroll out of a level's grid are deallocated and returned to the free list. Newly scrolled-in bricks are marked dirty and re-evaluated. A BVH over all edit bounds accelerates this: only bricks whose expanded AABB intersects at least one edit's bounds are marked dirty.

### Brick Allocation

A `BrickAllocator` manages atlas slots with a free list. When a dirty brick is evaluated and contains surface data (has both positive and negative distance values), it gets allocated a slot. Bricks with no surface are left empty. When bricks scroll out of the grid, their slots are returned to the free list for reuse.

### GPU Dispatch

Each frame, `SdfWorld::update()` collects dirty bricks across all clipmap levels and creates `GpuBrickDispatch` records sorted by distance from the camera (closest bricks evaluated first). A per-frame budget (`max_updates_per_frame`, default 4000) limits how many bricks are re-evaluated.

## SDF World

```rust
pub struct SdfWorld {
    pub edits: Vec<SdfEdit>,
    pub clipmap: SdfClipmap,
    pub bvh: SdfEditBvh,
    pub dirty: bool,
    pub pending_gpu_dispatches: Vec<GpuBrickDispatch>,
    pub max_updates_per_frame: usize,
    pub terrain: TerrainConfig,
    pub smoothness_scale: f32,
}
```

Create with default settings (10 levels, base voxel size 0.125):

```rust
let sdf_world = SdfWorld::new();
```

Or with custom LOD configuration:

```rust
let sdf_world = SdfWorld::with_config(8, 0.25);
```

## SDF Primitives

Six primitive shapes are available, each with an analytic distance function evaluated in local space:

```rust
pub enum SdfPrimitive {
    Sphere { radius: f32 },
    Box { half_extents: Vec3 },
    Cylinder { radius: f32, half_height: f32 },
    Torus { major_radius: f32, minor_radius: f32 },
    Capsule { radius: f32, half_height: f32 },
    Plane { normal: Vec3, offset: f32 },
}
```

### Sphere

```rust
SdfPrimitive::Sphere { radius: 1.0 }
```

### Box

```rust
SdfPrimitive::Box {
    half_extents: Vec3::new(1.0, 2.0, 0.5)
}
```

### Cylinder

```rust
SdfPrimitive::Cylinder {
    radius: 1.0,
    half_height: 1.5
}
```

### Torus

```rust
SdfPrimitive::Torus {
    major_radius: 2.0,
    minor_radius: 0.5
}
```

### Capsule

```rust
SdfPrimitive::Capsule {
    radius: 0.5,
    half_height: 1.0
}
```

### Plane

An infinite half-space defined by a normal direction and offset:

```rust
SdfPrimitive::Plane {
    normal: Vec3::new(0.0, 1.0, 0.0),
    offset: 0.0,
}
```

## CSG Operations

```rust
pub enum CsgOperation {
    Union,
    Subtraction,
    Intersection,
    SmoothUnion { smoothness: f32 },
    SmoothSubtraction { smoothness: f32 },
    SmoothIntersection { smoothness: f32 },
}
```

The hard operations use min/max:

| Operation | Formula |
|-----------|---------|
| Union | `min(a, b)` |
| Subtraction | `max(a, -b)` |
| Intersection | `max(a, b)` |

The smooth variants use polynomial smooth min (`h = clamp(0.5 + 0.5*(b-a)/k, 0, 1)`) for organic blending between shapes. The `smoothness` parameter controls the blend radius — larger values create a wider transition zone.

Material blending during smooth operations uses a dither threshold: when the blend factor exceeds 0.5, the first material is used; otherwise the second.

## SDF Edits

An `SdfEdit` combines a primitive, a CSG operation, a 4x4 transform, and a material ID. The transform is stored alongside its precomputed inverse and uniform scale factor for efficient evaluation:

```rust
let edit = SdfEdit::union(
    SdfPrimitive::Sphere { radius: 2.0 },
    nalgebra_glm::translation(&Vec3::new(0.0, 5.0, 0.0)),
    material_id,
);

let edit = SdfEdit::smooth_subtraction(
    SdfPrimitive::Sphere { radius: 1.5 },
    nalgebra_glm::translation(&position),
    0,
    0.5,
);

let edit = SdfEdit::from_operation(
    SdfPrimitive::Box { half_extents: Vec3::new(1.0, 1.0, 1.0) },
    CsgOperation::SmoothUnion { smoothness: 0.3 },
    transform,
    material_id,
);
```

To evaluate an edit at a world-space point, the point is transformed into local space via the inverse matrix, the primitive's distance function is evaluated, and the result is scaled by the uniform scale factor.

## Adding and Modifying Edits

### Convenience Methods

```rust
world.resources.sdf_world.add_sphere(center, 2.0, material_id);
world.resources.sdf_world.add_box(center, half_extents, material_id);
world.resources.sdf_world.add_ground_plane(0.0, material_id);
world.resources.sdf_world.subtract_sphere(center, 1.5, 0.3);
```

### Direct Edit API

```rust
let index = world.resources.sdf_world.add_edit(edit);
```

Each `add_edit` call pushes an undo action onto the undo stack and clears the redo stack. Use `add_edit_no_undo` to bypass undo tracking (useful for procedural generation).

### Modifying Existing Edits

```rust
world.resources.sdf_world.modify_edit(index, |edit| {
    edit.set_transform(new_transform);
});
```

This marks both the old and new bounds as dirty. Use `modify_edit_no_undo` for interactive sculpting where intermediate states shouldn't be individually undoable.

### Removing Edits

```rust
world.resources.sdf_world.remove_edit(index);
```

## Undo/Redo

The SDF world maintains undo and redo stacks (default max 100 entries):

```rust
if world.resources.sdf_world.can_undo() {
    world.resources.sdf_world.undo();
}

if world.resources.sdf_world.can_redo() {
    world.resources.sdf_world.redo();
}

world.resources.sdf_world.clear_undo_history();
```

Three action types are tracked: `AddEdit`, `RemoveEdit`, and `ModifyEdit`. Each undo/redo operation re-marks the affected bounds as dirty and triggers re-evaluation.

## SDF Materials

```rust
pub struct SdfMaterial {
    pub base_color: Vec3,
    pub roughness: f32,
    pub metallic: f32,
    pub emissive: Vec3,
}
```

Materials are managed through the `SdfMaterialRegistry` resource. A default material (gray, roughness 0.5, non-metallic) is always present at index 0:

```rust
let rock = world.resources.sdf_material_registry.add_material(
    SdfMaterial::new(Vec3::new(0.5, 0.45, 0.4))
        .with_roughness(0.9)
);

let gold = world.resources.sdf_material_registry.add_material(
    SdfMaterial::new(Vec3::new(1.0, 0.84, 0.0))
        .with_roughness(0.3)
        .with_metallic(1.0)
);

let lava = world.resources.sdf_material_registry.add_material(
    SdfMaterial::new(Vec3::new(0.8, 0.2, 0.0))
        .with_roughness(0.7)
        .with_emissive(Vec3::new(5.0, 1.0, 0.0))
);
```

## SDF Raycast

The SDF world provides CPU-side sphere tracing (up to 512 steps) for picking and collision:

```rust
let origin = ray.origin;
let direction = ray.direction;
let max_distance = 100.0;

if let Some(hit_point) = world.resources.sdf_world.raycast(origin, direction, max_distance) {
    let normal = world.resources.sdf_world.evaluate_normal_at(hit_point);
}
```

The raycast marches along the ray, stepping by the evaluated distance at each point (with a minimum step of half the base voxel size to avoid getting stuck inside surfaces). A hit is detected when the absolute distance falls below 0.1 times the base voxel size.

Normal estimation uses central differences: the gradient of the distance field is computed by evaluating at six points offset by half the base voxel size along each axis.

## Terrain Generation

The SDF system includes built-in fBm (fractal Brownian motion) terrain with derivative-based dampening and domain rotation between octaves:

```rust
pub struct TerrainConfig {
    pub enabled: bool,
    pub base_height: f32,
    pub material_id: u32,
    pub seed: u32,
    pub frequency: f32,
    pub amplitude: f32,
    pub octaves: u32,
    pub lacunarity: f32,
    pub gain: f32,
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `false` | Whether terrain is active |
| `base_height` | `0.0` | Vertical offset of the terrain surface |
| `material_id` | `0` | SDF material index for the terrain |
| `seed` | `0` | Hash seed for noise generation |
| `frequency` | `0.01` | Base noise frequency (lower = broader features) |
| `amplitude` | `30.0` | Maximum height variation |
| `octaves` | `11` | Number of noise layers |
| `lacunarity` | `2.0` | Frequency multiplier per octave |
| `gain` | `0.5` | Amplitude multiplier per octave |

Enable terrain:

```rust
world.resources.sdf_world.set_terrain_config(TerrainConfig {
    enabled: true,
    base_height: -5.0,
    frequency: 0.02,
    amplitude: 20.0,
    octaves: 8,
    seed: 42,
    ..Default::default()
});
```

The terrain noise uses quintic smoothstep interpolation (`6t^5 - 15t^4 + 10t^3`) with analytic derivatives for gradient computation. Each octave applies a 2D rotation matrix (`[1.6, -1.2; 1.2, 1.6]`) to the sample coordinates before the next octave, which reduces directional artifacts. The derivative accumulator dampens amplitude in areas of high gradient, producing naturally eroded ridgelines.

Terrain is evaluated only in the first 4 clipmap levels (highest detail) to avoid excessive computation at coarse LODs.

Query terrain height at a world XZ position:

```rust
let height = world.resources.sdf_world.terrain.height_at(x, z);
```

## Sculpting Tool Example

```rust
struct SculptTool {
    brush_size: f32,
    material_id: u32,
    operation: CsgOperation,
}

fn run_systems(&mut self, world: &mut World) {
    if world.resources.input.mouse.left_pressed {
        let screen_pos = world.resources.input.mouse.position;
        let ray = PickingRay::from_screen_position(world, screen_pos);

        if let Some(ray) = ray {
            if let Some(hit) = world.resources.sdf_world.raycast(
                ray.origin,
                ray.direction,
                100.0,
            ) {
                let normal = world.resources.sdf_world.evaluate_normal_at(hit);

                let sculpt_pos = match self.tool.operation {
                    CsgOperation::Union | CsgOperation::SmoothUnion { .. } => {
                        hit + normal * self.tool.brush_size * 0.5
                    }
                    CsgOperation::Subtraction | CsgOperation::SmoothSubtraction { .. } => {
                        hit - normal * self.tool.brush_size * 0.5
                    }
                    _ => hit,
                };

                let edit = SdfEdit::from_operation(
                    SdfPrimitive::Sphere { radius: self.tool.brush_size },
                    self.tool.operation,
                    nalgebra_glm::translation(&sculpt_pos),
                    self.tool.material_id,
                );
                world.resources.sdf_world.add_edit(edit);
            }
        }
    }
}
```

## Evaluating the Distance Field

Query the combined SDF (terrain + all edits) at any world-space point:

```rust
let distance = world.resources.sdf_world.evaluate_at(point);

let distance_lod = world.resources.sdf_world.evaluate_at_lod(point, 6);
```

The `evaluate_at_lod` variant limits the terrain noise octaves for cheaper evaluation at coarse LODs.

## Updating the SDF World

Call `update()` each frame with the camera position to recenter the clipmap, rebuild the BVH if needed, and generate GPU brick dispatches:

```rust
fn run_systems(&mut self, world: &mut World) {
    let camera_pos = get_active_camera_position(world);
    world.resources.sdf_world.update(camera_pos);
}
```

## Querying SDF State

```rust
let edit_count = world.resources.sdf_world.edit_count();
let allocated_bricks = world.resources.sdf_world.allocated_brick_count();
let max_bricks = world.resources.sdf_world.max_brick_count();
let level_count = world.resources.sdf_world.level_count();
let voxel_sizes = world.resources.sdf_world.voxel_sizes();
let base_voxel_size = world.resources.sdf_world.base_voxel_size();
```
