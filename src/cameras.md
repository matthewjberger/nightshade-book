# Cameras

> **Live Demo:** [Skybox](https://matthewberger.dev/nightshade/skybox)

Cameras define what the player sees in your game.

## Camera Components

A camera entity needs these components:

```rust
let camera = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | CAMERA,
    1
)[0];
```

## Spawning Cameras

### Basic Camera

```rust
let camera = spawn_camera(
    world,
    Vec3::new(0.0, 5.0, 10.0),
    "Main Camera".to_string(),
);
world.resources.active_camera = Some(camera);
```

### Pan-Orbit Camera

For editor-style camera controls:

```rust
use nightshade::ecs::camera::commands::spawn_pan_orbit_camera;

let camera = spawn_pan_orbit_camera(
    world,
    Vec3::new(0.0, 2.0, 0.0),  // focus point
    10.0,                       // radius (distance)
    0.5,                        // yaw (horizontal angle)
    0.4,                        // pitch (vertical angle)
    "Orbit Camera".to_string(),
);
```

## Camera Systems

### Fly Camera

Free-flying camera with WASD controls:

```rust
fn run_systems(&mut self, world: &mut World) {
    fly_camera_system(world);
}
```

### Pan-Orbit Camera

Orbit around a focus point:

```rust
use nightshade::ecs::camera::systems::pan_orbit_camera_system;

fn run_systems(&mut self, world: &mut World) {
    pan_orbit_camera_system(world);
}
```

### Follow Camera

Make camera follow a target:

```rust
fn follow_camera_system(world: &mut World, target: Entity, camera: Entity) {
    let Some(target_pos) = world.get_local_transform(target).map(|t| t.translation) else {
        return;
    };

    let offset = Vec3::new(0.0, 5.0, -10.0);
    let camera_pos = target_pos + offset;

    if let Some(transform) = world.get_local_transform_mut(camera) {
        transform.translation = camera_pos;
    }
}
```

## Perspective vs Orthographic

### Perspective Camera

Standard 3D perspective with depth:

```rust
world.set_perspective_camera(camera, PerspectiveCamera {
    y_fov_rad: 1.0,              // ~57 degrees
    aspect_ratio: Some(16.0 / 9.0),
    z_near: 0.1,
    z_far: Some(1000.0),
});
```

### Orthographic Camera

No perspective distortion (useful for 2D or isometric):

```rust
world.set_camera(camera, Camera {
    projection: Projection::Orthographic(OrthographicCamera {
        x_mag: 10.0,
        y_mag: 10.0,
        z_near: 0.1,
        z_far: 100.0,
    }),
    smoothing: None,
});
```

## Controlling Pan-Orbit Camera

Modify pan-orbit camera at runtime:

```rust
if let Some(pan_orbit) = world.get_pan_orbit_camera_mut(camera) {
    pan_orbit.focus = Vec3::new(0.0, 2.0, 0.0);

    pan_orbit.radius = 5.0;

    pan_orbit.yaw += 0.1;
    pan_orbit.pitch += 0.05;
}
```

## Camera Smoothing

Add smoothing for smoother camera movement:

```rust
world.set_camera(camera, Camera {
    projection: Projection::Perspective(PerspectiveCamera {
        y_fov_rad: 1.0,
        aspect_ratio: None,
        z_near: 0.1,
        z_far: Some(1000.0),
    }),
    smoothing: Some(Smoothing {
        mouse_sensitivity: 0.5,
        mouse_smoothness: 0.05,
        keyboard_smoothness: 0.08,
        ..Smoothing::default()
    }),
});
```

## Screen-to-World Conversion

Convert screen coordinates to world ray:

```rust
use nightshade::ecs::picking::PickingRay;

let screen_pos = Vec2::new(mouse_x, mouse_y);
if let Some(ray) = PickingRay::from_screen_position(world, screen_pos) {
    let origin = ray.origin;
    let direction = ray.direction;
    // Use ray for picking, projectiles, etc.
}
```

## Multiple Cameras

Switch between cameras:

```rust
struct MyGame {
    main_camera: Entity,
    debug_camera: Entity,
}

fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: ElementState) {
    if state == ElementState::Pressed && key == KeyCode::Tab {
        let current = world.resources.active_camera;
        world.resources.active_camera = if current == Some(self.main_camera) {
            Some(self.debug_camera)
        } else {
            Some(self.main_camera)
        };
    }
}
```
