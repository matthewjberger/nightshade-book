# Character Controllers

Character controllers provide smooth player movement with collision handling, slopes, and stairs.

## First-Person Player

The easiest way to get started:

```rust
use nightshade::ecs::physics::character::*;

fn initialize(&mut self, world: &mut World) {
    let (player_entity, camera_entity) = spawn_first_person_player(
        world,
        Vec3::new(0.0, 2.0, 0.0),  // Spawn position
    );

    self.player = Some(player_entity);
    world.resources.active_camera = Some(camera_entity);

    // Customize controller
    if let Some(controller) = world.get_character_controller_mut(player_entity) {
        controller.max_speed = 5.0;
        controller.sprint_speed_multiplier = 2.0;
        controller.jump_impulse = 6.0;
    }
}
```

## Custom Character Controller

For third-person or specialized characters:

```rust
fn spawn_character(world: &mut World, position: Vec3) -> Entity {
    let entity = world.spawn_entities(
        NAME | LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY | CHARACTER_CONTROLLER,
        1,
    )[0];

    world.set_name(entity, Name("Player".to_string()));
    world.set_local_transform(entity, LocalTransform {
        translation: position,
        ..Default::default()
    });

    if let Some(controller) = world.get_character_controller_mut(entity) {
        *controller = CharacterControllerComponent::new_capsule(0.5, 0.3);
        controller.max_speed = 3.0;
        controller.acceleration = 15.0;
        controller.deceleration = 20.0;
        controller.jump_impulse = 4.0;
        controller.sprint_speed_multiplier = 2.0;
        controller.crouch_enabled = false;
    }

    entity
}
```

## Controller Properties

| Property | Description | Default |
|----------|-------------|---------|
| `max_speed` | Walking speed | 5.0 |
| `sprint_speed_multiplier` | Sprint multiplier | 1.5 |
| `acceleration` | Speed up rate | 20.0 |
| `deceleration` | Slow down rate | 25.0 |
| `jump_impulse` | Jump strength | 5.0 |
| `gravity_multiplier` | Fall speed modifier | 1.0 |
| `crouch_enabled` | Allow crouching | true |
| `crouch_height` | Height when crouched | 0.6 |

## Movement Input

Character controllers automatically process input, but you can also control them manually:

```rust
fn custom_movement_system(world: &mut World, player: Entity) {
    let input = &world.resources.input;

    // Gather movement direction
    let mut direction = Vec3::zeros();
    if input.keyboard.is_key_pressed(KeyCode::KeyW) {
        direction.z -= 1.0;
    }
    if input.keyboard.is_key_pressed(KeyCode::KeyS) {
        direction.z += 1.0;
    }
    if input.keyboard.is_key_pressed(KeyCode::KeyA) {
        direction.x -= 1.0;
    }
    if input.keyboard.is_key_pressed(KeyCode::KeyD) {
        direction.x += 1.0;
    }

    if let Some(controller) = world.get_character_controller_mut(player) {
        controller.input_direction = direction;
        controller.wants_jump = input.keyboard.is_key_pressed(KeyCode::Space);
        controller.wants_sprint = input.keyboard.is_key_pressed(KeyCode::ShiftLeft);
    }
}
```

## Ground Detection

Check if the character is grounded:

```rust
if let Some(controller) = world.get_character_controller(player) {
    if controller.is_grounded {
        // On ground - can jump
    } else {
        // In air
    }
}
```

## Slope Handling

Controllers automatically handle slopes:

```rust
if let Some(controller) = world.get_character_controller_mut(player) {
    controller.max_slope_angle = 0.8;  // ~45 degrees in radians
}
```

## Camera Integration

### First-Person Camera

The camera is a child of the player:

```rust
let camera = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | CAMERA | PERSPECTIVE_CAMERA | PARENT,
    1
)[0];

world.update_parent(camera, Some(Parent(Some(player))));
world.set_local_transform(camera, LocalTransform {
    translation: Vec3::new(0.0, 0.8, 0.0),  // Eye height
    ..Default::default()
});

world.resources.active_camera = Some(camera);
```

### Third-Person Camera

Follow the character with an offset:

```rust
fn third_person_camera_system(world: &mut World, player: Entity, camera: Entity) {
    let Some(player_pos) = world.get_local_transform(player).map(|t| t.translation) else {
        return;
    };

    // Camera behind and above player
    let offset = Vec3::new(0.0, 3.0, 8.0);
    let target_pos = player_pos + offset;

    if let Some(pan_orbit) = world.get_pan_orbit_camera_mut(camera) {
        pan_orbit.target_focus = player_pos + Vec3::new(0.0, 1.0, 0.0);
    }
}
```

## Step Climbing

Controllers can automatically climb small steps:

```rust
if let Some(controller) = world.get_character_controller_mut(player) {
    controller.max_step_height = 0.3;  // Can climb 30cm steps
    controller.min_step_width = 0.1;   // Minimum step width
}
```

## Interaction Cooldowns

Prevent rapid repeated actions:

```rust
struct PlayerState {
    interaction_cooldown: f32,
}

fn update_cooldown(state: &mut PlayerState, dt: f32) {
    state.interaction_cooldown = (state.interaction_cooldown - dt).max(0.0);
}

fn can_interact(state: &PlayerState) -> bool {
    state.interaction_cooldown <= 0.0
}

fn set_cooldown(state: &mut PlayerState, duration: f32) {
    state.interaction_cooldown = duration;
}
```
