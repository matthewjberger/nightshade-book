# Audio Analyzer

The AudioAnalyzer provides real-time FFT-based spectral analysis for music-reactive applications. It extracts frequency bands, detects beats, estimates tempo, and identifies musical structure changes like buildups, drops, and breakdowns.

## Enabling the Feature

The AudioAnalyzer requires the `fft` feature flag:

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "audio", "fft"] }
```

## Creating an Analyzer

```rust
use nightshade::prelude::*;

let mut analyzer = AudioAnalyzer::new();

// Optional: configure sample rate and FFT size
let analyzer = AudioAnalyzer::new()
    .with_sample_rate(44100)
    .with_fft_size(4096);
```

## Loading Audio Samples

Load audio samples before analysis:

```rust
// samples: Vec<f32> of audio data (mono, normalized to -1.0..1.0)
// sample_rate: typically 44100 or 48000
analyzer.load_samples(samples, sample_rate);

// Check if samples are loaded
if analyzer.has_samples() {
    let duration = analyzer.total_duration();
    let rate = analyzer.sample_rate();
}
```

## Analyzing Audio

Call `analyze_at_time` each frame with the current playback position:

```rust
fn run_systems(&mut self, world: &mut World) {
    let current_time = self.playback_time; // seconds
    self.analyzer.analyze_at_time(current_time);

    // Now use analysis results
    let bass_level = self.analyzer.smoothed_bass;
}
```

## Frequency Bands

The analyzer splits the spectrum into six frequency bands:

| Band | Frequency Range | Use Cases |
|------|-----------------|-----------|
| `sub_bass` | 20-60 Hz | Deep rumble, sub drops |
| `bass` | 60-250 Hz | Kick drums, bass lines |
| `low_mids` | 250-500 Hz | Guitar body, warmth |
| `mids` | 500-2000 Hz | Vocals, melody |
| `high_mids` | 2000-4000 Hz | Presence, clarity |
| `highs` | 4000-12000 Hz | Hi-hats, cymbals, air |

Each band has raw and smoothed variants:

```rust
// Raw values (instant, can be jumpy)
analyzer.sub_bass
analyzer.bass
analyzer.low_mids
analyzer.mids
analyzer.high_mids
analyzer.highs

// Smoothed values (attack/release filtered)
analyzer.smoothed_sub_bass
analyzer.smoothed_bass
analyzer.smoothed_low_mids
analyzer.smoothed_mids
analyzer.smoothed_high_mids
analyzer.smoothed_highs
```

Values are normalized to 0.0-1.0 range using dB scaling.

## Beat Detection

The analyzer detects different drum elements:

```rust
// General onset detection
if analyzer.onset_detected {
    // Any significant transient occurred
}
analyzer.onset_decay  // 0.0-1.0, decays after onset

// Drum-specific detection
analyzer.kick_decay   // Triggers on kick drums (low frequency transients)
analyzer.snare_decay  // Triggers on snares (mid frequency transients)
analyzer.hat_decay    // Triggers on hi-hats (high frequency transients)
```

Decay values start at 1.0 when triggered and decay over time.

### Example: Reactive Visuals

```rust
fn run_systems(&mut self, world: &mut World) {
    self.analyzer.analyze_at_time(self.time);

    // Scale objects on kick
    if let Some(transform) = world.get_local_transform_mut(self.cube) {
        let scale = 1.0 + self.analyzer.kick_decay * 0.5;
        transform.scale = Vec3::new(scale, scale, scale);
    }

    // Flash lights on snare
    if let Some(light_entity) = self.light {
        if let Some(light) = world.get_light_mut(light_entity) {
            light.intensity = 5.0 + self.analyzer.snare_decay * 20.0;
        }
    }

    // Particle burst on onset
    if self.analyzer.onset_detected {
        self.spawn_burst_particles(world);
    }
}
```

## Tempo and Beat Phase

The analyzer estimates BPM from onset timing patterns:

```rust
analyzer.estimated_bpm    // Estimated beats per minute (60-200 range)
analyzer.beat_confidence  // 0.0-1.0, confidence in BPM estimate
analyzer.beat_phase       // 0.0-1.0, position within current beat
analyzer.time_since_last_beat  // Seconds since last detected kick
```

### Example: Beat-Synced Animation

```rust
fn run_systems(&mut self, world: &mut World) {
    self.analyzer.analyze_at_time(self.time);

    // Pulse on beat (phase goes 0->1 each beat)
    let phase = self.analyzer.beat_phase;
    let pulse = 1.0 - phase; // High at beat start, low at end

    // Or use groove_sync for smooth beat alignment
    let sync = self.analyzer.groove_sync; // 1.0 at beat, 0.0 between
}
```

## Spectral Features

Advanced spectral descriptors for music analysis:

```rust
// Spectral centroid: "brightness" of sound (0.0-1.0, normalized)
analyzer.spectral_centroid
analyzer.smoothed_centroid

// Spectral flatness: noise vs tonal (0.0=tonal, 1.0=noise)
analyzer.spectral_flatness
analyzer.smoothed_flatness

// Spectral rolloff: frequency below which 85% of energy lies
analyzer.spectral_rolloff
analyzer.smoothed_rolloff

// Spectral flux: rate of spectral change
analyzer.spectral_flux

// Brightness change between frames
analyzer.brightness_delta

// Harmonic content change
analyzer.harmonic_change
```

### Example: Color Based on Brightness

```rust
fn update_material(&self, world: &mut World) {
    use nightshade::ecs::generational_registry::registry_entry_by_name_mut;

    let brightness = self.analyzer.smoothed_centroid;

    let color = [
        1.0 - brightness,
        0.2,
        brightness,
        1.0
    ];

    if let Some(mat_ref) = world.get_material_ref(self.entity).cloned() {
        if let Some(material) = registry_entry_by_name_mut(
            &mut world.resources.material_registry.registry,
            &mat_ref.name,
        ) {
            material.base_color = color;
        }
    }
}
```

## Energy and Intensity

Track overall loudness and dynamics:

```rust
// Current energy level
analyzer.average_energy     // Short-term average
analyzer.long_term_energy   // Long-term average (for normalization)

// Intensity: current energy relative to long-term (can exceed 1.0)
analyzer.intensity

// Transient vs sustained balance
analyzer.transient_energy   // How "punchy" the sound is
analyzer.sustained_energy   // How "smooth" the sound is
analyzer.transient_ratio    // transient/sustained (0.0-2.0)

// Per-band transients
analyzer.low_transient      // Sudden low frequency increase
analyzer.mid_transient      // Sudden mid frequency increase
analyzer.high_transient     // Sudden high frequency increase
```

## Music Structure Detection

Detect musical sections automatically:

```rust
// Building up (energy increasing, pre-drop)
analyzer.is_building
analyzer.build_intensity  // 0.0-1.0, increases during buildup

// Drop (sudden energy increase with kick)
analyzer.is_dropping
analyzer.drop_intensity   // Starts at 1.0, decays

// Breakdown (low energy section)
analyzer.is_breakdown
analyzer.breakdown_intensity
```

### Example: Reactive Scene

```rust
fn run_systems(&mut self, world: &mut World) {
    self.analyzer.analyze_at_time(self.time);

    // Dim lights during breakdown
    if self.analyzer.is_breakdown {
        let intensity = 0.1 + 0.1 * self.analyzer.breakdown_intensity;
        world.resources.graphics.ambient_light = [intensity, intensity, intensity, 1.0];
    }

    // Camera shake on drop
    if self.analyzer.is_dropping {
        self.camera_shake = self.analyzer.drop_intensity * 0.5;
    }

    // Speed up particles during buildup
    if self.analyzer.is_building {
        self.particle_speed = 1.0 + self.analyzer.build_intensity * 3.0;
    }
}
```

## Groove Analysis

For tight rhythm synchronization:

```rust
// How well current timing aligns with detected beat grid
analyzer.groove_sync      // 1.0 at beat positions, 0.0 between

// Consistency of beat timing
analyzer.pocket_tightness // 0.0-1.0, higher = more consistent tempo
```

## Song Progress

Track position within the loaded audio:

```rust
let progress = analyzer.song_progress(current_time); // 0.0-1.0
```

## Resetting State

Reset all analysis state (useful when seeking or changing songs):

```rust
analyzer.reset();
```

## Complete Example

```rust
use nightshade::ecs::generational_registry::registry_entry_by_name_mut;
use nightshade::prelude::*;

struct MusicVisualizer {
    analyzer: AudioAnalyzer,
    playback_time: f32,
    cube: Option<Entity>,
    light: Option<Entity>,
}

impl Default for MusicVisualizer {
    fn default() -> Self {
        Self {
            analyzer: AudioAnalyzer::new(),
            playback_time: 0.0,
            cube: None,
            light: None,
        }
    }
}

impl State for MusicVisualizer {
    fn initialize(&mut self, world: &mut World) {
        // Load audio samples from a file (implementation depends on audio loading)
        let (samples, sample_rate) = load_audio_file("assets/audio/track.wav");
        self.analyzer.load_samples(samples, sample_rate);

        // Create scene
        self.cube = Some(spawn_cube_at(world, Vec3::zeros()));

        let light_entity = world.spawn_entities(
            LIGHT | LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY,
            1
        )[0];
        world.set_light(light_entity, Light {
            light_type: LightType::Point,
            color: Vec3::new(1.0, 1.0, 1.0),
            intensity: 10.0,
            range: 20.0,
            ..Default::default()
        });
        world.set_local_transform(light_entity, LocalTransform {
            translation: Vec3::new(0.0, 3.0, 0.0),
            ..Default::default()
        });
        self.light = Some(light_entity);

        let camera = spawn_camera(world, Vec3::new(0.0, 5.0, 10.0), "Camera".to_string());
        world.resources.active_camera = Some(camera);
        spawn_sun(world);
    }

    fn run_systems(&mut self, world: &mut World) {
        let dt = world.resources.window.timing.delta_time;
        self.playback_time += dt;

        // Analyze current audio position
        self.analyzer.analyze_at_time(self.playback_time);

        // React to bass
        if let Some(cube) = self.cube {
            if let Some(transform) = world.get_local_transform_mut(cube) {
                let bass_scale = 1.0 + self.analyzer.smoothed_bass * 0.5;
                transform.scale = Vec3::new(bass_scale, bass_scale, bass_scale);
            }

            if let Some(mat_ref) = world.get_material_ref(cube).cloned() {
                if let Some(material) = registry_entry_by_name_mut(
                    &mut world.resources.material_registry.registry,
                    &mat_ref.name,
                ) {
                    material.emissive_factor = [
                        self.analyzer.smoothed_bass,
                        self.analyzer.smoothed_mids,
                        self.analyzer.smoothed_highs,
                    ];
                    material.emissive_strength = self.analyzer.intensity * 2.0;
                }
            }
        }

        // Flash light on kick
        if let Some(light_entity) = self.light {
            if let Some(light) = world.get_light_mut(light_entity) {
                light.intensity = 5.0 + self.analyzer.kick_decay * 30.0;
            }
        }

        // Adjust ambient based on structure
        if self.analyzer.is_breakdown {
            world.resources.graphics.ambient_light = [0.05, 0.05, 0.05, 1.0];
        } else if self.analyzer.is_dropping {
            world.resources.graphics.ambient_light = [0.3, 0.3, 0.3, 1.0];
        } else {
            world.resources.graphics.ambient_light = [0.15, 0.15, 0.15, 1.0];
        }
    }
}

fn main() {
    nightshade::launch(MusicVisualizer::default());
}
```

## Constants

Internal analysis parameters:

| Constant | Value | Purpose |
|----------|-------|---------|
| `FFT_SIZE` | 4096 | FFT window size |
| `SPECTRUM_BINS` | 256 | Number of spectrum display bins |
| `ENERGY_HISTORY_SIZE` | 90 | Frames of energy history |
| `FLUX_HISTORY_SIZE` | 20 | Frames of spectral flux history |
| `ONSET_HISTORY_SIZE` | 512 | Onset times stored for tempo estimation |

## Performance Notes

- FFT analysis runs at most every 8ms to avoid redundant computation
- The analyzer is designed for pre-loaded audio, not real-time microphone input
- For best results, use uncompressed or high-quality audio (WAV, FLAC)
- Tempo estimation improves over time as more onsets are detected
