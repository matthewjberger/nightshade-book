# Spawning Entities

## Basic Entity Spawning

Spawn entities with `spawn_entities`, specifying component flags:

```rust
let entity = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | RENDER_MESH | MATERIAL_REF,
    1
)[0];
```

Then set component values:

```rust
world.set_local_transform(entity, LocalTransform {
    translation: Vec3::new(0.0, 1.0, 0.0),
    rotation: UnitQuaternion::identity(),
    scale: Vec3::new(1.0, 1.0, 1.0),
});

world.set_render_mesh(entity, RenderMesh {
    mesh_name: "cube".to_string(),
    gpu_mesh_id: None,
});

world.set_material_ref(entity, MaterialRef::new("default".to_string()));
```

## Spawning Multiple Entities

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

## Helper Functions

Nightshade provides convenience functions for common entities:

### Cameras

```rust
let camera = spawn_camera(world, Vec3::new(0.0, 5.0, 10.0), "Main Camera".to_string());
world.resources.active_camera = Some(camera);

// Pan-orbit camera
let orbit_camera = spawn_pan_orbit_camera(
    world,
    Vec3::zeros(),  // focus point
    10.0,           // radius
    0.5,            // yaw
    0.4,            // pitch
    "Orbit Camera".to_string(),
);
```

### Lights

```rust
spawn_sun(world);

spawn_point_light(world, Vec3::new(0.0, 3.0, 0.0), Vec3::new(1.0, 0.8, 0.6), 5.0);
```

### Primitives

```rust
use nightshade::ecs::mesh::primitives::*;

spawn_cube(world, Vec3::new(0.0, 1.0, 0.0), 1.0);
spawn_sphere(world, Vec3::new(2.0, 1.0, 0.0), 0.5);
spawn_plane(world, Vec3::zeros(), Vec2::new(10.0, 10.0));
```

### Physics Objects

```rust
use nightshade::ecs::physics::*;

// Dynamic cube
spawn_dynamic_physics_cube(world, Vec3::new(0.0, 5.0, 0.0), Vec3::new(1.0, 1.0, 1.0), 1.0);

// Static floor
spawn_static_physics_cube(world, Vec3::new(0.0, -0.5, 0.0), Vec3::new(50.0, 1.0, 50.0));

// Dynamic sphere
spawn_dynamic_physics_sphere(world, Vec3::new(0.0, 10.0, 0.0), 0.5, 1.0);
```

### Character Controllers

```rust
// First-person player
let (player, camera) = spawn_first_person_player(world, Vec3::new(0.0, 2.0, 0.0));

// Custom character controller
let controller = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY | CHARACTER_CONTROLLER,
    1,
)[0];

if let Some(cc) = world.get_character_controller_mut(controller) {
    *cc = CharacterControllerComponent::new_capsule(0.5, 0.3);
    cc.max_speed = 5.0;
    cc.jump_impulse = 6.0;
}
```

## Loading Models

Load glTF/GLB models:

```rust
use nightshade::ecs::prefab::*;

let model_bytes = include_bytes!("../assets/character.glb");
let result = import_gltf_from_bytes(model_bytes)?;

// Register textures
for (name, (rgba_data, width, height)) in result.textures {
    world.queue_command(WorldCommand::LoadTexture {
        name,
        rgba_data,
        width,
        height,
    });
}

// Register meshes
for (name, mesh) in result.meshes {
    mesh_cache_insert(&mut world.resources.mesh_cache, name, mesh);
}

// Spawn prefab
for prefab in result.prefabs {
    let entity = spawn_prefab_with_skins(
        world,
        &prefab,
        &result.animations,
        &result.skins,
        Vec3::new(0.0, 0.0, 0.0),
    );
}
```

## Despawning Entities

Remove entities from the world:

```rust
// Immediate despawn
world.despawn(entity);

// Deferred despawn (safe during iteration)
world.command_queue.despawn(entity);
```

## Entity with Parent

Spawn an entity as a child:

```rust
let parent = world.spawn_entities(LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];
let child = world.spawn_entities(LOCAL_TRANSFORM | GLOBAL_TRANSFORM | PARENT, 1)[0];

world.update_parent(child, Some(Parent(Some(parent))));
world.set_local_transform(child, LocalTransform {
    translation: Vec3::new(0.0, 1.0, 0.0),  // 1 unit above parent
    ..Default::default()
});
```
