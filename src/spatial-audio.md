# Spatial Audio

3D positional audio creates immersive soundscapes where sounds have position and direction.

## Audio Listener

The listener is the "ear" in the scene, represented as an entity with the `AUDIO_LISTENER` component. Usually attached to the camera:

```rust
fn initialize(&mut self, world: &mut World) {
    let camera = spawn_camera(world, Vec3::new(0.0, 2.0, 10.0), "Camera".to_string());
    world.resources.active_camera = Some(camera);

    world.set_audio_listener(camera, AudioListener);
}
```

## Spatial Audio Source

Attach sounds to entities for positional audio:

```rust
const AMBIENT_LOOP: &[u8] = include_bytes!("../assets/sounds/ambient.wav");

fn spawn_ambient_sound(world: &mut World, position: Vec3, data: &[u8]) -> Entity {
    let entity = world.spawn_entities(
        AUDIO_SOURCE | LOCAL_TRANSFORM | GLOBAL_TRANSFORM,
        1
    )[0];

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        ..Default::default()
    });

    world.set_audio_source(entity, AudioSource::new(data)
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
const WATERFALL: &[u8] = include_bytes!("../assets/sounds/waterfall.wav");

world.set_audio_source(entity, AudioSource::new(WATERFALL)
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
        transform.translation.x += 10.0 * dt;
    }
    world.mark_local_transform_dirty(helicopter);
}
```

## Non-Spatial (2D) Audio

UI sounds and music should not be spatial:

```rust
const UI_CLICK: &[u8] = include_bytes!("../assets/sounds/ui_click.wav");

world.set_audio_source(entity, AudioSource::new(UI_CLICK)
    .playing(),
);
```

## Directional Audio Sources

Some sounds are directional (like a speaker):

```rust
const ANNOUNCEMENT: &[u8] = include_bytes!("../assets/sounds/announcement.wav");

world.set_audio_source(entity, AudioSource::new(ANNOUNCEMENT)
    .with_spatial(true)
    .playing(),
);
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

        if let Some(_hit) = raycast(world, src, direction, distance) {
            if let Some(audio) = world.get_audio_source_mut(source) {
                audio.volume = 0.3;
            }
        } else {
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
const FOREST_AMBIENT: &[u8] = include_bytes!("../assets/sounds/forest_ambient.wav");
const BIRD_CHIRP: &[u8] = include_bytes!("../assets/sounds/bird_chirp.wav");
const BIRD_SONG: &[u8] = include_bytes!("../assets/sounds/bird_song.wav");
const STREAM: &[u8] = include_bytes!("../assets/sounds/stream.wav");

fn setup_forest_ambience(world: &mut World) {
    spawn_ambient_sound(world, Vec3::zeros(), FOREST_AMBIENT);

    spawn_ambient_sound(world, Vec3::new(10.0, 5.0, 0.0), BIRD_CHIRP);
    spawn_ambient_sound(world, Vec3::new(-8.0, 4.0, 5.0), BIRD_SONG);

    spawn_ambient_sound(world, Vec3::new(0.0, 0.0, 20.0), STREAM);
}
```

### Footstep System

```rust
const FOOTSTEP: &[u8] = include_bytes!("../assets/sounds/footstep.wav");

fn play_footstep_at_position(world: &mut World, position: Vec3) {
    let entity = world.spawn_entities(AUDIO_SOURCE | LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        ..Default::default()
    });

    world.set_audio_source(entity, AudioSource::new(FOOTSTEP)
        .with_spatial(true)
        .playing(),
    );
}
```
