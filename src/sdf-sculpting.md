# SDF Sculpting

Nightshade includes a voxel-based Signed Distance Field (SDF) system for real-time terrain sculpting and procedural geometry.

## SDF World

The SDF system uses a sparse brick map for efficient storage:

```rust
pub struct SdfWorld {
    pub brick_map: SparseBrickMap,
    pub materials: Vec<SdfMaterial>,
    pub clipmap: SdfClipmap,
}
```

## Enabling SDF

Add the `sdf_sculpt` feature:

```toml
nightshade = { git = "...", features = ["engine", "sdf_sculpt"] }
```

## SDF Operations

### Union

Add material:

```rust
sdf_sculpt(
    world,
    position,
    SdfPrimitive::Sphere { radius: 2.0 },
    SdfOperation::Union,
    material_index
);
```

### Subtraction

Remove material (carve):

```rust
sdf_sculpt(
    world,
    position,
    SdfPrimitive::Sphere { radius: 1.5 },
    SdfOperation::Subtraction,
    0
);
```

### Intersection

Keep only overlapping regions:

```rust
sdf_sculpt(
    world,
    position,
    SdfPrimitive::Box { half_extents: Vec3::new(2.0, 2.0, 2.0) },
    SdfOperation::Intersection,
    material_index
);
```

### Smooth Operations

Blend operations for organic shapes:

```rust
sdf_sculpt(
    world,
    position,
    SdfPrimitive::Sphere { radius: 1.0 },
    SdfOperation::SmoothUnion { smoothness: 0.5 },
    material_index
);

sdf_sculpt(
    world,
    position,
    SdfPrimitive::Sphere { radius: 0.8 },
    SdfOperation::SmoothSubtraction { smoothness: 0.3 },
    0
);
```

## SDF Primitives

```rust
pub enum SdfPrimitive {
    Sphere { radius: f32 },
    Box { half_extents: Vec3 },
    Capsule { radius: f32, height: f32 },
    Cylinder { radius: f32, height: f32 },
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

### Capsule

```rust
SdfPrimitive::Capsule {
    radius: 0.5,
    height: 2.0
}
```

### Cylinder

```rust
SdfPrimitive::Cylinder {
    radius: 1.0,
    height: 3.0
}
```

## SDF Materials

```rust
pub struct SdfMaterial {
    pub color: Vec3,
    pub roughness: f32,
    pub metallic: f32,
}

world.resources.sdf_world.materials.push(SdfMaterial {
    color: Vec3::new(0.5, 0.3, 0.2),
    roughness: 0.8,
    metallic: 0.0,
});
```

## Sculpting Tool Example

```rust
struct SculptTool {
    brush_size: f32,
    material: usize,
    operation: SdfOperation,
}

fn run_systems(&mut self, world: &mut World) {
    let input = &world.resources.input;

    if input.mouse_buttons.left {
        let ray = screen_to_ray(world, input.mouse_position.x, input.mouse_position.y);

        if let Some(hit) = sdf_raycast(world, ray) {
            let sculpt_pos = match self.tool.operation {
                SdfOperation::Union => hit.point + hit.normal * self.tool.brush_size * 0.5,
                SdfOperation::Subtraction => hit.point - hit.normal * self.tool.brush_size * 0.5,
                _ => hit.point,
            };

            sdf_sculpt(
                world,
                sculpt_pos,
                SdfPrimitive::Sphere { radius: self.tool.brush_size },
                self.tool.operation.clone(),
                self.tool.material
            );
        }
    }
}
```

## Procedural Generation

### Terrain

```rust
fn generate_sdf_terrain(world: &mut World, size: f32, height: f32) {
    let noise = FastNoise::new();
    noise.set_noise_type(NoiseType::Perlin);
    noise.set_frequency(0.02);

    for x in (-size as i32)..(size as i32) {
        for z in (-size as i32)..(size as i32) {
            let fx = x as f32;
            let fz = z as f32;
            let h = noise.get_noise(fx, fz) * height;

            sdf_sculpt(
                world,
                Vec3::new(fx, h * 0.5, fz),
                SdfPrimitive::Box {
                    half_extents: Vec3::new(0.5, h.abs() * 0.5 + 0.1, 0.5)
                },
                SdfOperation::Union,
                0
            );
        }
    }
}
```

### Cave System

```rust
fn carve_cave(world: &mut World, path: &[Vec3], radius: f32) {
    for window in path.windows(2) {
        let start = window[0];
        let end = window[1];
        let mid = (start + end) * 0.5;

        sdf_sculpt(
            world,
            start,
            SdfPrimitive::Sphere { radius },
            SdfOperation::SmoothSubtraction { smoothness: 0.5 },
            0
        );

        sdf_sculpt(
            world,
            mid,
            SdfPrimitive::Sphere { radius: radius * 1.2 },
            SdfOperation::SmoothSubtraction { smoothness: 0.5 },
            0
        );
    }

    sdf_sculpt(
        world,
        *path.last().unwrap(),
        SdfPrimitive::Sphere { radius },
        SdfOperation::SmoothSubtraction { smoothness: 0.5 },
        0
    );
}
```

## SDF Raycast

Query the SDF for intersections:

```rust
pub struct SdfHit {
    pub point: Vec3,
    pub normal: Vec3,
    pub material: usize,
}

if let Some(hit) = sdf_raycast(world, ray) {
    spawn_particle_effect(world, hit.point);
}
```

## Clipmap LOD

The SDF uses a clipmap for level-of-detail:

```rust
pub struct SdfClipmap {
    pub center: Vec3,
    pub levels: u32,
    pub base_resolution: u32,
}

world.resources.sdf_world.clipmap.center = camera_position;
```

## Performance Considerations

- Use smooth operations sparingly (more expensive)
- Batch multiple sculpt operations
- Adjust clipmap resolution for performance vs quality
- SDF rendering uses a dedicated compute shader pass
