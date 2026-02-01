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

## Timing Resources

### Time

Current frame timing:

```rust
pub struct Time {
    pub delta_seconds: f32,
    pub elapsed_seconds: f32,
    pub frame_count: u64,
}

fn run_systems(&mut self, world: &mut World) {
    let dt = world.resources.time.delta_seconds;
    let total = world.resources.time.elapsed_seconds;
    let frame = world.resources.time.frame_count;
}
```

### Window Timing

More detailed timing information:

```rust
pub struct WindowTiming {
    pub frame_count: u64,
    pub total_time: f32,
    pub frame_time: f32,
    pub fps: f32,
}

fn show_fps(world: &World) {
    let fps = world.resources.window.timing.fps;
    println!("FPS: {:.1}", fps);
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
    pub previous_position: Vec3,
    pub previous_rotation: UnitQuaternion<f32>,
    pub current_position: Vec3,
    pub current_rotation: UnitQuaternion<f32>,
}

fn interpolate_physics_transforms(world: &mut World, alpha: f32) {
    for entity in world.query(PHYSICS_INTERPOLATION) {
        let interp = world.get_physics_interpolation(entity).unwrap();
        let position = interp.previous_position.lerp(&interp.current_position, alpha);
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
    let dt = world.resources.time.delta_seconds;

    if let Some(transform) = world.get_local_transform_mut(entity) {
        transform.position += velocity * dt;
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
    let dt = world.resources.time.delta_seconds;

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
    nightshade::run(MyGame::default())
}
```

### WASM

```rust
#[wasm_bindgen(start)]
pub async fn start() {
    nightshade::run_wasm::<MyGame>(WindowConfig::default()).await;
}
```

### VR (OpenXR)

```rust
fn main() {
    nightshade::launch_xr::<MyGame>(XrConfig::default());
}
```

## Debugging Frame Issues

### Frame Spikes

If you see occasional stuttering:

```rust
fn run_systems(&mut self, world: &mut World) {
    let dt = world.resources.time.delta_seconds;
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
        tracing::debug!("expensive_system took {:?}", elapsed);
    }
}
```

## Best Practices

1. **Don't block the main thread**: Use async for file I/O
2. **Batch similar operations**: Process all enemies together, not interleaved
3. **Use spatial partitioning**: For collision checks with many entities
4. **Profile before optimizing**: Measure, don't guess
5. **Consider fixed timestep for gameplay**: Not just physics
