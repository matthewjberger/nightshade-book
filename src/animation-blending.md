# Blending & Transitions

> **Live Demos:** [Dance](https://matthewberger.dev/nightshade/dance) | [Morph Targets](https://matthewberger.dev/nightshade/morph)

Smooth transitions between animations using cross-fading.

## Cross-Fade Transition

The `blend_to` method smoothly transitions between animations:

```rust
if let Some(player) = world.get_animation_player_mut(entity) {
    player.blend_to(new_animation_index, 0.2);  // 0.2 second transition
}
```

## Blend Duration

Choose appropriate durations:

| Transition | Duration | Notes |
|------------|----------|-------|
| Idle → Walk | 0.2s | Natural start |
| Walk → Run | 0.15s | Quick acceleration |
| Run → Idle | 0.3s | Gradual stop |
| Any → Jump | 0.1s | Responsive |
| Attack | 0.05s | Immediate |

## Movement State Machine

Manage animation states cleanly:

```rust
#[derive(Clone, Copy, PartialEq, Eq)]
enum CharacterState {
    Idle,
    Walking,
    Running,
    Jumping,
    Falling,
    Landing,
}

struct AnimationController {
    state: CharacterState,
    current_animation: Option<usize>,
    indices: AnimationIndices,
}

impl AnimationController {
    fn update(&mut self, world: &mut World, entity: Entity, new_state: CharacterState) {
        if self.state == new_state {
            return;
        }

        let blend_time = self.get_blend_time(self.state, new_state);
        let target_anim = self.get_animation_for_state(new_state);

        if let Some(index) = target_anim {
            if let Some(player) = world.get_animation_player_mut(entity) {
                player.blend_to(index, blend_time);
                self.current_animation = Some(index);
            }
        }

        self.state = new_state;
    }

    fn get_blend_time(&self, from: CharacterState, to: CharacterState) -> f32 {
        match (from, to) {
            (CharacterState::Idle, CharacterState::Walking) => 0.2,
            (CharacterState::Walking, CharacterState::Running) => 0.15,
            (CharacterState::Running, CharacterState::Idle) => 0.3,
            (_, CharacterState::Jumping) => 0.1,
            _ => 0.2,
        }
    }

    fn get_animation_for_state(&self, state: CharacterState) -> Option<usize> {
        match state {
            CharacterState::Idle => self.indices.idle,
            CharacterState::Walking => self.indices.walk,
            CharacterState::Running => self.indices.run,
            CharacterState::Jumping => self.indices.jump,
            CharacterState::Falling => self.indices.jump,  // Reuse jump
            CharacterState::Landing => self.indices.idle,   // Brief idle
        }
    }
}
```

## Speed-Based Blending

Blend between walk and run based on speed:

```rust
fn update_locomotion(world: &mut World, entity: Entity, speed: f32, indices: &AnimationIndices) {
    let walk_threshold = 2.0;
    let run_threshold = 5.0;

    let state = if speed < 0.1 {
        MovementState::Idle
    } else if speed < walk_threshold {
        MovementState::Walking
    } else {
        MovementState::Running
    };

    let target_anim = match state {
        MovementState::Idle => indices.idle,
        MovementState::Walking => indices.walk,
        MovementState::Running => indices.run,
    };

    if let Some(index) = target_anim {
        if let Some(player) = world.get_animation_player_mut(entity) {
            if player.current_clip != index {
                player.blend_to(index, 0.2);
            }

            // Adjust playback speed
            player.speed = match state {
                MovementState::Idle => 1.0,
                MovementState::Walking => speed / walk_threshold,
                MovementState::Running => speed / run_threshold,
            };
        }
    }
}
```

## Interrupt Handling

Handle animation interrupts gracefully:

```rust
fn try_attack(world: &mut World, entity: Entity, attack_anim: usize, current_state: &mut CharacterState) -> bool {
    if let Some(player) = world.get_animation_player_mut(entity) {
        // Quick blend to attack
        player.blend_to(attack_anim, 0.05);
        player.looping = false;
        *current_state = CharacterState::Attacking;
        return true;
    }
    false
}

fn check_attack_finished(world: &World, entity: Entity) -> bool {
    if let Some(player) = world.get_animation_player(entity) {
        if !player.looping {
            let clip = &player.clips[player.current_clip];
            return player.time >= clip.duration * 0.9;  // 90% complete
        }
    }
    false
}
```

## Additive Blending

Layer animations (e.g., breathing on top of idle):

```rust
// Note: This is a conceptual example - actual implementation depends on engine support
struct LayeredAnimation {
    base_animation: usize,
    additive_animations: Vec<(usize, f32)>,  // (index, weight)
}
```

## Root Motion

When animations include movement:

```rust
fn apply_root_motion(world: &mut World, entity: Entity) {
    let Some(player) = world.get_animation_player(entity) else { return };

    let clip = &player.clips[player.current_clip];
    // Extract root bone translation from animation
    // Apply to character controller

    // Note: Often you'll want to remove root motion from animations
    // and drive movement from game code instead
}
```

## Transition Rules

Define clear rules for when transitions can occur:

```rust
fn can_transition(from: CharacterState, to: CharacterState) -> bool {
    match (from, to) {
        // Can always go to these states
        (_, CharacterState::Idle) => true,
        (_, CharacterState::Falling) => true,

        // Can't interrupt attacks
        (CharacterState::Attacking, _) => false,

        // Can only jump from ground
        (CharacterState::Falling, CharacterState::Jumping) => false,
        (CharacterState::Jumping, CharacterState::Jumping) => false,

        _ => true,
    }
}
```
