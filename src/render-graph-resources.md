# Resources & Textures

Render graph resources are GPU textures and buffers that passes read from and write to. Each resource has a `ResourceId` handle used for all graph operations.

## ResourceId

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ResourceId(pub u32);
```

`ResourceId` is an opaque handle returned when you declare a resource. Pass it to `add_pass()` slot bindings to connect passes to resources.

## Resource Types

| Type | Description |
|------|-------------|
| `ExternalColor` | Color texture provided externally each frame (e.g. swapchain) |
| `TransientColor` | Color texture managed by the graph (allocated, aliased, freed automatically) |
| `ExternalDepth` | Depth texture provided externally |
| `TransientDepth` | Depth texture managed by the graph |
| `ExternalBuffer` | GPU buffer provided externally |
| `TransientBuffer` | GPU buffer managed by the graph |

## External vs Transient

**External** resources are owned by you. You provide them each frame via `set_external_texture()`. The graph never creates or destroys them. The swapchain texture is the most common external resource.

**Transient** resources are owned by the graph. The graph creates GPU textures/buffers as needed, tracks their lifetimes, and can alias them (share memory between resources with non-overlapping lifetimes) to minimize VRAM usage.

## Creating Color Textures

Use the fluent builder:

```rust
// Transient - graph manages lifetime and may alias memory
let hdr = graph.add_color_texture("scene_color")
    .format(wgpu::TextureFormat::Rgba16Float)
    .size(1920, 1080)
    .clear_color(wgpu::Color::BLACK)
    .transient();

// External - you provide the texture each frame
let swapchain = graph.add_color_texture("swapchain")
    .format(wgpu::TextureFormat::Bgra8UnormSrgb)
    .external();
```

### Builder Methods

| Method | Description |
|--------|-------------|
| `format(TextureFormat)` | Pixel format (default: Rgba8UnormSrgb) |
| `size(width, height)` | Texture dimensions |
| `usage(TextureUsages)` | GPU usage flags |
| `sample_count(u32)` | MSAA sample count |
| `mip_levels(u32)` | Mipmap level count |
| `clear_color(Color)` | Clear color (only for the first pass that writes) |
| `no_store()` | Don't force store after last write |
| `transient()` | Finalize as transient (returns ResourceId) |
| `external()` | Finalize as external (returns ResourceId) |

## Creating Depth Textures

```rust
let depth = graph.add_depth_texture("depth")
    .size(1920, 1080)
    .format(wgpu::TextureFormat::Depth32Float)
    .clear_depth(0.0)
    .transient();
```

### Depth Builder Methods

| Method | Description |
|--------|-------------|
| `format(TextureFormat)` | Depth format (default: Depth32Float) |
| `size(width, height)` | Texture dimensions |
| `usage(TextureUsages)` | GPU usage flags |
| `array_layers(u32)` | For texture arrays (e.g. shadow cascades) |
| `clear_depth(f32)` | Clear depth value |
| `no_store()` | Don't force store |
| `transient()` / `external()` | Finalize |

## Creating Buffers

```rust
let data_buffer = graph.add_buffer("compute_data")
    .size(1024 * 1024)
    .usage(wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST)
    .transient();
```

## Resource Templates

For creating multiple similar resources, use templates:

```rust
let template = ResourceTemplate::new(
    wgpu::TextureFormat::Rgba16Float,
    1920,
    1080,
).usage(wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING);

let texture_a = graph.transient_color_from_template("blur_a", &template);
let texture_b = graph.transient_color_from_template("blur_b", &template);
```

### Template Methods

| Method | Description |
|--------|-------------|
| `new(format, width, height)` | Create a template |
| `usage(TextureUsages)` | Set usage flags |
| `sample_count(u32)` | MSAA samples |
| `mip_levels(u32)` | Mipmap levels |
| `array_layers(u32)` | Texture array layers |
| `cube_map()` | Configure as cube map (6 layers) |
| `dimension_3d(depth)` | 3D texture |

## Resource Pools

For batch allocation from a template:

```rust
let mut pool = graph.resource_pool(&template);
let [blur_a, blur_b, blur_c] = [
    pool.transient("blur_a"),
    pool.transient("blur_b"),
    pool.transient("blur_c"),
];
```

## Setting External Textures Per-Frame

External textures must be provided each frame before `execute()`:

```rust
// Each frame, provide the swapchain texture
let surface_texture = surface.get_current_texture()?;
let view = surface_texture.texture.create_view(&Default::default());
graph.set_external_texture(swapchain_id, view, width, height);
```

## Resizing Transient Textures

When the window resizes:

```rust
graph.resize_transient_resource(&device, depth_id, new_width, new_height)?;
graph.resize_transient_resource(&device, scene_color_id, new_width, new_height)?;
```

This invalidates the aliasing info and triggers reallocation on the next execution.
