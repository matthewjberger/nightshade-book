# Colliders

Colliders define the physical shape of objects for collision detection.

## Collider Shapes

### Ball (Sphere)

```rust
world.set_collider(entity, ColliderComponent::new_ball(0.5));
```

### Cuboid (Box)

```rust
world.set_collider(entity, ColliderComponent::cuboid(1.0, 0.5, 1.0));
```

### Capsule

Perfect for characters:

```rust
world.set_collider(entity, ColliderComponent::capsule(1.0, 0.3));
```

### Cylinder

```rust
world.set_collider(entity, ColliderComponent {
    shape: ColliderShape::Cylinder {
        radius: 0.5,
        height: 2.0,
    },
    ..Default::default()
});
```

### Cone

```rust
world.set_collider(entity, ColliderComponent {
    shape: ColliderShape::Cone {
        radius: 0.5,
        height: 2.0,
    },
    ..Default::default()
});
```

### Triangle Mesh

For complex static geometry:

```rust
let vertices: Vec<Vec3> = mesh.vertices.iter()
    .map(|v| Vec3::new(v.position[0], v.position[1], v.position[2]))
    .collect();

let indices: Vec<[u32; 3]> = mesh.indices
    .chunks(3)
    .map(|c| [c[0], c[1], c[2]])
    .collect();

world.set_collider(entity, ColliderComponent {
    shape: ColliderShape::Trimesh { vertices, indices },
    ..Default::default()
});
```

### Heightfield

For terrain:

```rust
let heights: Vec<Vec<f32>> = generate_height_grid(64, 64);

world.set_collider(entity, ColliderComponent {
    shape: ColliderShape::Heightfield {
        heights,
        scale: Vec3::new(100.0, 50.0, 100.0),
    },
    ..Default::default()
});
```

### Compound

Multiple shapes combined:

```rust
let shapes = vec![
    (ColliderShape::Cuboid { x: 0.5, y: 0.1, z: 0.5 }, body_offset),
    (ColliderShape::Ball { radius: 0.3 }, head_offset),
];

world.set_collider(entity, ColliderComponent {
    shape: ColliderShape::Compound { shapes },
    ..Default::default()
});
```

## Physics Materials

Control surface properties:

```rust
world.set_physics_material(entity, PhysicsMaterialComponent {
    friction: 0.5,      // Sliding resistance (0 = ice, 1 = rubber)
    restitution: 0.3,   // Bounciness (0 = no bounce, 1 = perfect bounce)
    density: 1.0,       // Mass per unit volume
});
```

### Material Examples

```rust
// Ice
let ice = PhysicsMaterialComponent {
    friction: 0.05,
    restitution: 0.1,
    density: 0.9,
};

// Rubber
let rubber = PhysicsMaterialComponent {
    friction: 0.9,
    restitution: 0.8,
    density: 1.1,
};

// Metal
let metal = PhysicsMaterialComponent {
    friction: 0.4,
    restitution: 0.2,
    density: 7.8,
};
```

## Collision Groups

Filter which objects collide:

```rust
use rapier3d::prelude::*;

// Define groups
const GROUP_PLAYER: Group = Group::GROUP_1;
const GROUP_ENEMY: Group = Group::GROUP_2;
const GROUP_PROJECTILE: Group = Group::GROUP_3;
const GROUP_WORLD: Group = Group::GROUP_4;

// Player collides with enemies and world, not own projectiles
let player_filter = CollisionGroups::new(
    GROUP_PLAYER,
    GROUP_ENEMY | GROUP_WORLD,
);
```

## Sensor Colliders

Detect overlaps without physical response:

```rust
// Create a trigger zone
if let Some(collider) = world.resources.physics.collider_set.get_mut(handle.into()) {
    collider.set_sensor(true);
}
```

Check sensor overlaps in your game logic:

```rust
fn check_trigger_zone(world: &World, trigger_entity: Entity) -> Vec<Entity> {
    // Query overlapping entities
    let overlaps = overlap_test(world, trigger_entity);
    overlaps
}
```

## Collision Events

Query collision pairs:

```rust
fn run_systems(&mut self, world: &mut World) {
    // Check for new collisions this frame
    for (entity_a, entity_b, started) in world.resources.physics.collision_events() {
        if started {
            handle_collision_start(entity_a, entity_b);
        } else {
            handle_collision_end(entity_a, entity_b);
        }
    }
}
```

## Convex Decomposition

For complex shapes on dynamic bodies, use convex decomposition:

```rust
use rapier3d::prelude::*;

// This creates multiple convex pieces from a concave mesh
let decomposed = SharedShape::convex_decomposition(&vertices, &indices);
```

## Performance Tips

| Shape | Performance | Use Case |
|-------|-------------|----------|
| Ball | Fastest | Rolling objects |
| Cuboid | Fast | Crates, buildings |
| Capsule | Fast | Characters |
| Cylinder | Medium | Barrels, pillars |
| Convex | Medium | Simple props |
| Trimesh | Slow | Static terrain only |
| Compound | Varies | Complex dynamic objects |

- Prefer primitive shapes over meshes
- Use trimesh only for static geometry
- Compound colliders are better than multiple entities
- Simplify collision geometry vs visual geometry
