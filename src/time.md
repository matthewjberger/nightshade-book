# Time

All timing information lives in `world.resources.window.timing`. There is no separate `Time` resource.

## WindowTiming

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
```

## Accessing Time

```rust
fn run_systems(&mut self, world: &mut World) {
    let dt = world.resources.window.timing.delta_time;
    let fps = world.resources.window.timing.frames_per_second;
    let elapsed = world.resources.window.timing.uptime_milliseconds as f32 / 1000.0;
    let frame = world.resources.window.timing.frame_counter;
}
```

## Delta Time

`delta_time` is the time in seconds since the last frame, adjusted by `time_speed`. Use it for all frame-rate-independent movement:

```rust
fn move_entity(world: &mut World, entity: Entity, velocity: Vec3) {
    let dt = world.resources.window.timing.delta_time;
    if let Some(transform) = world.get_local_transform_mut(entity) {
        transform.translation += velocity * dt;
    }
}
```

`raw_delta_time` is the unscaled delta time before `time_speed` is applied. Use `raw_delta_time` for UI animations or anything that should ignore time scaling.

## Time Speed

Control the speed of time:

```rust
world.resources.window.timing.time_speed = 0.5;  // Half speed (slow motion)
world.resources.window.timing.time_speed = 2.0;  // Double speed
world.resources.window.timing.time_speed = 0.0;  // Paused
```

`delta_time = raw_delta_time * time_speed`, so setting `time_speed` to zero pauses all time-dependent movement without stopping the render loop.

## Periodic Actions

Use an accumulator for timed events:

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

## Uptime

`uptime_milliseconds` counts wall-clock time since the application started. Useful for shader animations and effects:

```rust
let time = world.resources.window.timing.uptime_milliseconds as f32 / 1000.0;
let wave = (time * 2.0).sin();
```

## Web Compatibility

Timing uses `web_time::Instant` instead of `std::time::Instant` for cross-platform compatibility between native and WASM targets.
