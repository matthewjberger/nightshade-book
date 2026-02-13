# Physics Playground

> **Live Demo:** [Physics](https://matthewberger.dev/nightshade/physics)

An interactive physics sandbox demonstrating rigid bodies, colliders, joints, and forces.

## Complete Example

```rust
use nightshade::prelude::*;

struct PhysicsPlayground {
    spawn_mode: SpawnMode,
    selected_entity: Option<Entity>,
    holding_entity: Option<Entity>,
    grab_distance: f32,
}

#[derive(Default, Clone, Copy)]
enum SpawnMode {
    #[default]
    Cube,
    Sphere,
    Cylinder,
    Chain,
    Ragdoll,
}

impl Default for PhysicsPlayground {
    fn default() -> Self {
        Self {
            spawn_mode: SpawnMode::Cube,
            selected_entity: None,
            holding_entity: None,
            grab_distance: 5.0,
        }
    }
}

impl State for PhysicsPlayground {
    fn initialize(&mut self, world: &mut World) {
        let camera = spawn_camera(world, Vec3::new(0.0, 5.0, 10.0), "Camera".to_string());
        world.resources.active_camera = Some(camera);
        self.setup_environment(world);
        self.setup_ui(world);

        world.resources.graphics.show_cursor = false;
    }

    fn run_systems(&mut self, world: &mut World) {
        let dt = world.resources.window.timing.delta_time;

        fly_camera_system(world);
        self.update_held_object(world);
        self.update_ui(world);

        update_physics(world, dt);
    }

    fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: ElementState) {
        if state == ElementState::Pressed {
            match key {
                KeyCode::Digit1 => self.spawn_mode = SpawnMode::Cube,
                KeyCode::Digit2 => self.spawn_mode = SpawnMode::Sphere,
                KeyCode::Digit3 => self.spawn_mode = SpawnMode::Cylinder,
                KeyCode::Digit4 => self.spawn_mode = SpawnMode::Chain,
                KeyCode::Digit5 => self.spawn_mode = SpawnMode::Ragdoll,
                KeyCode::KeyR => self.reset_scene(world),
                KeyCode::KeyF => self.apply_explosion(world),
                KeyCode::KeyG => self.toggle_gravity(world),
                _ => {}
            }
        }
    }

    fn on_mouse_input(&mut self, world: &mut World, state: ElementState, button: MouseButton) {
        match (button, state) {
            (MouseButton::Left, ElementState::Pressed) => {
                self.spawn_object(world);
            }
            (MouseButton::Right, ElementState::Pressed) => {
                self.grab_object(world);
            }
            (MouseButton::Right, ElementState::Released) => {
                self.release_object(world);
            }
            (MouseButton::Middle, ElementState::Pressed) => {
                self.delete_at_cursor(world);
            }
            _ => {}
        }
    }
}

impl PhysicsPlayground {
    fn setup_environment(&mut self, world: &mut World) {
        let floor = spawn_plane_at(world, Vec3::zeros());
        set_material_with_textures(world,floor, Material {
            base_color: [0.3, 0.3, 0.35, 1.0],
            roughness: 0.8,
            ..Default::default()
        });
        add_collider(world, floor, ColliderShape::Box {
            half_extents: Vec3::new(50.0, 0.1, 50.0),
        });

        self.spawn_walls(world);

        spawn_sun(world);
        world.resources.graphics.ambient_light = [0.2, 0.2, 0.2, 1.0];
    }

    fn spawn_walls(&mut self, world: &mut World) {
        let wall_positions = [
            (Vec3::new(25.0, 2.5, 0.0), Vec3::new(0.5, 5.0, 50.0)),
            (Vec3::new(-25.0, 2.5, 0.0), Vec3::new(0.5, 5.0, 50.0)),
            (Vec3::new(0.0, 2.5, 25.0), Vec3::new(50.0, 5.0, 0.5)),
            (Vec3::new(0.0, 2.5, -25.0), Vec3::new(50.0, 5.0, 0.5)),
        ];

        for (position, half_extents) in wall_positions {
            let wall = spawn_cube_at(world, position);
            set_material_with_textures(world,wall, Material {
                base_color: [0.4, 0.4, 0.45, 1.0],
                roughness: 0.9,
                ..Default::default()
            });
            add_collider(world, wall, ColliderShape::Box { half_extents });
        }
    }

    fn setup_ui(&mut self, world: &mut World) {
        let help_text = "Controls:\n\
            1-5: Select spawn mode\n\
            Left Click: Spawn object\n\
            Right Click: Grab/throw\n\
            Middle Click: Delete\n\
            R: Reset scene\n\
            F: Explosion\n\
            G: Toggle gravity";

        spawn_hud_text(world, help_text, HudAnchor::TopLeft, Vec2::new(20.0, 20.0));

        spawn_hud_text(world, "Mode: Cube", HudAnchor::TopRight, Vec2::new(-20.0, 20.0));
    }

    fn update_ui(&mut self, world: &mut World) {
    }

    fn spawn_object(&mut self, world: &mut World) {
        let Some(camera) = world.resources.active_camera else { return };
        let Some(transform) = world.get_global_transform(camera) else { return };

        let spawn_position = transform.translation() +
            transform.forward_vector() * 5.0;

        match self.spawn_mode {
            SpawnMode::Cube => self.spawn_cube(world, spawn_position),
            SpawnMode::Sphere => self.spawn_sphere(world, spawn_position),
            SpawnMode::Cylinder => self.spawn_cylinder(world, spawn_position),
            SpawnMode::Chain => self.spawn_chain(world, spawn_position),
            SpawnMode::Ragdoll => self.spawn_ragdoll(world, spawn_position),
        }
    }

    fn spawn_cube(&self, world: &mut World, position: Vec3) -> Entity {
        let cube = spawn_cube_at(world, position);

        if let Some(transform) = world.get_local_transform_mut(cube) {
            transform.rotation = random_rotation();
        }

        set_material_with_textures(world,cube, Material {
            base_color: random_color(),
            roughness: 0.7,
            metallic: 0.1,
            ..Default::default()
        });

        add_rigid_body(world, cube, RigidBodyType::Dynamic, 1.0);
        add_collider(world, cube, ColliderShape::Box {
            half_extents: Vec3::new(0.5, 0.5, 0.5),
        });

        cube
    }

    fn spawn_sphere(&self, world: &mut World, position: Vec3) -> Entity {
        let sphere = spawn_sphere_at(world, position);

        set_material_with_textures(world,sphere, Material {
            base_color: random_color(),
            roughness: 0.3,
            metallic: 0.8,
            ..Default::default()
        });

        add_rigid_body(world, sphere, RigidBodyType::Dynamic, 1.0);
        add_collider(world, sphere, ColliderShape::Sphere { radius: 0.5 });

        sphere
    }

    fn spawn_cylinder(&self, world: &mut World, position: Vec3) -> Entity {
        let capsule = spawn_cylinder_at(world, position);

        if let Some(transform) = world.get_local_transform_mut(capsule) {
            transform.rotation = random_rotation();
        }

        set_material_with_textures(world,capsule, Material {
            base_color: random_color(),
            roughness: 0.5,
            metallic: 0.3,
            ..Default::default()
        });

        add_rigid_body(world, capsule, RigidBodyType::Dynamic, 1.0);
        add_collider(world, capsule, ColliderShape::Capsule {
            half_height: 0.5,
            radius: 0.3,
        });

        capsule
    }

    fn spawn_chain(&self, world: &mut World, start_position: Vec3) {
        let link_count = 10;
        let link_spacing = 0.8;
        let mut previous_link: Option<Entity> = None;

        for index in 0..link_count {
            let position = start_position + Vec3::new(0.0, -(index as f32 * link_spacing), 0.0);

            let link = spawn_cylinder_at(world, position);
            if let Some(transform) = world.get_local_transform_mut(link) {
                transform.scale = Vec3::new(0.2, 0.3, 0.2);
            }

            set_material_with_textures(world,link, Material {
                base_color: [0.7, 0.7, 0.75, 1.0],
                roughness: 0.3,
                metallic: 0.9,
                ..Default::default()
            });

            if index == 0 {
                add_rigid_body(world, link, RigidBodyType::Static, 0.0);
            } else {
                add_rigid_body(world, link, RigidBodyType::Dynamic, 0.5);
            }

            add_collider(world, link, ColliderShape::Capsule {
                half_height: 0.15,
                radius: 0.1,
            });

            if let Some(prev) = previous_link {
                create_spherical_joint(
                    world,
                    prev,
                    Vec3::new(0.0, -link_spacing / 2.0, 0.0),
                    link,
                    Vec3::new(0.0, link_spacing / 2.0, 0.0),
                );
            }

            previous_link = Some(link);
        }
    }

    fn spawn_ragdoll(&self, world: &mut World, position: Vec3) {
        let torso = self.spawn_body_part(world, position, Vec3::new(0.3, 0.4, 0.2), [0.8, 0.6, 0.5, 1.0]);

        let head = self.spawn_body_part(
            world,
            position + Vec3::new(0.0, 0.6, 0.0),
            Vec3::new(0.15, 0.15, 0.15),
            [0.9, 0.7, 0.6, 1.0],
        );

        let left_arm = self.spawn_body_part(
            world,
            position + Vec3::new(-0.5, 0.2, 0.0),
            Vec3::new(0.25, 0.08, 0.08),
            [0.8, 0.6, 0.5, 1.0],
        );

        let right_arm = self.spawn_body_part(
            world,
            position + Vec3::new(0.5, 0.2, 0.0),
            Vec3::new(0.25, 0.08, 0.08),
            [0.8, 0.6, 0.5, 1.0],
        );

        let left_leg = self.spawn_body_part(
            world,
            position + Vec3::new(-0.15, -0.6, 0.0),
            Vec3::new(0.1, 0.3, 0.1),
            [0.3, 0.3, 0.5, 1.0],
        );

        let right_leg = self.spawn_body_part(
            world,
            position + Vec3::new(0.15, -0.6, 0.0),
            Vec3::new(0.1, 0.3, 0.1),
            [0.3, 0.3, 0.5, 1.0],
        );

        create_spherical_joint(world, torso, Vec3::new(0.0, 0.4, 0.0), head, Vec3::new(0.0, -0.15, 0.0));
        create_spherical_joint(world, torso, Vec3::new(-0.3, 0.2, 0.0), left_arm, Vec3::new(0.25, 0.0, 0.0));
        create_spherical_joint(world, torso, Vec3::new(0.3, 0.2, 0.0), right_arm, Vec3::new(-0.25, 0.0, 0.0));
        create_spherical_joint(world, torso, Vec3::new(-0.15, -0.4, 0.0), left_leg, Vec3::new(0.0, 0.3, 0.0));
        create_spherical_joint(world, torso, Vec3::new(0.15, -0.4, 0.0), right_leg, Vec3::new(0.0, 0.3, 0.0));
    }

    fn spawn_body_part(&self, world: &mut World, position: Vec3, half_extents: Vec3, color: [f32; 4]) -> Entity {
        let part = spawn_cube_at(world, position);

        if let Some(transform) = world.get_local_transform_mut(part) {
            transform.scale = half_extents * 2.0;
        }

        set_material_with_textures(world,part, Material {
            base_color: color,
            roughness: 0.8,
            ..Default::default()
        });

        add_rigid_body(world, part, RigidBodyType::Dynamic, half_extents.x * half_extents.y * half_extents.z * 8.0);
        add_collider(world, part, ColliderShape::Box { half_extents });

        part
    }

    fn grab_object(&mut self, world: &mut World) {
        let Some(camera) = world.resources.active_camera else { return };
        let Some(transform) = world.get_global_transform(camera) else { return };

        let origin = transform.translation();
        let direction = transform.forward_vector();

        if let Some(hit) = raycast(world, origin, direction, 20.0) {
            if world.get_rigid_body(hit.entity).is_some() {
                self.holding_entity = Some(hit.entity);
                self.grab_distance = hit.distance;

                if let Some(body) = world.get_rigid_body_mut(hit.entity) {
                    body.linear_damping = 10.0;
                    body.angular_damping = 10.0;
                }
            }
        }
    }

    fn release_object(&mut self, world: &mut World) {
        if let Some(entity) = self.holding_entity.take() {
            if let Some(body) = world.get_rigid_body_mut(entity) {
                body.linear_damping = 0.0;
                body.angular_damping = 0.0;

                let Some(camera) = world.resources.active_camera else { return };
                let Some(transform) = world.get_global_transform(camera) else { return };

                let throw_direction = transform.forward_vector();
                body.velocity = throw_direction * 20.0;
            }
        }
    }

    fn update_held_object(&mut self, world: &mut World) {
        let Some(entity) = self.holding_entity else { return };
        let Some(camera) = world.resources.active_camera else { return };
        let Some(camera_transform) = world.get_global_transform(camera) else { return };

        let target = camera_transform.translation() +
            camera_transform.forward_vector() * self.grab_distance;

        if let Some(transform) = world.get_local_transform(entity) {
            let to_target = target - transform.translation;
            if let Some(body) = world.get_rigid_body_mut(entity) {
                body.velocity = to_target * 20.0;
            }
        }
    }

    fn delete_at_cursor(&mut self, world: &mut World) {
        let Some(camera) = world.resources.active_camera else { return };
        let Some(transform) = world.get_global_transform(camera) else { return };

        let origin = transform.translation();
        let direction = transform.forward_vector();

        if let Some(hit) = raycast(world, origin, direction, 50.0) {
            world.despawn_entities(&[hit.entity]);
        }
    }

    fn apply_explosion(&self, world: &mut World) {
        let Some(camera) = world.resources.active_camera else { return };
        let Some(transform) = world.get_global_transform(camera) else { return };

        let explosion_center = transform.translation() +
            transform.forward_vector() * 5.0;
        let explosion_radius = 10.0;
        let explosion_force = 50.0;

        for entity in world.query_entities(RIGID_BODY | GLOBAL_TRANSFORM) {
            if let (Some(body), Some(entity_transform)) = (
                world.get_rigid_body_mut(entity),
                world.get_global_transform(entity),
            ) {
                let to_entity = entity_transform.translation() - explosion_center;
                let distance = to_entity.magnitude();

                if distance < explosion_radius && distance > 0.1 {
                    let falloff = 1.0 - (distance / explosion_radius);
                    let force = to_entity.normalize() * explosion_force * falloff;
                    body.velocity += force;
                }
            }
        }
    }

    fn toggle_gravity(&self, world: &mut World) {
        let gravity = &mut world.resources.physics.gravity;
        if gravity.y < 0.0 {
            *gravity = Vec3::zeros();
        } else {
            *gravity = Vec3::new(0.0, -9.81, 0.0);
        }
    }

    fn reset_scene(&mut self, world: &mut World) {
        let entities_to_remove: Vec<Entity> = world
            .query_entities(RIGID_BODY)
            .filter(|e| {
                world.get_rigid_body(*e)
                    .map(|b| b.body_type == RigidBodyType::Dynamic)
                    .unwrap_or(false)
            })
            .collect();

        world.despawn_entities(&entities_to_remove);

        self.holding_entity = None;
        self.selected_entity = None;
    }
}

fn random_color() -> [f32; 4] {
    [
        0.3 + 0.7 * pseudo_random(),
        0.3 + 0.7 * pseudo_random(),
        0.3 + 0.7 * pseudo_random(),
        1.0,
    ]
}

fn random_rotation() -> nalgebra_glm::Quat {
    nalgebra_glm::quat_angle_axis(
        pseudo_random() * std::f32::consts::TAU,
        &Vec3::new(
            pseudo_random() - 0.5,
            pseudo_random() - 0.5,
            pseudo_random() - 0.5,
        ).normalize(),
    )
}

fn pseudo_random() -> f32 {
    static mut SEED: u32 = 12345;
    unsafe {
        SEED = SEED.wrapping_mul(1103515245).wrapping_add(12345);
        (SEED as f32 / u32::MAX as f32)
    }
}

fn main() {
    nightshade::launch(PhysicsPlayground::default());
}
```

## Features Demonstrated

### Object Spawning

Spawn various physics primitives with random colors:
- Cubes
- Spheres
- Cylinders

### Joint Systems

**Chain**: A series of capsules connected by spherical joints, anchored at the top.

**Ragdoll**: A humanoid figure made of box body parts connected by joints:
- Head connected to torso
- Arms connected to torso
- Legs connected to torso

### Object Manipulation

**Grab**: Right-click to grab objects and move them with the camera.

**Throw**: Release right-click to throw grabbed objects.

**Delete**: Middle-click to delete objects.

### Physics Effects

**Explosion**: Press F to apply radial force to nearby objects.

**Gravity Toggle**: Press G to toggle between normal gravity and zero gravity.

### Raycasting

Used for:
- Selecting objects to grab
- Deleting objects
- Hit detection

## Cargo.toml

```toml
[package]
name = "physics-playground"
version = "0.1.0"
edition = "2024"

[dependencies]
nightshade = { git = "...", features = ["engine", "wgpu", "physics"] }
```
