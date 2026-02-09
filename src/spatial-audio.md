# Spatial Audio

3D positional audio creates immersive soundscapes where sounds have position and direction.

## Audio Listener

The listener is the "ear" in the scene - usually attached to the camera:

```rust
fn initialize(&mut self, world: &mut World) {
    let camera = spawn_camera(world, Vec3::new(0.0, 2.0, 10.0), "Camera".to_string());
    world.resources.active_camera = Some(camera);

    // Make camera the audio listener
    world.set_audio_listener(camera, AudioListener);
}
```

## Spatial Audio Source

Attach sounds to entities for positional audio:

```rust
fn spawn_ambient_sound(world: &mut World, position: Vec3, sound: &str) -> Entity {
    let entity = world.spawn_entities(
        AUDIO_SOURCE | LOCAL_TRANSFORM | GLOBAL_TRANSFORM,
        1
    )[0];

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        ..Default::default()
    });

    world.set_audio_source(entity, AudioSource::new(sound)
        .with_spatial(true)
        .with_looping(true)
        .playing(),
    );

    entity
}
```

## Distance Attenuation

Sounds get quieter with distance:

```rust
world.set_audio_source(entity, AudioSource::new("waterfall")
    .with_spatial(true)
    .with_looping(true)
    .playing(),
);
```

### Rolloff Modes

| Mode | Description |
|------|-------------|
| `Linear` | Linear falloff between min/max distance |
| `Inverse` | Realistic 1/distance falloff |
| `Exponential` | Steep falloff, good for small sounds |

## Moving Sound Sources

Sounds automatically track their entity's position:

```rust
fn update_helicopter(world: &mut World, helicopter: Entity, dt: f32) {
    if let Some(transform) = world.get_local_transform_mut(helicopter) {
        // Move the helicopter
        transform.translation.x += 10.0 * dt;
    }
    world.mark_local_transform_dirty(helicopter);
    // Audio position updates automatically
}
```

## Doppler Effect

Moving sounds experience pitch shift:

```rust
world.resources.audio.set_doppler_factor(1.0);  // 0 = off, 1 = realistic
```

## Reverb Zones

Create ambient reverb for different environments:

```rust
fn set_cave_reverb(world: &mut World) {
    world.resources.audio.set_reverb(ReverbSettings {
        room_size: 0.9,
        damping: 0.3,
        wet_mix: 0.6,
        dry_mix: 0.8,
    });
}

fn set_outdoor_reverb(world: &mut World) {
    world.resources.audio.set_reverb(ReverbSettings {
        room_size: 0.2,
        damping: 0.8,
        wet_mix: 0.1,
        dry_mix: 1.0,
    });
}
```

## Non-Spatial (2D) Audio

UI sounds and music should not be spatial:

```rust
world.set_audio_source(entity, AudioSource::new("ui_click")
    .playing(),
);
```

## Directional Audio Sources

Some sounds are directional (like a speaker):

```rust
world.set_audio_source(entity, AudioSource::new("announcement")
    .with_spatial(true)
    .playing(),
);
```

## Multiple Listeners (Split-Screen)

For split-screen games:

```rust
// Not typically supported - most games use single listener
// For split-screen, consider:
// 1. Use the average position of both players
// 2. Disable spatial audio and use manual panning
```

## Audio Occlusion

Simple occlusion with raycast:

```rust
fn update_audio_occlusion(world: &mut World, source: Entity, listener: Entity) {
    let source_pos = world.get_global_transform(source).map(|t| t.translation());
    let listener_pos = world.get_global_transform(listener).map(|t| t.translation());

    if let (Some(src), Some(lst)) = (source_pos, listener_pos) {
        let direction = (lst - src).normalize();
        let distance = (lst - src).magnitude();

        // Check if something blocks the sound
        if let Some(_hit) = raycast(world, src, direction, distance) {
            // Something in the way - muffle the sound
            if let Some(audio) = world.get_audio_source_mut(source) {
                audio.volume = 0.3;
            }
        } else {
            // Clear path
            if let Some(audio) = world.get_audio_source_mut(source) {
                audio.volume = 1.0;
            }
        }
    }
}
```

## Common Patterns

### Ambient Soundscape

```rust
fn setup_forest_ambience(world: &mut World) {
    // Background ambient loop (non-spatial)
    spawn_ambient_sound(world, Vec3::zeros(), "forest_ambient");

    // Positioned bird sounds
    spawn_ambient_sound(world, Vec3::new(10.0, 5.0, 0.0), "bird_chirp");
    spawn_ambient_sound(world, Vec3::new(-8.0, 4.0, 5.0), "bird_song");

    // Stream
    spawn_ambient_sound(world, Vec3::new(0.0, 0.0, 20.0), "stream");
}
```

### Footstep System

```rust
fn play_footstep_at_position(world: &mut World, position: Vec3) {
    let entity = world.spawn_entities(AUDIO_SOURCE | LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        ..Default::default()
    });

    world.set_audio_source(entity, AudioSource::new("footstep")
        .with_spatial(true)
        .playing(),
    );
}
```
