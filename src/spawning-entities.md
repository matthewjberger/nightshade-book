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
    rotation: Quat::identity(),
    scale: Vec3::new(1.0, 1.0, 1.0),
});

world.set_render_mesh(entity, RenderMesh {
    name: "cube".to_string(),
    id: None,
});

world.set_material_ref(entity, MaterialRef::new("Default"));
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

Nightshade provides convenience functions for common entities. Primitive spawn helpers and `fly_camera_system` / `escape_key_exit_system` are available from the prelude.

### Cameras

```rust
let camera = spawn_camera(world, Vec3::new(0.0, 5.0, 10.0), "Main Camera".to_string());
world.resources.active_camera = Some(camera);

let orbit_camera = spawn_pan_orbit_camera(
    world,
    Vec3::zeros(),
    10.0,
    0.5,
    0.4,
    "Orbit Camera".to_string(),
);
```

### Lights

```rust
let sun = spawn_sun(world);
```

To create a point light, manually spawn an entity with the `LIGHT` flag and set the `Light` component with `LightType::Point`:

```rust
let light = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LIGHT,
    1,
)[0];

world.set_local_transform(light, LocalTransform {
    translation: Vec3::new(0.0, 3.0, 0.0),
    ..Default::default()
});

world.set_light(light, Light {
    light_type: LightType::Point,
    color: Vec3::new(1.0, 0.8, 0.6),
    intensity: 5.0,
    range: 10.0,
    cast_shadows: true,
    shadow_bias: 0.005,
    inner_cone_angle: 0.0,
    outer_cone_angle: 0.0,
});
```

### Primitives

All primitive spawn helpers are available from the prelude:

```rust
spawn_cube_at(world, Vec3::new(0.0, 1.0, 0.0));
spawn_sphere_at(world, Vec3::new(2.0, 1.0, 0.0));
spawn_plane_at(world, Vec3::zeros());
spawn_cylinder_at(world, Vec3::new(4.0, 1.0, 0.0));
spawn_cone_at(world, Vec3::new(6.0, 1.0, 0.0));
spawn_torus_at(world, Vec3::new(8.0, 1.0, 0.0));
```

### Physics Objects

There are no dedicated physics spawn helpers. Create physics entities manually by combining the appropriate component flags:

```rust
let dynamic_cube = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY
    | RENDER_MESH | MATERIAL_REF | RIGID_BODY | COLLIDER,
    1,
)[0];

world.set_local_transform(dynamic_cube, LocalTransform {
    translation: Vec3::new(0.0, 5.0, 0.0),
    ..Default::default()
});

world.set_render_mesh(dynamic_cube, RenderMesh {
    name: "cube".to_string(),
    id: None,
});

world.set_material_ref(dynamic_cube, MaterialRef::new("Default"));

world.set_rigid_body(dynamic_cube, RigidBodyComponent {
    body_type: RigidBodyType::Dynamic,
    ..Default::default()
});
```

For a static floor:

```rust
let floor = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY
    | RENDER_MESH | MATERIAL_REF | RIGID_BODY | COLLIDER,
    1,
)[0];

world.set_local_transform(floor, LocalTransform {
    translation: Vec3::new(0.0, -0.5, 0.0),
    scale: Vec3::new(50.0, 1.0, 50.0),
    ..Default::default()
});

world.set_render_mesh(floor, RenderMesh {
    name: "cube".to_string(),
    id: None,
});

world.set_material_ref(floor, MaterialRef::new("Default"));

world.set_rigid_body(floor, RigidBodyComponent {
    body_type: RigidBodyType::Fixed,
    ..Default::default()
});
```

### Character Controllers

```rust
let (player_entity, camera_entity) = spawn_first_person_player(world, Vec3::new(0.0, 2.0, 0.0));
```

`spawn_first_person_player` takes the world and position, and returns a tuple of `(Entity, Entity)` for the player entity and camera entity.

## Loading Models

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
    let entity = spawn_prefab_with_animations(
        world,
        &prefab,
        &result.animations,
        Vec3::new(0.0, 0.0, 0.0),
    );
}
```

## Despawning Entities

Remove entities from the world:

```rust
world.despawn_entities(&[entity]);

despawn_recursive_immediate(world, entity);
```

## Entity with Parent

Spawn an entity as a child:

```rust
let parent = world.spawn_entities(LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];
let child = world.spawn_entities(LOCAL_TRANSFORM | GLOBAL_TRANSFORM | PARENT, 1)[0];

world.update_parent(child, Some(Parent(Some(parent))));
world.set_local_transform(child, LocalTransform {
    translation: Vec3::new(0.0, 1.0, 0.0),
    ..Default::default()
});
```
