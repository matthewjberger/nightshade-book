# Rendering Architecture

This chapter explains how ECS data flows to pixels on screen. Nightshade's renderer is built on wgpu and uses a dependency-driven render graph to orchestrate all GPU work.

## High-Level Flow

```
ECS World State
    |
    v
Renderer (WgpuRenderer)
    |-- Sync data: upload transforms, materials, lights to GPU buffers
    |-- Prepare passes: each pass updates its bind groups and uniforms
    |-- Execute render graph: run passes in dependency order
    |-- Submit command buffers to GPU queue
    |-- Present swapchain surface
    |
    v
Pixels on Screen
```

## The Render Trait

All rendering goes through the `Render` trait, which abstracts the GPU backend:

```rust
pub trait Render {
    fn render_frame(&mut self, world: &mut World, state: &mut dyn State);
    fn resize(&mut self, width: u32, height: u32, world: &mut World);
    // ... additional methods for texture upload, screenshot, etc.
}
```

`WgpuRenderer` is the concrete implementation that owns the wgpu device, queue, surface, and render graph.

## WgpuRenderer

The renderer holds all GPU state:

- **Instance, Adapter, Device, Queue** - wgpu initialization chain
- **Surface** - the window's swapchain
- **RenderGraph** - the dependency-driven frame graph with all passes
- **Resource IDs** - handles to all transient and external textures
- **Texture Cache** - uploaded GPU textures
- **Font Atlas** - glyph texture for text rendering
- **Camera Viewports** - render-to-texture for editor viewports

## Initialization

When the application starts:

1. **Instance creation** - wgpu creates a `wgpu::Instance`, which selects the GPU backend (Vulkan on Linux/Windows, Metal on macOS, DX12 on Windows, WebGPU on WASM). The instance is the entry point to the GPU API.
2. **Adapter request** - The instance queries available GPUs and selects one. The adapter describes the GPU's capabilities (supported texture formats, limits, features).
3. **Device and queue** - The adapter opens a logical device (the interface for creating GPU resources) and a command queue (where command buffers are submitted for execution). All GPU work goes through the queue.
4. **Surface configuration** - The window surface is configured with the GPU's preferred format (typically Bgra8UnormSrgb) and the presentation mode (Fifo for vsync, Mailbox for low-latency).
5. **Pass creation** - All built-in passes are created. Each pass constructs its shader modules, pipeline layouts, render pipelines, bind group layouts, and any persistent GPU buffers during initialization.
6. **Render graph construction** - A `RenderGraph<World>` is constructed with all transient textures and passes registered.
7. **User configuration** - `State::configure_render_graph()` is called, allowing the game to add custom passes, textures, or modify the pipeline.
8. **Graph compilation** - The graph builds dependency edges, topologically sorts passes, computes resource lifetimes, determines aliasing, and calculates load/store operations.

## Transient Textures

The renderer declares all intermediate textures at initialization:

| Texture | Format | Description |
|---------|--------|-------------|
| `depth` | Depth32Float | Main depth buffer (reversed-Z, 0.0 = far) |
| `scene_color` | Rgba16Float | HDR color accumulation buffer |
| `compute_output` | Surface format | Post-processed output before swapchain blit |
| `shadow_depth` | Depth32Float | Cascaded shadow map (8192x8192 native, 4096 WASM) |
| `spotlight_shadow_atlas` | Depth32Float | Spotlight shadow atlas (4096 native, 1024 WASM) |
| `entity_id` | R32Float | Entity ID buffer for GPU picking |
| `view_normals` | Rgba16Float | View-space normals for SSAO/SSGI |
| `selection_mask` | R8Unorm | Selection mask for editor outlines |
| `ssao_raw` | R8Unorm | Raw SSAO before blur |
| `ssao` | R8Unorm | Blurred SSAO |
| `ssgi_raw` | Rgba16Float | Raw SSGI (half resolution) |
| `ssgi` | Rgba16Float | Blurred SSGI (half resolution) |
| `ssr_raw` | Rgba16Float | Raw screen-space reflections |
| `ssr` | Rgba16Float | Blurred SSR |
| `ui_depth` | Depth32Float | Separate depth for UI rendering |

External textures (provided each frame):
- `swapchain` - the window surface texture
- `viewport_output` - editor viewport render target

## Per-Frame Rendering

Each frame, `render_frame()` executes:

1. **Sync data** - Upload transform matrices, material uniforms, light data, and animation bone matrices to GPU buffers
2. **Process commands** - Handle queued `WorldCommand` values (texture loads, screenshots, etc.)
3. **Set swapchain texture** - Acquire the next swapchain image and bind it as the external `swapchain` resource
4. **Call `State::update_render_graph()`** - Allow per-frame graph modifications
5. **Execute render graph** - Run all enabled, non-culled passes in topological order, collecting command buffers
6. **Submit** - Send command buffers to the GPU queue
7. **Present** - Display the frame

## Resize Handling

When the window resizes:

1. The surface is reconfigured with new dimensions
2. All transient textures are resized to match
3. The render graph recomputes resource aliasing
4. Passes that cache bind groups invalidate them

SSGI textures resize to half the new dimensions.

## Custom Rendering

Games customize rendering through two `State` methods:

- **`configure_render_graph()`** - Called once at startup. Add custom passes, textures, and change the pipeline structure.
- **`update_render_graph()`** - Called each frame. Enable/disable passes, update pass parameters.

See [The Render Graph](render-graph.md) for details on how the graph system works, and [Custom Passes](render-graph-custom.md) for implementation examples.
