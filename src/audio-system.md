# Audio System

> **Live Demo:** [Audio](https://matthewberger.dev/nightshade/audio)

Nightshade uses Kira for audio playback, supporting both sound effects and music.

## Enabling Audio

Audio requires the `audio` feature:

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "audio"] }
```

## Playing Sounds

### Basic Playback

```rust
use nightshade::ecs::audio::*;

// Play a sound effect
play_sound(world, "explosion", PlaybackSettings::default());

// Play with custom settings
play_sound(world, "footstep", PlaybackSettings {
    volume: 0.5,
    speed: 1.0,
    loop_sound: false,
});
```

### Loading Sounds

Load sounds at initialization:

```rust
const EXPLOSION_WAV: &[u8] = include_bytes!("../assets/sounds/explosion.wav");
const MUSIC_OGG: &[u8] = include_bytes!("../assets/sounds/music.ogg");

fn initialize(&mut self, world: &mut World) {
    load_sound(world, "explosion", EXPLOSION_WAV);
    load_sound(world, "music", MUSIC_OGG);
}
```

## Background Music

### Play Music

```rust
fn start_music(world: &mut World) {
    play_sound(world, "music", PlaybackSettings {
        volume: 0.7,
        speed: 1.0,
        loop_sound: true,
    });
}
```

### Control Music

```rust
// Stop music
stop_sound(world, "music");

// Pause music
pause_sound(world, "music");

// Resume music
resume_sound(world, "music");

// Fade out
fade_sound(world, "music", 0.0, 2.0);  // Fade to 0 volume over 2 seconds
```

## Volume Control

### Master Volume

```rust
world.resources.audio.set_master_volume(0.8);
```

### Category Volumes

```rust
// Music volume
world.resources.audio.set_music_volume(0.7);

// Effects volume
world.resources.audio.set_sfx_volume(1.0);
```

## Sound Variations

Play random variations:

```rust
fn play_footstep(world: &mut World) {
    let sounds = ["footstep_1", "footstep_2", "footstep_3", "footstep_4"];
    let index = rand::random::<usize>() % sounds.len();
    play_sound(world, sounds[index], PlaybackSettings::default());
}
```

## Pitch Variation

Add variety with pitch:

```rust
fn play_with_variation(world: &mut World, sound: &str) {
    let pitch = 0.9 + rand::random::<f32>() * 0.2;  // 0.9 to 1.1
    play_sound(world, sound, PlaybackSettings {
        speed: pitch,
        ..Default::default()
    });
}
```

## Audio Source Component

Attach sounds to entities:

```rust
let entity = world.spawn_entities(AUDIO_SOURCE | LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];

world.set_audio_source(entity, AudioSource::new("engine_loop")
    .with_spatial(true)
    .with_looping(true)
    .playing(),
);
```

## Audio Listener

Mark the entity that "hears" sounds (usually the camera):

```rust
world.set_audio_listener(camera_entity, AudioListener);
```

## Triggering Sounds on Events

```rust
fn run_systems(&mut self, world: &mut World) {
    // Play sound on collision
    for event in world.resources.physics.collision_events() {
        if event.started {
            play_sound(world, "impact", PlaybackSettings::default());
        }
    }

    // Play sound on input
    if world.resources.input.keyboard.is_key_just_pressed(KeyCode::Space) {
        play_sound(world, "jump", PlaybackSettings::default());
    }
}
```

## Sound Cooldowns

Prevent sound spam:

```rust
struct SoundCooldowns {
    footstep_timer: f32,
}

fn try_play_footstep(world: &mut World, cooldowns: &mut SoundCooldowns, dt: f32) {
    cooldowns.footstep_timer -= dt;

    if cooldowns.footstep_timer <= 0.0 {
        play_sound(world, "footstep", PlaybackSettings::default());
        cooldowns.footstep_timer = 0.3;  // 300ms cooldown
    }
}
```

## Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| WAV | .wav | Uncompressed, fast loading |
| OGG | .ogg | Compressed, good for music |
| MP3 | .mp3 | Compressed, widely supported |
| FLAC | .flac | Lossless compression |

## Memory Management

Unload sounds when not needed:

```rust
// Unload a specific sound
unload_sound(world, "explosion");

// Unload all sounds (e.g., on level change)
clear_all_sounds(world);
```
