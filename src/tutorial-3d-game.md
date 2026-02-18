# Tutorial: Building a 3D Game

This tutorial walks through building a complete 3D Pong game from scratch. By the end, you'll have two paddles, a bouncing ball, AI opponent, scoring, pause/unpause, and a game-over screen — all rendered in 3D with PBR materials and egui overlays.

## Project Setup

Create a new project:

```bash
cargo init pong-game
```

`Cargo.toml`:

```toml
[package]
name = "pong-game"
version = "0.1.0"
edition = "2024"

[dependencies]
nightshade = { git = "https://github.com/user/nightshade", features = ["engine", "wgpu"] }
rand = "0.9"
```

## Step 1: The Empty Window

Every Nightshade application starts with a struct that implements the `State` trait and a call to `launch`:

```rust
use nightshade::prelude::*;

struct PongGame;

impl State for PongGame {
    fn title(&self) -> &str {
        "Pong"
    }

    fn initialize(&mut self, world: &mut World) {
        let camera = spawn_camera(world, Vec3::new(0.0, 0.0, 15.0), "Camera".to_string());
        world.resources.active_camera = Some(camera);
        spawn_sun(world);
    }
}

fn main() {
    launch(PongGame);
}
```

`launch` creates the window, initializes the wgpu renderer, calls `initialize` once, then runs the game loop calling `run_systems` every frame. The camera is positioned at `(0, 0, 15)` looking toward the origin, and we add a directional light so objects are visible.

Run it and you'll see an empty scene with a grid floor.

## Step 2: Game Constants and State

Define the arena dimensions and game state. All game data lives in your state struct — the engine doesn't own any of it:

```rust
use nightshade::ecs::material::resources::material_registry_insert;
use nightshade::prelude::*;

const PADDLE_WIDTH: f32 = 0.3;
const PADDLE_HEIGHT: f32 = 2.0;
const PADDLE_DEPTH: f32 = 0.3;
const PADDLE_SPEED: f32 = 8.0;
const BALL_SIZE: f32 = 0.3;
const BALL_SPEED: f32 = 6.0;
const ARENA_WIDTH: f32 = 12.0;
const ARENA_HEIGHT: f32 = 8.0;
const WINNING_SCORE: u32 = 5;

#[derive(Default)]
struct PongGame {
    left_paddle_y: f32,
    right_paddle_y: f32,
    ball_x: f32,
    ball_y: f32,
    ball_vel_x: f32,
    ball_vel_y: f32,
    left_score: u32,
    right_score: u32,
    left_paddle_entity: Option<Entity>,
    right_paddle_entity: Option<Entity>,
    ball_entity: Option<Entity>,
    paused: bool,
    game_over: bool,
}
```

The game state is separate from the ECS world. The ECS holds the visual entities (meshes, transforms, materials). Your struct holds game logic data (positions, velocities, scores). Each frame, you update game logic first, then sync the ECS transforms to match.

## Step 3: Spawning Game Objects

Create the paddles, ball, and walls. Each is a mesh entity with a material:

```rust
impl PongGame {
    fn create_game_objects(&mut self, world: &mut World) {
        self.left_paddle_entity = Some(self.spawn_colored_mesh(
            world,
            "Cube",
            Vec3::new(-ARENA_WIDTH / 2.0 + 0.5, 0.0, 0.0),
            Vec3::new(PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH),
            [0.2, 0.6, 1.0, 1.0],
        ));

        self.right_paddle_entity = Some(self.spawn_colored_mesh(
            world,
            "Cube",
            Vec3::new(ARENA_WIDTH / 2.0 - 0.5, 0.0, 0.0),
            Vec3::new(PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH),
            [1.0, 0.4, 0.2, 1.0],
        ));

        self.ball_entity = Some(self.spawn_colored_mesh(
            world,
            "Sphere",
            Vec3::zeros(),
            Vec3::new(BALL_SIZE, BALL_SIZE, BALL_SIZE),
            [1.0, 1.0, 1.0, 1.0],
        ));

        self.spawn_colored_mesh(
            world,
            "Cube",
            Vec3::new(0.0, ARENA_HEIGHT / 2.0 + 0.25, 0.0),
            Vec3::new(ARENA_WIDTH + 1.0, 0.5, 0.5),
            [0.5, 0.5, 0.5, 1.0],
        );

        self.spawn_colored_mesh(
            world,
            "Cube",
            Vec3::new(0.0, -ARENA_HEIGHT / 2.0 - 0.25, 0.0),
            Vec3::new(ARENA_WIDTH + 1.0, 0.5, 0.5),
            [0.5, 0.5, 0.5, 1.0],
        );
    }

    fn spawn_colored_mesh(
        &self,
        world: &mut World,
        mesh_name: &str,
        position: Vec3,
        scale: Vec3,
        color: [f32; 4],
    ) -> Entity {
        let entity = spawn_mesh(world, mesh_name, position, scale);

        let material_name = format!("mat_{}", entity.id);
        material_registry_insert(
            &mut world.resources.material_registry,
            material_name.clone(),
            Material {
                base_color: color,
                ..Default::default()
            },
        );

        if let Some(&index) = world
            .resources
            .material_registry
            .registry
            .name_to_index
            .get(&material_name)
        {
            world.resources.material_registry.registry.add_reference(index);
        }

        world.set_material_ref(entity, MaterialRef::new(material_name));
        entity
    }
}
```

`spawn_mesh` creates an entity with `LOCAL_TRANSFORM`, `GLOBAL_TRANSFORM`, and `RENDER_MESH` components. The material is registered in the global `MaterialRegistry` by name, then assigned to the entity via `MaterialRef`. Each material needs a unique name — using the entity ID ensures no collisions.

## Step 4: Ball Movement and Reset

The ball moves in a straight line, bouncing off walls and paddles:

```rust
impl PongGame {
    fn reset_ball(&mut self) {
        self.ball_x = 0.0;
        self.ball_y = 0.0;
        let angle = (rand::random::<f32>() - 0.5) * std::f32::consts::PI * 0.5;
        self.ball_vel_x = BALL_SPEED * angle.cos();
        self.ball_vel_y = BALL_SPEED * angle.sin();
    }

    fn ball_movement_system(&mut self, world: &mut World) {
        let dt = world.resources.window.timing.delta_time;
        self.ball_x += self.ball_vel_x * dt;
        self.ball_y += self.ball_vel_y * dt;
    }

    fn normalize_ball_speed(&mut self) {
        let speed = (self.ball_vel_x * self.ball_vel_x + self.ball_vel_y * self.ball_vel_y).sqrt();
        self.ball_vel_x *= BALL_SPEED / speed;
        self.ball_vel_y *= BALL_SPEED / speed;
    }
}
```

Time comes from `world.resources.window.timing.delta_time`, which gives the frame duration in seconds. Multiplying velocity by delta time makes movement frame-rate independent.

## Step 5: Input and AI

The player controls the left paddle with W/S or arrow keys. The AI tracks the ball's Y position:

```rust
impl PongGame {
    fn input_system(&mut self, world: &mut World) {
        let dt = world.resources.window.timing.delta_time;
        let keyboard = &world.resources.input.keyboard;

        if keyboard.is_key_pressed(KeyCode::KeyW) || keyboard.is_key_pressed(KeyCode::ArrowUp) {
            self.left_paddle_y += PADDLE_SPEED * dt;
        }
        if keyboard.is_key_pressed(KeyCode::KeyS) || keyboard.is_key_pressed(KeyCode::ArrowDown) {
            self.left_paddle_y -= PADDLE_SPEED * dt;
        }

        let max_y = ARENA_HEIGHT / 2.0 - PADDLE_HEIGHT / 2.0;
        self.left_paddle_y = self.left_paddle_y.clamp(-max_y, max_y);
    }

    fn ai_system(&mut self, world: &mut World) {
        let dt = world.resources.window.timing.delta_time;
        let distance = self.ball_y - self.right_paddle_y;

        if distance.abs() > 0.2 {
            self.right_paddle_y += distance.signum() * PADDLE_SPEED * 0.75 * dt;
        }

        let max_y = ARENA_HEIGHT / 2.0 - PADDLE_HEIGHT / 2.0;
        self.right_paddle_y = self.right_paddle_y.clamp(-max_y, max_y);
    }
}
```

Input is polled via `world.resources.input.keyboard.is_key_pressed()`. This checks whether a key is currently held down (not just pressed this frame).

## Step 6: Collision Detection

Check ball against walls and paddles. When the ball passes a paddle's edge, score a point:

```rust
impl PongGame {
    fn collision_system(&mut self) {
        let ball_max_y = ARENA_HEIGHT / 2.0 - BALL_SIZE;
        if self.ball_y > ball_max_y {
            self.ball_y = ball_max_y;
            self.ball_vel_y = -self.ball_vel_y.abs();
        } else if self.ball_y < -ball_max_y {
            self.ball_y = -ball_max_y;
            self.ball_vel_y = self.ball_vel_y.abs();
        }

        let left_x = -ARENA_WIDTH / 2.0 + 0.5;
        if self.ball_x < left_x + PADDLE_WIDTH / 2.0 + BALL_SIZE
            && self.ball_x > left_x - PADDLE_WIDTH / 2.0
            && (self.ball_y - self.left_paddle_y).abs() < PADDLE_HEIGHT / 2.0 + BALL_SIZE
        {
            self.ball_x = left_x + PADDLE_WIDTH / 2.0 + BALL_SIZE;
            self.ball_vel_x = self.ball_vel_x.abs();
            let hit_offset = (self.ball_y - self.left_paddle_y) / (PADDLE_HEIGHT / 2.0);
            self.ball_vel_y += hit_offset * 2.0;
            self.normalize_ball_speed();
        }

        let right_x = ARENA_WIDTH / 2.0 - 0.5;
        if self.ball_x > right_x - PADDLE_WIDTH / 2.0 - BALL_SIZE
            && self.ball_x < right_x + PADDLE_WIDTH / 2.0
            && (self.ball_y - self.right_paddle_y).abs() < PADDLE_HEIGHT / 2.0 + BALL_SIZE
        {
            self.ball_x = right_x - PADDLE_WIDTH / 2.0 - BALL_SIZE;
            self.ball_vel_x = -self.ball_vel_x.abs();
            let hit_offset = (self.ball_y - self.right_paddle_y) / (PADDLE_HEIGHT / 2.0);
            self.ball_vel_y += hit_offset * 2.0;
            self.normalize_ball_speed();
        }

        if self.ball_x < -ARENA_WIDTH / 2.0 - 1.0 {
            self.right_score += 1;
            self.reset_ball();
            if self.right_score >= WINNING_SCORE {
                self.game_over = true;
            }
        } else if self.ball_x > ARENA_WIDTH / 2.0 + 1.0 {
            self.left_score += 1;
            self.reset_ball();
            if self.left_score >= WINNING_SCORE {
                self.game_over = true;
            }
        }
    }
}
```

Where the ball hits the paddle affects the bounce angle — hitting the edge sends the ball at a steeper angle, hitting the center keeps it flat. After adjusting the velocity, `normalize_ball_speed()` ensures the ball always moves at `BALL_SPEED`.

## Step 7: Syncing Visuals

After updating game logic, write the positions back to the ECS transforms. This is where game state becomes visible:

```rust
impl PongGame {
    fn update_visuals(&mut self, world: &mut World) {
        if let Some(entity) = self.left_paddle_entity {
            if let Some(transform) = world.get_local_transform_mut(entity) {
                transform.translation.y = self.left_paddle_y;
            }
            mark_local_transform_dirty(world, entity);
        }

        if let Some(entity) = self.right_paddle_entity {
            if let Some(transform) = world.get_local_transform_mut(entity) {
                transform.translation.y = self.right_paddle_y;
            }
            mark_local_transform_dirty(world, entity);
        }

        if let Some(entity) = self.ball_entity {
            if let Some(transform) = world.get_local_transform_mut(entity) {
                transform.translation.x = self.ball_x;
                transform.translation.y = self.ball_y;
            }
            mark_local_transform_dirty(world, entity);
        }
    }
}
```

`mark_local_transform_dirty` tells the engine that this entity's transform changed and the global transform hierarchy needs to be recalculated. Without it, the entity won't visually move.

## Step 8: The Game Loop

Wire everything together in the `State` trait implementation:

```rust
impl State for PongGame {
    fn title(&self) -> &str {
        "Pong"
    }

    fn initialize(&mut self, world: &mut World) {
        world.resources.graphics.atmosphere = Atmosphere::Space;
        world.resources.graphics.show_grid = false;
        world.resources.user_interface.enabled = true;

        spawn_sun_without_shadows(world);

        let camera = spawn_camera(world, Vec3::new(0.0, 0.0, 15.0), "Camera".to_string());
        if let Some(camera_component) = world.get_camera_mut(camera) {
            camera_component.projection = Projection::Perspective(PerspectiveCamera {
                aspect_ratio: None,
                y_fov_rad: 60.0_f32.to_radians(),
                z_far: Some(1000.0),
                z_near: 0.1,
            });
        }
        world.resources.active_camera = Some(camera);

        self.create_game_objects(world);
        self.reset_ball();
    }

    fn run_systems(&mut self, world: &mut World) {
        escape_key_exit_system(world);

        if !self.paused && !self.game_over {
            self.input_system(world);
            self.ai_system(world);
            self.ball_movement_system(world);
            self.collision_system();
        }

        self.update_visuals(world);
    }

    fn on_keyboard_input(&mut self, _world: &mut World, key: KeyCode, state: KeyState) {
        if state == KeyState::Pressed {
            match key {
                KeyCode::Space => self.paused = !self.paused,
                KeyCode::KeyR => self.reset_game(),
                _ => {}
            }
        }
    }
}
```

`run_systems` is called every frame. The pattern is: check input → update game logic → detect collisions → sync visuals. `on_keyboard_input` handles one-shot key events (pressed/released) rather than held keys.

## Step 9: UI Overlay with egui

Add score display and pause/game-over screens. The `ui` method receives an egui context for immediate-mode UI:

```rust
impl State for PongGame {
    fn ui(&mut self, _world: &mut World, ctx: &egui::Context) {
        egui::Window::new("Score")
            .anchor(egui::Align2::CENTER_TOP, [0.0, 10.0])
            .resizable(false)
            .collapsible(false)
            .title_bar(false)
            .show(ctx, |ui| {
                ui.heading(format!("{} - {}", self.left_score, self.right_score));
            });

        if self.paused {
            egui::CentralPanel::default()
                .frame(egui::Frame::new().fill(egui::Color32::from_black_alpha(180)))
                .show(ctx, |ui| {
                    ui.vertical_centered(|ui| {
                        ui.add_space(100.0);
                        ui.heading("PAUSED");
                        ui.add_space(20.0);
                        ui.label("Press SPACE to resume");
                        ui.label("Press R to restart");
                    });
                });
        }

        if self.game_over {
            egui::CentralPanel::default()
                .frame(egui::Frame::new().fill(egui::Color32::from_black_alpha(180)))
                .show(ctx, |ui| {
                    ui.vertical_centered(|ui| {
                        ui.add_space(100.0);
                        let winner = if self.left_score >= WINNING_SCORE {
                            "You Win!"
                        } else {
                            "AI Wins!"
                        };
                        ui.heading(winner);
                        ui.add_space(10.0);
                        ui.label(format!("Final Score: {} - {}", self.left_score, self.right_score));
                        ui.add_space(20.0);
                        ui.label("Press R to play again");
                    });
                });
        }

        egui::Window::new("Controls")
            .anchor(egui::Align2::LEFT_BOTTOM, [10.0, -10.0])
            .resizable(false)
            .collapsible(false)
            .show(ctx, |ui| {
                ui.label("W/S or Up/Down - Move paddle");
                ui.label("SPACE - Pause");
                ui.label("R - Restart");
                ui.label("ESC - Exit");
            });
    }
}
```

egui runs at the end of each frame, after rendering. The `anchor` method positions windows relative to screen edges. `CentralPanel` covers the entire screen — useful for overlay menus.

## Step 10: Game Reset

```rust
impl PongGame {
    fn reset_game(&mut self) {
        self.left_paddle_y = 0.0;
        self.right_paddle_y = 0.0;
        self.left_score = 0;
        self.right_score = 0;
        self.paused = false;
        self.game_over = false;
        self.reset_ball();
    }
}
```

Since game state lives in your struct (not the ECS), resetting is just zeroing your fields. The ECS entities remain — they just get new transform values next frame.

## Key Patterns Demonstrated

| Pattern | Where Used |
|---------|------------|
| State trait lifecycle | `initialize`, `run_systems`, `on_keyboard_input`, `ui` |
| Entity spawning | `spawn_mesh` + material registration |
| Frame-rate independent movement | `velocity * delta_time` |
| Input polling | `keyboard.is_key_pressed()` for held keys |
| One-shot input events | `on_keyboard_input` for press/release |
| Transform updates | `get_local_transform_mut` + `mark_local_transform_dirty` |
| Game state separation | Logic in struct fields, visuals in ECS |
| egui overlays | Score display, pause menu, game over screen |

## Where to Go Next

From this foundation you can add:

- **Physics**: Replace manual collision with Rapier rigid bodies and colliders. See [Physics Overview](physics-overview.md).
- **Audio**: Add sound effects with `load_sound` and `play_sound`. See [Audio System](audio-system.md).
- **3D Models**: Replace cubes with loaded glTF models via `load_gltf`. See [Meshes & Models](meshes-models.md).
- **Particles**: Add spark effects on ball collision. See [Particle Systems](particles.md).
- **Materials**: Make the ball emissive so it glows. See [Materials](materials.md).
