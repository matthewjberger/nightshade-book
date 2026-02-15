# Components

Nightshade provides 44 built-in components across several categories.

## Transform Components

| Component | Description |
|-----------|-------------|
| `LocalTransform` | Position, rotation, scale relative to parent |
| `GlobalTransform` | Computed world-space transformation matrix |
| `LocalTransformDirty` | Marker for transforms needing propagation |
| `Parent` | Parent entity reference for hierarchy |

```rust
pub struct LocalTransform {
    pub translation: Vec3,
    pub rotation: Quat,
    pub scale: Vec3,
}

pub struct GlobalTransform(pub Mat4);

pub struct Parent(pub Option<Entity>);
```

## Rendering Components

| Component | Description |
|-----------|-------------|
| `RenderMesh` | References mesh by name |
| `MaterialRef` | References material by name |
| `Sprite` | 2D billboard rendering |
| `RenderLayer` | Depth/layer for ordering |
| `CastsShadow` | Marks mesh for shadow maps |
| `Visibility` | Visibility toggle |

```rust
pub struct RenderMesh {
    pub name: String,
    pub id: Option<MeshId>,
}

pub struct MaterialRef {
    pub name: String,
    pub id: Option<MaterialId>,
}
```

`MaterialRef::new(name)` takes `impl Into<String>`, so you can pass `&str` directly:

```rust
MaterialRef::new("Default")
```

## Camera Components

| Component | Description |
|-----------|-------------|
| `Camera` | Projection mode and smoothing |
| `PanOrbitCamera` | Orbiting camera controller |

There is a single `CAMERA` component flag. The projection type is determined by the `Projection` enum inside the `Camera` struct:

```rust
pub struct Camera {
    pub projection: Projection,
    pub smoothing: Option<Smoothing>,
}

pub enum Projection {
    Perspective(PerspectiveCamera),
    Orthographic(OrthographicCamera),
}

pub struct PerspectiveCamera {
    pub aspect_ratio: Option<f32>,
    pub y_fov_rad: f32,
    pub z_far: Option<f32>,
    pub z_near: f32,
}

pub struct OrthographicCamera {
    pub x_mag: f32,
    pub y_mag: f32,
    pub z_far: f32,
    pub z_near: f32,
}
```

## Lighting

| Component | Description |
|-----------|-------------|
| `Light` | Directional, Point, or Spot light |

```rust
pub struct Light {
    pub light_type: LightType,
    pub color: Vec3,
    pub intensity: f32,
    pub range: f32,
    pub cast_shadows: bool,
    pub shadow_bias: f32,
    pub inner_cone_angle: f32,
    pub outer_cone_angle: f32,
}

pub enum LightType {
    Directional,
    Point,
    Spot,
}
```

## Physics Components

| Component | Description |
|-----------|-------------|
| `RigidBodyComponent` | Dynamic/Fixed/Kinematic body |
| `ColliderComponent` | Collision shape |
| `CharacterControllerComponent` | Kinematic player controller |
| `PhysicsInterpolation` | Smooth physics rendering |

```rust
pub struct RigidBodyComponent {
    pub handle: Option<RigidBodyHandle>,
    pub body_type: RigidBodyType,
    pub translation: [f32; 3],
    pub rotation: [f32; 4],
    pub linvel: [f32; 3],
    pub angvel: [f32; 3],
    pub mass: f32,
    pub locked_axes: u8,
}

pub enum RigidBodyType {
    Dynamic,
    Fixed,
    KinematicPositionBased,
    KinematicVelocityBased,
}
```

Constructor methods:
- `RigidBodyComponent::new_dynamic()`
- `RigidBodyComponent::new_static()` (creates a `Fixed` body type)
- `RigidBodyComponent::new_kinematic_position_based()`
- `RigidBodyComponent::new_kinematic_velocity_based()`

The component flag for rigid bodies is `RIGID_BODY` (not `RIGID_BODY_COMPONENT`).

## Animation Components

| Component | Description |
|-----------|-------------|
| `AnimationPlayer` | Animation playback control |
| `Skin` | Skeleton definition |
| `Joint` | Bone in skeleton |
| `MorphWeights` | Blend shape weights |

```rust
pub struct AnimationPlayer {
    pub clips: Vec<AnimationClip>,
    pub current_clip: Option<usize>,
    pub blend_from_clip: Option<usize>,
    pub blend_factor: f32,
    pub playing: bool,
    pub speed: f32,
    pub time: f32,
    pub looping: bool,
}
```

## Audio Components

| Component | Description |
|-----------|-------------|
| `AudioSource` | Sound playback |
| `AudioListener` | 3D audio receiver |

## Geometry Components

| Component | Description |
|-----------|-------------|
| `Text` | 3D world text |
| `HudText` | Screen-space HUD text |
| `Lines` | Debug line rendering |

```rust
pub struct Lines {
    pub lines: Vec<Line>,
}

pub struct Line {
    pub start: Vec3,
    pub end: Vec3,
    pub color: Vec4,
}
```

## Advanced Components

| Component | Description |
|-----------|-------------|
| `ParticleEmitter` | GPU particle system |
| `GrassRegion` | Procedural grass field |
| `GrassInteractor` | Grass bending interaction |
| `NavMeshAgent` | AI pathfinding agent |
| `Water` | Water surface/volume |
| `Decal` | Projected texture |
| `Name` | String identifier |
