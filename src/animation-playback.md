# Animation Playback

Control animation playback through the `AnimationPlayer` component.

## AnimationPlayer Component

```rust
pub struct AnimationPlayer {
    pub clips: Vec<AnimationClip>,
    pub current_clip: usize,
    pub playing: bool,
    pub speed: f32,
    pub time: f32,
    pub looping: bool,
    pub crossfade_duration: f32,
    pub bone_mapping: HashMap<String, Entity>,
}
```

## Basic Playback

```rust
fn play_animation(world: &mut World, entity: Entity, clip_index: usize) {
    if let Some(player) = world.get_animation_player_mut(entity) {
        player.current_clip = clip_index;
        player.time = 0.0;
        player.playing = true;
        player.looping = true;
    }
}
```

## Controlling Speed

```rust
fn set_animation_speed(world: &mut World, entity: Entity, speed: f32) {
    if let Some(player) = world.get_animation_player_mut(entity) {
        player.speed = speed;  // 1.0 = normal, 0.5 = half speed, 2.0 = double
    }
}
```

## Pausing and Resuming

```rust
fn pause_animation(world: &mut World, entity: Entity) {
    if let Some(player) = world.get_animation_player_mut(entity) {
        player.playing = false;
    }
}

fn resume_animation(world: &mut World, entity: Entity) {
    if let Some(player) = world.get_animation_player_mut(entity) {
        player.playing = true;
    }
}
```

## Looping

```rust
fn set_looping(world: &mut World, entity: Entity, looping: bool) {
    if let Some(player) = world.get_animation_player_mut(entity) {
        player.looping = looping;
    }
}
```

## Checking Animation State

```rust
fn is_animation_finished(world: &World, entity: Entity) -> bool {
    if let Some(player) = world.get_animation_player(entity) {
        if !player.looping {
            let clip = &player.clips[player.current_clip];
            return player.time >= clip.duration;
        }
    }
    false
}

fn get_animation_progress(world: &World, entity: Entity) -> f32 {
    if let Some(player) = world.get_animation_player(entity) {
        let clip = &player.clips[player.current_clip];
        player.time / clip.duration
    } else {
        0.0
    }
}
```

## Animation by Name

Find and play animations by name:

```rust
fn play_animation_by_name(world: &mut World, entity: Entity, name: &str) -> bool {
    if let Some(player) = world.get_animation_player_mut(entity) {
        for (index, clip) in player.clips.iter().enumerate() {
            if clip.name.to_lowercase().contains(&name.to_lowercase()) {
                player.current_clip = index;
                player.time = 0.0;
                player.playing = true;
                return true;
            }
        }
    }
    false
}
```

## State-Based Animation

Common pattern for character animation:

```rust
#[derive(Clone, Copy, PartialEq)]
enum MovementState {
    Idle,
    Walking,
    Running,
    Jumping,
}

fn update_character_animation(
    world: &mut World,
    entity: Entity,
    state: MovementState,
    indices: &AnimationIndices,
    current: &mut Option<usize>,
) {
    let target = match state {
        MovementState::Idle => indices.idle,
        MovementState::Walking => indices.walk,
        MovementState::Running => indices.run,
        MovementState::Jumping => indices.jump,
    };

    // Only change if different
    if target != *current {
        if let Some(index) = target {
            if let Some(player) = world.get_animation_player_mut(entity) {
                player.blend_to(index, 0.2);  // Smooth transition
                *current = Some(index);
            }
        }
    }
}
```

## Speed Based on Movement

Match animation speed to movement speed:

```rust
fn sync_animation_to_movement(world: &mut World, entity: Entity, velocity: f32) {
    if let Some(player) = world.get_animation_player_mut(entity) {
        // Assuming walk animation matches 3 m/s
        let base_speed = 3.0;
        player.speed = (velocity / base_speed).clamp(0.5, 2.0);
    }
}
```

## One-Shot Animations

Play an animation once without looping:

```rust
fn play_once(world: &mut World, entity: Entity, clip_index: usize) {
    if let Some(player) = world.get_animation_player_mut(entity) {
        player.current_clip = clip_index;
        player.time = 0.0;
        player.playing = true;
        player.looping = false;
    }
}
```

## Animation Events

Trigger events at specific times:

```rust
fn check_animation_events(world: &World, entity: Entity, event_time: f32) -> bool {
    if let Some(player) = world.get_animation_player(entity) {
        let prev_time = player.time - world.resources.window.timing.delta_time * player.speed;
        // Check if we crossed the event time this frame
        prev_time < event_time && player.time >= event_time
    } else {
        false
    }
}

// Usage: Play footstep sound at specific animation times
fn footstep_system(world: &mut World, character: Entity) {
    if check_animation_events(world, character, 0.3) {
        play_sound(world, "footstep_left");
    }
    if check_animation_events(world, character, 0.8) {
        play_sound(world, "footstep_right");
    }
}
```
