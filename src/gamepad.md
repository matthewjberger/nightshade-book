# Gamepad Support

Nightshade provides cross-platform gamepad support.

## Enabling Gamepad

Gamepad requires the `gamepad` feature:

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "gamepad"] }
```

## Checking for Gamepad

```rust
fn run_systems(&mut self, world: &mut World) {
    if let Some(gamepad) = &world.resources.input.gamepad {
        handle_gamepad_input(gamepad);
    }
}
```

## Button Input

### Button States

```rust
fn handle_gamepad_input(gamepad: &Gamepad) {
    if gamepad.pressed(GamepadButton::South) {
        jump();
    }

    if gamepad.pressed(GamepadButton::West) {
        attack();
    }

    if gamepad.just_pressed(GamepadButton::North) {
        interact();
    }
}
```

### Button Mapping

| GamepadButton | Xbox | PlayStation | Nintendo |
|---------------|------|-------------|----------|
| `South` | A | Cross | B |
| `East` | B | Circle | A |
| `West` | X | Square | Y |
| `North` | Y | Triangle | X |
| `LeftBumper` | LB | L1 | L |
| `RightBumper` | RB | R1 | R |
| `Select` | View | Share | - |
| `Start` | Menu | Options | + |
| `DPadUp/Down/Left/Right` | D-Pad | D-Pad | D-Pad |

## Analog Sticks

```rust
fn handle_analog_input(gamepad: &Gamepad) {
    let movement = gamepad.left_stick;
    let look = gamepad.right_stick;
}
```

## Triggers

Triggers return values from 0.0 (not pressed) to 1.0 (fully pressed):

```rust
fn handle_triggers(gamepad: &Gamepad) {
    let left = gamepad.left_trigger;
    let right = gamepad.right_trigger;

    let acceleration = right * max_acceleration;
}
```

## Event-Based Input

Handle button events in the State trait:

```rust
fn run_systems(&mut self, world: &mut World) {
    if let Some(gamepad) = &world.resources.input.gamepad {
        if gamepad.just_pressed(GamepadButton::Start) {
            self.paused = !self.paused;
        }
        if gamepad.just_pressed(GamepadButton::Select) {
            toggle_camera_mode(&mut self.game);
        }
        if gamepad.just_pressed(GamepadButton::South) {
            if self.phase == GamePhase::MainMenu {
                self.phase = GamePhase::Playing;
            }
        }
    }
}
```

## Vibration/Rumble

```rust
fn trigger_rumble(world: &mut World, strength: f32, duration_ms: u32) {
    if let Some(gamepad) = world.resources.input.gamepad.as_mut() {
        gamepad.set_rumble(strength, strength, duration_ms);
    }
}

fn hit_feedback(world: &mut World) {
    trigger_rumble(world, 0.5, 100);
}

fn explosion_feedback(world: &mut World) {
    trigger_rumble(world, 1.0, 300);
}
```

## Combining Keyboard and Gamepad

```rust
struct PlayerInput {
    movement: Vec2,
    look: Vec2,
    jump: bool,
    attack: bool,
}

fn gather_input(world: &World) -> PlayerInput {
    let mut input = PlayerInput::default();

    let keyboard = &world.resources.input.keyboard;
    if keyboard.is_key_pressed(KeyCode::KeyW) { input.movement.y -= 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyS) { input.movement.y += 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyA) { input.movement.x -= 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyD) { input.movement.x += 1.0; }
    input.jump |= keyboard.is_key_pressed(KeyCode::Space);

    if let Some(gamepad) = &world.resources.input.gamepad {
        let stick = gamepad.left_stick;

        if stick.magnitude() > 0.0 {
            input.movement = stick;
        }

        input.jump |= gamepad.pressed(GamepadButton::South);
        input.attack |= gamepad.pressed(GamepadButton::West);
    }

    input
}
```
