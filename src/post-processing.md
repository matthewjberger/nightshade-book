# Post-Processing

> **Live Demos:** [Bloom](https://matthewberger.dev/nightshade/bloom) | [SSAO](https://matthewberger.dev/nightshade/ssao) | [Depth of Field](https://matthewberger.dev/nightshade/depth_of_field)

Nightshade includes several post-processing effects that enhance visual quality.

## Available Effects

| Effect | Description |
|--------|-------------|
| Bloom | Glow around bright areas |
| SSAO | Screen-space ambient occlusion |
| Depth of Field | Focus blur effect |
| Tonemapping | HDR to LDR conversion |
| Color Grading | Color adjustments |
| Anti-Aliasing | Edge smoothing |

## Enabling Effects

Control post-processing through `world.resources.graphics`:

```rust
fn initialize(&mut self, world: &mut World) {
    // Bloom
    world.resources.graphics.bloom_enabled = true;
    world.resources.graphics.bloom_intensity = 0.3;
    world.resources.graphics.bloom_threshold = 1.0;

    // SSAO
    world.resources.graphics.ssao_enabled = true;
    world.resources.graphics.ssao_radius = 0.5;
    world.resources.graphics.ssao_intensity = 1.0;

    // Tonemapping
    world.resources.graphics.tonemap_method = TonemapMethod::Aces;
}
```

## Bloom

Bloom creates a glow effect around bright pixels:

```rust
world.resources.graphics.bloom_enabled = true;
world.resources.graphics.bloom_intensity = 0.5;  // Glow strength
world.resources.graphics.bloom_threshold = 1.0;  // Brightness cutoff
world.resources.graphics.bloom_radius = 0.005;   // Blur spread
```

### Emissive Materials for Bloom

Materials with emissive values will glow:

```rust
let glowing_material = Material {
    base_color: [0.2, 0.8, 1.0, 1.0],
    emissive_factor: [2.0, 8.0, 10.0],  // High values create bloom
    ..Default::default()
};
```

## SSAO (Screen-Space Ambient Occlusion)

SSAO adds subtle shadows in corners and crevices:

```rust
world.resources.graphics.ssao_enabled = true;
world.resources.graphics.ssao_radius = 0.5;     // Sample radius
world.resources.graphics.ssao_intensity = 1.0;  // Shadow darkness
world.resources.graphics.ssao_bias = 0.025;     // Depth comparison bias
```

## Tonemapping

Convert HDR colors to displayable range:

```rust
pub enum TonemapMethod {
    Reinhard,         // Simple, good for general use
    ReinhardExtended, // Reinhard with white point
    Aces,             // Film-like, high contrast
    AcesApprox,       // Faster ACES approximation
    Filmic,           // Cinematic look
    Uncharted2,       // Video game standard
    None,             // No tonemapping (LDR only)
}

world.resources.graphics.tonemap_method = TonemapMethod::Aces;
world.resources.graphics.exposure = 1.0;  // Brightness adjustment
```

## Depth of Field

Blur based on distance from focus:

```rust
world.resources.graphics.dof_enabled = true;
world.resources.graphics.dof_focus_distance = 10.0;  // In-focus distance
world.resources.graphics.dof_aperture = 0.05;        // Blur amount
world.resources.graphics.dof_focal_length = 50.0;    // Lens simulation
```

## Color Grading

Adjust colors for stylistic effect:

```rust
world.resources.graphics.saturation = 1.0;   // 0 = grayscale, 1 = normal
world.resources.graphics.contrast = 1.0;     // Higher = more contrast
world.resources.graphics.brightness = 0.0;   // Offset
```

## Vignette

Darken screen edges:

```rust
world.resources.graphics.vignette_enabled = true;
world.resources.graphics.vignette_intensity = 0.3;
world.resources.graphics.vignette_radius = 0.75;
```

## Custom Post-Processing

Add custom passes via the render graph:

```rust
fn configure_render_graph(
    &mut self,
    graph: &mut RenderGraph<World>,
    device: &wgpu::Device,
    surface_format: wgpu::TextureFormat,
    resources: RenderResources,
) {
    // Custom shader pass
    let custom_pass = MyCustomPass::new(device);
    graph
        .pass(Box::new(custom_pass))
        .read("input", resources.scene_color)
        .write("output", resources.post_processed);
}
```

## Performance Considerations

Post-processing effects have performance costs:

| Effect | Cost | Notes |
|--------|------|-------|
| Bloom | Medium | Multiple blur passes |
| SSAO | High | Many depth samples |
| DoF | Medium | Gaussian blur |
| Tonemapping | Low | Per-pixel math |
| Color Grading | Low | Per-pixel math |

Disable expensive effects for better performance:

```rust
fn set_quality_low(world: &mut World) {
    world.resources.graphics.ssao_enabled = false;
    world.resources.graphics.bloom_enabled = false;
}

fn set_quality_high(world: &mut World) {
    world.resources.graphics.ssao_enabled = true;
    world.resources.graphics.bloom_enabled = true;
}
```
