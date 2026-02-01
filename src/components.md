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
    pub rotation: UnitQuaternion<f32>,
    pub scale: Vec3,
}

pub struct GlobalTransform {
    pub matrix: Mat4,
}

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
    pub mesh_name: String,
    pub gpu_mesh_id: Option<MeshId>,
}

pub struct MaterialRef {
    pub material_name: String,
}

pub struct Visibility {
    pub visible: bool,
}
```

## Camera Components

| Component | Description |
|-----------|-------------|
| `Camera` | Projection mode and smoothing |
| `PerspectiveCamera` | FOV, aspect, near/far planes |
| `OrthographicCamera` | Size, near/far for orthographic |
| `PanOrbitCamera` | Orbiting camera controller |

```rust
pub struct PerspectiveCamera {
    pub fov: f32,
    pub aspect: f32,
    pub near: f32,
    pub far: f32,
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
| `RigidBodyComponent` | Dynamic/Kinematic/Static body |
| `ColliderComponent` | Collision shape |
| `CharacterController` | Kinematic player controller |
| `PhysicsInterpolation` | Smooth physics rendering |

```rust
pub struct RigidBodyComponent {
    pub body_type: RigidBodyType,
    pub handle: Option<RigidBodyHandle>,
}

pub enum RigidBodyType {
    Dynamic,
    Kinematic,
    Static,
}
```

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
    pub current_clip: usize,
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
