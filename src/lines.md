# Lines Rendering

> **Live Demo:** [Lines](https://matthewberger.dev/nightshade/lines)

Debug line drawing for visualization, gizmos, and wireframes.

## How Lines Rendering Works

The lines system is a GPU-driven rendering pipeline that uses instanced rendering with compute-based frustum culling. Rather than submitting geometry for each line, the engine uploads all line data to a GPU storage buffer and renders them using a two-vertex line primitive with one instance per line.

### The Two-Vertex Trick

The vertex buffer contains only two vertices: position `[0, 0, 0]` and position `[1, 0, 0]`. Every line in the scene reuses these same two vertices through instancing. The vertex shader uses the instance index to look up the actual line data (start, end, color) from a storage buffer, then uses the vertex position's X coordinate (0.0 or 1.0) to interpolate between start and end:

```wgsl
let line = lines[in.instance_index];
let pos = mix(line.start.xyz, line.end.xyz, in.position.x);
out.clip_position = uniforms.view_proj * vec4<f32>(pos, 1.0);
out.color = line.color;
```

This means rendering 100,000 lines requires only 2 vertices in GPU memory regardless of line count. All line data lives in a storage buffer that grows dynamically (starting at 1,024 lines, doubling as needed, up to 1,000,000).

### GPU Frustum Culling

A compute shader (`line_culling_gpu.wgsl`) runs before the render pass to determine which lines are visible. For each line, it tests both endpoints against the camera frustum planes. If either endpoint is inside the frustum, the line is visible. If neither is, the shader samples 8 intermediate points along the line segment to catch lines that span across the view without either endpoint being visible.

Visible lines generate `DrawIndexedIndirectCommand` structs via atomic append:

```wgsl
let command_index = atomicAdd(&draw_count, 1u);
draw_commands[command_index].index_count = 2u;
draw_commands[command_index].instance_count = 1u;
draw_commands[command_index].first_instance = line_index;
```

The render pass then executes these commands with `multi_draw_indexed_indirect_count` (or `multi_draw_indexed_indirect` on macOS/WASM/OpenXR where count buffers are unavailable).

### Bounding Volume Lines

When `show_bounding_volumes` is enabled, a separate compute shader (`bounding_volume_lines.wgsl`) generates wireframe lines from entity OBBs (Oriented Bounding Boxes). Each bounding volume produces exactly 12 edge lines. The shader:

1. Computes the 8 OBB corners using quaternion rotation in local space
2. Transforms all corners to world space via the entity's model matrix
3. Writes 12 edge lines (the box wireframe) into the line buffer at a pre-allocated offset

### Normal Visualization Lines

Another compute shader (`normal_lines.wgsl`) generates lines showing mesh surface normals. For each vertex, it:

1. Transforms the vertex position to world space using the model matrix
2. Transforms the normal using the upper-left 3x3 of the model matrix (the normal matrix)
3. Computes the endpoint by extending along the normal by the configured length
4. Writes a single line from the vertex position to the endpoint

### GPU Data Layout

Each line on the GPU is a 64-byte structure aligned to 16 bytes:

```rust
struct GpuLineData {
    start: [f32; 4],      // World-space start + padding
    end: [f32; 4],        // World-space end + padding
    color: [f32; 4],      // RGBA color
    entity_id: u32,        // Source entity ID
    visible: u32,          // Visibility flag
    _padding: [u32; 2],
}
```

### Data Synchronization

Each frame, `sync_lines_data` queries all entities with `LINES | GLOBAL_TRANSFORM | VISIBILITY` components, transforms each line's start and end positions to world space using the entity's global transform matrix, packs them into `GpuLineData` structs, and uploads them to the GPU via `queue.write_buffer`. The total buffer includes user lines, bounding volume lines, and normal visualization lines.

## Lines Component

```rust
pub struct Lines {
    pub lines: Vec<Line>,
    pub version: u64,
}

pub struct Line {
    pub start: Vec3,
    pub end: Vec3,
    pub color: Vec4,
}
```

The `version` field is a dirty counter. Calling `push()`, `clear()`, or `mark_dirty()` increments it, enabling the renderer to detect changes and skip re-uploading unchanged line data.

## Basic Line Drawing

```rust
fn initialize(&mut self, world: &mut World) {
    let entity = world.spawn_entities(LINES, 1)[0];

    let mut lines = Lines::new();
    lines.add(
        Vec3::new(0.0, 0.0, 0.0),
        Vec3::new(1.0, 1.0, 1.0),
        Vec4::new(1.0, 0.0, 0.0, 1.0),
    );

    world.set_lines(entity, lines);
}
```

## Adding Lines

```rust
let mut lines = Lines::new();

// Single line
lines.add(start, end, color);

// Coordinate axes
lines.add(Vec3::zeros(), Vec3::x(), Vec4::new(1.0, 0.0, 0.0, 1.0));
lines.add(Vec3::zeros(), Vec3::y(), Vec4::new(0.0, 1.0, 0.0, 1.0));
lines.add(Vec3::zeros(), Vec3::z(), Vec4::new(0.0, 0.0, 1.0, 1.0));
```

## Drawing Shapes

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

    for index in 0..segments {
        let angle1 = index as f32 * step;
        let angle2 = (index + 1) as f32 * step;

        // XY circle
        let p1 = center + Vec3::new(angle1.cos() * radius, angle1.sin() * radius, 0.0);
        let p2 = center + Vec3::new(angle2.cos() * radius, angle2.sin() * radius, 0.0);
        lines.add(p1, p2, color);

        // XZ circle
        let p1 = center + Vec3::new(angle1.cos() * radius, 0.0, angle1.sin() * radius);
        let p2 = center + Vec3::new(angle2.cos() * radius, 0.0, angle2.sin() * radius);
        lines.add(p1, p2, color);

        // YZ circle
        let p1 = center + Vec3::new(0.0, angle1.cos() * radius, angle1.sin() * radius);
        let p2 = center + Vec3::new(0.0, angle2.cos() * radius, angle2.sin() * radius);
        lines.add(p1, p2, color);
    }
}
```

## Updating Lines Each Frame

```rust
fn run_systems(&mut self, world: &mut World) {
    if let Some(lines) = world.get_lines_mut(self.debug_lines) {
        lines.clear();

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

Lines are frustum-culled on the GPU via a compute shader. Toggle this with:

```rust
world.resources.graphics.gpu_culling_enabled = true;
```

When enabled, only lines visible to the camera are drawn. The compute shader outputs indirect draw commands, so the CPU never needs to know which lines survived culling.

## Line Limits

```rust
const MAX_LINES: u32 = 1_000_000;
```

The buffer starts at 1,024 lines and grows by 2x when capacity is exceeded.

## Transform Gizmos

Built-in gizmos for entity manipulation:

```rust
use nightshade::ecs::gizmos::*;

create_translation_gizmo(world, entity);
create_rotation_gizmo(world, entity);
create_scale_gizmo(world, entity);
```

## Rendering Pipeline

The lines pass fits into the render graph as a geometry pass that writes to `scene_color` and `depth`. The execution order each frame is:

1. Generate bounding volume lines (compute shader, 64 threads/workgroup, 12 lines per bounding volume)
2. Generate normal visualization lines (compute shader, 256 threads/workgroup, 1 line per vertex)
3. Frustum cull all lines (compute shader, 256 threads/workgroup, outputs indirect draw commands)
4. Render visible lines (instanced `LineList` primitive with alpha blending and `GreaterEqual` depth test for reversed-Z)

The render pipeline uses `wgpu::PrimitiveTopology::LineList`, draws indices 0-1 per instance, and routes each instance to the correct line data via `first_instance` in the indirect draw command. The fragment shader is a simple color passthrough.
