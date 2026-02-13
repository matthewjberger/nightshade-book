# Keyboard & Mouse

Handle keyboard and mouse input through the input resources.

## Keyboard Input

### Checking Key State

```rust
fn run_systems(&mut self, world: &mut World) {
    let keyboard = &world.resources.input.keyboard;

    // Key currently held down
    if keyboard.is_key_pressed(KeyCode::KeyW) {
        move_forward();
    }

    if keyboard.is_key_pressed(KeyCode::Space) {
        jump();
    }

    if keyboard.is_key_pressed(KeyCode::ShiftLeft) {
        sprint();
    }
}
```

### Common Key Codes

| Key | Code |
|-----|------|
| Letters | `KeyCode::KeyA` through `KeyCode::KeyZ` |
| Numbers | `KeyCode::Digit0` through `KeyCode::Digit9` |
| Arrow keys | `KeyCode::ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` |
| Space | `KeyCode::Space` |
| Shift | `KeyCode::ShiftLeft`, `KeyCode::ShiftRight` |
| Control | `KeyCode::ControlLeft`, `KeyCode::ControlRight` |
| Alt | `KeyCode::AltLeft`, `KeyCode::AltRight` |
| Escape | `KeyCode::Escape` |
| Enter | `KeyCode::Enter` |
| Tab | `KeyCode::Tab` |
| F keys | `KeyCode::F1` through `KeyCode::F12` |

### Direct Event Handling

Handle key events in the State trait:

```rust
fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: ElementState) {
    if state == ElementState::Pressed {
        match key {
            KeyCode::Escape => self.paused = !self.paused,
            KeyCode::F11 => toggle_fullscreen(world),
            KeyCode::Digit1 => self.select_weapon(0),
            KeyCode::Digit2 => self.select_weapon(1),
            _ => {}
        }
    }
}
```

## Mouse Input

### Mouse Position

```rust
let mouse = &world.resources.input.mouse;
let position = mouse.position;  // Screen coordinates (x, y)
```

### Mouse Movement (Delta)

```rust
let delta = world.resources.input.mouse.position_delta;
camera_yaw += delta.x * sensitivity;
camera_pitch += delta.y * sensitivity;
```

### Mouse Buttons

```rust
let mouse = &world.resources.input.mouse;

// Button held
if mouse.state.contains(MouseState::LEFT_CLICKED) {
    fire_weapon();
}

// Button just pressed
if mouse.state.contains(MouseState::LEFT_JUST_PRESSED) {
    start_drag();
}

// Button just released
if mouse.state.contains(MouseState::LEFT_JUST_RELEASED) {
    end_drag();
}

// Right mouse button
if mouse.state.contains(MouseState::RIGHT_CLICKED) {
    aim_down_sights();
}

// Middle mouse button
if mouse.state.contains(MouseState::MIDDLE_CLICKED) {
    pan_camera();
}
```

### Mouse Scroll

```rust
let scroll = world.resources.input.mouse.wheel_delta;
if scroll.y != 0.0 {
    zoom_camera(scroll.y);
}
```

### Direct Event Handling

```rust
fn on_mouse_input(&mut self, world: &mut World, state: ElementState, button: MouseButton) {
    match (button, state) {
        (MouseButton::Left, ElementState::Pressed) => self.shoot(),
        (MouseButton::Right, ElementState::Pressed) => self.aim(),
        (MouseButton::Right, ElementState::Released) => self.stop_aim(),
        _ => {}
    }
}
```

## Movement Input Pattern

Common WASD movement:

```rust
fn get_movement_input(world: &World) -> Vec3 {
    let keyboard = &world.resources.input.keyboard;
    let mut direction = Vec3::zeros();

    if keyboard.is_key_pressed(KeyCode::KeyW) {
        direction.z -= 1.0;
    }
    if keyboard.is_key_pressed(KeyCode::KeyS) {
        direction.z += 1.0;
    }
    if keyboard.is_key_pressed(KeyCode::KeyA) {
        direction.x -= 1.0;
    }
    if keyboard.is_key_pressed(KeyCode::KeyD) {
        direction.x += 1.0;
    }

    if direction.magnitude() > 0.0 {
        direction.normalize_mut();
    }

    direction
}
```

## Mouse Look Pattern

First-person camera control:

```rust
fn mouse_look_system(world: &mut World, sensitivity: f32) {
    let delta = world.resources.input.mouse.position_delta;

    if let Some(camera) = world.resources.active_camera {
        if let Some(transform) = world.get_local_transform_mut(camera) {
            // Horizontal rotation (yaw)
            let yaw = nalgebra_glm::quat_angle_axis(
                -delta.x * sensitivity,
                &Vec3::y(),
            );

            // Vertical rotation (pitch) - clamped
            let pitch = nalgebra_glm::quat_angle_axis(
                -delta.y * sensitivity,
                &Vec3::x(),
            );

            transform.rotation = yaw * transform.rotation * pitch;
        }
    }
}
```

## Cursor Visibility

For first-person games:

```rust
fn initialize(&mut self, world: &mut World) {
    world.resources.graphics.show_cursor = false;
}

fn toggle_cursor(world: &mut World) {
    world.resources.graphics.show_cursor = !world.resources.graphics.show_cursor;
}
```

## Key Bindings

Create rebindable controls:

```rust
struct KeyBindings {
    move_forward: KeyCode,
    move_back: KeyCode,
    move_left: KeyCode,
    move_right: KeyCode,
    jump: KeyCode,
    sprint: KeyCode,
}

impl Default for KeyBindings {
    fn default() -> Self {
        Self {
            move_forward: KeyCode::KeyW,
            move_back: KeyCode::KeyS,
            move_left: KeyCode::KeyA,
            move_right: KeyCode::KeyD,
            jump: KeyCode::Space,
            sprint: KeyCode::ShiftLeft,
        }
    }
}
```

## Input Buffer

Buffer inputs for responsive controls:

```rust
struct InputBuffer {
    jump_buffer: f32,
}

fn update_input_buffer(buffer: &mut InputBuffer, world: &World, dt: f32) {
    buffer.jump_buffer = (buffer.jump_buffer - dt).max(0.0);

    if world.resources.input.keyboard.is_key_pressed(KeyCode::Space) {
        buffer.jump_buffer = 0.15;
    }
}

fn try_jump(buffer: &mut InputBuffer, grounded: bool) -> bool {
    if grounded && buffer.jump_buffer > 0.0 {
        buffer.jump_buffer = 0.0;
        return true;
    }
    false
}
```
