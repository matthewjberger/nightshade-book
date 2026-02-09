# Minimal Example

The simplest possible Nightshade application.

## Complete Code

```rust
use nightshade::prelude::*;

struct MinimalGame;

impl State for MinimalGame {
    fn initialize(&mut self, world: &mut World) {
        spawn_fly_camera(world);

        spawn_cube_at(world, Vec3::new(0.0, 0.0, -5.0));

        spawn_sun(world);
    }
}

fn main() {
    nightshade::launch(MinimalGame);
}
```

## Step-by-Step Breakdown

### 1. Import the Prelude

```rust
use nightshade::prelude::*;
```

The prelude exports all commonly used types:
- `State` trait
- `World` struct
- `Entity` type
- Math types (`Vec3`, `Vec4`, `Mat4`, etc.)
- Component flags (`LOCAL_TRANSFORM`, `MESH_COMPONENT`, etc.)
- Common functions (`spawn_cube_at`, `spawn_fly_camera`, etc.)

### 2. Define Your Game State

```rust
struct MinimalGame;
```

Your game state struct holds all game-specific data. It can be empty for simple demos or contain complex game logic:

```rust
struct MinimalGame {
    score: u32,
    player: Option<Entity>,
    enemies: Vec<Entity>,
}
```

### 3. Implement the State Trait

```rust
impl State for MinimalGame {
    fn initialize(&mut self, world: &mut World) {
        // Called once at startup
    }
}
```

The `State` trait has many optional methods:

| Method | Purpose |
|--------|---------|
| `initialize` | Setup at startup |
| `run_systems` | Game logic each frame |
| `ui` | egui-based UI |
| `immediate_ui` | Built-in immediate mode UI |
| `on_keyboard_input` | Key press/release |
| `on_mouse_input` | Mouse button events |
| `on_gamepad_event` | Gamepad input |
| `configure_render_graph` | Custom rendering |
| `next_state` | State transitions |

### 4. Set Up the Scene

```rust
fn initialize(&mut self, world: &mut World) {
    // Camera (required to see anything)
    spawn_fly_camera(world);

    // A visible object
    spawn_cube_at(world, Vec3::new(0.0, 0.0, -5.0));

    // Light (required for PBR materials)
    spawn_sun(world);
}
```

### 5. Run the Application

```rust
fn main() {
    nightshade::launch(MinimalGame);
}
```

The `launch` function:
1. Creates the window
2. Initializes the renderer
3. Calls `initialize` on your state
4. Runs the game loop
5. Handles input events
6. Calls `run_systems` each frame

## Adding Cargo.toml

```toml
[package]
name = "minimal-game"
version = "0.1.0"
edition = "2024"

[dependencies]
nightshade = { git = "https://github.com/user/nightshade", features = ["engine", "wgpu"] }
```

## Running

```bash
cargo run --release
```

Release mode is recommended for better performance.

## Controls

The fly camera uses standard controls:
- **WASD** - Move horizontally
- **Space/Shift** - Move up/down
- **Mouse** - Look around
- **Escape** - Release cursor

## Extending the Example

### Add More Objects

```rust
fn initialize(&mut self, world: &mut World) {
    spawn_fly_camera(world);

    // Ground plane
    spawn_plane_at(world, Vec3::zeros());

    // Multiple cubes
    for index in 0..5 {
        spawn_cube_at(world, Vec3::new(index as f32 * 2.0 - 4.0, 0.5, -5.0));
    }

    spawn_sun(world);
}
```

### Add Animation

```rust
struct MinimalGame {
    cube: Option<Entity>,
    time: f32,
}

impl State for MinimalGame {
    fn initialize(&mut self, world: &mut World) {
        spawn_fly_camera(world);

        self.cube = Some(spawn_cube_at(world, Vec3::new(0.0, 0.0, -5.0)));

        spawn_sun(world);
    }

    fn run_systems(&mut self, world: &mut World) {
        let dt = world.resources.window.timing.delta_time;
        self.time += dt;

        if let Some(cube) = self.cube {
            if let Some(transform) = world.get_local_transform_mut(cube) {
                transform.rotation = nalgebra_glm::quat_angle_axis(
                    self.time,
                    &Vec3::y(),
                );
            }
        }
    }
}
```

### Add Input Handling

```rust
impl State for MinimalGame {
    fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: ElementState) {
        if state == ElementState::Pressed {
            match key {
                KeyCode::Escape => std::process::exit(0),
                KeyCode::Space => self.spawn_cube(world),
                _ => {}
            }
        }
    }
}
```

## What's Next

From this foundation, you can:
- Add physics with rigid bodies and colliders
- Load 3D models with `load_gltf`
- Add skeletal animation
- Implement game logic in `run_systems`
- Create UI with egui
- Add audio with Kira

See the other examples for complete implementations of these features.
