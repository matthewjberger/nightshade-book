# Entities

Entities are unique identifiers that group components together. An entity is just an ID - it has no data of its own.

## Entity Type

```rust
pub use freecs::Entity;
```

`Entity` is a lightweight handle containing a generation and an index. Generations prevent dangling references - if an entity is despawned and its slot reused, the old `Entity` handle will no longer match.

## Spawning Entities

### Basic Spawning

Spawn entities with `spawn_entities`, specifying component flags and count:

```rust
let entity = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | RENDER_MESH | MATERIAL_REF,
    1,
)[0];
```

Then set component values:

```rust
world.set_local_transform(entity, LocalTransform {
    translation: Vec3::new(0.0, 1.0, 0.0),
    rotation: Quat::identity(),
    scale: Vec3::new(1.0, 1.0, 1.0),
});

world.set_render_mesh(entity, RenderMesh {
    name: "cube".to_string(),
    id: None,
});

world.set_material_ref(entity, MaterialRef::new("Default"));
```

### Batch Spawning

Spawn multiple entities at once:

```rust
let entities = world.spawn_entities(LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 100);

for (index, entity) in entities.iter().enumerate() {
    world.set_local_transform(*entity, LocalTransform {
        translation: Vec3::new(index as f32 * 2.0, 0.0, 0.0),
        ..Default::default()
    });
}
```

### Helper Functions

Nightshade provides convenience functions for common entities:

```rust
// Primitives
spawn_cube_at(world, Vec3::new(0.0, 1.0, 0.0));
spawn_sphere_at(world, Vec3::new(2.0, 1.0, 0.0));
spawn_plane_at(world, Vec3::zeros());
spawn_cylinder_at(world, Vec3::new(4.0, 1.0, 0.0));
spawn_cone_at(world, Vec3::new(6.0, 1.0, 0.0));
spawn_torus_at(world, Vec3::new(8.0, 1.0, 0.0));

// Camera
let camera = spawn_camera(world, Vec3::new(0.0, 5.0, 10.0), "Main Camera".to_string());
world.resources.active_camera = Some(camera);

// Sun light
let sun = spawn_sun(world);

// First-person player with character controller
let (player_entity, camera_entity) = spawn_first_person_player(world, Vec3::new(0.0, 2.0, 0.0));
```

### Loading Models

Load glTF/GLB models:

```rust
use nightshade::ecs::prefab::*;

let model_bytes = include_bytes!("../assets/character.glb");
let result = import_gltf_from_bytes(model_bytes)?;

for (name, (rgba_data, width, height)) in result.textures {
    world.queue_command(WorldCommand::LoadTexture {
        name,
        rgba_data,
        width,
        height,
    });
}

for (name, mesh) in result.meshes {
    mesh_cache_insert(&mut world.resources.mesh_cache, name, mesh);
}

for prefab in result.prefabs {
    spawn_prefab_with_animations(
        world,
        &prefab,
        &result.animations,
        Vec3::new(0.0, 0.0, 0.0),
    );
}
```

## Despawning Entities

```rust
// Despawn specific entities
world.despawn_entities(&[entity]);

// Despawn entity and all children recursively
despawn_recursive_immediate(world, entity);

// Deferred despawn via command queue
world.queue_command(WorldCommand::DespawnRecursive { entity });
```

## Checking Components

```rust
if world.entity_has_components(entity, RENDER_MESH) {
    // Entity has a mesh
}

if world.entity_has_components(entity, ANIMATION_PLAYER | SKIN) {
    // Entity is an animated skinned model
}
```

## Parent-Child Relationships

Spawn an entity as a child of another:

```rust
let parent = world.spawn_entities(LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];
let child = world.spawn_entities(LOCAL_TRANSFORM | GLOBAL_TRANSFORM | PARENT, 1)[0];

world.set_parent(child, Parent(Some(parent)));
world.set_local_transform(child, LocalTransform {
    translation: Vec3::new(0.0, 1.0, 0.0),
    ..Default::default()
});
```

See [Transform Hierarchy](scene-hierarchy.md) for details on parent-child transforms.
