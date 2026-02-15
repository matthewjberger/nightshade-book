# Rigid Bodies

Rigid bodies are the foundation of physics simulation. They define how objects move and respond to forces.

## Body Types

### Dynamic Bodies

Fully simulated physics objects:

```rust
let entity = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | RIGID_BODY | COLLIDER,
    1
)[0];

world.set_rigid_body(entity, RigidBodyComponent::new_dynamic());

world.set_collider(entity, ColliderComponent::new_ball(0.5));
```

### Kinematic Bodies

Controlled by code, not affected by forces:

```rust
world.set_rigid_body(entity, RigidBodyComponent::new_kinematic_position_based());
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
world.set_rigid_body(entity, RigidBodyComponent::new_static());
```

## Helper Functions

### Spawning Physics Cubes

```rust
use nightshade::ecs::physics::*;

let cube = spawn_cube_at(world, Vec3::new(0.0, 5.0, 0.0));
```

### Spawning Physics Spheres

```rust
let sphere = spawn_sphere_at(world, Vec3::new(0.0, 10.0, 0.0));
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
