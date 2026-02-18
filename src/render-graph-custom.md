# Custom Passes

Customize the rendering pipeline by adding your own passes to the render graph.

## configure_render_graph()

Override this `State` method to add custom passes at startup:

```rust
fn configure_render_graph(
    &mut self,
    graph: &mut RenderGraph<World>,
    device: &wgpu::Device,
    surface_format: wgpu::TextureFormat,
    resources: RenderResources,
) {
    // Add custom textures
    let my_texture = graph.add_color_texture("my_effect")
        .format(wgpu::TextureFormat::Rgba16Float)
        .size(1920, 1080)
        .clear_color(wgpu::Color::BLACK)
        .transient();

    // Add custom passes
    let my_pass = MyCustomPass::new(device);
    graph.add_pass(
        Box::new(my_pass),
        &[("input", resources.scene_color), ("output", my_texture)],
    );
}
```

## RenderResources

The `RenderResources` struct provides resource IDs for all built-in textures:

| Field | Description |
|-------|-------------|
| `scene_color` | HDR color buffer (Rgba16Float) |
| `depth` | Main depth buffer (Depth32Float) |
| `compute_output` | Post-processed output before swapchain blit |
| `swapchain` | Final swapchain output |
| `view_normals` | View-space normals |
| `ssao_raw` / `ssao` | Raw and blurred SSAO |
| `ssgi_raw` / `ssgi` | Raw and blurred SSGI |
| `ssr_raw` / `ssr` | Raw and blurred SSR |
| `surface_width` / `surface_height` | Current window dimensions in pixels |

## update_render_graph()

For per-frame changes, use `update_render_graph()`:

```rust
fn update_render_graph(&mut self, graph: &mut RenderGraph<World>, world: &World) {
    if self.bloom_changed {
        let _ = graph.set_pass_enabled("bloom_pass", self.bloom_enabled);
        self.bloom_changed = false;
    }
}
```

## Adding Built-in Passes

Use the built-in pass types in your custom graph:

```rust
use nightshade::render::passes;

fn configure_render_graph(
    &mut self,
    graph: &mut RenderGraph<World>,
    device: &wgpu::Device,
    surface_format: wgpu::TextureFormat,
    resources: RenderResources,
) {
    let bloom_texture = graph.add_color_texture("bloom")
        .format(wgpu::TextureFormat::Rgba16Float)
        .size(960, 540)
        .clear_color(wgpu::Color::BLACK)
        .transient();

    // Bloom
    let bloom_pass = passes::BloomPass::new(device, 1920, 1080);
    graph.add_pass(
        Box::new(bloom_pass),
        &[("hdr", resources.scene_color), ("bloom", bloom_texture)],
    );

    // SSAO
    let ssao_pass = passes::SsaoPass::new(device, 1920, 1080);
    graph.add_pass(
        Box::new(ssao_pass),
        &[
            ("depth", resources.depth),
            ("normals", resources.view_normals),
            ("ssao_raw", resources.ssao_raw),
        ],
    );

    let ssao_blur_pass = passes::SsaoBlurPass::new(device, 1920, 1080);
    graph.add_pass(
        Box::new(ssao_blur_pass),
        &[("ssao_raw", resources.ssao_raw), ("ssao", resources.ssao)],
    );

    // Final compositing
    let postprocess_pass = passes::PostProcessPass::new(device, surface_format, 0.3);
    graph.add_pass(
        Box::new(postprocess_pass),
        &[
            ("hdr", resources.scene_color),
            ("bloom", bloom_texture),
            ("ssao", resources.ssao),
            ("output", resources.compute_output),
        ],
    );

    // Blit to swapchain
    let blit_pass = passes::BlitPass::new(device, surface_format);
    graph.add_pass(
        Box::new(blit_pass),
        &[("input", resources.compute_output), ("output", resources.swapchain)],
    );
}
```

## PassBuilder Fluent API

Instead of `add_pass()`, you can use the fluent builder:

```rust
graph.pass(Box::new(bloom_pass))
    .read("hdr", resources.scene_color)
    .write("bloom", bloom_texture);

graph.pass(Box::new(postprocess_pass))
    .read("hdr", resources.scene_color)
    .read("bloom", bloom_texture)
    .read("ssao", resources.ssao)
    .write("output", resources.swapchain);
```

The `PassBuilder` automatically adds the pass to the graph when it goes out of scope (via `Drop`).

## Conditional Passes

Enable or disable passes based on settings:

```rust
fn configure_render_graph(
    &mut self,
    graph: &mut RenderGraph<World>,
    device: &wgpu::Device,
    surface_format: wgpu::TextureFormat,
    resources: RenderResources,
) {
    if self.ssao_enabled {
        let ssao_pass = passes::SsaoPass::new(device, 1920, 1080);
        graph.add_pass(
            Box::new(ssao_pass),
            &[
                ("depth", resources.depth),
                ("normals", resources.view_normals),
                ("ssao_raw", resources.ssao_raw),
            ],
        );
    }
}
```

Or toggle at runtime:

```rust
fn update_render_graph(&mut self, graph: &mut RenderGraph<World>, _world: &World) {
    let _ = graph.set_pass_enabled("ssao_pass", self.ssao_enabled);
}
```

## Default Pipeline

If you don't override `configure_render_graph()`, the default implementation adds:

1. **BloomPass** - HDR bloom at half resolution
2. **PostProcessPass** - Tonemapping and compositing
3. **BlitPass** - Copy to swapchain

The engine always adds the core passes (clear, sky, shadow, mesh, skinned mesh, water, grass, grid, lines, selection) regardless of your custom configuration.
