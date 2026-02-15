# Audio System

> **Live Demo:** [Audio](https://matthewberger.dev/nightshade/audio)

Nightshade uses Kira for audio playback, supporting both sound effects and music.

## Enabling Audio

Audio requires the `audio` feature:

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "audio"] }
```

## Loading Sounds

Load sounds at initialization using `world.resources.audio.load_sound`:

```rust
use nightshade::ecs::audio::*;

const EXPLOSION_WAV: &[u8] = include_bytes!("../assets/sounds/explosion.wav");
const MUSIC_OGG: &[u8] = include_bytes!("../assets/sounds/music.ogg");

fn initialize(&mut self, world: &mut World) {
    world.resources.audio.load_sound("explosion", EXPLOSION_WAV);
    world.resources.audio.load_sound("music", MUSIC_OGG);
}
```

## Playing Sounds

### Basic Playback

```rust
let handle = world.resources.audio.load_sound("explosion", EXPLOSION_WAV);
world.resources.audio.play(handle);
```

## Audio Source Component

Attach sounds to entities:

```rust
const ENGINE_LOOP: &[u8] = include_bytes!("../assets/sounds/engine_loop.wav");

let entity = world.spawn_entities(AUDIO_SOURCE | LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];

world.set_audio_source(entity, AudioSource::new(ENGINE_LOOP)
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

## Sound Variations

Play random variations:

```rust
const FOOTSTEP_1: &[u8] = include_bytes!("../assets/sounds/footstep_1.wav");
const FOOTSTEP_2: &[u8] = include_bytes!("../assets/sounds/footstep_2.wav");
const FOOTSTEP_3: &[u8] = include_bytes!("../assets/sounds/footstep_3.wav");
const FOOTSTEP_4: &[u8] = include_bytes!("../assets/sounds/footstep_4.wav");

fn initialize(&mut self, world: &mut World) {
    world.resources.audio.load_sound("footstep_1", FOOTSTEP_1);
    world.resources.audio.load_sound("footstep_2", FOOTSTEP_2);
    world.resources.audio.load_sound("footstep_3", FOOTSTEP_3);
    world.resources.audio.load_sound("footstep_4", FOOTSTEP_4);
}

fn play_footstep(world: &mut World) {
    let sounds = ["footstep_1", "footstep_2", "footstep_3", "footstep_4"];
    let index = rand::random::<usize>() % sounds.len();
    let handle = world.resources.audio.load_sound(sounds[index], &[]);
    world.resources.audio.play(handle);
}
```

## Triggering Sounds on Events

```rust
fn run_systems(&mut self, world: &mut World) {
    for event in world.resources.physics.collision_events() {
        if event.started {
            let handle = world.resources.audio.load_sound("impact", IMPACT_WAV);
            world.resources.audio.play(handle);
        }
    }
}
```

## Stopping Sounds

Stop a sound attached to an entity:

```rust
world.resources.audio.stop_sound(entity);
```

## Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| WAV | .wav | Uncompressed, fast loading |
| OGG | .ogg | Compressed, good for music |
| MP3 | .mp3 | Compressed, widely supported |
| FLAC | .flac | Lossless compression |
