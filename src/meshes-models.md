# Meshes & Models

> **Live Demo:** [Prefabs](https://matthewberger.dev/nightshade/prefabs)

## Built-in Primitives

Nightshade provides basic geometric primitives:

```rust
use nightshade::prelude::*;

spawn_cube_at(world, Vec3::new(0.0, 1.0, 0.0));
spawn_sphere_at(world, Vec3::new(2.0, 1.0, 0.0));
spawn_plane_at(world, Vec3::zeros());
spawn_cylinder_at(world, Vec3::new(-2.0, 1.0, 0.0));
```

## Loading glTF/GLB Models

### Basic Loading

```rust
use nightshade::ecs::prefab::*;

const MODEL_BYTES: &[u8] = include_bytes!("../assets/character.glb");

fn load_model(world: &mut World) -> Option<Entity> {
    let result = import_gltf_from_bytes(MODEL_BYTES).ok()?;

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

    // Spawn first prefab
    result.prefabs.first().map(|prefab| {
        spawn_prefab_with_skins(
            world,
            prefab,
            &result.animations,
            &result.skins,
            Vec3::zeros(),
        )
    })
}
```

### With Custom Position/Transform

```rust
fn spawn_model_at(world: &mut World, prefab: &Prefab, position: Vec3, scale: f32) -> Entity {
    let entity = spawn_prefab(world, prefab, position);

    if let Some(transform) = world.get_local_transform_mut(entity) {
        transform.scale = Vec3::new(scale, scale, scale);
    }

    entity
}
```

### Filtered Animation Channels

Remove root motion from animations:

```rust
let root_bone_indices: HashSet<usize> = [0, 1, 2, 3].into();

let filtered_animations: Vec<AnimationClip> = result
    .animations
    .iter()
    .map(|clip| AnimationClip {
        name: clip.name.clone(),
        duration: clip.duration,
        channels: clip
            .channels
            .iter()
            .filter(|channel| {
                // Skip translation on all bones
                if channel.target_property == AnimationProperty::Translation {
                    return false;
                }
                // Skip rotation on root bones
                if root_bone_indices.contains(&channel.target_node)
                    && channel.target_property == AnimationProperty::Rotation
                {
                    return false;
                }
                true
            })
            .cloned()
            .collect(),
    })
    .collect();
```

## Manual Mesh Creation

Create meshes programmatically:

```rust
use nightshade::ecs::mesh::*;

let vertices = vec![
    Vertex {
        position: [0.0, 0.0, 0.0],
        normal: [0.0, 1.0, 0.0],
        tex_coords: [0.0, 0.0],
        ..Default::default()
    },
    Vertex {
        position: [1.0, 0.0, 0.0],
        normal: [0.0, 1.0, 0.0],
        tex_coords: [1.0, 0.0],
        ..Default::default()
    },
    Vertex {
        position: [0.5, 0.0, 1.0],
        normal: [0.0, 1.0, 0.0],
        tex_coords: [0.5, 1.0],
        ..Default::default()
    },
];

let indices = vec![0, 1, 2];

let mesh = Mesh {
    vertices,
    indices,
    ..Default::default()
};

mesh_cache_insert(&mut world.resources.mesh_cache, "triangle".to_string(), mesh);
```

## Mesh Component

Assign a mesh to an entity:

```rust
let entity = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | RENDER_MESH | MATERIAL_REF,
    1
)[0];

world.set_render_mesh(entity, RenderMesh {
    name: "triangle".to_string(),
    id: None,
});

world.set_material_ref(entity, MaterialRef::new("default"));
```

## Instanced Meshes

For rendering many copies of the same mesh efficiently:

```rust
world.set_instanced_mesh(entity, InstancedMesh {
    mesh_name: "tree".to_string(),
    instance_count: 1000,
    instance_data: instance_transforms,
});
```

## Mesh Cache

Access the mesh cache:

```rust
// Check if mesh exists
if world.resources.mesh_cache.contains("cube") {
    // Mesh is available
}

// Get mesh data (for physics, etc.)
if let Some(mesh) = world.resources.mesh_cache.get("terrain") {
    let vertices: Vec<Vec3> = mesh.vertices.iter()
        .map(|v| Vec3::new(v.position[0], v.position[1], v.position[2]))
        .collect();
}
```

## Skinned Meshes

For animated characters with skeletons:

```rust
let entity = spawn_prefab_with_skins(
    world,
    &prefab,
    &animations,
    &skins,
    position,
);

// The entity will have Skin and AnimationPlayer components
if let Some(player) = world.get_animation_player_mut(entity) {
    player.playing = true;
    player.looping = true;
}
```

## Shadow Casting

Control whether a mesh casts shadows:

```rust
// Enable shadow casting
world.set_casts_shadow(entity, CastsShadow(true));

// Disable shadow casting (for UI elements, etc.)
world.set_casts_shadow(entity, CastsShadow(false));
```
