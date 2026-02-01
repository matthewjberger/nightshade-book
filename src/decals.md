# Decals

Decals are textures projected onto scene geometry, commonly used for bullet holes, blood splatters, footprints, and environmental details.

## Decal Component

```rust
pub struct Decal {
    pub texture: u32,
    pub size: Vec3,
    pub normal_threshold: f32,
    pub fade_distance: f32,
    pub emissive: bool,
    pub emissive_strength: f32,
}
```

## Spawning Decals

```rust
fn spawn_bullet_hole(world: &mut World, position: Vec3, normal: Vec3) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | DECAL,
        1
    )[0];

    let rotation = UnitQuaternion::face_towards(&normal, &Vec3::y());

    world.set_local_transform(entity, LocalTransform {
        position,
        rotation,
        scale: Vec3::new(1.0, 1.0, 1.0),
    });

    let texture_index = world.resources.texture_cache
        .get_texture_index("bullet_hole")
        .unwrap_or(0);

    world.set_decal(entity, Decal {
        texture: texture_index,
        size: Vec3::new(0.2, 0.2, 0.1),
        normal_threshold: 0.5,
        fade_distance: 20.0,
        emissive: false,
        emissive_strength: 0.0,
    });

    entity
}
```

## Decal Properties

### Size

The projected box size (width, height, depth):

```rust
decal.size = Vec3::new(0.5, 0.5, 0.2);
```

### Normal Threshold

Controls which surfaces receive the decal based on their angle to the decal's forward direction. Range 0-1 where 0 accepts all angles and 1 only perpendicular surfaces:

```rust
decal.normal_threshold = 0.5;
```

### Fade Distance

Distance at which the decal fades out:

```rust
decal.fade_distance = 50.0;
```

### Emissive Decals

For glowing decals like magic runes or neon signs:

```rust
decal.emissive = true;
decal.emissive_strength = 2.0;
```

## Common Use Cases

### Blood Splatter

```rust
fn spawn_blood(world: &mut World, position: Vec3, normal: Vec3) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | DECAL,
        1
    )[0];

    let rotation = UnitQuaternion::face_towards(&normal, &Vec3::y());
    let random_angle = rand::random::<f32>() * std::f32::consts::TAU;
    let rotation = rotation * UnitQuaternion::from_axis_angle(&Vec3::z_axis(), random_angle);

    world.set_local_transform(entity, LocalTransform {
        position,
        rotation,
        scale: Vec3::new(1.0, 1.0, 1.0),
    });

    world.set_decal(entity, Decal {
        texture: world.resources.texture_cache.get_texture_index("blood").unwrap_or(0),
        size: Vec3::new(0.8, 0.8, 0.1),
        normal_threshold: 0.3,
        fade_distance: 30.0,
        emissive: false,
        emissive_strength: 0.0,
    });

    entity
}
```

### Footprints

```rust
fn spawn_footprint(world: &mut World, position: Vec3, direction: Vec3, left: bool) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | DECAL,
        1
    )[0];

    let rotation = UnitQuaternion::face_towards(&Vec3::y(), &direction);
    let flip = if left { 1.0 } else { -1.0 };

    world.set_local_transform(entity, LocalTransform {
        position,
        rotation,
        scale: Vec3::new(flip, 1.0, 1.0),
    });

    world.set_decal(entity, Decal {
        texture: world.resources.texture_cache.get_texture_index("footprint").unwrap_or(0),
        size: Vec3::new(0.15, 0.3, 0.05),
        normal_threshold: 0.8,
        fade_distance: 15.0,
        emissive: false,
        emissive_strength: 0.0,
    });

    entity
}
```

### Magic Rune

```rust
fn spawn_magic_rune(world: &mut World, position: Vec3) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | DECAL,
        1
    )[0];

    world.set_local_transform(entity, LocalTransform {
        position,
        rotation: UnitQuaternion::from_axis_angle(&Vec3::x_axis(), -std::f32::consts::FRAC_PI_2),
        scale: Vec3::new(1.0, 1.0, 1.0),
    });

    world.set_decal(entity, Decal {
        texture: world.resources.texture_cache.get_texture_index("rune").unwrap_or(0),
        size: Vec3::new(2.0, 2.0, 0.5),
        normal_threshold: 0.7,
        fade_distance: 50.0,
        emissive: true,
        emissive_strength: 3.0,
    });

    entity
}
```

## Decal Pooling

For frequently spawned decals (bullets, footprints), use object pooling:

```rust
struct DecalPool {
    available: Vec<Entity>,
    max_decals: usize,
}

impl DecalPool {
    fn get_or_spawn(&mut self, world: &mut World) -> Entity {
        if let Some(entity) = self.available.pop() {
            entity
        } else {
            world.spawn_entities(LOCAL_TRANSFORM | GLOBAL_TRANSFORM | DECAL, 1)[0]
        }
    }

    fn release(&mut self, entity: Entity) {
        if self.available.len() < self.max_decals {
            self.available.push(entity);
        }
    }
}
```

## Decal Lifetime

Decals can be set to fade out and despawn:

```rust
struct DecalLifetime {
    pub entity: Entity,
    pub remaining: f32,
    pub fade_start: f32,
}

fn update_decal_lifetimes(world: &mut World, decals: &mut Vec<DecalLifetime>, dt: f32) {
    decals.retain_mut(|d| {
        d.remaining -= dt;
        if d.remaining <= 0.0 {
            world.despawn(d.entity);
            false
        } else {
            true
        }
    });
}
```

## Performance Tips

- Use texture atlases to batch decals
- Limit total decal count (despawn oldest when limit reached)
- Reduce `size.z` (depth) to minimize overdraw
- Use object pooling for frequently spawned decals
