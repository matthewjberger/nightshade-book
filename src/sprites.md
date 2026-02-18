# Sprites

> **Live Demo:** [Sprites](https://matthewberger.dev/nightshade/sprites)

Sprites are 2D textured quads rendered in 3D space. They support texture blending, animation, and GPU-instanced rendering with automatic z-sorting.

## Sprite Component

The `Sprite` component defines the visual properties of a sprite entity:

```rust
pub struct Sprite {
    pub color: [f32; 4],
    pub texture_index: u32,
    pub texture_index2: u32,
    pub blend_factor: f32,
    pub uv_min: Vec2,
    pub uv_max: Vec2,
}
```

| Field | Description |
|-------|-------------|
| `color` | RGBA tint color, multiplied with the texture |
| `texture_index` | Primary texture slot in the sprite atlas |
| `texture_index2` | Secondary texture slot for blending |
| `blend_factor` | Blend weight between the two textures (0.0 = first, 1.0 = second) |
| `uv_min` / `uv_max` | UV coordinates within the atlas slot |

## Creating Sprites

Use the builder pattern:

```rust
let sprite = Sprite::new()
    .with_texture(0)
    .with_color([1.0, 0.5, 0.5, 1.0]);

let entity = world.spawn_entities(
    SPRITE | LOCAL_TRANSFORM | GLOBAL_TRANSFORM,
    1,
)[0];
world.set_sprite(entity, sprite);
world.set_local_transform(entity, LocalTransform {
    translation: Vec3::new(0.0, 1.0, 0.0),
    scale: Vec3::new(2.0, 2.0, 1.0),
    ..Default::default()
});
```

### Texture Blending

Blend between two textures for smooth transitions:

```rust
let sprite = Sprite::new()
    .with_multitexture(0, 1, 0.5);
```

## Loading Sprite Textures

Sprite textures are stored in the sprite texture atlas, not the main texture cache. Upload textures to atlas slots using `WorldCommand::UploadSpriteTexture`:

```rust
world.queue_command(WorldCommand::UploadSpriteTexture {
    slot: 0,
    rgba_data: image_bytes,
    width: 256,
    height: 256,
});
```

Each slot is 512x512 pixels. There are 128 total slots. Textures smaller than the slot size are placed in the top-left corner of the slot.

## Sprite Animation

The `SpriteAnimator` component drives frame-based animation by updating the sprite's UV coordinates each frame.

### Grid-Based Animation

For sprite sheets arranged in a grid:

```rust
let animator = SpriteAnimator::from_grid(
    8,      // columns
    4,      // rows
    32,     // total frames
    0.1,    // seconds per frame
);

world.set_sprite_animator(entity, animator);
```

This computes UV coordinates for each frame automatically based on the grid layout.

### Loop Modes

```rust
let animator = SpriteAnimator::from_grid(4, 1, 4, 0.15)
    .with_loop_mode(LoopMode::Loop);      // default
```

| Mode | Behavior |
|------|----------|
| `LoopMode::Once` | Plays once and stops on the last frame |
| `LoopMode::Loop` | Loops back to the first frame (default) |
| `LoopMode::PingPong` | Plays forward, then backward, repeating |

### Playback Control

```rust
animator.play();
animator.pause();
animator.reset();
```

### Speed

```rust
let animator = SpriteAnimator::from_grid(4, 1, 4, 0.1)
    .with_speed(2.0); // 2x playback speed
```

### Manual Frames

For non-uniform frame layouts, define frames individually:

```rust
let animator = SpriteAnimator {
    frames: vec![
        SpriteFrame {
            uv_min: Vec2::new(0.0, 0.0),
            uv_max: Vec2::new(0.25, 0.5),
            duration: 0.1,
            texture_index: None,
        },
        SpriteFrame {
            uv_min: Vec2::new(0.25, 0.0),
            uv_max: Vec2::new(0.5, 0.5),
            duration: 0.2,
            texture_index: Some(1), // switch to atlas slot 1
        },
    ],
    ..Default::default()
};
```

The `texture_index` field on `SpriteFrame` optionally switches the sprite's atlas slot on that frame.

### Animation System

The `sprite_animation_system` must run each frame to advance animations:

```rust
fn run_systems(&mut self, world: &mut World) {
    sprite_animation_system(world);
}
```

## Rendering

The `SpritePass` renders all sprite entities using GPU instancing. It:

- Collects all entities with `Sprite` + `GlobalTransform` components
- Performs frustum culling based on camera position
- Sorts sprites by depth for correct alpha blending
- Renders camera-facing quads with instanced draw calls

Sprites are rendered as part of the geometry pass pipeline and write to both `scene_color` and `depth`.
