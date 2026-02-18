# Cameras

> **Live Demo:** [Skybox](https://matthewberger.dev/nightshade/skybox)

Cameras define the viewpoint and projection used to render the scene. Nightshade uses reversed-Z depth buffers for both perspective and orthographic projections, and supports infinite far planes, input smoothing, and arc-ball orbit controllers.

## Camera Component

A camera entity needs a transform and the `CAMERA` component:

```rust
let camera = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | CAMERA,
    1
)[0];
```

```rust
pub struct Camera {
    pub projection: Projection,
    pub smoothing: Option<Smoothing>,
}

pub enum Projection {
    Perspective(PerspectiveCamera),
    Orthographic(OrthographicCamera),
}
```

The default `Camera` uses a perspective projection (45 degree FOV, infinite far plane, 0.01 near plane) with smoothing enabled.

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

For editor-style arc-ball controls:

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

## Perspective Projection

```rust
pub struct PerspectiveCamera {
    pub aspect_ratio: Option<f32>,
    pub y_fov_rad: f32,
    pub z_far: Option<f32>,
    pub z_near: f32,
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `aspect_ratio` | `None` | Width/height ratio. `None` uses the viewport aspect ratio |
| `y_fov_rad` | `0.7854` (45 deg) | Vertical field of view in radians |
| `z_far` | `None` | Far plane distance. `None` uses an infinite far plane |
| `z_near` | `0.01` | Near plane distance |

### Reversed-Z Projection

Nightshade uses reversed-Z depth buffers where the near plane maps to depth 1.0 and the far plane maps to 0.0. This distributes floating-point precision more evenly across the depth range, dramatically reducing z-fighting artifacts at large distances.

With an infinite far plane (`z_far: None`), the projection matrix is:

```
f = 1 / tan(fov / 2)

| f/aspect  0     0      0     |
| 0         f     0      0     |
| 0         0     0      z_near|
| 0         0    -1      0     |
```

With a finite far plane, the matrix maps `[z_near, z_far]` to `[1.0, 0.0]`:

```
| f/aspect  0     0                          0                           |
| 0         f     0                          0                           |
| 0         0     z_near/(z_far - z_near)    z_near*z_far/(z_far-z_near) |
| 0         0    -1                          0                           |
```

```rust
world.set_camera(camera, Camera {
    projection: Projection::Perspective(PerspectiveCamera {
        y_fov_rad: 1.0,
        aspect_ratio: None,
        z_near: 0.1,
        z_far: Some(1000.0),
    }),
    smoothing: None,
});
```

## Orthographic Projection

```rust
pub struct OrthographicCamera {
    pub x_mag: f32,
    pub y_mag: f32,
    pub z_far: f32,
    pub z_near: f32,
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `x_mag` | `10.0` | Half-width of the view volume (horizontal extent is ±x_mag) |
| `y_mag` | `10.0` | Half-height of the view volume (vertical extent is ±y_mag) |
| `z_far` | `1000.0` | Far clipping plane distance |
| `z_near` | `0.01` | Near clipping plane distance |

The orthographic projection also uses reversed-Z, mapping `[z_near, z_far]` to `[1.0, 0.0]`:

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

## Camera Systems

### Fly Camera

Free-flying FPS-style camera with WASD movement:

```rust
fn run_systems(&mut self, world: &mut World) {
    fly_camera_system(world);
}
```

### Pan-Orbit Camera

Arc-ball camera that orbits around a focus point:

```rust
use nightshade::ecs::camera::systems::pan_orbit_camera_system;

fn run_systems(&mut self, world: &mut World) {
    pan_orbit_camera_system(world);
}
```

### Orthographic Camera

For 2D or isometric views:

```rust
use nightshade::ecs::camera::systems::ortho_camera_system;

fn run_systems(&mut self, world: &mut World) {
    ortho_camera_system(world);
}
```

## Input Smoothing

The `Smoothing` component applies frame-rate-independent exponential smoothing to all camera input. The smoothing factor is computed as:

```
smoothing_factor = 1.0 - smoothness^7 ^ delta_time
```

Where `smoothness` is the per-device smoothness parameter. A smoothness of 0 gives instant response; values approaching 1 make the input increasingly sluggish. The `powi(7)` exponent makes the smoothness parameter feel linear to adjust.

```rust
pub struct Smoothing {
    pub mouse_sensitivity: f32,
    pub mouse_smoothness: f32,
    pub mouse_dpi_scale: f32,
    pub keyboard_smoothness: f32,
    pub gamepad_sensitivity: f32,
    pub gamepad_smoothness: f32,
    pub gamepad_deadzone: f32,
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `mouse_sensitivity` | `0.5` | Mouse look speed multiplier |
| `mouse_smoothness` | `0.05` | Mouse input smoothing (0 = instant, 1 = no change) |
| `mouse_dpi_scale` | `1.0` | DPI scaling factor for mouse input |
| `keyboard_smoothness` | `0.08` | Keyboard movement smoothing |
| `gamepad_sensitivity` | `1.5` | Gamepad stick look speed |
| `gamepad_smoothness` | `0.06` | Gamepad input smoothing |
| `gamepad_deadzone` | `0.15` | Gamepad stick deadzone threshold |

```rust
world.set_camera(camera, Camera {
    projection: Projection::Perspective(PerspectiveCamera::default()),
    smoothing: Some(Smoothing {
        mouse_sensitivity: 0.5,
        mouse_smoothness: 0.05,
        keyboard_smoothness: 0.08,
        ..Smoothing::default()
    }),
});
```

## Pan-Orbit Camera Configuration

The `PanOrbitCamera` component provides a fully configurable arc-ball camera with Blender-style controls by default.

```rust
pub struct PanOrbitCamera {
    pub focus: Vec3,
    pub radius: f32,
    pub yaw: f32,
    pub pitch: f32,
    pub target_focus: Vec3,
    pub target_radius: f32,
    pub target_yaw: f32,
    pub target_pitch: f32,
    pub enabled: bool,
    // ... configuration fields
}
```

### Default Controls

| Action | Mouse | Gamepad | Touch |
|--------|-------|---------|-------|
| Orbit | Middle button | Right stick | Single finger drag |
| Pan | Shift + Middle button | Left stick | Two finger drag |
| Zoom (drag) | Ctrl + Middle button | Triggers | Pinch |
| Zoom (step) | Scroll wheel | — | — |

### Builder API

```rust
let pan_orbit = PanOrbitCamera::new(focus, 10.0)
    .with_yaw_pitch(0.5, 0.4)
    .with_zoom_limits(1.0, Some(100.0))
    .with_pitch_limits(-1.5, 1.5)
    .with_smoothness(0.1, 0.02, 0.1)
    .with_buttons(PanOrbitButton::Middle, PanOrbitButton::Middle)
    .with_modifiers(None, Some(PanOrbitModifier::Shift))
    .with_upside_down(false);
```

### Sensitivity and Smoothness

Each action has independent sensitivity and smoothness parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `orbit_sensitivity` | `1.0` | Mouse orbit speed |
| `pan_sensitivity` | `1.0` | Mouse pan speed |
| `zoom_sensitivity` | `1.0` | Scroll zoom speed |
| `orbit_smoothness` | `0.1` | Orbit interpolation smoothness |
| `pan_smoothness` | `0.02` | Pan interpolation smoothness |
| `zoom_smoothness` | `0.1` | Zoom interpolation smoothness |
| `gamepad_orbit_sensitivity` | `2.0` | Gamepad orbit speed |
| `gamepad_pan_sensitivity` | `10.0` | Gamepad pan speed |
| `gamepad_zoom_sensitivity` | `5.0` | Gamepad zoom speed |
| `gamepad_deadzone` | `0.15` | Stick deadzone |
| `gamepad_smoothness` | `0.06` | Gamepad smoothing |

Target values (`target_yaw`, `target_pitch`, `target_focus`, `target_radius`) are set by user input, then the current values interpolate towards them using the smoothing formula. The system snaps to the target when the difference falls below 0.001.

### Zoom and Pitch Limits

```rust
if let Some(pan_orbit) = world.get_pan_orbit_camera_mut(camera) {
    pan_orbit.zoom_lower_limit = 1.0;
    pan_orbit.zoom_upper_limit = Some(50.0);
    pan_orbit.pitch_upper_limit = std::f32::consts::FRAC_PI_2 - 0.01;
    pan_orbit.pitch_lower_limit = -(std::f32::consts::FRAC_PI_2 - 0.01);
}
```

### Upside-Down Handling

When `allow_upside_down` is `true`, the pitch can exceed ±90 degrees. When the camera goes upside down, the yaw direction is automatically reversed for intuitive mouse control.

### Runtime Control

```rust
if let Some(pan_orbit) = world.get_pan_orbit_camera_mut(camera) {
    pan_orbit.target_focus = Vec3::new(0.0, 2.0, 0.0);
    pan_orbit.target_radius = 5.0;
    pan_orbit.target_yaw += 0.1;
    pan_orbit.target_pitch += 0.05;
}
```

### Computing Camera Transform

The pan-orbit camera position is computed from yaw, pitch, and radius:

```rust
let (position, rotation) = pan_orbit.compute_camera_transform();
```

The camera is placed at `focus + rotate(yaw, pitch) * (0, 0, radius)` — the rotation is composed as yaw (around Y) then pitch (around X).

## Screen-to-World Conversion

Convert screen coordinates to a world-space ray:

```rust
use nightshade::ecs::picking::PickingRay;

let screen_pos = world.resources.input.mouse.position;
if let Some(ray) = PickingRay::from_screen_position(world, screen_pos) {
    let origin = ray.origin;
    let direction = ray.direction;
}
```

For perspective cameras, the ray origin is the camera position and the direction is computed by unprojecting through the inverse view-projection matrix. For orthographic cameras, the origin is the unprojected near-plane point and the direction is the camera's forward vector.

## Multiple Cameras

Switch between cameras:

```rust
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
