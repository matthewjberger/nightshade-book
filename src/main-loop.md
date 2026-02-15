# Main Loop

Understanding the frame lifecycle helps you structure game logic correctly and debug timing issues.

## Frame Execution Order

Each frame executes in this order:

```
1.  Process window/input events (winit)
2.  Update input state from events
3.  Calculate delta time
4.  Begin egui frame (if enabled)
5.  Call State::run_systems() - Your game logic
6.  Dispatch EventBus messages
7.  Update animation players
8.  Apply animations to transforms
9.  Propagate transform hierarchy
10. Step physics simulation (fixed timestep)
11. Sync physics transforms to ECS
12. Update audio listener positions
13. Execute render graph passes
14. End egui frame
15. Present to swapchain
```

## Timing

All timing information is accessed through `world.resources.window.timing`:

```rust
pub struct WindowTiming {
    pub frames_per_second: f32,
    pub delta_time: f32,
    pub raw_delta_time: f32,
    pub time_speed: f32,
    pub last_frame_start_instant: Option<web_time::Instant>,
    pub current_frame_start_instant: Option<web_time::Instant>,
    pub initial_frame_start_instant: Option<web_time::Instant>,
    pub frame_counter: u32,
    pub uptime_milliseconds: u64,
}

fn run_systems(&mut self, world: &mut World) {
    let dt = world.resources.window.timing.delta_time;
    let elapsed = world.resources.window.timing.uptime_milliseconds as f32 / 1000.0;
    let frame = world.resources.window.timing.frame_counter;
}
```

## Fixed Timestep Physics

Physics runs at a fixed 60 Hz regardless of frame rate:

```rust
const PHYSICS_TIMESTEP: f32 = 1.0 / 60.0;

fn update_physics(world: &mut World, dt: f32) {
    world.resources.physics_accumulator += dt;

    while world.resources.physics_accumulator >= PHYSICS_TIMESTEP {
        store_physics_state(world);
        world.resources.physics.step(PHYSICS_TIMESTEP);
        world.resources.physics_accumulator -= PHYSICS_TIMESTEP;
    }

    let alpha = world.resources.physics_accumulator / PHYSICS_TIMESTEP;
    interpolate_physics_transforms(world, alpha);
}
```

### Physics Interpolation

For smooth rendering between physics steps:

```rust
pub struct PhysicsInterpolation {
    pub previous_translation: Vec3,
    pub previous_rotation: Quat,
    pub current_translation: Vec3,
    pub current_rotation: Quat,
}

fn interpolate_physics_transforms(world: &mut World, alpha: f32) {
    for entity in world.query_entities(PHYSICS_INTERPOLATION) {
        let interp = world.get_physics_interpolation(entity).unwrap();
        let translation = interp.previous_translation.lerp(&interp.current_translation, alpha);
        let rotation = interp.previous_rotation.slerp(&interp.current_rotation, alpha);
    }
}
```

## System Ordering

### Before Physics

Place movement and input handling before physics:

```rust
fn run_systems(&mut self, world: &mut World) {
    handle_input(world);

    player_movement_system(world);

    ai_decision_system(world);
}
```

### After Physics

Query physics results after the step:

```rust
fn run_systems(&mut self, world: &mut World) {
    let contacts = get_all_contacts(world);
    for contact in contacts {
        handle_collision(world, contact);
    }
}
```

## Delta Time Usage

Always multiply movement by delta time for frame-rate independence:

```rust
fn move_entity(world: &mut World, entity: Entity, velocity: Vec3) {
    let dt = world.resources.window.timing.delta_time;

    if let Some(transform) = world.get_local_transform_mut(entity) {
        transform.translation += velocity * dt;
    }
}
```

### Accumulating Time

For periodic actions:

```rust
struct MyGame {
    spawn_timer: f32,
}

fn run_systems(&mut self, world: &mut World) {
    let dt = world.resources.window.timing.delta_time;

    self.spawn_timer += dt;
    if self.spawn_timer >= 2.0 {
        spawn_enemy(world);
        self.spawn_timer = 0.0;
    }
}
```

## Entry Points

### Desktop

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    nightshade::launch(MyGame::default())
}
```

### WASM

```rust
#[wasm_bindgen(start)]
pub async fn start() {
    nightshade::launch(MyGame::default()).await;
}
```

### VR (OpenXR)

```rust
fn main() {
    nightshade::launch_xr(MyGame::default());
}
```

## Debugging Frame Issues

### Frame Spikes

If you see occasional stuttering:

```rust
fn run_systems(&mut self, world: &mut World) {
    let dt = world.resources.window.timing.delta_time;
    if dt > 0.1 {
        tracing::warn!("Long frame: {:.3}s", dt);
    }
}
```

### Consistent Slowdown

Profile your systems:

```rust
fn run_systems(&mut self, world: &mut World) {
    let start = std::time::Instant::now();

    expensive_system(world);

    let elapsed = start.elapsed();
    if elapsed.as_millis() > 5 {
        tracing::info!("expensive_system took {:?}", elapsed);
    }
}
```

## Best Practices

1. **Don't block the main thread**: Use async for file I/O
2. **Batch similar operations**: Process all enemies together, not interleaved
3. **Use spatial partitioning**: For collision checks with many entities
4. **Profile before optimizing**: Measure, don't guess
5. **Consider fixed timestep for gameplay**: Not just physics
