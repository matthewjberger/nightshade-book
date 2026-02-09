# Cookbook

Common recipes and patterns for Nightshade game development.

## Player Movement

### Basic WASD Movement

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
    }
}
```

### Camera-Relative Movement

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

    let forward = camera_transform.forward();
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
}
```

### Jumping

```rust
struct PlayerState {
    velocity_y: f32,
    grounded: bool,
}

fn handle_jumping(
    world: &mut World,
    player: Entity,
    state: &mut PlayerState,
    jump_force: f32,
    gravity: f32,
) {
    let dt = world.resources.window.timing.delta_time;
    let keyboard = &world.resources.input.keyboard;

    if state.grounded && keyboard.is_key_just_pressed(KeyCode::Space) {
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
}
```

## Camera Systems

### Smooth Follow Camera

```rust
struct FollowCamera {
    offset: Vec3,
    smoothness: f32,
}

fn follow_camera_system(
    world: &mut World,
    target: Entity,
    camera: Entity,
    config: &FollowCamera,
) {
    let dt = world.resources.window.timing.delta_time;

    let Some(target_transform) = world.get_global_transform(target) else { return };
    let target_pos = target_transform.translation() + config.offset;

    if let Some(cam_transform) = world.get_local_transform_mut(camera) {
        cam_transform.translation = nalgebra_glm::lerp(
            &cam_transform.translation,
            &target_pos,
            dt * config.smoothness,
        );

        let look_at = target_transform.translation();
        let direction = (look_at - cam_transform.translation).normalize();
        let pitch = (-direction.y).asin();
        let yaw = direction.x.atan2(direction.z);

        cam_transform.rotation = nalgebra_glm::quat_angle_axis(yaw, &Vec3::y())
            * nalgebra_glm::quat_angle_axis(pitch, &Vec3::x());
    }
}
```

### Third-Person Orbit Camera

```rust
struct OrbitCamera {
    target: Entity,
    distance: f32,
    yaw: f32,
    pitch: f32,
    sensitivity: f32,
}

fn orbit_camera_system(world: &mut World, camera: Entity, orbit: &mut OrbitCamera) {
    let mouse_delta = world.resources.input.mouse.delta;
    let scroll = world.resources.input.mouse.scroll_delta;

    orbit.yaw -= mouse_delta.x * orbit.sensitivity;
    orbit.pitch -= mouse_delta.y * orbit.sensitivity;
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
}
```

### First-Person Camera

```rust
struct FpsCamera {
    yaw: f32,
    pitch: f32,
    sensitivity: f32,
}

fn fps_camera_system(world: &mut World, camera: Entity, fps: &mut FpsCamera) {
    let mouse_delta = world.resources.input.mouse.delta;

    fps.yaw -= mouse_delta.x * fps.sensitivity;
    fps.pitch -= mouse_delta.y * fps.sensitivity;
    fps.pitch = fps.pitch.clamp(-1.5, 1.5);

    if let Some(transform) = world.get_local_transform_mut(camera) {
        transform.rotation = nalgebra_glm::quat_angle_axis(fps.yaw, &Vec3::y())
            * nalgebra_glm::quat_angle_axis(fps.pitch, &Vec3::x());
    }
}
```

## Combat Systems

### Health System

```rust
struct Health {
    current: f32,
    maximum: f32,
    invulnerable_timer: f32,
}

impl Health {
    fn take_damage(&mut self, amount: f32, dt: f32) -> bool {
        if self.invulnerable_timer > 0.0 {
            return false;
        }

        self.current = (self.current - amount).max(0.0);
        self.invulnerable_timer = 0.5;

        self.current <= 0.0
    }

    fn heal(&mut self, amount: f32) {
        self.current = (self.current + amount).min(self.maximum);
    }

    fn update(&mut self, dt: f32) {
        if self.invulnerable_timer > 0.0 {
            self.invulnerable_timer -= dt;
        }
    }
}
```

### Melee Attack

```rust
fn melee_attack(
    world: &mut World,
    attacker: Entity,
    damage: f32,
    range: f32,
    angle: f32,
) -> Vec<Entity> {
    let Some(attacker_transform) = world.get_global_transform(attacker) else {
        return vec![];
    };

    let origin = attacker_transform.translation();
    let forward = attacker_transform.forward();

    let mut hit_entities = vec![];

    for entity in world.query_entities(GLOBAL_TRANSFORM) {
        if entity == attacker {
            continue;
        }

        let Some(target_transform) = world.get_global_transform(entity) else {
            continue;
        };

        let to_target = target_transform.translation() - origin;
        let distance = to_target.magnitude();

        if distance > range {
            continue;
        }

        let dot = forward.dot(&to_target.normalize());
        if dot < angle.cos() {
            continue;
        }

        hit_entities.push(entity);
    }

    hit_entities
}
```

### Projectile System

```rust
struct Projectile {
    velocity: Vec3,
    damage: f32,
    lifetime: f32,
    owner: Entity,
}

fn spawn_projectile(
    world: &mut World,
    position: Vec3,
    direction: Vec3,
    speed: f32,
    damage: f32,
    owner: Entity,
) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | MESH_COMPONENT,
        1
    )[0];

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        scale: Vec3::new(0.1, 0.1, 0.5),
        ..Default::default()
    });

    entity
}

fn update_projectiles(
    world: &mut World,
    projectiles: &mut Vec<(Entity, Projectile)>,
) {
    let dt = world.resources.window.timing.delta_time;

    projectiles.retain_mut(|(entity, projectile)| {
        projectile.lifetime -= dt;

        if projectile.lifetime <= 0.0 {
            world.despawn_entities(&[*entity]);
            return false;
        }

        if let Some(transform) = world.get_local_transform_mut(*entity) {
            transform.translation += projectile.velocity * dt;
        }

        true
    });
}
```

## Object Pooling

### Entity Pool

```rust
struct EntityPool {
    available: Vec<Entity>,
    active: Vec<Entity>,
    prefab_spawn_fn: fn(&mut World) -> Entity,
}

impl EntityPool {
    fn new(world: &mut World, initial_size: usize, spawn_fn: fn(&mut World) -> Entity) -> Self {
        let mut available = Vec::with_capacity(initial_size);

        for _ in 0..initial_size {
            let entity = spawn_fn(world);
            set_entity_active(world, entity, false);
            available.push(entity);
        }

        Self {
            available,
            active: Vec::new(),
            prefab_spawn_fn: spawn_fn,
        }
    }

    fn acquire(&mut self, world: &mut World) -> Entity {
        let entity = self.available.pop().unwrap_or_else(|| {
            (self.prefab_spawn_fn)(world)
        });

        set_entity_active(world, entity, true);
        self.active.push(entity);
        entity
    }

    fn release(&mut self, world: &mut World, entity: Entity) {
        if let Some(index) = self.active.iter().position(|&e| e == entity) {
            self.active.swap_remove(index);
            set_entity_active(world, entity, false);
            self.available.push(entity);
        }
    }
}

fn set_entity_active(world: &mut World, entity: Entity, active: bool) {
    world.set_visible(entity, Visible(active));
}
```

## State Machines

### Simple State Machine

```rust
#[derive(Clone, Copy, PartialEq, Eq)]
enum PlayerState {
    Idle,
    Walking,
    Running,
    Jumping,
    Falling,
    Attacking,
}

struct StateMachine {
    current: PlayerState,
    state_timer: f32,
}

impl StateMachine {
    fn transition(&mut self, new_state: PlayerState) {
        if self.current != new_state {
            self.current = new_state;
            self.state_timer = 0.0;
        }
    }

    fn update(&mut self, dt: f32) {
        self.state_timer += dt;
    }

    fn can_interrupt(&self) -> bool {
        match self.current {
            PlayerState::Attacking => self.state_timer > 0.5,
            _ => true,
        }
    }
}
```

## UI Patterns

### Health Bar

```rust
fn update_health_bar(world: &mut World, health_text: Entity, current: f32, max: f32) {
    let percentage = (current / max * 100.0) as u32;
    let bar_length = 20;
    let filled = (percentage as usize * bar_length / 100).min(bar_length);

    let bar = format!(
        "[{}{}] {}/{}",
        "█".repeat(filled),
        "░".repeat(bar_length - filled),
        current as u32,
        max as u32,
    );

    if let Some(text) = world.get_hud_text_mut(health_text) {
        text.text = bar;
    }
}
```

### FPS Counter

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

## Spawning Patterns

### Random Position in Area

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

### Wave Spawner

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
            self.start_next_wave();
            return;
        }

        self.spawn_timer -= dt;

        if self.spawn_timer <= 0.0 {
            self.spawn_enemy(world);
            self.spawn_timer = self.spawn_interval;
        }
    }

    fn start_next_wave(&mut self) {
        self.wave += 1;
        self.enemies_remaining = 5 + self.wave * 2;
        self.spawn_interval = (2.0 - self.wave as f32 * 0.1).max(0.3);
    }

    fn spawn_enemy(&mut self, world: &mut World) {
        let position = random_position_on_circle(Vec3::zeros(), 20.0);
        spawn_cube_at(world, position);
        self.enemies_remaining -= 1;
    }
}
```

## Audio Patterns

### Footstep System

```rust
struct FootstepSystem {
    step_timer: f32,
    step_interval: f32,
    sounds: Vec<String>,
    last_index: usize,
}

impl FootstepSystem {
    fn update(&mut self, world: &mut World, is_moving: bool, is_running: bool, dt: f32) {
        if !is_moving {
            self.step_timer = 0.0;
            return;
        }

        let interval = if is_running {
            self.step_interval * 0.6
        } else {
            self.step_interval
        };

        self.step_timer += dt;

        if self.step_timer >= interval {
            self.step_timer = 0.0;
            self.play_footstep(world);
        }
    }

    fn play_footstep(&mut self, world: &mut World) {
        let mut index = rand::random::<usize>() % self.sounds.len();
        if index == self.last_index && self.sounds.len() > 1 {
            index = (index + 1) % self.sounds.len();
        }
        self.last_index = index;

        play_sound(world, &self.sounds[index]);
    }
}
```

## Saving/Loading

### Simple Save Data

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

## Debug Visualization

### Draw Collision Shapes

```rust
fn debug_draw_colliders(world: &mut World, lines_entity: Entity) {
    let mut lines = vec![];

    for entity in world.query_entities(COLLIDER_COMPONENT | GLOBAL_TRANSFORM) {
        let Some(collider) = world.get_collider(entity) else { continue };
        let Some(transform) = world.get_global_transform(entity) else { continue };

        let pos = transform.translation();
        let color = [0.0, 1.0, 0.0, 1.0];

        match &collider.shape {
            ColliderShape::Box { half_extents } => {
                draw_wire_box(&mut lines, pos, *half_extents, color);
            }
            ColliderShape::Sphere { radius } => {
                draw_wire_sphere(&mut lines, pos, *radius, color);
            }
            _ => {}
        }
    }

    world.set_lines(lines_entity, LinesComponent { lines });
}

fn draw_wire_box(lines: &mut Vec<Line>, center: Vec3, half: Vec3, color: [f32; 4]) {
    let corners = [
        center + Vec3::new(-half.x, -half.y, -half.z),
        center + Vec3::new( half.x, -half.y, -half.z),
        center + Vec3::new( half.x, -half.y,  half.z),
        center + Vec3::new(-half.x, -half.y,  half.z),
        center + Vec3::new(-half.x,  half.y, -half.z),
        center + Vec3::new( half.x,  half.y, -half.z),
        center + Vec3::new( half.x,  half.y,  half.z),
        center + Vec3::new(-half.x,  half.y,  half.z),
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
```

## Timer Utilities

### Cooldown Timer

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

### Repeating Timer

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
