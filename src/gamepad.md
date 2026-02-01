# Gamepad Support

Nightshade uses gilrs for cross-platform gamepad support.

## Enabling Gamepad

Gamepad requires the `gamepad` feature:

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "gamepad"] }
```

## Checking for Gamepad

```rust
use nightshade::ecs::input::queries::query_active_gamepad;

fn run_systems(&mut self, world: &mut World) {
    if let Some(gamepad) = query_active_gamepad(world) {
        // Gamepad is connected and active
        handle_gamepad_input(gamepad);
    }
}
```

## Button Input

### Button States

```rust
fn handle_gamepad_input(gamepad: &Gamepad) {
    // Button pressed
    if gamepad.is_pressed(gilrs::Button::South) {
        // A button (Xbox) / Cross (PlayStation)
        jump();
    }

    if gamepad.is_pressed(gilrs::Button::West) {
        // X button (Xbox) / Square (PlayStation)
        attack();
    }

    if gamepad.is_pressed(gilrs::Button::RightTrigger2) {
        // Right trigger
        fire();
    }
}
```

### Button Mapping

| gilrs Button | Xbox | PlayStation | Nintendo |
|--------------|------|-------------|----------|
| `South` | A | Cross | B |
| `East` | B | Circle | A |
| `West` | X | Square | Y |
| `North` | Y | Triangle | X |
| `LeftTrigger` | LB | L1 | L |
| `RightTrigger` | RB | R1 | R |
| `LeftTrigger2` | LT | L2 | ZL |
| `RightTrigger2` | RT | R2 | ZR |
| `Select` | View | Share | - |
| `Start` | Menu | Options | + |
| `DPadUp/Down/Left/Right` | D-Pad | D-Pad | D-Pad |

## Analog Sticks

```rust
fn handle_analog_input(gamepad: &Gamepad) {
    // Left stick - movement
    let left_x = gamepad.axis_value(gilrs::Axis::LeftStickX);
    let left_y = gamepad.axis_value(gilrs::Axis::LeftStickY);

    // Right stick - camera
    let right_x = gamepad.axis_value(gilrs::Axis::RightStickX);
    let right_y = gamepad.axis_value(gilrs::Axis::RightStickY);

    // Apply deadzone
    let movement = apply_deadzone(left_x, left_y, 0.15);
    let look = apply_deadzone(right_x, right_y, 0.1);
}

fn apply_deadzone(x: f32, y: f32, deadzone: f32) -> Vec2 {
    let magnitude = (x * x + y * y).sqrt();
    if magnitude < deadzone {
        Vec2::zeros()
    } else {
        let normalized = Vec2::new(x, y) / magnitude;
        let adjusted_magnitude = (magnitude - deadzone) / (1.0 - deadzone);
        normalized * adjusted_magnitude
    }
}
```

## Triggers

Triggers return values from 0.0 (not pressed) to 1.0 (fully pressed):

```rust
let left_trigger = gamepad.axis_value(gilrs::Axis::LeftZ);
let right_trigger = gamepad.axis_value(gilrs::Axis::RightZ);

// Accelerate based on trigger pressure
let acceleration = right_trigger * max_acceleration;
```

## Event-Based Input

Handle button events in the State trait:

```rust
fn on_gamepad_event(&mut self, world: &mut World, event: gilrs::Event) {
    let gilrs::EventType::ButtonPressed(button, _) = event.event else {
        return;
    };

    match button {
        gilrs::Button::Start => {
            self.paused = !self.paused;
        }
        gilrs::Button::Select => {
            toggle_camera_mode(&mut self.game);
        }
        gilrs::Button::South => {
            if self.phase == GamePhase::MainMenu {
                self.phase = GamePhase::Playing;
            }
        }
        _ => {}
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

// Different intensities for different events
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

    // Keyboard input
    let keyboard = &world.resources.input.keyboard;
    if keyboard.is_key_pressed(KeyCode::KeyW) { input.movement.y -= 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyS) { input.movement.y += 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyA) { input.movement.x -= 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyD) { input.movement.x += 1.0; }
    input.jump |= keyboard.is_key_just_pressed(KeyCode::Space);

    // Gamepad input (overrides if present)
    if let Some(gamepad) = query_active_gamepad(world) {
        let stick_x = gamepad.axis_value(gilrs::Axis::LeftStickX);
        let stick_y = gamepad.axis_value(gilrs::Axis::LeftStickY);
        let stick = apply_deadzone(stick_x, stick_y, 0.15);

        if stick.magnitude() > 0.0 {
            input.movement = stick;
        }

        input.jump |= gamepad.is_pressed(gilrs::Button::South);
        input.attack |= gamepad.is_pressed(gilrs::Button::West);
    }

    input
}
```

## Multiple Gamepads

For local multiplayer:

```rust
fn get_player_gamepad(world: &World, player_index: usize) -> Option<&Gamepad> {
    world.resources.input.gamepads.get(player_index)
}
```
