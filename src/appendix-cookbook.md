# Cookbook

Quick recipes organized by what you want to accomplish. Each recipe is self-contained and uses real Nightshade API patterns.

## I Want To... Move Things

### Move a player with WASD

```rust
fn player_movement(world: &mut World, player: Entity, speed: f32) {
    let dt = world.resources.window.timing.delta_time;
    let keyboard = &world.resources.input.keyboard;

    let mut direction = Vec3::zeros();

    if keyboard.is_key_pressed(KeyCode::KeyW) { direction.z -= 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyS) { direction.z += 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyA) { direction.x -= 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyD) { direction.x += 1.0; }

    if direction.magnitude() > 0.0 {
        direction = direction.normalize();

        if let Some(transform) = world.get_local_transform_mut(player) {
            transform.translation += direction * speed * dt;
        }
        mark_local_transform_dirty(world, player);
    }
}
```

### Move a player relative to the camera

```rust
fn camera_relative_movement(
    world: &mut World,
    player: Entity,
    camera: Entity,
    speed: f32,
) {
    let dt = world.resources.window.timing.delta_time;
    let keyboard = &world.resources.input.keyboard;

    let mut input = Vec2::zeros();
    if keyboard.is_key_pressed(KeyCode::KeyW) { input.y -= 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyS) { input.y += 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyA) { input.x -= 1.0; }
    if keyboard.is_key_pressed(KeyCode::KeyD) { input.x += 1.0; }

    if input.magnitude() < 0.01 {
        return;
    }
    input = input.normalize();

    let Some(camera_transform) = world.get_global_transform(camera) else { return };
    let forward = camera_transform.forward_vector();
    let forward_flat = Vec3::new(forward.x, 0.0, forward.z).normalize();
    let right_flat = Vec3::new(forward.z, 0.0, -forward.x).normalize();

    let world_direction = forward_flat * -input.y + right_flat * input.x;

    if let Some(transform) = world.get_local_transform_mut(player) {
        transform.translation += world_direction * speed * dt;

        let target_yaw = world_direction.x.atan2(world_direction.z);
        let target_rotation = nalgebra_glm::quat_angle_axis(target_yaw, &Vec3::y());
        transform.rotation = nalgebra_glm::quat_slerp(
            &transform.rotation,
            &target_rotation,
            dt * 10.0,
        );
    }
    mark_local_transform_dirty(world, player);
}
```

### Add jumping with gravity

```rust
struct JumpState {
    velocity_y: f32,
    grounded: bool,
}

fn handle_jumping(
    world: &mut World,
    player: Entity,
    state: &mut JumpState,
    jump_force: f32,
    gravity: f32,
) {
    let dt = world.resources.window.timing.delta_time;

    if state.grounded && world.resources.input.keyboard.is_key_pressed(KeyCode::Space) {
        state.velocity_y = jump_force;
        state.grounded = false;
    }

    if !state.grounded {
        state.velocity_y -= gravity * dt;
    }

    if let Some(transform) = world.get_local_transform_mut(player) {
        transform.translation.y += state.velocity_y * dt;

        if transform.translation.y <= 0.0 {
            transform.translation.y = 0.0;
            state.velocity_y = 0.0;
            state.grounded = true;
        }
    }
    mark_local_transform_dirty(world, player);
}
```

### Make an object bob up and down

```rust
fn bob_system(world: &mut World, entity: Entity, time: f32, amplitude: f32, frequency: f32) {
    if let Some(transform) = world.get_local_transform_mut(entity) {
        transform.translation.y = 1.0 + (time * frequency).sin() * amplitude;
    }
    mark_local_transform_dirty(world, entity);
}
```

### Rotate an object continuously

```rust
fn spin_system(world: &mut World, entity: Entity, time: f32) {
    if let Some(transform) = world.get_local_transform_mut(entity) {
        transform.rotation = nalgebra_glm::quat_angle_axis(time, &Vec3::y());
    }
    mark_local_transform_dirty(world, entity);
}
```

---

## I Want To... Set Up Cameras

### Make a first-person camera

Horizontal yaw on the player body, vertical pitch on the camera. The camera is parented to the player so it follows automatically:

```rust
fn setup_fps_camera(world: &mut World, player: Entity) -> Entity {
    let camera = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | CAMERA | PARENT,
        1,
    )[0];

    world.set_local_transform(camera, LocalTransform {
        translation: Vec3::new(0.0, 0.7, 0.0),
        ..Default::default()
    });
    world.set_camera(camera, Camera::default());
    world.set_parent(camera, Parent(Some(player)));
    world.resources.active_camera = Some(camera);

    camera
}

fn fps_look(world: &mut World, player: Entity, camera: Entity) {
    let mouse_delta = world.resources.input.mouse.position_delta;
    let sensitivity = 0.002;

    if let Some(transform) = world.get_local_transform_mut(player) {
        let yaw = nalgebra_glm::quat_angle_axis(-mouse_delta.x * sensitivity, &Vec3::y());
        transform.rotation = yaw * transform.rotation;
    }
    mark_local_transform_dirty(world, player);

    if let Some(transform) = world.get_local_transform_mut(camera) {
        let pitch = nalgebra_glm::quat_angle_axis(-mouse_delta.y * sensitivity, &Vec3::x());
        transform.rotation = transform.rotation * pitch;
    }
    mark_local_transform_dirty(world, camera);
}
```

### Make a third-person orbit camera

```rust
struct OrbitCamera {
    target: Entity,
    distance: f32,
    yaw: f32,
    pitch: f32,
}

fn orbit_camera_system(world: &mut World, camera: Entity, orbit: &mut OrbitCamera) {
    let mouse_delta = world.resources.input.mouse.position_delta;
    let scroll = world.resources.input.mouse.wheel_delta;

    orbit.yaw -= mouse_delta.x * 0.003;
    orbit.pitch -= mouse_delta.y * 0.003;
    orbit.pitch = orbit.pitch.clamp(-1.4, 1.4);
    orbit.distance = (orbit.distance - scroll.y * 0.5).clamp(2.0, 20.0);

    let Some(target_transform) = world.get_global_transform(orbit.target) else { return };
    let target_pos = target_transform.translation() + Vec3::new(0.0, 1.5, 0.0);

    let offset = Vec3::new(
        orbit.yaw.sin() * orbit.pitch.cos(),
        orbit.pitch.sin(),
        orbit.yaw.cos() * orbit.pitch.cos(),
    ) * orbit.distance;

    let camera_pos = target_pos + offset;

    if let Some(transform) = world.get_local_transform_mut(camera) {
        transform.translation = camera_pos;

        let direction = (target_pos - camera_pos).normalize();
        let pitch = (-direction.y).asin();
        let yaw = direction.x.atan2(direction.z);

        transform.rotation = nalgebra_glm::quat_angle_axis(yaw, &Vec3::y())
            * nalgebra_glm::quat_angle_axis(pitch, &Vec3::x());
    }
    mark_local_transform_dirty(world, camera);
}
```

### Make a smooth follow camera

```rust
fn follow_camera(
    world: &mut World,
    target: Entity,
    camera: Entity,
    offset: Vec3,
    smoothness: f32,
) {
    let dt = world.resources.window.timing.delta_time;

    let Some(target_transform) = world.get_global_transform(target) else { return };
    let target_pos = target_transform.translation() + offset;

    if let Some(cam_transform) = world.get_local_transform_mut(camera) {
        cam_transform.translation = nalgebra_glm::lerp(
            &cam_transform.translation,
            &target_pos,
            dt * smoothness,
        );

        let look_at = target_transform.translation();
        let direction = (look_at - cam_transform.translation).normalize();
        let pitch = (-direction.y).asin();
        let yaw = direction.x.atan2(direction.z);

        cam_transform.rotation = nalgebra_glm::quat_angle_axis(yaw, &Vec3::y())
            * nalgebra_glm::quat_angle_axis(pitch, &Vec3::x());
    }
    mark_local_transform_dirty(world, camera);
}
```

---

## I Want To... Spawn Objects

### Spawn a colored cube

```rust
fn spawn_colored_cube(world: &mut World, position: Vec3, color: [f32; 4]) -> Entity {
    let cube = spawn_cube_at(world, position);

    material_registry_insert(
        &mut world.resources.material_registry,
        format!("cube_{}", cube.id),
        Material {
            base_color: color,
            ..Default::default()
        },
    );

    let material_name = format!("cube_{}", cube.id);
    if let Some(&index) = world.resources.material_registry.registry.name_to_index.get(&material_name) {
        world.resources.material_registry.registry.add_reference(index);
    }
    world.set_material_ref(cube, MaterialRef::new(material_name));

    cube
}
```

### Spawn objects at random positions

```rust
fn random_position_in_box(center: Vec3, half_extents: Vec3) -> Vec3 {
    Vec3::new(
        center.x + (rand::random::<f32>() - 0.5) * 2.0 * half_extents.x,
        center.y + (rand::random::<f32>() - 0.5) * 2.0 * half_extents.y,
        center.z + (rand::random::<f32>() - 0.5) * 2.0 * half_extents.z,
    )
}

fn random_position_on_circle(center: Vec3, radius: f32) -> Vec3 {
    let angle = rand::random::<f32>() * std::f32::consts::TAU;
    Vec3::new(
        center.x + angle.cos() * radius,
        center.y,
        center.z + angle.sin() * radius,
    )
}
```

### Spawn a physics object that falls

```rust
fn spawn_physics_cube(world: &mut World, position: Vec3) -> Entity {
    let cube = spawn_cube_at(world, position);
    add_rigid_body(world, cube, RigidBodyType::Dynamic, 1.0);
    add_collider(world, cube, ColliderShape::Cuboid {
        half_extents: Vec3::new(0.5, 0.5, 0.5),
    });
    cube
}
```

### Spawn a wave of enemies at intervals

```rust
struct WaveSpawner {
    wave: u32,
    enemies_remaining: u32,
    spawn_timer: f32,
    spawn_interval: f32,
}

impl WaveSpawner {
    fn update(&mut self, world: &mut World, dt: f32) {
        if self.enemies_remaining == 0 {
            self.wave += 1;
            self.enemies_remaining = 5 + self.wave * 2;
            self.spawn_interval = (2.0 - self.wave as f32 * 0.1).max(0.3);
            return;
        }

        self.spawn_timer -= dt;
        if self.spawn_timer <= 0.0 {
            let position = random_position_on_circle(Vec3::zeros(), 20.0);
            spawn_cube_at(world, position);
            self.enemies_remaining -= 1;
            self.spawn_timer = self.spawn_interval;
        }
    }
}
```

### Load a 3D model

```rust
fn initialize(&mut self, world: &mut World) {
    let entities = load_gltf(world, "assets/models/character.glb");
    let root = entities[0];

    world.set_local_transform(root, LocalTransform {
        translation: Vec3::new(0.0, 0.0, 0.0),
        scale: Vec3::new(1.0, 1.0, 1.0),
        ..Default::default()
    });
}
```

---

## I Want To... Use Physics

### Apply an explosion force

```rust
fn explosion(world: &mut World, center: Vec3, radius: f32, force: f32) {
    for entity in world.query_entities(RIGID_BODY | GLOBAL_TRANSFORM) {
        let Some(transform) = world.get_global_transform(entity) else { continue };
        let to_entity = transform.translation() - center;
        let distance = to_entity.magnitude();

        if distance < radius && distance > 0.1 {
            let falloff = 1.0 - (distance / radius);
            let impulse = to_entity.normalize() * force * falloff;

            if let Some(body) = world.get_rigid_body_mut(entity) {
                body.linvel = [
                    body.linvel[0] + impulse.x,
                    body.linvel[1] + impulse.y,
                    body.linvel[2] + impulse.z,
                ];
            }
        }
    }
}
```

### Raycast from the camera

```rust
fn shoot_from_camera(world: &mut World) {
    let Some(camera) = world.resources.active_camera else { return };
    let Some(transform) = world.get_global_transform(camera) else { return };

    let origin = transform.translation();
    let direction = transform.forward_vector();

    if let Some(hit) = raycast(world, origin, direction, 100.0) {
        let hit_position = hit.position;
        let hit_normal = hit.normal;
        let hit_entity = hit.entity;
    }
}
```

### Grab and throw objects

```rust
struct GrabState {
    entity: Option<Entity>,
    distance: f32,
}

fn grab_object(world: &mut World, state: &mut GrabState) {
    let Some(camera) = world.resources.active_camera else { return };
    let Some(transform) = world.get_global_transform(camera) else { return };

    if let Some(hit) = raycast(world, transform.translation(), transform.forward_vector(), 20.0) {
        if world.get_rigid_body(hit.entity).is_some() {
            state.entity = Some(hit.entity);
            state.distance = hit.distance;

            if let Some(body) = world.get_rigid_body_mut(hit.entity) {
                body.linear_damping = 10.0;
                body.angular_damping = 10.0;
            }
        }
    }
}

fn update_held_object(world: &mut World, state: &GrabState) {
    let Some(entity) = state.entity else { return };
    let Some(camera) = world.resources.active_camera else { return };
    let Some(camera_transform) = world.get_global_transform(camera) else { return };

    let target = camera_transform.translation() +
        camera_transform.forward_vector() * state.distance;

    if let Some(transform) = world.get_local_transform(entity) {
        let to_target = target - transform.translation;
        if let Some(body) = world.get_rigid_body_mut(entity) {
            body.linvel = [to_target.x * 20.0, to_target.y * 20.0, to_target.z * 20.0];
        }
    }
}

fn throw_object(world: &mut World, state: &mut GrabState) {
    if let Some(entity) = state.entity.take() {
        let Some(camera) = world.resources.active_camera else { return };
        let Some(transform) = world.get_global_transform(camera) else { return };
        let direction = transform.forward_vector();

        if let Some(body) = world.get_rigid_body_mut(entity) {
            body.linear_damping = 0.0;
            body.angular_damping = 0.0;
            body.linvel = [direction.x * 20.0, direction.y * 20.0, direction.z * 20.0];
        }
    }
}
```

---

## I Want To... Create Materials

### Make a glowing emissive material

```rust
let neon = Material {
    base_color: [0.2, 0.8, 1.0, 1.0],
    emissive_factor: [0.2, 0.8, 1.0],
    emissive_strength: 10.0,
    roughness: 0.8,
    ..Default::default()
};
```

### Make glass

```rust
let glass = Material {
    base_color: [0.95, 0.95, 1.0, 1.0],
    roughness: 0.05,
    metallic: 0.0,
    transmission_factor: 0.95,
    ior: 1.5,
    ..Default::default()
};
```

### Make a metallic surface

```rust
let gold = Material {
    base_color: [1.0, 0.84, 0.0, 1.0],
    roughness: 0.3,
    metallic: 1.0,
    ..Default::default()
};
```

### Make a transparent ghost-like material

```rust
let ghost = Material {
    base_color: [0.9, 0.95, 1.0, 0.3],
    alpha_mode: AlphaMode::Blend,
    roughness: 0.1,
    ..Default::default()
};
```

---

## I Want To... Show UI

### Display an FPS counter

```rust
struct FpsCounter {
    samples: Vec<f32>,
    text_entity: Entity,
}

impl FpsCounter {
    fn update(&mut self, world: &mut World) {
        let fps = world.resources.window.timing.frames_per_second;
        self.samples.push(fps);

        if self.samples.len() > 60 {
            self.samples.remove(0);
        }

        let avg: f32 = self.samples.iter().sum::<f32>() / self.samples.len() as f32;

        if let Some(text) = world.get_hud_text_mut(self.text_entity) {
            text.text = format!("FPS: {:.0}", avg);
        }
    }
}
```

### Display a health bar as HUD text

```rust
fn update_health_bar(world: &mut World, text_entity: Entity, current: f32, max: f32) {
    let bar_length = 20;
    let filled = ((current / max) * bar_length as f32) as usize;

    let bar = format!(
        "[{}{}] {}/{}",
        "|".repeat(filled.min(bar_length)),
        ".".repeat(bar_length - filled.min(bar_length)),
        current as u32,
        max as u32,
    );

    if let Some(text) = world.get_hud_text_mut(text_entity) {
        text.text = bar;
    }
}
```

### Show a scoreboard with egui

```rust
fn ui(&mut self, _world: &mut World, ctx: &egui::Context) {
    egui::Window::new("Score")
        .anchor(egui::Align2::CENTER_TOP, [0.0, 10.0])
        .resizable(false)
        .collapsible(false)
        .title_bar(false)
        .show(ctx, |ui| {
            ui.heading(format!("{} - {}", self.left_score, self.right_score));
        });
}
```

---

## I Want To... Handle Game States

### Pause the game

```rust
fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: KeyState) {
    if state == KeyState::Pressed && key == KeyCode::Escape {
        self.paused = !self.paused;
        world.resources.graphics.show_cursor = self.paused;
    }
}

fn run_systems(&mut self, world: &mut World) {
    if self.paused {
        return;
    }

    self.update_game_logic(world);
}
```

### Build a state machine for player actions

```rust
#[derive(Clone, Copy, PartialEq, Eq)]
enum PlayerAction {
    Idle,
    Walking,
    Running,
    Attacking,
    Dodging,
}

struct ActionState {
    current: PlayerAction,
    timer: f32,
}

impl ActionState {
    fn transition(&mut self, new_state: PlayerAction) {
        if self.current != new_state {
            self.current = new_state;
            self.timer = 0.0;
        }
    }

    fn update(&mut self, dt: f32) {
        self.timer += dt;
    }

    fn can_interrupt(&self) -> bool {
        match self.current {
            PlayerAction::Attacking => self.timer > 0.5,
            PlayerAction::Dodging => self.timer > 0.3,
            _ => true,
        }
    }
}
```

---

## I Want To... Use Timers

### Cooldown timer

```rust
struct Cooldown {
    duration: f32,
    remaining: f32,
}

impl Cooldown {
    fn new(duration: f32) -> Self {
        Self { duration, remaining: 0.0 }
    }

    fn update(&mut self, dt: f32) {
        self.remaining = (self.remaining - dt).max(0.0);
    }

    fn ready(&self) -> bool {
        self.remaining <= 0.0
    }

    fn trigger(&mut self) {
        self.remaining = self.duration;
    }

    fn progress(&self) -> f32 {
        1.0 - (self.remaining / self.duration)
    }
}
```

### Repeating timer

```rust
struct RepeatingTimer {
    interval: f32,
    elapsed: f32,
}

impl RepeatingTimer {
    fn new(interval: f32) -> Self {
        Self { interval, elapsed: 0.0 }
    }

    fn tick(&mut self, dt: f32) -> bool {
        self.elapsed += dt;

        if self.elapsed >= self.interval {
            self.elapsed -= self.interval;
            true
        } else {
            false
        }
    }
}
```

---

## I Want To... Debug Things

### Draw wireframe collision boxes

```rust
fn debug_draw_boxes(
    world: &mut World,
    lines_entity: Entity,
    entities: &[Entity],
    half_extents: Vec3,
) {
    let mut lines = vec![];

    for &entity in entities {
        let Some(transform) = world.get_global_transform(entity) else { continue };
        let pos = transform.translation();
        let color = Vec4::new(0.0, 1.0, 0.0, 1.0);
        let half = half_extents;

        let corners = [
            pos + Vec3::new(-half.x, -half.y, -half.z),
            pos + Vec3::new( half.x, -half.y, -half.z),
            pos + Vec3::new( half.x, -half.y,  half.z),
            pos + Vec3::new(-half.x, -half.y,  half.z),
            pos + Vec3::new(-half.x,  half.y, -half.z),
            pos + Vec3::new( half.x,  half.y, -half.z),
            pos + Vec3::new( half.x,  half.y,  half.z),
            pos + Vec3::new(-half.x,  half.y,  half.z),
        ];

        let edges = [
            (0,1), (1,2), (2,3), (3,0),
            (4,5), (5,6), (6,7), (7,4),
            (0,4), (1,5), (2,6), (3,7),
        ];

        for (a, b) in edges {
            lines.push(Line { start: corners[a], end: corners[b], color });
        }
    }

    world.set_lines(lines_entity, Lines { lines, version: 0 });
}
```

---

## I Want To... Save and Load

### Save game state to JSON

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct SaveData {
    player_position: [f32; 3],
    player_health: f32,
    score: u32,
    level: u32,
}

fn save_game(data: &SaveData, path: &str) -> std::io::Result<()> {
    let json = serde_json::to_string_pretty(data)?;
    std::fs::write(path, json)?;
    Ok(())
}

fn load_game(path: &str) -> std::io::Result<SaveData> {
    let json = std::fs::read_to_string(path)?;
    let data: SaveData = serde_json::from_str(&json)?;
    Ok(data)
}
```

---

## I Want To... Play Audio

### Footstep sounds while moving

```rust
struct FootstepSystem {
    timer: f32,
    interval: f32,
    sounds: Vec<String>,
    last_index: usize,
}

impl FootstepSystem {
    fn update(&mut self, world: &mut World, is_moving: bool, is_running: bool, dt: f32) {
        if !is_moving {
            self.timer = 0.0;
            return;
        }

        let interval = if is_running { self.interval * 0.6 } else { self.interval };
        self.timer += dt;

        if self.timer >= interval {
            self.timer = 0.0;

            let mut index = rand::random::<usize>() % self.sounds.len();
            if index == self.last_index && self.sounds.len() > 1 {
                index = (index + 1) % self.sounds.len();
            }
            self.last_index = index;

            play_sound(world, &self.sounds[index]);
        }
    }
}
```

---

## I Want To... Pool Entities

### Reuse entities instead of spawning/despawning

```rust
struct EntityPool {
    available: Vec<Entity>,
    active: Vec<Entity>,
    spawn_fn: fn(&mut World) -> Entity,
}

impl EntityPool {
    fn new(world: &mut World, initial_size: usize, spawn_fn: fn(&mut World) -> Entity) -> Self {
        let mut available = Vec::with_capacity(initial_size);

        for _ in 0..initial_size {
            let entity = spawn_fn(world);
            world.set_visibility(entity, Visibility { visible: false });
            available.push(entity);
        }

        Self { available, active: Vec::new(), spawn_fn }
    }

    fn acquire(&mut self, world: &mut World) -> Entity {
        let entity = self.available.pop().unwrap_or_else(|| (self.spawn_fn)(world));
        world.set_visibility(entity, Visibility { visible: true });
        self.active.push(entity);
        entity
    }

    fn release(&mut self, world: &mut World, entity: Entity) {
        if let Some(index) = self.active.iter().position(|&entity_in_pool| entity_in_pool == entity) {
            self.active.swap_remove(index);
            world.set_visibility(entity, Visibility { visible: false });
            self.available.push(entity);
        }
    }
}
```

---

## I Want To... Attach Things to Other Things

### Parent an object to another entity

```rust
world.set_parent(child, Parent(Some(parent)));
```

The child's `LocalTransform` becomes relative to the parent. The engine computes the `GlobalTransform` automatically via the transform hierarchy.

### Attach a weapon to a camera

```rust
fn attach_weapon_to_camera(world: &mut World, camera: Entity) -> Entity {
    let weapon = load_gltf(world, "assets/models/pistol.glb")[0];

    world.set_local_transform(weapon, LocalTransform {
        translation: Vec3::new(0.3, -0.2, -0.5),
        rotation: nalgebra_glm::quat_angle_axis(std::f32::consts::PI, &Vec3::y()),
        scale: Vec3::new(0.1, 0.1, 0.1),
    });

    world.set_parent(weapon, Parent(Some(camera)));
    weapon
}
```

### Add weapon sway from mouse movement

```rust
fn weapon_sway(world: &mut World, weapon: Entity, rest_x: f32, rest_y: f32) {
    let dt = world.resources.window.timing.delta_time;
    let mouse_delta = world.resources.input.mouse.position_delta;

    if let Some(transform) = world.get_local_transform_mut(weapon) {
        let target_x = rest_x - mouse_delta.x * 0.001;
        let target_y = rest_y - mouse_delta.y * 0.001;

        transform.translation.x += (target_x - transform.translation.x) * dt * 10.0;
        transform.translation.y += (target_y - transform.translation.y) * dt * 10.0;
    }
    mark_local_transform_dirty(world, weapon);
}
```
