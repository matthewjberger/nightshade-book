# First Person Game

A complete first-person shooter/exploration template with physics, audio, and weapons.

## Complete Example

```rust
use nightshade::prelude::*;

struct FirstPersonGame {
    player: Option<Entity>,
    weapon: Option<Entity>,
    health: f32,
    ammo: u32,
    score: u32,
    footstep_timer: f32,
}

impl Default for FirstPersonGame {
    fn default() -> Self {
        Self {
            player: None,
            weapon: None,
            health: 100.0,
            ammo: 30,
            score: 0,
            footstep_timer: 0.0,
        }
    }
}

impl State for FirstPersonGame {
    fn initialize(&mut self, world: &mut World) {
        self.setup_player(world);
        self.setup_level(world);
        self.setup_lighting(world);
        self.setup_ui(world);
        self.setup_audio(world);

        world.resources.graphics.show_cursor = false;
    }

    fn run_systems(&mut self, world: &mut World) {
        let dt = world.resources.window.timing.delta_time;

        self.update_player_movement(world, dt);
        self.update_weapon_sway(world, dt);
        self.update_footsteps(world, dt);
        self.update_ui(world);

        update_physics(world, dt);
        update_character_controller(world);
    }

    fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: ElementState) {
        if state == ElementState::Pressed {
            match key {
                KeyCode::Escape => self.toggle_pause(world),
                KeyCode::KeyR => self.reload_weapon(),
                _ => {}
            }
        }
    }

    fn on_mouse_input(&mut self, world: &mut World, state: ElementState, button: MouseButton) {
        if button == MouseButton::Left && state == ElementState::Pressed {
            self.fire_weapon(world);
        }
    }
}

impl FirstPersonGame {
    fn setup_player(&mut self, world: &mut World) {
        let player = world.spawn_entities(
            LOCAL_TRANSFORM | GLOBAL_TRANSFORM |
            CHARACTER_CONTROLLER | COLLIDER |
            AUDIO_LISTENER,
            1
        )[0];

        world.set_local_transform(player, LocalTransform {
            translation: Vec3::new(0.0, 1.8, 0.0),
            ..Default::default()
        });

        world.set_character_controller(player, CharacterController {
            height: 1.8,
            radius: 0.3,
            step_height: 0.3,
            max_slope: 45.0,
            move_speed: 5.0,
            jump_speed: 7.0,
            gravity: 20.0,
            grounded: false,
            velocity: Vec3::zeros(),
        });

        world.set_collider(player, ColliderComponent::capsule(0.3, 1.2));

        let camera = world.spawn_entities(
            LOCAL_TRANSFORM | GLOBAL_TRANSFORM | CAMERA | PARENT,
            1
        )[0];

        world.set_local_transform(camera, LocalTransform {
            translation: Vec3::new(0.0, 0.7, 0.0),
            ..Default::default()
        });

        world.set_camera(camera, Camera {
            projection: Projection::Perspective(PerspectiveCamera {
                y_fov_rad: 75.0_f32.to_radians(),
                z_near: 0.1,
                z_far: Some(1000.0),
                aspect_ratio: None,
            }),
            smoothing: None,
        });

        world.set_parent(camera, Parent(Some(player)));
        world.resources.active_camera = Some(camera);

        self.setup_weapon(world, camera);
        self.player = Some(player);
    }

    fn setup_weapon(&mut self, world: &mut World, camera: Entity) {
        let weapon = load_gltf(world, "assets/models/pistol.glb")[0];

        world.set_local_transform(weapon, LocalTransform {
            translation: Vec3::new(0.3, -0.2, -0.5),
            rotation: nalgebra_glm::quat_angle_axis(
                std::f32::consts::PI,
                &Vec3::y(),
            ),
            scale: Vec3::new(0.1, 0.1, 0.1),
        });

        world.set_parent(weapon, Parent(Some(camera)));
        self.weapon = Some(weapon);
    }

    fn setup_level(&mut self, world: &mut World) {
        let floor = spawn_plane_at(world, Vec3::zeros());
        set_material_with_textures(world, floor, Material {
            base_color: [0.3, 0.3, 0.3, 1.0],
            roughness: 0.9,
            ..Default::default()
        });
        add_collider(world, floor, ColliderShape::Box {
            half_extents: Vec3::new(50.0, 0.1, 50.0),
        });

        for index in 0..10 {
            let wall = spawn_cube_at(world, Vec3::zeros());
            let angle = index as f32 * std::f32::consts::TAU / 10.0;
            let distance = 20.0;

            world.set_local_transform(wall, LocalTransform {
                translation: Vec3::new(
                    angle.cos() * distance,
                    2.0,
                    angle.sin() * distance,
                ),
                scale: Vec3::new(5.0, 4.0, 0.5),
                rotation: nalgebra_glm::quat_angle_axis(angle, &Vec3::y()),
            });

            add_collider(world, wall, ColliderShape::Box {
                half_extents: Vec3::new(5.0, 4.0, 0.5),
            });
        }

        for index in 0..5 {
            let crate_entity = spawn_cube_at(world, Vec3::zeros());
            world.set_local_transform(crate_entity, LocalTransform {
                translation: Vec3::new(
                    (index as f32 - 2.0) * 3.0,
                    0.5,
                    -10.0,
                ),
                ..Default::default()
            });
            set_material_with_textures(world, crate_entity, Material {
                base_color: [0.6, 0.4, 0.2, 1.0],
                roughness: 0.8,
                ..Default::default()
            });

            add_rigid_body(world, crate_entity, RigidBodyType::Dynamic, 10.0);
            add_collider(world, crate_entity, ColliderShape::Box {
                half_extents: Vec3::new(0.5, 0.5, 0.5),
            });
        }
    }

    fn setup_lighting(&mut self, world: &mut World) {
        spawn_sun(world);

        world.resources.graphics.ambient_light = [0.1, 0.1, 0.1, 1.0];
    }

    fn setup_ui(&mut self, world: &mut World) {
        spawn_hud_text(
            world,
            &format!("Health: {}", self.health as u32),
            HudAnchor::BottomLeft,
            Vec2::new(20.0, -30.0),
        );

        spawn_hud_text(
            world,
            &format!("Ammo: {}", self.ammo),
            HudAnchor::BottomRight,
            Vec2::new(-20.0, -30.0),
        );

        let crosshair = spawn_hud_text(
            world,
            "+",
            HudAnchor::Center,
            Vec2::zeros(),
        );

        if let Some(hud_text) = world.get_hud_text_mut(crosshair) {
            hud_text.properties.font_size = 24.0;
            hud_text.properties.color = [1.0, 1.0, 1.0, 0.8];
        }
    }

    fn setup_audio(&mut self, world: &mut World) {
        load_sound(world, "footstep", "assets/audio/footstep.wav");
        load_sound(world, "gunshot", "assets/audio/gunshot.wav");
        load_sound(world, "reload", "assets/audio/reload.wav");
    }

    fn update_player_movement(&mut self, world: &mut World, dt: f32) {
        let Some(player) = self.player else { return };

        let keyboard = &world.resources.input.keyboard;
        let position_delta = world.resources.input.mouse.position_delta;

        let mut move_input = Vec3::zeros();
        if keyboard.is_key_pressed(KeyCode::KeyW) { move_input.z -= 1.0; }
        if keyboard.is_key_pressed(KeyCode::KeyS) { move_input.z += 1.0; }
        if keyboard.is_key_pressed(KeyCode::KeyA) { move_input.x -= 1.0; }
        if keyboard.is_key_pressed(KeyCode::KeyD) { move_input.x += 1.0; }

        if move_input.magnitude() > 0.0 {
            move_input = move_input.normalize();
        }

        let sprint = keyboard.is_key_pressed(KeyCode::ShiftLeft);
        let speed = if sprint { 8.0 } else { 5.0 };

        if let Some(controller) = world.get_character_controller_mut(player) {
            if let Some(transform) = world.get_local_transform(player) {
                let forward = transform.rotation * Vec3::new(0.0, 0.0, -1.0);
                let right = transform.rotation * Vec3::new(1.0, 0.0, 0.0);

                let forward_flat = Vec3::new(forward.x, 0.0, forward.z).normalize();
                let right_flat = Vec3::new(right.x, 0.0, right.z).normalize();

                let world_move = forward_flat * -move_input.z + right_flat * move_input.x;
                controller.velocity.x = world_move.x * speed;
                controller.velocity.z = world_move.z * speed;

                if keyboard.is_key_pressed(KeyCode::Space) && controller.grounded {
                    controller.velocity.y = controller.jump_speed;
                }
            }
        }

        if let Some(transform) = world.get_local_transform_mut(player) {
            let sensitivity = 0.002;
            let yaw = nalgebra_glm::quat_angle_axis(
                -position_delta.x * sensitivity,
                &Vec3::y(),
            );
            transform.rotation = yaw * transform.rotation;
        }

        if let Some(camera) = world.resources.active_camera {
            if let Some(transform) = world.get_local_transform_mut(camera) {
                let sensitivity = 0.002;
                let pitch = nalgebra_glm::quat_angle_axis(
                    -position_delta.y * sensitivity,
                    &Vec3::x(),
                );
                transform.rotation = transform.rotation * pitch;
            }
        }
    }

    fn update_weapon_sway(&mut self, world: &mut World, dt: f32) {
        let Some(weapon) = self.weapon else { return };

        let position_delta = world.resources.input.mouse.position_delta;

        if let Some(transform) = world.get_local_transform_mut(weapon) {
            let target_x = 0.3 - position_delta.x * 0.001;
            let target_y = -0.2 - position_delta.y * 0.001;

            transform.translation.x += (target_x - transform.translation.x) * dt * 10.0;
            transform.translation.y += (target_y - transform.translation.y) * dt * 10.0;
        }
    }

    fn update_footsteps(&mut self, world: &mut World, dt: f32) {
        let Some(player) = self.player else { return };

        let keyboard = &world.resources.input.keyboard;
        let moving = keyboard.is_key_pressed(KeyCode::KeyW) ||
                     keyboard.is_key_pressed(KeyCode::KeyS) ||
                     keyboard.is_key_pressed(KeyCode::KeyA) ||
                     keyboard.is_key_pressed(KeyCode::KeyD);

        if let Some(controller) = world.get_character_controller(player) {
            if moving && controller.grounded {
                self.footstep_timer -= dt;
                if self.footstep_timer <= 0.0 {
                    play_sound(world, "footstep");
                    self.footstep_timer = 0.4;
                }
            }
        }
    }

    fn update_ui(&mut self, world: &mut World) {
    }

    fn fire_weapon(&mut self, world: &mut World) {
        if self.ammo == 0 {
            return;
        }

        self.ammo -= 1;
        play_sound(world, "gunshot");

        if let Some(camera) = world.resources.active_camera {
            if let Some(transform) = world.get_global_transform(camera) {
                let origin = transform.translation();
                let direction = transform.forward_vector();

                if let Some(hit) = raycast(world, origin, direction, 100.0) {
                    if let Some(body) = world.get_rigid_body_mut(hit.entity) {
                        if body.body_type == RigidBodyType::Dynamic {
                            body.velocity += direction * 10.0;
                        }
                    }

                    self.spawn_impact_effect(world, hit.position, hit.normal);
                }
            }
        }
    }

    fn spawn_impact_effect(&self, world: &mut World, position: Vec3, normal: Vec3) {
        let sparks = world.spawn_entities(PARTICLE_EMITTER, 1)[0];

        world.set_particle_emitter(sparks, ParticleEmitter {
            emitter_type: EmitterType::Sparks,
            shape: EmitterShape::Point,
            position,
            direction: normal,
            spawn_rate: 0.0,
            burst_count: 20,
            particle_lifetime_min: 0.1,
            particle_lifetime_max: 0.3,
            initial_velocity_min: 3.0,
            initial_velocity_max: 8.0,
            velocity_spread: 0.5,
            gravity: Vec3::new(0.0, -10.0, 0.0),
            size_start: 0.02,
            size_end: 0.01,
            emissive_strength: 10.0,
            enabled: true,
            ..Default::default()
        });
    }

    fn reload_weapon(&mut self) {
        self.ammo = 30;
    }

    fn toggle_pause(&mut self, world: &mut World) {
        world.resources.graphics.show_cursor = !world.resources.graphics.show_cursor;
    }
}

fn main() {
    nightshade::launch(FirstPersonGame::default());
}
```

## Key Components

### Character Controller

The character controller handles physics-based movement:

```rust
CharacterController {
    height: 1.8,        // Player height
    radius: 0.3,        // Collision radius
    step_height: 0.3,   // Max step up height
    max_slope: 45.0,    // Walkable slope angle
    move_speed: 5.0,    // Base move speed
    jump_speed: 7.0,    // Jump velocity
    gravity: 20.0,      // Gravity strength
    grounded: false,    // On ground?
    velocity: Vec3::zeros(),
}
```

### Camera Setup

First-person camera is parented to the player:

```rust
world.set_parent(camera, Parent(Some(player)));
```

This makes the camera follow the player automatically.

### Weapon Attachment

The weapon is parented to the camera so it stays in view:

```rust
world.set_parent(weapon, Parent(Some(camera)));
```

### Mouse Look

Horizontal rotation (yaw) goes on the player body, vertical rotation (pitch) goes on the camera:

```rust
// Yaw on player
transform.rotation = yaw * transform.rotation;

// Pitch on camera
transform.rotation = transform.rotation * pitch;
```

This prevents gimbal lock and feels natural.

## Cargo.toml

```toml
[package]
name = "fps-game"
version = "0.1.0"
edition = "2024"

[dependencies]
nightshade = { git = "...", features = ["engine", "wgpu", "physics", "audio"] }
```
