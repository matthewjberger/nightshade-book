# Physics Overview

> **Live Demo:** [Physics](https://matthewberger.dev/nightshade/physics)

Nightshade integrates Rapier3D for physics simulation, providing rigid body dynamics, collision detection, and character controllers.

## Enabling Physics

Physics is enabled with the `physics` feature:

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "physics"] }
```

## Physics World

The physics world is accessed through resources:

```rust
let physics = &mut world.resources.physics;

// Configuration
physics.gravity = Vec3::new(0.0, -9.81, 0.0);
physics.fixed_timestep = 1.0 / 60.0;
```

## Core Concepts

### Rigid Bodies

Objects that can move and be affected by forces:

- **Dynamic**: Affected by gravity and forces
- **Kinematic**: Moved by code, affects dynamic bodies
- **Static**: Immovable, infinite mass

### Colliders

Shapes used for collision detection:

- Box, Sphere, Capsule, Cylinder
- Triangle mesh, Heightfield
- Compound shapes

### Character Controllers

Kinematic bodies with special handling for player movement.

## Quick Start

```rust
use nightshade::ecs::physics::*;

fn initialize(&mut self, world: &mut World) {
    // Static floor
    spawn_static_physics_cube(
        world,
        Vec3::new(0.0, -0.5, 0.0),
        Vec3::new(50.0, 1.0, 50.0),
    );

    // Dynamic cubes
    for index in 0..10 {
        spawn_dynamic_physics_cube(
            world,
            Vec3::new(0.0, 2.0 + index as f32 * 1.5, 0.0),
            Vec3::new(1.0, 1.0, 1.0),
            1.0,  // mass
        );
    }
}
```

## Physics Synchronization

Physics runs at a fixed timestep. Transforms are automatically synchronized:

1. Game logic updates entity transforms
2. Physics simulation steps (may run multiple times per frame)
3. Physics transforms sync back to entities
4. Interpolation smooths visual positions

## Querying Physics

### Raycasting

```rust
use nightshade::ecs::physics::queries::*;

let ray_origin = Vec3::new(0.0, 5.0, 0.0);
let ray_direction = Vec3::new(0.0, -1.0, 0.0);
let max_distance = 100.0;

if let Some(hit) = raycast(world, ray_origin, ray_direction, max_distance) {
    let hit_point = hit.point;
    let hit_normal = hit.normal;
    let hit_entity = hit.entity;
}
```

### Overlap Tests

```rust
// Check if a sphere overlaps any colliders
let overlaps = sphere_overlap(world, center, radius);
for entity in overlaps {
    // Handle collision
}
```

## Physics Materials

Control friction and bounciness:

```rust
world.set_physics_material(entity, PhysicsMaterialComponent {
    friction: 0.5,
    restitution: 0.3,  // Bounciness
    density: 1.0,
});
```

## Debug Visualization

Enable physics debug drawing:

```rust
world.resources.physics.debug_draw = true;

// In run_systems
physics_debug_draw_system(world);
```

This renders:
- Collider shapes (wireframe)
- Contact points
- Collision normals

## Performance Tips

1. Use simple collider shapes (boxes, spheres) when possible
2. Disable collision between groups that don't need it
3. Use compound colliders instead of many small colliders
4. Set bodies to sleep when inactive
5. Use appropriate fixed timestep (60 Hz is standard)

## Joints

Connect bodies with joints for:
- Doors (revolute)
- Drawers (prismatic)
- Ropes (rope/spring)
- Chains (spherical)

See [Physics Joints](physics-joints.md) for details.
