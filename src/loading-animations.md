# Loading Animated Models

Nightshade supports skeletal animation through glTF/GLB files.

## Loading an Animated Model

```rust
use nightshade::ecs::prefab::*;

const CHARACTER_GLB: &[u8] = include_bytes!("../assets/character.glb");

fn load_character(world: &mut World) -> Option<Entity> {
    let result = import_gltf_from_bytes(CHARACTER_GLB).ok()?;

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

    // Spawn with animations and skins
    result.prefabs.first().map(|prefab| {
        spawn_prefab_with_animations(
            world,
            prefab,
            &result.animations,
            Vec3::zeros(),
        )
    })
}
```

## Animation Data Structure

Loaded animations contain:

```rust
pub struct AnimationClip {
    pub name: String,
    pub duration: f32,
    pub channels: Vec<AnimationChannel>,
}

pub struct AnimationChannel {
    pub target_node: usize,
    pub target_property: AnimationProperty,
    pub interpolation: Interpolation,
    pub times: Vec<f32>,
    pub values: Vec<f32>,
}

pub enum AnimationProperty {
    Translation,
    Rotation,
    Scale,
    MorphWeights,
}
```

## Filtering Animation Channels

Remove unwanted channels (like root motion):

```rust
fn filter_animations(animations: &[AnimationClip]) -> Vec<AnimationClip> {
    let root_bone_indices: std::collections::HashSet<usize> = [0, 1, 2, 3].into();

    animations
        .iter()
        .map(|clip| AnimationClip {
            name: clip.name.clone(),
            duration: clip.duration,
            channels: clip
                .channels
                .iter()
                .filter(|channel| {
                    // Remove translation from all bones (prevent sliding)
                    if channel.target_property == AnimationProperty::Translation {
                        return false;
                    }
                    // Remove rotation from root bones
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
        .collect()
}
```

## Storing Animation Indices

Track which animations are which:

```rust
struct AnimationIndices {
    idle: Option<usize>,
    walk: Option<usize>,
    run: Option<usize>,
    jump: Option<usize>,
}

fn find_animation_indices(clips: &[AnimationClip]) -> AnimationIndices {
    let mut indices = AnimationIndices {
        idle: None,
        walk: None,
        run: None,
        jump: None,
    };

    for (index, clip) in clips.iter().enumerate() {
        let name = clip.name.to_lowercase();
        if name.contains("idle") {
            indices.idle = Some(index);
        } else if name.contains("walk") {
            indices.walk = Some(index);
        } else if name.contains("run") {
            indices.run = Some(index);
        } else if name.contains("jump") {
            indices.jump = Some(index);
        }
    }

    indices
}
```

## Skeleton Structure

Skinned meshes have a skeleton:

```rust
pub struct Skin {
    pub joints: Vec<Entity>,
    pub inverse_bind_matrices: Vec<Mat4>,
}
```

The `joints` array contains entities for each bone in the skeleton.

## Attaching Objects to Bones

Attach items to specific bones:

```rust
fn attach_to_bone(world: &mut World, item: Entity, bone: Entity) {
    world.update_parent(item, Some(Parent(Some(bone))));

    if let Some(transform) = world.get_local_transform_mut(item) {
        transform.translation = Vec3::new(0.0, 0.1, 0.0);  // Local offset
        transform.scale = Vec3::new(1.0, 1.0, 1.0);
    }
}

// Example: Attach hat to head bone
fn attach_hat(world: &mut World, character: Entity, hat: Entity) {
    // Find head bone (usually named "Head" or similar in the model)
    if let Some(skin) = world.get_skin(character) {
        for joint in &skin.joints {
            if let Some(name) = world.get_name(*joint) {
                if name.0.contains("Head") {
                    attach_to_bone(world, hat, *joint);
                    return;
                }
            }
        }
    }
}
```

## Finding Bones by Name

```rust
fn find_bone_by_name(world: &World, character: Entity, bone_name: &str) -> Option<Entity> {
    let skin = world.get_skin(character)?;

    for joint in &skin.joints {
        if let Some(name) = world.get_name(*joint) {
            if name.0.contains(bone_name) {
                return Some(*joint);
            }
        }
    }
    None
}
```

## Multiple Animated Characters

Load once, spawn many:

```rust
struct CharacterFactory {
    prefab: Prefab,
    animations: Vec<AnimationClip>,
}

impl CharacterFactory {
    fn new(bytes: &[u8]) -> Option<Self> {
        let result = import_gltf_from_bytes(bytes).ok()?;
        Some(Self {
            prefab: result.prefabs.into_iter().next()?,
            animations: result.animations,
        })
    }

    fn spawn(&self, world: &mut World, position: Vec3) -> Entity {
        spawn_prefab_with_animations(
            world,
            &self.prefab,
            &self.animations,
            position,
        )
    }
}
```
