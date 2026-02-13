# Effects Pass

> **Live Demo:** [PSX Retro Effects](https://matthewberger.dev/nightshade/psx)

The EffectsPass is a configurable post-processing system with 38 shader parameters for visual effects. It includes distortions, color grading, raymarched overlays, retro effects, and more.

## Overview

The EffectsPass operates as a render graph node that processes the rendered scene through a fullscreen shader. Effects can be combined and animated for music visualizers, stylized games, or creative applications.

## Setup

Create and configure the effects state, then add the pass to your render graph:

```rust
use nightshade::render::wgpu::passes::postprocess::effects::*;

fn configure_render_graph(
    &mut self,
    graph: &mut RenderGraph<World>,
    device: &wgpu::Device,
    surface_format: wgpu::TextureFormat,
    resources: RenderResources,
) {
    // Create shared state handle
    let effects_state = create_effects_state();
    self.effects_state = Some(effects_state.clone());

    // Create and add the pass
    let effects_pass = EffectsPass::new(device, surface_format, effects_state);
    graph.add_pass(Box::new(effects_pass));
}
```

## Modifying Effects

Access the state handle to modify effect parameters:

```rust
fn run_systems(&mut self, world: &mut World) {
    if let Some(state_handle) = &self.effects_state {
        if let Ok(mut state) = state_handle.write() {
            // Modify uniforms
            state.uniforms.chromatic_aberration = 0.02;
            state.uniforms.vignette = 0.3;

            // Enable/disable the entire pass
            state.enabled = true;

            // Auto-animate hue rotation
            state.animate_hue = false;
        }
    }
}
```

## Effect Parameters

### Distortion Effects

```rust
// Chromatic aberration: RGB channel separation (0.0-0.1 typical)
uniforms.chromatic_aberration = 0.02;

// Wave distortion: sinusoidal screen warping
uniforms.wave_distortion = 0.5;

// Glitch intensity: digital glitch artifacts
uniforms.glitch_intensity = 0.3;

// VHS distortion: analog tape wobble and noise
uniforms.vhs_distortion = 0.4;

// Heat distortion: rising heat shimmer effect
uniforms.heat_distortion = 0.2;

// Screen shake: camera shake offset
uniforms.screen_shake = 0.1;

// Warp speed: hyperspace stretch effect
uniforms.warp_speed = 0.5;
```

### Color Effects

```rust
// Hue rotation: shift all colors around the wheel (0.0-1.0)
uniforms.hue_rotation = 0.5;

// Saturation: color intensity (0.0=grayscale, 1.0=normal, 2.0=oversaturated)
uniforms.saturation = 1.0;

// Color shift: global color offset
uniforms.color_shift = 0.1;

// Invert: color inversion (0.0=normal, 1.0=inverted)
uniforms.invert = 1.0;

// Color posterize: reduce color depth (0.0=off, higher=fewer colors)
uniforms.color_posterize = 4.0;

// Color cycle speed: rate of automatic color animation
uniforms.color_cycle_speed = 1.0;
```

### Color Grading

Apply preset color grades:

```rust
uniforms.color_grade_mode = ColorGradeMode::Cyberpunk as f32;
```

Available modes:

| Mode | Value | Description |
|------|-------|-------------|
| `None` | 0 | No color grading |
| `Cyberpunk` | 1 | Teal and magenta, high contrast |
| `Sunset` | 2 | Warm orange and purple tones |
| `Grayscale` | 3 | Black and white |
| `Sepia` | 4 | Vintage brown tones |
| `Matrix` | 5 | Green tinted, digital look |
| `HotMetal` | 6 | Heat map colors |

### Geometric Effects

```rust
// Kaleidoscope: mirror segments (0=off, 6-12 typical)
uniforms.kaleidoscope_segments = 6.0;

// Mirror mode: horizontal/vertical mirroring
uniforms.mirror_mode = 1.0;

// Zoom pulse: rhythmic zoom in/out
uniforms.zoom_pulse = 0.5;

// Radial blur: motion blur from center
uniforms.radial_blur = 0.2;

// Pixelate: reduce resolution (0=off, higher=larger pixels)
uniforms.pixelate = 8.0;
```

### Raymarched Overlays

Blend raymarched 3D effects over the scene:

```rust
uniforms.raymarch_mode = RaymarchMode::Tunnel as f32;
uniforms.raymarch_blend = 0.5; // 0.0-1.0 blend with scene
uniforms.tunnel_speed = 1.0;   // Animation speed
uniforms.fractal_iterations = 4.0;
```

Available raymarch modes:

| Mode | Value | Description |
|------|-------|-------------|
| `Off` | 0 | No raymarching |
| `Tunnel` | 1 | Infinite tunnel flythrough |
| `Fractal` | 2 | 2D fractal pattern |
| `Mandelbulb` | 3 | 3D mandelbulb fractal |
| `PlasmaVortex` | 4 | Swirling plasma effect |
| `Geometric` | 5 | Repeating geometric shapes |

### Retro Effects

```rust
// CRT scanlines: horizontal line overlay
uniforms.crt_scanlines = 0.5;

// Film grain: random noise overlay
uniforms.film_grain = 0.1;

// ASCII mode: convert to ASCII art characters
uniforms.ascii_mode = 1.0;

// Digital rain: Matrix-style falling characters
uniforms.digital_rain = 0.5;
```

### Glow and Light Effects

```rust
// Vignette: darken screen edges (0.0-1.0)
uniforms.vignette = 0.3;

// Glow intensity: bloom-like glow
uniforms.glow_intensity = 0.5;

// Lens flare: bright light artifacts
uniforms.lens_flare = 0.3;

// Edge glow: outline bright edges
uniforms.edge_glow = 0.2;

// Strobe: flashing white overlay
uniforms.strobe = 0.5;
```

### Plasma and Patterns

```rust
// Plasma intensity: colorful plasma overlay
uniforms.plasma_intensity = 0.5;

// Pulse rings: expanding circular rings
uniforms.pulse_rings = 0.3;

// Speed lines: motion/action lines
uniforms.speed_lines = 0.5;
```

### Image Processing

```rust
// Sharpen: edge enhancement (0.0-1.0)
uniforms.sharpen = 0.5;

// Feedback amount: recursive frame blending
uniforms.feedback_amount = 0.3;
```

## Combining Effects

Effects can be layered for complex looks:

```rust
// Cyberpunk aesthetic
state.uniforms.chromatic_aberration = 0.015;
state.uniforms.crt_scanlines = 0.2;
state.uniforms.vignette = 0.4;
state.uniforms.color_grade_mode = ColorGradeMode::Cyberpunk as f32;
state.uniforms.glow_intensity = 0.3;

// VHS tape look
state.uniforms.vhs_distortion = 0.4;
state.uniforms.crt_scanlines = 0.3;
state.uniforms.film_grain = 0.15;
state.uniforms.chromatic_aberration = 0.01;
state.uniforms.saturation = 0.8;

// Psychedelic visualizer
state.uniforms.kaleidoscope_segments = 8.0;
state.uniforms.plasma_intensity = 0.3;
state.uniforms.hue_rotation = time * 0.1;
state.uniforms.wave_distortion = 0.2;
```

## Music-Reactive Effects

Combine with AudioAnalyzer for reactive visuals:

```rust
fn run_systems(&mut self, world: &mut World) {
    self.analyzer.analyze_at_time(self.time);

    if let Some(state_handle) = &self.effects_state {
        if let Ok(mut state) = state_handle.write() {
            // Chromatic aberration on bass
            state.uniforms.chromatic_aberration =
                self.analyzer.smoothed_bass * 0.05;

            // Glitch on snare hits
            state.uniforms.glitch_intensity =
                self.analyzer.snare_decay * 0.5;

            // Zoom pulse on kick
            state.uniforms.zoom_pulse =
                self.analyzer.kick_decay * 0.3;

            // Color cycling based on energy
            state.uniforms.hue_rotation =
                self.time * self.analyzer.intensity * 0.2;

            // Screen shake on drops
            if self.analyzer.is_dropping {
                state.uniforms.screen_shake =
                    self.analyzer.drop_intensity * 0.1;
            } else {
                state.uniforms.screen_shake *= 0.9;
            }

            // Switch to tunnel during breakdown
            if self.analyzer.is_breakdown {
                state.uniforms.raymarch_mode = RaymarchMode::Tunnel as f32;
                state.uniforms.raymarch_blend =
                    self.analyzer.breakdown_intensity * 0.5;
            } else {
                state.uniforms.raymarch_blend *= 0.95;
            }
        }
    }
}
```

## Custom Input/Output Slots

By default, the EffectsPass reads from "input" and writes to "output". Configure custom slots:

```rust
let effects_pass = EffectsPass::with_slots(
    device,
    surface_format,
    effects_state,
    "post_bloom",    // Input slot name
    "final_output"   // Output slot name
);
```

## Disabling the Pass

Temporarily bypass all effects:

```rust
if let Ok(mut state) = state_handle.write() {
    state.enabled = false; // Pass through without processing
}
```

When disabled, the pass performs a simple blit operation with no effects applied.

## Auto-Animate Hue

Enable automatic hue rotation:

```rust
if let Ok(mut state) = state_handle.write() {
    state.animate_hue = true; // Continuously rotate hue based on time
}
```

## Complete Example

```rust
use nightshade::prelude::*;
use nightshade::render::wgpu::passes::postprocess::effects::*;

struct VisualDemo {
    effects_state: Option<EffectsStateHandle>,
    analyzer: AudioAnalyzer,
    time: f32,
}

impl Default for VisualDemo {
    fn default() -> Self {
        Self {
            effects_state: None,
            analyzer: AudioAnalyzer::new(),
            time: 0.0,
        }
    }
}

impl State for VisualDemo {
    fn initialize(&mut self, world: &mut World) {
        let camera = spawn_camera(world, Vec3::new(0.0, 5.0, 10.0), "Camera".to_string());
        world.resources.active_camera = Some(camera);
        spawn_sun(world);

        // Load some geometry
        load_gltf(world, "assets/models/scene.glb");

        // Load audio for reactive effects
        let (samples, sample_rate) = load_audio_file("assets/audio/music.wav");
        self.analyzer.load_samples(samples, sample_rate);
    }

    fn run_systems(&mut self, world: &mut World) {
        let dt = world.resources.window.timing.delta_time;
        self.time += dt;

        // Analyze audio
        self.analyzer.analyze_at_time(self.time);

        // Update effects based on audio
        if let Some(state_handle) = &self.effects_state {
            if let Ok(mut state) = state_handle.write() {
                // Base effects
                state.uniforms.vignette = 0.3;
                state.uniforms.crt_scanlines = 0.15;

                // Audio-reactive
                state.uniforms.chromatic_aberration =
                    self.analyzer.smoothed_bass * 0.04;
                state.uniforms.glow_intensity =
                    self.analyzer.intensity * 0.5;
                state.uniforms.zoom_pulse =
                    self.analyzer.kick_decay * 0.2;

                // Structure-based
                if self.analyzer.is_dropping {
                    state.uniforms.color_grade_mode =
                        ColorGradeMode::Cyberpunk as f32;
                    state.uniforms.strobe =
                        self.analyzer.drop_intensity * 0.3;
                } else if self.analyzer.is_breakdown {
                    state.uniforms.color_grade_mode =
                        ColorGradeMode::Grayscale as f32;
                } else {
                    state.uniforms.color_grade_mode =
                        ColorGradeMode::None as f32;
                    state.uniforms.strobe = 0.0;
                }
            }
        }
    }

    fn configure_render_graph(
        &mut self,
        graph: &mut RenderGraph<World>,
        device: &wgpu::Device,
        surface_format: wgpu::TextureFormat,
        resources: RenderResources,
    ) {
        // Add standard passes first...

        // Create effects pass
        let effects_state = create_effects_state();
        self.effects_state = Some(effects_state.clone());

        let effects_pass = EffectsPass::new(device, surface_format, effects_state);
        graph.add_pass(Box::new(effects_pass));
    }
}

fn main() {
    nightshade::launch(VisualDemo::default());
}
```

## Parameter Reference

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `time` | 0.0+ | 0.0 | Elapsed time (auto-updated) |
| `chromatic_aberration` | 0.0-0.1 | 0.0 | RGB channel offset |
| `wave_distortion` | 0.0-1.0 | 0.0 | Sinusoidal screen warp |
| `color_shift` | 0.0-1.0 | 0.0 | Global color offset |
| `kaleidoscope_segments` | 0-16 | 0.0 | Mirror segment count |
| `crt_scanlines` | 0.0-1.0 | 0.0 | Scanline intensity |
| `vignette` | 0.0-1.0 | 0.0 | Edge darkening |
| `plasma_intensity` | 0.0-1.0 | 0.0 | Plasma overlay strength |
| `glitch_intensity` | 0.0-1.0 | 0.0 | Digital glitch amount |
| `mirror_mode` | 0.0-1.0 | 0.0 | Screen mirroring |
| `invert` | 0.0-1.0 | 0.0 | Color inversion |
| `hue_rotation` | 0.0-1.0 | 0.0 | Hue shift amount |
| `raymarch_mode` | 0-5 | 0.0 | Raymarch effect type |
| `raymarch_blend` | 0.0-1.0 | 0.0 | Raymarch overlay blend |
| `film_grain` | 0.0-1.0 | 0.0 | Noise grain intensity |
| `sharpen` | 0.0-1.0 | 0.0 | Edge sharpening |
| `pixelate` | 0-64 | 0.0 | Pixel size (0=off) |
| `color_posterize` | 0-16 | 0.0 | Color quantization |
| `radial_blur` | 0.0-1.0 | 0.0 | Center blur amount |
| `tunnel_speed` | 0.0-5.0 | 1.0 | Tunnel animation speed |
| `fractal_iterations` | 1-8 | 4.0 | Fractal detail level |
| `glow_intensity` | 0.0-1.0 | 0.0 | Bloom-like glow |
| `screen_shake` | 0.0-0.5 | 0.0 | Camera shake offset |
| `zoom_pulse` | 0.0-1.0 | 0.0 | Rhythmic zoom amount |
| `speed_lines` | 0.0-1.0 | 0.0 | Motion line intensity |
| `color_grade_mode` | 0-6 | 0.0 | Color grading preset |
| `vhs_distortion` | 0.0-1.0 | 0.0 | VHS tape wobble |
| `lens_flare` | 0.0-1.0 | 0.0 | Light flare intensity |
| `edge_glow` | 0.0-1.0 | 0.0 | Edge highlight amount |
| `saturation` | 0.0-2.0 | 1.0 | Color saturation |
| `warp_speed` | 0.0-1.0 | 0.0 | Hyperspace stretch |
| `pulse_rings` | 0.0-1.0 | 0.0 | Expanding ring effect |
| `heat_distortion` | 0.0-1.0 | 0.0 | Heat shimmer amount |
| `digital_rain` | 0.0-1.0 | 0.0 | Matrix rain effect |
| `strobe` | 0.0-1.0 | 0.0 | Flash intensity |
| `color_cycle_speed` | 0.0-5.0 | 1.0 | Auto color animation rate |
| `feedback_amount` | 0.0-1.0 | 0.0 | Frame feedback blend |
| `ascii_mode` | 0.0-1.0 | 0.0 | ASCII art conversion |
