# Your First Application

Let's create a simple application that displays a 3D scene with a camera, lighting, and some cubes.

## Basic Structure

Every Nightshade application implements the `State` trait:

```rust
use nightshade::prelude::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    launch(MyGame::default())
}

#[derive(Default)]
struct MyGame;

impl State for MyGame {
    fn title(&self) -> &str {
        "My First Game"
    }

    fn initialize(&mut self, world: &mut World) {
        // Setup happens here
    }

    fn run_systems(&mut self, world: &mut World) {
        // Game logic runs every frame
    }
}
```

## Adding a Camera

The camera determines what the player sees:

```rust
fn initialize(&mut self, world: &mut World) {
    let camera = spawn_camera(
        world,
        Vec3::new(0.0, 5.0, 10.0),
        "Main Camera".to_string(),
    );
    world.resources.active_camera = Some(camera);
}
```

## Adding Lighting

Without lights, everything is dark. Add a directional light (sun):

```rust
fn initialize(&mut self, world: &mut World) {
    // Camera setup...

    spawn_sun(world);
}
```

## Enabling the Grid

For development, a ground grid is helpful:

```rust
fn initialize(&mut self, world: &mut World) {
    world.resources.graphics.show_grid = true;
    world.resources.graphics.atmosphere = Atmosphere::Sky;

    // Camera and lighting...
}
```

## Adding Geometry

Spawn a cube using the built-in primitive:

```rust
use nightshade::ecs::mesh::primitives::spawn_cube;

fn initialize(&mut self, world: &mut World) {
    // Previous setup...

    spawn_cube(world, Vec3::new(0.0, 1.0, 0.0), 1.0);
}
```

## Camera Controls

Add a fly camera system so you can navigate the scene:

```rust
fn run_systems(&mut self, world: &mut World) {
    fly_camera_system(world);
    escape_key_exit_system(world);
}
```

## Complete Example

```rust
use nightshade::prelude::*;
use nightshade::ecs::mesh::primitives::spawn_cube;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    launch(MyGame::default())
}

#[derive(Default)]
struct MyGame;

impl State for MyGame {
    fn title(&self) -> &str {
        "My First Game"
    }

    fn initialize(&mut self, world: &mut World) {
        world.resources.graphics.show_grid = true;
        world.resources.graphics.atmosphere = Atmosphere::Sky;

        let camera = spawn_camera(
            world,
            Vec3::new(0.0, 5.0, 10.0),
            "Main Camera".to_string(),
        );
        world.resources.active_camera = Some(camera);

        spawn_sun(world);

        spawn_cube(world, Vec3::new(0.0, 1.0, 0.0), 1.0);
        spawn_cube(world, Vec3::new(3.0, 0.5, 0.0), 0.5);
        spawn_cube(world, Vec3::new(-2.0, 1.5, 2.0), 1.5);
    }

    fn run_systems(&mut self, world: &mut World) {
        fly_camera_system(world);
        escape_key_exit_system(world);
    }
}
```

## Controls

With the fly camera system enabled:

| Key | Action |
|-----|--------|
| W/A/S/D | Move forward/left/back/right |
| Space | Move up |
| Shift | Move down |
| Mouse | Look around |
| Escape | Exit |

## Next Steps

Now that you have a basic scene, explore:

- [Meshes & Models](meshes-models.md) - Load 3D models
- [Materials](materials.md) - Customize appearance
- [Physics](physics-overview.md) - Add physics simulation
