# Cameras

Cameras define what the player sees in your game.

## Camera Components

A camera entity needs these components:

```rust
let camera = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | CAMERA | PERSPECTIVE_CAMERA,
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
    fov: 1.0,        // ~57 degrees
    aspect: 16.0 / 9.0,
    near: 0.1,
    far: 1000.0,
});
```

### Orthographic Camera

No perspective distortion (useful for 2D or isometric):

```rust
world.set_camera(camera, Camera {
    projection: ProjectionMode::Orthographic,
    smoothing: None,
});

world.set_orthographic_camera(camera, OrthographicCamera {
    size: 10.0,
    near: 0.1,
    far: 100.0,
});
```

## Controlling Pan-Orbit Camera

Modify pan-orbit camera at runtime:

```rust
if let Some(pan_orbit) = world.get_pan_orbit_camera_mut(camera) {
    // Change focus point
    pan_orbit.target_focus = Vec3::new(0.0, 2.0, 0.0);

    // Zoom in/out
    pan_orbit.target_radius = 5.0;

    // Rotate
    pan_orbit.target_yaw += 0.1;
    pan_orbit.target_pitch += 0.05;
}
```

## Camera Smoothing

Add smoothing for smoother camera movement:

```rust
world.set_camera(camera, Camera {
    projection: ProjectionMode::Perspective,
    smoothing: Some(CameraSmoothing {
        position_smoothing: 5.0,
        rotation_smoothing: 10.0,
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

fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: KeyState) {
    if state == KeyState::Pressed && key == KeyCode::Tab {
        let current = world.resources.active_camera;
        world.resources.active_camera = if current == Some(self.main_camera) {
            Some(self.debug_camera)
        } else {
            Some(self.main_camera)
        };
    }
}
```
