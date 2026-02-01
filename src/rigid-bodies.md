# Rigid Bodies

Rigid bodies are the foundation of physics simulation. They define how objects move and respond to forces.

## Body Types

### Dynamic Bodies

Fully simulated physics objects:

```rust
let entity = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | RIGID_BODY_COMPONENT | COLLIDER_COMPONENT,
    1
)[0];

world.set_rigid_body(entity, RigidBodyComponent {
    body_type: RigidBodyType::Dynamic,
    handle: None,  // Set by physics sync
});

world.set_collider(entity, ColliderComponent {
    shape: ColliderShape::Ball { radius: 0.5 },
    handle: None,
});
```

### Kinematic Bodies

Controlled by code, not affected by forces:

```rust
world.set_rigid_body(entity, RigidBodyComponent {
    body_type: RigidBodyType::Kinematic,
    handle: None,
});
```

Move kinematic bodies by updating their transform:

```rust
if let Some(transform) = world.get_local_transform_mut(kinematic_entity) {
    transform.translation.x += velocity.x * dt;
}
world.mark_local_transform_dirty(kinematic_entity);
```

### Static Bodies

Immovable objects (floors, walls):

```rust
world.set_rigid_body(entity, RigidBodyComponent {
    body_type: RigidBodyType::Static,
    handle: None,
});
```

## Helper Functions

### Spawning Physics Cubes

```rust
use nightshade::ecs::physics::*;

// Dynamic cube
let cube = spawn_dynamic_physics_cube(
    world,
    Vec3::new(0.0, 5.0, 0.0),  // position
    Vec3::new(1.0, 1.0, 1.0),  // size
    1.0,                        // mass
);

// With custom material
let cube = spawn_dynamic_physics_cube_with_material(
    world,
    Vec3::new(0.0, 5.0, 0.0),
    Vec3::new(1.0, 1.0, 1.0),
    2.0,
    my_material,
);

// Static cube
spawn_static_physics_cube(
    world,
    Vec3::new(0.0, -0.5, 0.0),
    Vec3::new(50.0, 1.0, 50.0),
);
```

### Spawning Physics Spheres

```rust
let sphere = spawn_dynamic_physics_sphere(
    world,
    Vec3::new(0.0, 10.0, 0.0),
    0.5,   // radius
    1.0,   // mass
);
```

### Spawning Physics Cylinders

```rust
let cylinder = spawn_dynamic_physics_cylinder(
    world,
    Vec3::new(0.0, 5.0, 0.0),
    0.5,   // half_height
    0.3,   // radius
    2.0,   // mass
);
```

## Applying Forces

Access the Rapier rigid body directly:

```rust
fn apply_force(world: &mut World, entity: Entity, force: Vec3) {
    let Some(rb_component) = world.get_rigid_body(entity) else { return };
    let Some(handle) = rb_component.handle else { return };

    if let Some(rigid_body) = world.resources.physics.rigid_body_set.get_mut(handle.into()) {
        rigid_body.add_force(
            rapier3d::prelude::Vector::new(force.x, force.y, force.z),
            true,  // wake up if sleeping
        );
    }
}
```

## Applying Impulses

Instant velocity change:

```rust
fn apply_impulse(world: &mut World, entity: Entity, impulse: Vec3) {
    let Some(rb_component) = world.get_rigid_body(entity) else { return };
    let Some(handle) = rb_component.handle else { return };

    if let Some(rigid_body) = world.resources.physics.rigid_body_set.get_mut(handle.into()) {
        rigid_body.apply_impulse(
            rapier3d::prelude::Vector::new(impulse.x, impulse.y, impulse.z),
            true,
        );
    }
}
```

## Setting Velocity

```rust
fn set_velocity(world: &mut World, entity: Entity, velocity: Vec3) {
    let Some(rb_component) = world.get_rigid_body(entity) else { return };
    let Some(handle) = rb_component.handle else { return };

    if let Some(rigid_body) = world.resources.physics.rigid_body_set.get_mut(handle.into()) {
        rigid_body.set_linvel(
            rapier3d::prelude::Vector::new(velocity.x, velocity.y, velocity.z),
            true,
        );
    }
}
```

## Getting Velocity

```rust
fn get_velocity(world: &World, entity: Entity) -> Option<Vec3> {
    let rb_component = world.get_rigid_body(entity)?;
    let handle = rb_component.handle?;
    let rigid_body = world.resources.physics.rigid_body_set.get(handle.into())?;

    let vel = rigid_body.linvel();
    Some(Vec3::new(vel.x, vel.y, vel.z))
}
```

## Mass Properties

```rust
fn set_mass(world: &mut World, entity: Entity, mass: f32) {
    let Some(rb_component) = world.get_rigid_body(entity) else { return };
    let Some(handle) = rb_component.handle else { return };

    if let Some(rigid_body) = world.resources.physics.rigid_body_set.get_mut(handle.into()) {
        rigid_body.set_additional_mass(mass, true);
    }
}
```

## Locking Axes

Prevent rotation or translation on specific axes:

```rust
if let Some(rigid_body) = world.resources.physics.rigid_body_set.get_mut(handle.into()) {
    // Lock rotation (useful for character controllers)
    rigid_body.lock_rotations(true, true);

    // Lock specific translation axes
    // rigid_body.lock_translations(true, true);  // Lock X and Y
}
```

## Damping

Add drag to slow objects:

```rust
if let Some(rigid_body) = world.resources.physics.rigid_body_set.get_mut(handle.into()) {
    rigid_body.set_linear_damping(0.5);   // Translation damping
    rigid_body.set_angular_damping(0.5);  // Rotation damping
}
```

## Sleeping

Bodies automatically sleep when stationary. Wake them:

```rust
if let Some(rigid_body) = world.resources.physics.rigid_body_set.get_mut(handle.into()) {
    rigid_body.wake_up(true);
}
```
