# Third Person Game

A complete third-person action game template with character animation, combat, and camera control.

## Complete Example

```rust
use nightshade::prelude::*;

struct ThirdPersonGame {
    player: Option<Entity>,
    camera: Option<Entity>,
    camera_target: Vec3,
    camera_distance: f32,
    camera_pitch: f32,
    camera_yaw: f32,

    player_state: PlayerState,
    attack_timer: f32,
    dodge_timer: f32,
    health: f32,
}

#[derive(Default, PartialEq)]
enum PlayerState {
    #[default]
    Idle,
    Walking,
    Running,
    Attacking,
    Dodging,
}

impl Default for ThirdPersonGame {
    fn default() -> Self {
        Self {
            player: None,
            camera: None,
            camera_target: Vec3::zeros(),
            camera_distance: 5.0,
            camera_pitch: 0.3,
            camera_yaw: 0.0,
            player_state: PlayerState::Idle,
            attack_timer: 0.0,
            dodge_timer: 0.0,
            health: 100.0,
        }
    }
}

impl State for ThirdPersonGame {
    fn initialize(&mut self, world: &mut World) {
        self.setup_player(world);
        self.setup_camera(world);
        self.setup_level(world);
        self.setup_lighting(world);
        self.setup_enemies(world);

        world.resources.graphics.show_cursor = false;
    }

    fn run_systems(&mut self, world: &mut World) {
        let dt = world.resources.window.timing.delta_time;

        self.update_camera_input(world);
        self.update_player_movement(world, dt);
        self.update_player_state(world, dt);
        self.update_camera_position(world, dt);
        self.update_animations(world);

        update_physics(world, dt);
        update_character_controller(world);
        update_animation_players(world, dt);
    }

    fn on_mouse_input(&mut self, world: &mut World, state: ElementState, button: MouseButton) {
        if state == ElementState::Pressed {
            match button {
                MouseButton::Left => self.attack(world),
                MouseButton::Right => self.dodge(world),
                _ => {}
            }
        }
    }
}

impl ThirdPersonGame {
    fn setup_player(&mut self, world: &mut World) {
        let entities = load_gltf(world, "assets/models/character.glb");
        let player = entities[0];

        world.set_local_transform(player, LocalTransform {
            translation: Vec3::new(0.0, 0.0, 0.0),
            scale: Vec3::new(1.0, 1.0, 1.0),
            ..Default::default()
        });

        let controller_entity = world.spawn_entities(
            LOCAL_TRANSFORM | GLOBAL_TRANSFORM | CHARACTER_CONTROLLER | COLLIDER,
            1
        )[0];

        world.set_character_controller(controller_entity, CharacterController {
            height: 1.8,
            radius: 0.4,
            step_height: 0.3,
            max_slope: 45.0,
            move_speed: 4.0,
            jump_speed: 8.0,
            gravity: 20.0,
            grounded: false,
            velocity: Vec3::zeros(),
        });

        world.set_collider(controller_entity, ColliderComponent::capsule(0.4, 1.2));

        world.set_parent(player, Parent(Some(controller_entity)));
        world.set_local_transform(player, LocalTransform {
            translation: Vec3::new(0.0, -0.9, 0.0),
            ..Default::default()
        });

        if let Some(animation_player) = world.get_animation_player_mut(player) {
            animation_player.play("idle");
            animation_player.set_looping(true);
        }

        self.player = Some(controller_entity);
    }

    fn setup_camera(&mut self, world: &mut World) {
        let camera = world.spawn_entities(
            LOCAL_TRANSFORM | GLOBAL_TRANSFORM | CAMERA,
            1
        )[0];

        world.set_camera(camera, Camera {
            projection: Projection::Perspective(PerspectiveCamera {
                y_fov_rad: 60.0_f32.to_radians(),
                z_near: 0.1,
                z_far: Some(1000.0),
                aspect_ratio: None,
            }),
            smoothing: None,
        });

        world.resources.active_camera = Some(camera);
        self.camera = Some(camera);
    }

    fn setup_level(&mut self, world: &mut World) {
        let floor = spawn_plane_at(world, Vec3::zeros());
        set_material_with_textures(world, floor, Material {
            base_color: [0.2, 0.5, 0.2, 1.0],
            roughness: 0.9,
            ..Default::default()
        });
        add_collider(world, floor, ColliderShape::Box {
            half_extents: Vec3::new(100.0, 0.1, 100.0),
        });

        for index in 0..20 {
            let rock = spawn_sphere_at(world, Vec3::zeros());
            let x = (index % 5) as f32 * 15.0 - 30.0 + rand_range(-2.0, 2.0);
            let z = (index / 5) as f32 * 15.0 - 30.0 + rand_range(-2.0, 2.0);
            let scale = rand_range(0.5, 2.0);

            world.set_local_transform(rock, LocalTransform {
                translation: Vec3::new(x, scale * 0.5, z),
                scale: Vec3::new(scale, scale, scale),
                ..Default::default()
            });

            set_material_with_textures(world, rock, Material {
                base_color: [0.4, 0.4, 0.4, 1.0],
                roughness: 0.95,
                ..Default::default()
            });

            add_collider(world, rock, ColliderShape::Sphere { radius: scale });
        }
    }

    fn setup_lighting(&mut self, world: &mut World) {
        spawn_sun(world);

        world.resources.graphics.ambient_light = [0.2, 0.2, 0.2, 1.0];
    }

    fn setup_enemies(&mut self, world: &mut World) {
        for index in 0..5 {
            let angle = index as f32 * std::f32::consts::TAU / 5.0;
            let distance = 15.0;

            let enemy = load_gltf(world, "assets/models/enemy.glb")[0];
            world.set_local_transform(enemy, LocalTransform {
                translation: Vec3::new(
                    angle.cos() * distance,
                    0.0,
                    angle.sin() * distance,
                ),
                ..Default::default()
            });
        }
    }

    fn update_camera_input(&mut self, world: &mut World) {
        let position_delta = world.resources.input.mouse.position_delta;
        let scroll = world.resources.input.mouse.wheel_delta;

        let sensitivity = 0.003;
        self.camera_yaw -= position_delta.x * sensitivity;
        self.camera_pitch -= position_delta.y * sensitivity;

        self.camera_pitch = self.camera_pitch.clamp(-1.2, 1.2);

        self.camera_distance -= scroll.y * 0.5;
        self.camera_distance = self.camera_distance.clamp(2.0, 15.0);
    }

    fn update_player_movement(&mut self, world: &mut World, dt: f32) {
        if self.player_state == PlayerState::Attacking ||
           self.player_state == PlayerState::Dodging {
            return;
        }

        let Some(player) = self.player else { return };

        let keyboard = &world.resources.input.keyboard;

        let mut move_input = Vec2::zeros();
        if keyboard.is_key_pressed(KeyCode::KeyW) { move_input.y -= 1.0; }
        if keyboard.is_key_pressed(KeyCode::KeyS) { move_input.y += 1.0; }
        if keyboard.is_key_pressed(KeyCode::KeyA) { move_input.x -= 1.0; }
        if keyboard.is_key_pressed(KeyCode::KeyD) { move_input.x += 1.0; }

        let running = keyboard.is_key_pressed(KeyCode::ShiftLeft);

        if move_input.magnitude() > 0.0 {
            move_input = move_input.normalize();

            let camera_forward = Vec3::new(
                self.camera_yaw.sin(),
                0.0,
                self.camera_yaw.cos(),
            );
            let camera_right = Vec3::new(
                self.camera_yaw.cos(),
                0.0,
                -self.camera_yaw.sin(),
            );

            let world_direction = camera_forward * -move_input.y + camera_right * move_input.x;

            if let Some(transform) = world.get_local_transform_mut(player) {
                let target_rotation = nalgebra_glm::quat_angle_axis(
                    world_direction.x.atan2(world_direction.z),
                    &Vec3::y(),
                );
                transform.rotation = nalgebra_glm::quat_slerp(
                    &transform.rotation,
                    &target_rotation,
                    dt * 10.0,
                );
            }

            let speed = if running { 8.0 } else { 4.0 };
            if let Some(controller) = world.get_character_controller_mut(player) {
                controller.velocity.x = world_direction.x * speed;
                controller.velocity.z = world_direction.z * speed;
            }

            self.player_state = if running { PlayerState::Running } else { PlayerState::Walking };
        } else {
            if let Some(controller) = world.get_character_controller_mut(player) {
                controller.velocity.x = 0.0;
                controller.velocity.z = 0.0;
            }
            self.player_state = PlayerState::Idle;
        }

        if keyboard.is_key_pressed(KeyCode::Space) {
            if let Some(controller) = world.get_character_controller_mut(player) {
                if controller.grounded {
                    controller.velocity.y = controller.jump_speed;
                }
            }
        }
    }

    fn update_player_state(&mut self, world: &mut World, dt: f32) {
        if self.attack_timer > 0.0 {
            self.attack_timer -= dt;
            if self.attack_timer <= 0.0 {
                self.player_state = PlayerState::Idle;
            }
        }

        if self.dodge_timer > 0.0 {
            self.dodge_timer -= dt;
            if self.dodge_timer <= 0.0 {
                self.player_state = PlayerState::Idle;
            }
        }
    }

    fn update_camera_position(&mut self, world: &mut World, dt: f32) {
        let Some(player) = self.player else { return };
        let Some(camera) = self.camera else { return };

        if let Some(player_transform) = world.get_global_transform(player) {
            let target = player_transform.translation() + Vec3::new(0.0, 1.5, 0.0);
            self.camera_target = nalgebra_glm::lerp(
                &self.camera_target,
                &target,
                dt * 8.0,
            );
        }

        let offset = Vec3::new(
            self.camera_yaw.sin() * self.camera_pitch.cos(),
            self.camera_pitch.sin(),
            self.camera_yaw.cos() * self.camera_pitch.cos(),
        ) * self.camera_distance;

        let camera_position = self.camera_target + offset;

        if let Some(transform) = world.get_local_transform_mut(camera) {
            transform.translation = camera_position;

            let direction = (self.camera_target - camera_position).normalize();
            let pitch = (-direction.y).asin();
            let yaw = direction.x.atan2(direction.z);

            transform.rotation = nalgebra_glm::quat_angle_axis(yaw, &Vec3::y())
                * nalgebra_glm::quat_angle_axis(pitch, &Vec3::x());
        }
    }

    fn update_animations(&mut self, world: &mut World) {
        let Some(player) = self.player else { return };

        let children = world.resources.children_cache.get(&player).cloned().unwrap_or_default();
        for child in children {
            if let Some(animation_player) = world.get_animation_player_mut(child) {
                let animation_name = match self.player_state {
                    PlayerState::Idle => "idle",
                    PlayerState::Walking => "walk",
                    PlayerState::Running => "run",
                    PlayerState::Attacking => "attack",
                    PlayerState::Dodging => "dodge",
                };

                if animation_player.current_animation() != Some(animation_name) {
                    animation_player.blend_to(animation_name, 0.2);
                }
            }
        }
    }

    fn attack(&mut self, world: &mut World) {
        if self.player_state == PlayerState::Attacking ||
           self.player_state == PlayerState::Dodging {
            return;
        }

        self.player_state = PlayerState::Attacking;
        self.attack_timer = 0.6;

        self.check_attack_hits(world);
    }

    fn check_attack_hits(&self, world: &mut World) {
        let Some(player) = self.player else { return };

        if let Some(transform) = world.get_global_transform(player) {
            let attack_origin = transform.translation() + Vec3::new(0.0, 1.0, 0.0);
            let forward = transform.forward_vector();
            let attack_range = 2.0;

            for entity in world.query_entities(GLOBAL_TRANSFORM) {
                if entity == player { continue; }

                if let Some(target_transform) = world.get_global_transform(entity) {
                    let to_target = target_transform.translation() - attack_origin;
                    let distance = to_target.magnitude();
                    let dot = forward.dot(&to_target.normalize());

                    if distance < attack_range && dot > 0.5 {
                        self.apply_damage(world, entity, 25.0);
                    }
                }
            }
        }
    }

    fn apply_damage(&self, world: &mut World, entity: Entity, damage: f32) {
    }

    fn dodge(&mut self, world: &mut World) {
        if self.player_state == PlayerState::Attacking ||
           self.player_state == PlayerState::Dodging {
            return;
        }

        let Some(player) = self.player else { return };

        self.player_state = PlayerState::Dodging;
        self.dodge_timer = 0.5;

        if let Some(transform) = world.get_local_transform(player) {
            let forward = transform.rotation * Vec3::new(0.0, 0.0, -1.0);
            if let Some(controller) = world.get_character_controller_mut(player) {
                controller.velocity.x = forward.x * 12.0;
                controller.velocity.z = forward.z * 12.0;
            }
        }
    }
}

fn rand_range(min: f32, max: f32) -> f32 {
    min + (max - min) * 0.5
}

fn main() {
    nightshade::launch(ThirdPersonGame::default());
}
```

## Key Systems

### Orbit Camera

The camera orbits around the player using spherical coordinates:

```rust
let offset = Vec3::new(
    self.camera_yaw.sin() * self.camera_pitch.cos(),
    self.camera_pitch.sin(),
    self.camera_yaw.cos() * self.camera_pitch.cos(),
) * self.camera_distance;
```

Mouse X controls yaw, mouse Y controls pitch, scroll controls distance.

### Camera-Relative Movement

Player moves relative to where the camera is looking:

```rust
let camera_forward = Vec3::new(
    self.camera_yaw.sin(),
    0.0,
    self.camera_yaw.cos(),
);

let world_direction = camera_forward * -move_input.y + camera_right * move_input.x;
```

### Character Rotation

The character smoothly rotates to face movement direction:

```rust
transform.rotation = nalgebra_glm::quat_slerp(
    &transform.rotation,
    &target_rotation,
    dt * 10.0,
);
```

### Animation Blending

Animations blend smoothly when state changes:

```rust
animation_player.blend_to(animation_name, 0.2);  // 0.2 second blend
```

### State Machine

Simple state machine prevents conflicting actions:

```rust
if self.player_state == PlayerState::Attacking ||
   self.player_state == PlayerState::Dodging {
    return;  // Can't move while attacking/dodging
}
```

## Cargo.toml

```toml
[package]
name = "third-person-game"
version = "0.1.0"
edition = "2024"

[dependencies]
nightshade = { git = "...", features = ["engine", "wgpu", "physics"] }
```
