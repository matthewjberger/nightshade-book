# Post-Processing

> **Live Demos:** [Bloom](https://matthewberger.dev/nightshade/bloom) | [SSAO](https://matthewberger.dev/nightshade/ssao) | [Depth of Field](https://matthewberger.dev/nightshade/depth_of_field)

Post-processing passes read the HDR scene color, depth, and normals to produce the final image. These passes are added in `configure_render_graph()`.

## Available Passes

| Pass | Description | Reads | Writes |
|------|-------------|-------|--------|
| `SsaoPass` | Screen-space ambient occlusion | depth, normals | ssao_raw |
| `SsaoBlurPass` | Bilateral blur for SSAO | ssao_raw | ssao |
| `SsgiPass` | Screen-space global illumination (half-res) | scene_color, depth, normals | ssgi_raw |
| `SsgiBlurPass` | Bilateral blur for SSGI | ssgi_raw | ssgi |
| `SsrPass` | Screen-space reflections | scene_color, depth, normals | ssr_raw |
| `SsrBlurPass` | Blur for SSR | ssr_raw | ssr |
| `BloomPass` | HDR bloom with mip chain | scene_color | bloom |
| `DepthOfFieldPass` | Bokeh depth of field | scene_color, depth | scene_color |
| `PostProcessPass` | Final tonemapping and compositing | scene_color, bloom, ssao | output |
| `EffectsPass` | Custom shader effects | scene_color | scene_color |
| `OutlinePass` | Selection outline | selection_mask | scene_color |
| `BlitPass` | Simple texture copy | input | output |
| `ComputeGrayscalePass` | Grayscale conversion | input | output |

## Enabling Effects

Control post-processing through `world.resources.graphics`:

```rust
fn initialize(&mut self, world: &mut World) {
    world.resources.graphics.bloom_enabled = true;
    world.resources.graphics.bloom_intensity = 0.3;

    world.resources.graphics.ssao_enabled = true;
    world.resources.graphics.ssao_radius = 0.5;
    world.resources.graphics.ssao_intensity = 1.0;

    world.resources.graphics.color_grading.tonemap_algorithm = TonemapAlgorithm::Aces;
}
```

## SSAO (Screen-Space Ambient Occlusion)

In the real world, corners, crevices, and enclosed spaces receive less ambient light because surrounding geometry occludes incoming light from many directions. SSAO approximates this effect in screen space by analyzing the depth buffer.

### How SSAO Works

For each pixel, the shader reconstructs the 3D position from the depth buffer, then samples several random points in a hemisphere oriented along the surface normal. Each sample point is projected back into screen space to check the depth buffer: if the stored depth is closer than the sample point, that direction is occluded. The ratio of occluded samples to total samples gives the occlusion factor.

The key inputs are:
- **Depth buffer** - Provides the 3D position of each pixel
- **View-space normals** - Orients the sampling hemisphere along the surface
- **Random noise** - Rotates the sample kernel per-pixel to avoid banding patterns

The raw SSAO output is noisy because of the limited sample count (typically 16-64 samples per pixel). A bilateral blur pass smooths the result while preserving edges (it avoids blurring across depth discontinuities, which would cause halos around objects).

```rust
world.resources.graphics.ssao_enabled = true;
world.resources.graphics.ssao_radius = 0.5;
world.resources.graphics.ssao_intensity = 1.0;
world.resources.graphics.ssao_bias = 0.025;
```

- `ssao_radius` - The hemisphere radius in world units. Larger values detect occlusion from farther geometry but can cause over-darkening.
- `ssao_bias` - A small depth offset to prevent self-occlusion artifacts on flat surfaces.
- `ssao_intensity` - Multiplier for the final occlusion factor.

## SSGI (Screen-Space Global Illumination)

In real-world lighting, light bounces between surfaces. A red wall next to a white floor tints the floor red. Traditional rasterization only computes direct lighting (light source to surface to camera). Global illumination (GI) adds these indirect bounces.

SSGI approximates one bounce of indirect light using only screen-space information. For each pixel, the shader traces short rays through the depth buffer to find nearby surfaces, then samples the color at those hit points as incoming indirect light. This is conceptually similar to SSAO but samples color instead of just occlusion.

SSGI is computed at half resolution for performance (the indirect illumination is low-frequency and doesn't need full resolution), then bilaterally blurred and upsampled.

## SSR (Screen-Space Reflections)

SSR adds dynamic reflections by ray-marching through the depth buffer. For each reflective pixel, the shader computes the reflection vector from the camera direction and the surface normal, then steps along that vector in screen space, checking the depth buffer at each step. When the ray intersects a surface (the ray's depth exceeds the depth buffer value), the color at that screen position becomes the reflection.

This technique works well for reflections of on-screen geometry but has inherent limitations: off-screen objects cannot be reflected, and reflections at grazing angles stretch across large screen areas. The blur pass hides artifacts from these limitations, and a fallback to environment maps or IBL fills in where SSR has no data.

## Bloom

Bloom simulates the light scattering that occurs in real cameras and the human eye when bright light sources bleed into surrounding areas. In HDR rendering, pixels can have values above 1.0 (the displayable range). Bloom extracts these bright pixels and spreads their light outward.

### How Bloom Works

The bloom pipeline uses a progressive downsample/upsample approach (similar to the technique described in the Call of Duty: Advanced Warfare presentation):

1. **Threshold** - Extract pixels brighter than a threshold from the HDR scene color
2. **Downsample chain** - Progressively halve the resolution through multiple mip levels (e.g., 1920x1080 -> 960x540 -> 480x270 -> ...), applying a blur at each step. This is much cheaper than blurring at full resolution because each mip level has 1/4 the pixels.
3. **Upsample chain** - Walk back up the mip chain, additively blending each level with the one above it. This produces a smooth, wide blur that spans many pixels without requiring a massive blur kernel.
4. **Composite** - Add the bloom result to the scene color during the final post-process pass.

The mip-chain approach produces natural-looking bloom because it captures both tight glow (from the high-resolution mips) and wide glow (from the low-resolution mips) simultaneously.

Bloom creates a glow effect around bright pixels using this mip-chain downsample/upsample approach:

```rust
world.resources.graphics.bloom_enabled = true;
world.resources.graphics.bloom_intensity = 0.5;
```

Materials with high emissive values produce the strongest bloom:

```rust
let glowing = Material {
    base_color: [0.2, 0.8, 1.0, 1.0],
    emissive_factor: [2.0, 8.0, 10.0],
    ..Default::default()
};
```

## Depth of Field

Depth of field simulates the optical behavior of a physical camera lens. A real lens can only focus at one distance; objects nearer or farther than the focal plane appear blurred. The amount of blur (the circle of confusion, or CoC) increases with distance from the focal plane and is controlled by the aperture size.

### How DoF Works

1. **CoC computation** - For each pixel, compute the circle of confusion from the depth buffer value, the focus distance, and the aperture. The CoC is the diameter (in pixels) of the blur disc for that pixel.
2. **Blur** - Apply a variable-radius blur where the kernel size is proportional to the CoC. Pixels with large CoC values (far from focus) get blurred heavily; pixels near the focal plane remain sharp.
3. **Bokeh** - Bright out-of-focus highlights form characteristic shapes (circles, hexagons) called bokeh. The shader can emphasize bright pixels during the blur to simulate this optical effect.

Focus blur based on distance from a focus plane:

```rust
world.resources.graphics.depth_of_field.enabled = true;
world.resources.graphics.depth_of_field.focus_distance = 10.0;
world.resources.graphics.depth_of_field.focus_range = 5.0;
world.resources.graphics.depth_of_field.max_blur_radius = 10.0;
world.resources.graphics.depth_of_field.bokeh_threshold = 1.0;
world.resources.graphics.depth_of_field.bokeh_intensity = 1.0;
```

## Tonemapping

HDR rendering computes lighting in a physically linear color space where values can range from 0 to thousands. But displays can only show values between 0 and 1. Tonemapping is the process of compressing the HDR range into the displayable LDR range while preserving the perception of brightness differences and color relationships.

Different tonemapping curves make different trade-offs:
- **Reinhard** - Simple `color / (color + 1)` mapping. Preserves highlights but can look washed out.
- **ACES** (Academy Color Encoding System) - Film-industry standard curve with good contrast and a slight warm tint. Widely used in games.
- **AgX** - A more recent curve designed to handle highly saturated colors better than ACES (which can produce hue shifts in bright saturated regions).
- **Neutral** - Minimal color manipulation, useful when color grading is handled externally.

The `PostProcessPass` performs HDR-to-LDR tonemapping:

```rust
pub enum TonemapAlgorithm {
    Reinhard,
    Aces,
    ReinhardExtended,
    Uncharted2,
    AgX,
    Neutral,
    None,
}

world.resources.graphics.color_grading.tonemap_algorithm = TonemapAlgorithm::Aces;
```

## Color Grading

```rust
world.resources.graphics.color_grading.saturation = 1.0;
world.resources.graphics.color_grading.contrast = 1.0;
world.resources.graphics.color_grading.brightness = 0.0;
```

## Effects Pass

The `EffectsPass` runs custom WGSL shader effects for specialized visual treatments:

- Color grading presets
- Chromatic aberration
- Film grain
- Custom shader effects

See [Effects Pass](effects-pass.md) for details.

## Custom Post-Processing

Add custom post-processing passes via the render graph. See [Custom Passes](render-graph-custom.md) for implementation examples.

## Performance

| Effect | Cost | Notes |
|--------|------|-------|
| Bloom | Medium | Multiple blur passes at half resolution |
| SSAO | High | Many depth samples per pixel |
| SSGI | High | Half resolution helps, but still expensive |
| SSR | High | Ray tracing through depth buffer |
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
