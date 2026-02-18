# The freecs Macro

The `freecs::ecs!` macro generates the entire World struct, component storage, accessors, query methods, and entity management from a declarative definition.

## Macro Syntax

```rust
freecs::ecs! {
    World {
        // Components: field_name: Type => FLAG_NAME,
        local_transform: LocalTransform => LOCAL_TRANSFORM,
        global_transform: GlobalTransform => GLOBAL_TRANSFORM,
        render_mesh: RenderMesh => RENDER_MESH,
        material_ref: MaterialRef => MATERIAL_REF,
        camera: Camera => CAMERA,
        light: Light => LIGHT,
        // ... more components
    }
    Resources {
        // Global singletons: field_name: Type,
        window: Window,
        input: Input,
        graphics: Graphics,
        active_camera: Option<Entity>,
        // ... more resources
    }
}
```

Each line in the component block declares:
1. A **field name** (snake_case) - used to generate accessor methods
2. A **type** - the Rust struct stored for this component
3. A **flag constant** (UPPER_SNAKE_CASE) - the bitflag for queries

## What Gets Generated

From the macro invocation, freecs generates:

### The World Struct

```rust
pub struct World {
    // Internal entity storage (archetype tables, free lists, etc.)
    entities: EntityStorage,
    // All global resources
    pub resources: Resources,
}
```

### Per-Component Accessors

For each component `foo: Foo => FOO`, the macro generates:

```rust
// Immutable access
world.get_foo(entity) -> Option<&Foo>

// Mutable access
world.get_foo_mut(entity) -> Option<&mut Foo>

// Set value
world.set_foo(entity, value: Foo)
```

### Entity Management

```rust
// Spawn entities with a component mask
world.spawn_entities(flags: ComponentFlags, count: usize) -> Vec<Entity>

// Despawn entities
world.despawn_entities(entities: &[Entity])

// Check if entity has components
world.entity_has_components(entity: Entity, flags: ComponentFlags) -> bool
```

### Query Methods

```rust
// Query entities matching a component mask
world.query_entities(flags: ComponentFlags) -> impl Iterator<Item = Entity>

// Query and return first match
world.query_first_entity(flags: ComponentFlags) -> Option<Entity>
```

### Component Flag Constants

```rust
pub const LOCAL_TRANSFORM: ComponentFlags = 1 << 0;
pub const GLOBAL_TRANSFORM: ComponentFlags = 1 << 1;
pub const RENDER_MESH: ComponentFlags = 1 << 2;
// ... one per component, powers of 2
```

### The Resources Struct

```rust
pub struct Resources {
    pub window: Window,
    pub input: Input,
    pub graphics: Graphics,
    pub active_camera: Option<Entity>,
    // ... all declared resources with Default initialization
}
```

## Nightshade's World Definition

Nightshade declares 48 components and 30+ resources. Here is the complete declaration (simplified paths for readability):

### Components

| Flag | Field | Type | Category |
|------|-------|------|----------|
| `ANIMATION_PLAYER` | `animation_player` | `AnimationPlayer` | Animation |
| `NAME` | `name` | `Name` | Identity |
| `LOCAL_TRANSFORM` | `local_transform` | `LocalTransform` | Transform |
| `GLOBAL_TRANSFORM` | `global_transform` | `GlobalTransform` | Transform |
| `LOCAL_TRANSFORM_DIRTY` | `local_transform_dirty` | `LocalTransformDirty` | Transform |
| `PARENT` | `parent` | `Parent` | Transform |
| `IGNORE_PARENT_SCALE` | `ignore_parent_scale` | `IgnoreParentScale` | Transform |
| `AUDIO_SOURCE` | `audio_source` | `AudioSource` | Audio |
| `AUDIO_LISTENER` | `audio_listener` | `AudioListener` | Audio |
| `CAMERA` | `camera` | `Camera` | Camera |
| `PAN_ORBIT_CAMERA` | `pan_orbit_camera` | `PanOrbitCamera` | Camera |
| `LIGHT` | `light` | `Light` | Lighting |
| `LINES` | `lines` | `Lines` | Debug |
| `VISIBILITY` | `visibility` | `Visibility` | Rendering |
| `DECAL` | `decal` | `Decal` | Rendering |
| `RENDER_MESH` | `render_mesh` | `RenderMesh` | Rendering |
| `MATERIAL_REF` | `material_ref` | `MaterialRef` | Rendering |
| `RENDER_LAYER` | `render_layer` | `RenderLayer` | Rendering |
| `SPRITE` | `sprite` | `Sprite` | 2D |
| `SPRITE_ANIMATOR` | `sprite_animator` | `SpriteAnimator` | 2D |
| `TEXT` | `text` | `Text` | Text |
| `HUD_TEXT` | `hud_text` | `HudText` | Text |
| `TEXT_CHARACTER_COLORS` | `text_character_colors` | `TextCharacterColors` | Text |
| `TEXT_CHARACTER_BACKGROUND_COLORS` | `text_character_background_colors` | `TextCharacterBackgroundColors` | Text |
| `BOUNDING_VOLUME` | `bounding_volume` | `BoundingVolume` | Spatial |
| `HOVERED` | `hovered` | `Hovered` | Input |
| `ROTATION` | `rotation` | `Rotation` | Transform |
| `CASTS_SHADOW` | `casts_shadow` | `CastsShadow` | Rendering |
| `RIGID_BODY` | `rigid_body` | `RigidBodyComponent` | Physics |
| `COLLIDER` | `collider` | `ColliderComponent` | Physics |
| `PHYSICS_MATERIAL` | `physics_material` | `PhysicsMaterialComponent` | Physics |
| `CHARACTER_CONTROLLER` | `character_controller` | `CharacterControllerComponent` | Physics |
| `PHYSICS_INTERPOLATION` | `physics_interpolation` | `PhysicsInterpolation` | Physics |
| `INSTANCED_MESH` | `instanced_mesh` | `InstancedMesh` | Rendering |
| `PARTICLE_EMITTER` | `particle_emitter` | `ParticleEmitter` | Particles |
| `PREFAB_SOURCE` | `prefab_source` | `PrefabSource` | Prefabs |
| `PREFAB_INSTANCE` | `prefab_instance` | `PrefabInstance` | Prefabs |
| `SCRIPT` | `script` | `Script` | Scripting |
| `SKIN` | `skin` | `Skin` | Animation |
| `JOINT` | `joint` | `Joint` | Animation |
| `MORPH_WEIGHTS` | `morph_weights` | `MorphWeights` | Animation |
| `NAVMESH_AGENT` | `navmesh_agent` | `NavMeshAgent` | Navigation |
| `LATTICE` | `lattice` | `Lattice` | Deformation |
| `LATTICE_INFLUENCED` | `lattice_influenced` | `LatticeInfluenced` | Deformation |
| `WATER` | `water` | `Water` | Rendering |
| `GRASS_REGION` | `grass_region` | `GrassRegion` | Rendering |
| `GRASS_INTERACTOR` | `grass_interactor` | `GrassInteractor` | Rendering |

### Resources

The `Resources` block includes:

| Field | Type | Feature Gate |
|-------|------|-------------|
| `window` | `Window` | always |
| `secondary_windows` | `SecondaryWindows` | always |
| `user_interface` | `UserInterface` | always |
| `immediate_ui` | `ImmediateUi` | always |
| `graphics` | `Graphics` | always |
| `input` | `Input` | always |
| `audio` | `AudioEngine` | `audio` |
| `physics` | `PhysicsWorld` | `physics` |
| `navmesh` | `NavMeshWorld` | always |
| `text_cache` | `TextCache` | always |
| `mesh_cache` | `MeshCache` | always |
| `animation_cache` | `AnimationCache` | always |
| `prefab_cache` | `PrefabCache` | always |
| `material_registry` | `MaterialRegistry` | always |
| `texture_cache` | `TextureCache` | always |
| `active_camera` | `Option<Entity>` | always |
| `event_bus` | `EventBus` | always |
| `command_queue` | `Vec<WorldCommand>` | always |
| `entity_names` | `HashMap<String, Entity>` | always |

Conditional resources are included only when their feature flag is enabled, using `#[cfg(feature = "...")]` attributes in the macro.
