# Lines Rendering

Debug line drawing for visualization, gizmos, and wireframes.

## Basic Line Drawing

```rust
use nightshade::ecs::lines::*;

fn initialize(&mut self, world: &mut World) {
    let entity = world.spawn_entities(LINES_COMPONENT, 1)[0];

    let mut lines = Lines::new();
    lines.add(
        Vec3::new(0.0, 0.0, 0.0),
        Vec3::new(1.0, 1.0, 1.0),
        Vec4::new(1.0, 0.0, 0.0, 1.0),
    );

    world.set_lines(entity, lines);
}
```

## Lines Component

```rust
pub struct Lines {
    pub lines: Vec<Line>,
}

pub struct Line {
    pub start: Vec3,
    pub end: Vec3,
    pub color: Vec4,
}
```

## Adding Lines

```rust
let mut lines = Lines::new();

// Single line
lines.add(start, end, color);

// Multiple lines
lines.add(Vec3::zeros(), Vec3::x(), Vec4::new(1.0, 0.0, 0.0, 1.0));
lines.add(Vec3::zeros(), Vec3::y(), Vec4::new(0.0, 1.0, 0.0, 1.0));
lines.add(Vec3::zeros(), Vec3::z(), Vec4::new(0.0, 0.0, 1.0, 1.0));
```

## Drawing Shapes

### Coordinate Axes

```rust
fn draw_axes(lines: &mut Lines, origin: Vec3, scale: f32) {
    let red = Vec4::new(1.0, 0.0, 0.0, 1.0);
    let green = Vec4::new(0.0, 1.0, 0.0, 1.0);
    let blue = Vec4::new(0.0, 0.0, 1.0, 1.0);

    lines.add(origin, origin + Vec3::x() * scale, red);
    lines.add(origin, origin + Vec3::y() * scale, green);
    lines.add(origin, origin + Vec3::z() * scale, blue);
}
```

### Wireframe Box

```rust
fn draw_box(lines: &mut Lines, center: Vec3, half_extents: Vec3, color: Vec4) {
    let min = center - half_extents;
    let max = center + half_extents;

    // Bottom face
    lines.add(Vec3::new(min.x, min.y, min.z), Vec3::new(max.x, min.y, min.z), color);
    lines.add(Vec3::new(max.x, min.y, min.z), Vec3::new(max.x, min.y, max.z), color);
    lines.add(Vec3::new(max.x, min.y, max.z), Vec3::new(min.x, min.y, max.z), color);
    lines.add(Vec3::new(min.x, min.y, max.z), Vec3::new(min.x, min.y, min.z), color);

    // Top face
    lines.add(Vec3::new(min.x, max.y, min.z), Vec3::new(max.x, max.y, min.z), color);
    lines.add(Vec3::new(max.x, max.y, min.z), Vec3::new(max.x, max.y, max.z), color);
    lines.add(Vec3::new(max.x, max.y, max.z), Vec3::new(min.x, max.y, max.z), color);
    lines.add(Vec3::new(min.x, max.y, max.z), Vec3::new(min.x, max.y, min.z), color);

    // Vertical edges
    lines.add(Vec3::new(min.x, min.y, min.z), Vec3::new(min.x, max.y, min.z), color);
    lines.add(Vec3::new(max.x, min.y, min.z), Vec3::new(max.x, max.y, min.z), color);
    lines.add(Vec3::new(max.x, min.y, max.z), Vec3::new(max.x, max.y, max.z), color);
    lines.add(Vec3::new(min.x, min.y, max.z), Vec3::new(min.x, max.y, max.z), color);
}
```

### Wireframe Sphere

```rust
fn draw_sphere(lines: &mut Lines, center: Vec3, radius: f32, color: Vec4, segments: u32) {
    let step = std::f32::consts::TAU / segments as f32;

    // XY circle
    for index in 0..segments {
        let angle1 = index as f32 * step;
        let angle2 = (index + 1) as f32 * step;

        let p1 = center + Vec3::new(angle1.cos() * radius, angle1.sin() * radius, 0.0);
        let p2 = center + Vec3::new(angle2.cos() * radius, angle2.sin() * radius, 0.0);
        lines.add(p1, p2, color);
    }

    // XZ circle
    for index in 0..segments {
        let angle1 = index as f32 * step;
        let angle2 = (index + 1) as f32 * step;

        let p1 = center + Vec3::new(angle1.cos() * radius, 0.0, angle1.sin() * radius);
        let p2 = center + Vec3::new(angle2.cos() * radius, 0.0, angle2.sin() * radius);
        lines.add(p1, p2, color);
    }

    // YZ circle
    for index in 0..segments {
        let angle1 = index as f32 * step;
        let angle2 = (index + 1) as f32 * step;

        let p1 = center + Vec3::new(0.0, angle1.cos() * radius, angle1.sin() * radius);
        let p2 = center + Vec3::new(0.0, angle2.cos() * radius, angle2.sin() * radius);
        lines.add(p1, p2, color);
    }
}
```

### Grid

```rust
fn draw_grid(lines: &mut Lines, size: f32, divisions: u32, color: Vec4) {
    let step = size / divisions as f32;
    let half = size / 2.0;

    for index in 0..=divisions {
        let offset = -half + index as f32 * step;

        // X-axis lines
        lines.add(
            Vec3::new(-half, 0.0, offset),
            Vec3::new(half, 0.0, offset),
            color,
        );

        // Z-axis lines
        lines.add(
            Vec3::new(offset, 0.0, -half),
            Vec3::new(offset, 0.0, half),
            color,
        );
    }
}
```

### Arrow

```rust
fn draw_arrow(lines: &mut Lines, start: Vec3, end: Vec3, color: Vec4, head_size: f32) {
    lines.add(start, end, color);

    let direction = (end - start).normalize();
    let perpendicular = if direction.y.abs() < 0.9 {
        direction.cross(&Vec3::y()).normalize()
    } else {
        direction.cross(&Vec3::x()).normalize()
    };

    let head_base = end - direction * head_size;
    let offset = perpendicular * head_size * 0.5;

    lines.add(end, head_base + offset, color);
    lines.add(end, head_base - offset, color);
}
```

## Updating Lines

```rust
fn run_systems(&mut self, world: &mut World) {
    if let Some(lines) = world.get_lines_mut(self.debug_lines) {
        lines.clear();

        // Draw velocity vectors for all physics bodies
        for entity in world.query_entities(RIGID_BODY | LOCAL_TRANSFORM) {
            if let (Some(body), Some(transform)) = (
                world.get_rigid_body(entity),
                world.get_local_transform(entity),
            ) {
                let start = transform.translation;
                let end = start + body.velocity;
                lines.add(start, end, Vec4::new(1.0, 1.0, 0.0, 1.0));
            }
        }
    }
}
```

## Built-in Debug Visualization

### Bounding Volumes

```rust
world.resources.graphics.show_bounding_volumes = true;
```

### Selected Entity Bounds

```rust
world.resources.graphics.show_selected_bounding_volume = true;
world.resources.graphics.bounding_volume_selected_entity = Some(entity);
```

### Surface Normals

```rust
world.resources.graphics.show_normals = true;
world.resources.graphics.normal_line_length = 0.2;
world.resources.graphics.normal_line_color = [0.0, 1.0, 0.0, 1.0];
```

## GPU Culling

Lines are frustum-culled on the GPU for performance:

```rust
world.resources.graphics.gpu_culling_enabled = true;
```

## Line Limits

The system supports up to 1,000,000 lines per component:

```rust
const MAX_LINES: u32 = 1_000_000;
```

## Transform Gizmos

Built-in gizmos for entity manipulation:

```rust
use nightshade::ecs::gizmos::*;

// Translation gizmo (XYZ arrows)
create_translation_gizmo(world, entity);

// Rotation gizmo (rings)
create_rotation_gizmo(world, entity);

// Scale gizmo (cubes with cylinders)
create_scale_gizmo(world, entity);
```

## Debug Helpers

### Draw Physics Colliders

```rust
fn draw_colliders(world: &mut World, lines_entity: Entity) {
    if let Some(lines) = world.get_lines_mut(lines_entity) {
        lines.clear();

        for entity in world.query_entities(COLLIDER_COMPONENT | GLOBAL_TRANSFORM) {
            if let (Some(collider), Some(transform)) = (
                world.get_collider(entity),
                world.get_global_transform(entity),
            ) {
                match &collider.shape {
                    ColliderShape::Sphere { radius } => {
                        draw_sphere(lines, transform.translation, *radius, Vec4::new(0.0, 1.0, 0.0, 1.0), 16);
                    }
                    ColliderShape::Box { half_extents } => {
                        draw_box(lines, transform.translation, *half_extents, Vec4::new(0.0, 1.0, 0.0, 1.0));
                    }
                    _ => {}
                }
            }
        }
    }
}
```

### Draw Navigation Path

```rust
fn draw_navmesh_path(lines: &mut Lines, path: &[Vec3], color: Vec4) {
    for index in 0..path.len().saturating_sub(1) {
        lines.add(path[index], path[index + 1], color);
    }
}
```

### Draw Ray

```rust
fn draw_ray(lines: &mut Lines, origin: Vec3, direction: Vec3, length: f32, color: Vec4) {
    let end = origin + direction.normalize() * length;
    draw_arrow(lines, origin, end, color, 0.1);
}
```

## Performance Tips

- Clear and rebuild lines each frame for dynamic visualization
- Use GPU culling for large numbers of lines
- Batch related lines in a single Lines component
- Disable debug visualization in release builds

## Example: Debug Overlay

```rust
struct DebugOverlay {
    lines_entity: Entity,
    show_colliders: bool,
    show_velocities: bool,
    show_paths: bool,
}

impl DebugOverlay {
    fn update(&self, world: &mut World) {
        if let Some(lines) = world.get_lines_mut(self.lines_entity) {
            lines.clear();

            if self.show_colliders {
                self.draw_all_colliders(world, lines);
            }

            if self.show_velocities {
                self.draw_all_velocities(world, lines);
            }

            if self.show_paths {
                self.draw_all_paths(world, lines);
            }
        }
    }
}
```
