# Physics Joints

Joints connect two rigid bodies together, constraining their relative motion.

## Joint Types

| Joint | Description | Use Cases |
|-------|-------------|-----------|
| Fixed | Rigid connection | Welded objects |
| Spherical | Ball-and-socket | Pendulums, ragdolls |
| Revolute | Hinge | Doors, wheels |
| Prismatic | Slider | Drawers, pistons |
| Rope | Max distance | Ropes, chains |
| Spring | Elastic | Suspension, bouncy connections |

## Fixed Joint

Rigidly connects two bodies:

```rust
use nightshade::ecs::physics::joints::*;

create_fixed_joint(
    world,
    body_a,
    body_b,
    FixedJoint::new()
        .with_local_anchor1(Vec3::new(0.5, 0.0, 0.0))
        .with_local_anchor2(Vec3::new(-0.5, 0.0, 0.0)),
);
```

## Spherical Joint (Ball-and-Socket)

Allows rotation in all directions:

```rust
// Pendulum
let anchor = spawn_cube_at(world, Vec3::new(0.0, 5.0, 0.0));
let ball = spawn_sphere_at(world, Vec3::new(0.0, 3.0, 0.0));

create_spherical_joint(
    world,
    anchor,
    ball,
    SphericalJoint::new()
        .with_local_anchor1(Vec3::new(0.0, -0.15, 0.0))
        .with_local_anchor2(Vec3::new(0.0, 1.0, 0.0)),
);
```

## Revolute Joint (Hinge)

Rotates around a single axis:

```rust
// Door hinge
let door_frame = spawn_static_entity(world);
let door = spawn_cube_at(world, Vec3::new(0.5, 1.0, 0.0));

create_revolute_joint(
    world,
    door_frame,
    door,
    RevoluteJoint::new(JointAxisDirection::Y)  // Rotate around Y axis
        .with_local_anchor1(Vec3::new(0.0, 0.0, 0.0))
        .with_local_anchor2(Vec3::new(-0.5, 0.0, 0.0))
        .with_limits(JointLimits::new(-1.5, 1.5)),  // Limit rotation
);
```

### Adding Motor

Make the door swing automatically:

```rust
RevoluteJoint::new(JointAxisDirection::Y)
    .with_motor(0.0, 10.0, 5.0, 100.0)  // target_pos, target_vel, stiffness, damping
```

## Prismatic Joint (Slider)

Slides along an axis:

```rust
// Drawer
let cabinet = spawn_static_entity(world);
let drawer = spawn_cube_at(world, Vec3::new(0.0, 0.0, 0.5));

create_prismatic_joint(
    world,
    cabinet,
    drawer,
    PrismaticJoint::new(JointAxisDirection::Z)  // Slide on Z axis
        .with_local_anchor1(Vec3::new(0.0, 0.0, 0.0))
        .with_local_anchor2(Vec3::new(0.0, 0.0, -0.5))
        .with_limits(JointLimits::new(0.0, 0.8)),  // Min/max extension
);
```

## Rope Joint

Maximum distance constraint:

```rust
let ceiling = spawn_static_entity(world);
let weight = spawn_sphere_at(world, Vec3::new(0.0, 0.0, 0.0));

create_rope_joint(
    world,
    ceiling,
    weight,
    RopeJoint::new(2.0)  // Max length
        .with_local_anchor1(Vec3::new(0.0, -0.15, 0.0))
        .with_local_anchor2(Vec3::new(0.0, 0.0, 0.0)),
);
```

## Spring Joint

Elastic connection:

```rust
let anchor = spawn_static_entity(world);
let bob = spawn_sphere_at(world, Vec3::new(0.0, -2.0, 0.0));

create_spring_joint(
    world,
    anchor,
    bob,
    SpringJoint::new(1.5, 50.0, 2.0)  // rest_length, stiffness, damping
        .with_local_anchor1(Vec3::new(0.0, -0.15, 0.0))
        .with_local_anchor2(Vec3::new(0.0, 0.2, 0.0)),
);
```

## Joint Limits

Constrain movement range:

```rust
// Rotation limits (radians)
RevoluteJoint::new(JointAxisDirection::Z)
    .with_limits(JointLimits::new(-1.57, 1.57))  // -90° to +90°

// Translation limits (meters)
PrismaticJoint::new(JointAxisDirection::X)
    .with_limits(JointLimits::new(-2.0, 2.0))
```

## Breaking Joints

Joints can break under force:

```rust
if let Some(joint) = world.resources.physics.get_joint_mut(joint_handle) {
    joint.set_max_force(1000.0);  // Break if force exceeds this
}
```

## Chain Example

Create a chain of connected spheres:

```rust
fn create_chain(world: &mut World, start: Vec3, links: usize) {
    let mut previous = spawn_cube_at(world, start);

    for index in 0..links {
        let position = start - Vec3::new(0.0, (index + 1) as f32 * 0.5, 0.0);
        let link = spawn_sphere_at(world, position);

        create_spherical_joint(
            world,
            previous,
            link,
            SphericalJoint::new()
                .with_local_anchor1(Vec3::new(0.0, -0.2, 0.0))
                .with_local_anchor2(Vec3::new(0.0, 0.2, 0.0)),
        );

        previous = link;
    }
}
```

## Interactive Door Example

Complete door with momentum:

```rust
fn spawn_interactive_door(world: &mut World, position: Vec3) -> Entity {
    let frame = spawn_cube_at(world, position);

    let door = spawn_cube_at(world, position + Vec3::new(0.5, 0.0, 0.0));

    // Lock vertical rotation
    if let Some(rb) = world.get_rigid_body(door) {
        if let Some(handle) = rb.handle {
            if let Some(body) = world.resources.physics.rigid_body_set.get_mut(handle.into()) {
                body.lock_rotations(true, true);  // Only Y rotation allowed
            }
        }
    }

    create_revolute_joint(
        world,
        frame,
        door,
        RevoluteJoint::new(JointAxisDirection::Y)
            .with_local_anchor1(Vec3::new(0.05, 0.0, 0.0))
            .with_local_anchor2(Vec3::new(-0.5, 0.0, 0.0))
            .with_limits(JointLimits::new(-2.0, 2.0)),
    );

    door
}
```
