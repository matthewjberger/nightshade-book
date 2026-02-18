# Decals

> **Live Demo:** [Decals](https://matthewberger.dev/nightshade/decals)

Decals are textures projected onto scene geometry using deferred projection through the depth buffer. They are used for bullet holes, blood splatters, footprints, scorch marks, and environmental details without modifying the underlying mesh geometry.

## How Decal Rendering Works

Each decal is rendered as a unit cube positioned and oriented in world space. The fragment shader reconstructs the world position of the scene geometry behind the cube by sampling the depth buffer, then transforms that position into the decal's local space using the inverse model matrix. If the reconstructed point falls within the decal's projection volume (±1 in XY, 0 to depth in Z), the decal texture is sampled at those local XY coordinates and blended onto the scene.

The normal threshold test compares the scene surface normal (from the depth buffer gradients) against the decal's forward direction. Surfaces angled beyond the threshold are rejected, preventing decals from wrapping around sharp edges.

Distance fade uses a smoothstep between `fade_start` and `fade_end` based on the camera-to-decal distance.

## Decal Component

```rust
pub struct Decal {
    pub texture: Option<String>,
    pub emissive_texture: Option<String>,
    pub emissive_strength: f32,
    pub color: [f32; 4],
    pub size: Vec2,
    pub depth: f32,
    pub normal_threshold: f32,
    pub fade_start: f32,
    pub fade_end: f32,
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `texture` | `None` | Texture name in the texture cache |
| `emissive_texture` | `None` | Optional emissive texture for glowing decals |
| `emissive_strength` | `1.0` | HDR multiplier for emissive texture |
| `color` | `[1, 1, 1, 1]` | RGBA tint multiplied with the texture |
| `size` | `(1.0, 1.0)` | Width and height of the projected decal |
| `depth` | `1.0` | Projection depth (how far the decal penetrates into surfaces) |
| `normal_threshold` | `0.5` | Surface angle cutoff (0 = accept all, 1 = perpendicular only) |
| `fade_start` | `50.0` | Distance where fade begins |
| `fade_end` | `100.0` | Distance where the decal is fully transparent |

## Spawning Decals

```rust
fn spawn_bullet_hole(world: &mut World, position: Vec3, normal: Vec3) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY | DECAL,
        1
    )[0];

    let rotation = nalgebra_glm::quat_look_at(&normal, &Vec3::y());

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        rotation,
        ..Default::default()
    });

    world.set_decal(entity, Decal::new("bullet_hole")
        .with_size(0.2, 0.2)
        .with_depth(0.1)
        .with_normal_threshold(0.5)
        .with_fade(20.0, 30.0));

    entity
}
```

## Builder API

The `Decal` struct supports a builder pattern:

```rust
let decal = Decal::new("texture_name")
    .with_size(0.5, 0.5)
    .with_depth(0.2)
    .with_color([1.0, 0.0, 0.0, 1.0])
    .with_normal_threshold(0.3)
    .with_fade(30.0, 50.0)
    .with_emissive("rune_glow", 3.0);
```

## Common Use Cases

### Blood Splatter

```rust
fn spawn_blood(world: &mut World, position: Vec3, normal: Vec3) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY | DECAL,
        1
    )[0];

    let rotation = nalgebra_glm::quat_look_at(&normal, &Vec3::y());
    let random_angle = rand::random::<f32>() * std::f32::consts::TAU;
    let rotation = rotation * nalgebra_glm::quat_angle_axis(random_angle, &Vec3::z());

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        rotation,
        ..Default::default()
    });

    world.set_decal(entity, Decal::new("blood")
        .with_size(0.8, 0.8)
        .with_depth(0.1)
        .with_normal_threshold(0.3)
        .with_fade(30.0, 50.0));

    entity
}
```

### Emissive Rune

```rust
fn spawn_magic_rune(world: &mut World, position: Vec3) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY | DECAL,
        1
    )[0];

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        rotation: nalgebra_glm::quat_angle_axis(
            -std::f32::consts::FRAC_PI_2,
            &Vec3::x(),
        ),
        ..Default::default()
    });

    world.set_decal(entity, Decal::new("rune")
        .with_size(2.0, 2.0)
        .with_depth(0.5)
        .with_normal_threshold(0.7)
        .with_fade(50.0, 80.0)
        .with_emissive("rune_glow", 3.0));

    entity
}
```

### Footprints

```rust
fn spawn_footprint(world: &mut World, position: Vec3, direction: Vec3, left: bool) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY | DECAL,
        1
    )[0];

    let rotation = nalgebra_glm::quat_look_at(&Vec3::y(), &direction);
    let flip = if left { 1.0 } else { -1.0 };

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        rotation,
        scale: Vec3::new(flip, 1.0, 1.0),
    });

    world.set_decal(entity, Decal::new("footprint")
        .with_size(0.15, 0.3)
        .with_depth(0.05)
        .with_normal_threshold(0.8)
        .with_fade(15.0, 25.0));

    entity
}
```
