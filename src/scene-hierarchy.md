# Scene Hierarchy

Nightshade supports parent-child relationships between entities, enabling hierarchical transforms where child entities move relative to their parents.

## Parent-Child Relationships

### Setting a Parent

```rust
world.set_parent(child_entity, Parent { entity: parent_entity });
world.set_local_transform_dirty(child_entity, LocalTransformDirty);
```

When you set a parent, the child's `LocalTransform` becomes relative to the parent's position, rotation, and scale.

### Getting Children

```rust
let children = world.get_children(parent_entity);
for child in children {
    // Process each child
}
```

### Removing a Parent

```rust
world.remove_parent(child_entity);
```

## Transform Propagation

Each frame, transforms propagate through the hierarchy:

```rust
propagate_transforms(world);
```

### How It Works

1. Find all entities marked with `LocalTransformDirty`
2. Mark all their descendants as dirty
3. Sort entities by depth (parents before children)
4. For each entity:
   - If has parent: `GlobalTransform = parent.GlobalTransform * LocalTransform`
   - If no parent: `GlobalTransform = LocalTransform.to_matrix()`
5. Remove the `LocalTransformDirty` marker

### Local vs Global Transform

```rust
pub struct LocalTransform {
    pub position: Vec3,
    pub rotation: UnitQuaternion<f32>,
    pub scale: Vec3,
}

pub struct GlobalTransform {
    pub matrix: Mat4,
}
```

- **LocalTransform**: Position, rotation, scale relative to parent (or world if no parent)
- **GlobalTransform**: Final world-space transformation matrix used for rendering

## Scene Serialization

Scenes can be saved and loaded for level editing and persistence.

### Scene Structure

```rust
pub struct Scene {
    pub name: String,
    pub entities: Vec<SerializedEntity>,
    pub hierarchy: Vec<HierarchyNode>,
    pub assets: SceneAssets,
}

pub struct SerializedEntity {
    pub id: u64,
    pub name: Option<String>,
    pub components: SerializedComponents,
}

pub struct SceneAssets {
    pub textures: Vec<TextureReference>,
    pub materials: Vec<MaterialReference>,
    pub meshes: Vec<MeshReference>,
}
```

### Saving a Scene

```rust
let scene = world_to_scene(world);
save_scene(&scene, "level1.scene")?;
```

### Loading a Scene

```rust
let scene = load_scene("level1.scene")?;
spawn_scene(world, &scene);
```

### Binary Serialization

For faster loading and smaller file sizes:

```rust
let bytes = serialize_scene_binary(&scene)?;
let scene = deserialize_scene_binary(&bytes)?;
```

## Recursive Operations

### Despawning with Children

```rust
despawn_recursive_immediate(world, parent_entity);
```

This removes the entity and all its descendants from the world.

### Cloning Hierarchy

```rust
let clone = clone_entity_recursive(world, original_entity);
```

Creates a deep copy of an entity and all its children.

## Example: Building a Robot Arm

```rust
fn spawn_robot_arm(world: &mut World) -> Entity {
    let base = spawn_cube(world, Vec3::zeros(), 1.0);
    world.set_name(base, Name("Base".to_string()));

    let lower_arm = spawn_cube(world, Vec3::new(0.0, 1.5, 0.0), 0.3);
    world.set_name(lower_arm, Name("Lower Arm".to_string()));
    world.set_parent(lower_arm, Parent { entity: base });

    let upper_arm = spawn_cube(world, Vec3::new(0.0, 2.0, 0.0), 0.3);
    world.set_name(upper_arm, Name("Upper Arm".to_string()));
    world.set_parent(upper_arm, Parent { entity: lower_arm });

    let hand = spawn_cube(world, Vec3::new(0.0, 1.5, 0.0), 0.2);
    world.set_name(hand, Name("Hand".to_string()));
    world.set_parent(hand, Parent { entity: upper_arm });

    base
}

fn rotate_arm(world: &mut World, lower_arm: Entity, angle: f32) {
    if let Some(transform) = world.get_local_transform_mut(lower_arm) {
        transform.rotation = UnitQuaternion::from_axis_angle(
            &Vec3::z_axis(),
            angle
        );
    }
    world.set_local_transform_dirty(lower_arm, LocalTransformDirty);
}
```

Rotating the lower arm automatically rotates the upper arm and hand with it.
