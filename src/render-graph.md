# Render Graph

> **Live Demos:** [Custom Pass](https://matthewberger.dev/nightshade/custom_pass) | [Custom Multipass](https://matthewberger.dev/nightshade/custom_multipass) | [Render Layers](https://matthewberger.dev/nightshade/render_layers)

The render graph is a declarative system for defining the rendering pipeline. Passes are automatically ordered based on their dependencies.

## Default Pipeline

Nightshade's default render pipeline includes:

1. Shadow map generation
2. Depth prepass
3. G-buffer pass
4. Lighting pass
5. Skybox
6. Transparent objects
7. Particles
8. Post-processing (bloom, SSAO, tonemapping)
9. UI/HUD
10. Final blit to screen

## Custom Render Graph

Override the render graph in your State implementation:

```rust
impl State for MyGame {
    fn configure_render_graph(
        &mut self,
        graph: &mut RenderGraph<World>,
        device: &wgpu::Device,
        surface_format: wgpu::TextureFormat,
        resources: RenderResources,
    ) {
        // Add custom passes
    }
}
```

## Adding Passes

### Built-in Passes

```rust
use nightshade::render::passes;

fn configure_render_graph(
    &mut self,
    graph: &mut RenderGraph<World>,
    device: &wgpu::Device,
    surface_format: wgpu::TextureFormat,
    resources: RenderResources,
) {
    let particle_pass = passes::ParticlePass::new(device, wgpu::TextureFormat::Rgba16Float);
    graph.add_pass(
        Box::new(particle_pass),
        &[("color", resources.scene_color), ("depth", resources.depth)],
    );

    let bloom_pass = passes::BloomPass::new(device, 1920, 1080);
    graph.add_pass(
        Box::new(bloom_pass),
        &[("hdr", resources.scene_color), ("bloom", resources.bloom)],
    );

    let ssao_pass = passes::SsaoPass::new(device);
    graph.add_pass(
        Box::new(ssao_pass),
        &[
            ("depth", resources.depth),
            ("normals", resources.view_normals),
            ("ssao_raw", resources.ssao_raw),
        ],
    );

    let ssao_blur_pass = passes::SsaoBlurPass::new(device);
    graph.add_pass(
        Box::new(ssao_blur_pass),
        &[("ssao_raw", resources.ssao_raw), ("ssao", resources.ssao)],
    );

    let postprocess_pass = passes::PostProcessPass::new(device, surface_format, 0.3);
    graph.add_pass(
        Box::new(postprocess_pass),
        &[
            ("hdr", resources.scene_color),
            ("bloom", resources.bloom),
            ("ssao", resources.ssao),
            ("output", resources.swapchain),
        ],
    );
}
```

## Creating Custom Textures

Add intermediate textures for custom passes:

```rust
let custom_texture = graph
    .add_color_texture("my_effect")
    .format(wgpu::TextureFormat::Rgba16Float)
    .size(1920, 1080)
    .clear_color(wgpu::Color::BLACK)
    .transient();  // Freed after use
```

## Custom Pass Implementation

Implement the `PassNode` trait for custom passes:

```rust
use nightshade::render::render_graph::{PassNode, ResourceInput, ResourceOutput};

pub struct MyCustomPass {
    pipeline: wgpu::RenderPipeline,
    bind_group_layout: wgpu::BindGroupLayout,
}

impl PassNode<World> for MyCustomPass {
    fn name(&self) -> &str {
        "my_custom_pass"
    }

    fn inputs(&self) -> Vec<ResourceInput> {
        vec![
            ResourceInput::texture("input_color"),
        ]
    }

    fn outputs(&self) -> Vec<ResourceOutput> {
        vec![
            ResourceOutput::texture("output_color"),
        ]
    }

    fn execute(
        &mut self,
        world: &mut World,
        encoder: &mut wgpu::CommandEncoder,
        resources: &RenderResources,
    ) {
        // Get input/output textures from resources
        // Create render pass
        // Draw full-screen quad with shader
    }
}
```

## Pass Dependencies

The graph automatically orders passes based on read/write dependencies:

```rust
graph.add_pass(
    Box::new(pass_a),
    &[("intermediate", texture_a)],
);

graph.add_pass(
    Box::new(pass_b),
    &[("intermediate", texture_a), ("final", texture_b)],
);
```

## Render Resources

Available built-in resources:

| Resource | Description |
|----------|-------------|
| `scene_color` | HDR color buffer |
| `depth` | Depth buffer |
| `view_normals` | World-space normals |
| `ssao_raw` | Raw SSAO output |
| `ssao` | Blurred SSAO |
| `bloom` | Bloom texture |
| `swapchain` | Final output |

## Conditional Passes

Enable/disable passes based on settings:

```rust
if world.resources.graphics.bloom_enabled {
    let bloom_pass = passes::BloomPass::new(device, width, height);
    graph.add_pass(
        Box::new(bloom_pass),
        &[("hdr", resources.scene_color), ("bloom", resources.bloom)],
    );
}
```
