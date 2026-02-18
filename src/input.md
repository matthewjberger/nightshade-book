# Input System

Input state is aggregated each frame into `world.resources.input`. Nightshade supports keyboard, mouse, and gamepad input through both polling and event-driven patterns.

## Polling Input

Check input state at any point during `run_systems`:

```rust
fn run_systems(&mut self, world: &mut World) {
    // Keyboard
    if world.resources.input.keyboard.is_key_pressed(KeyCode::KeyW) {
        move_forward(world);
    }

    // Mouse position
    let mouse_pos = world.resources.input.mouse.position;

    // Mouse buttons
    if world.resources.input.mouse.state.contains(MouseState::LEFT_JUST_PRESSED) {
        shoot(world);
    }
}
```

## Event-Driven Input

Handle input events through the `State` trait:

```rust
fn on_keyboard_input(&mut self, world: &mut World, key_code: KeyCode, key_state: ElementState) {
    if key_state == ElementState::Pressed {
        match key_code {
            KeyCode::Escape => self.paused = !self.paused,
            KeyCode::F11 => toggle_fullscreen(world),
            _ => {}
        }
    }
}

fn on_mouse_input(&mut self, world: &mut World, state: ElementState, button: MouseButton) {
    if state == ElementState::Pressed && button == MouseButton::Left {
        self.shoot(world);
    }
}
```

## Built-in Systems

Nightshade provides ready-to-use input systems:

```rust
fn run_systems(&mut self, world: &mut World) {
    // WASD + mouse fly camera
    fly_camera_system(world);

    // Escape key exits the application
    escape_key_exit_system(world);

    // Pan-orbit camera (middle mouse drag to orbit, scroll to zoom)
    pan_orbit_camera_system(world);
}
```

## Chapters

- [Keyboard & Mouse](keyboard-mouse.md) - Key detection, mouse tracking, cursor control
- [Gamepad Support](gamepad.md) - Controller input, analog sticks, rumble
