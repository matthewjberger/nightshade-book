# Picking System

> **Live Demo:** [Picking](https://matthewberger.dev/nightshade/picking)

Picking allows you to select entities in the 3D world using mouse clicks or screen positions. Nightshade provides two picking methods: fast bounding volume ray intersection and precise triangle mesh raycasting via Rapier physics colliders.

## How Picking Works

### Screen-to-Ray Conversion

`PickingRay::from_screen_position` converts a 2D screen coordinate into a 3D ray. It computes NDC coordinates from the screen position, builds the inverse view-projection matrix from the active camera, then unprojects through it:

- **Perspective cameras**: The ray origin is the camera position. A clip-space point at `z=1.0` (reversed-Z near plane) is unprojected to get the world direction.
- **Orthographic cameras**: Both near (`z=1.0`) and far (`z=0.0`) clip-space points are unprojected. The ray origin is the near point; the direction is the vector from near to far.

Viewport rectangles are handled by converting screen coordinates to local viewport space and scaling by the viewport-to-window ratio.

```rust
pub struct PickingRay {
    pub origin: Vec3,
    pub direction: Vec3,
}

let screen_pos = world.resources.input.mouse.position;
if let Some(ray) = PickingRay::from_screen_position(world, screen_pos) {
    // ray.origin and ray.direction are in world space
}
```

### Bounding Volume Picking (Fast)

The fast picking path tests the ray against every entity's bounding volume. For each entity with a `BoundingVolume` component:

1. Transform the bounding volume by the entity's global transform
2. Early reject using a bounding sphere test (project center onto ray, check distance)
3. Test against the oriented bounding box (OBB) for a precise intersection distance
4. Optionally skip invisible entities via the `Visibility` component

Results are sorted by distance (closest first).

```rust
if let Some(hit) = pick_closest_entity(world, screen_pos) {
    let entity = hit.entity;
    let distance = hit.distance;
    let position = hit.world_position;
}
```

### Pick All Entities

Return all entities hit by the ray, sorted by distance:

```rust
let hits = pick_entities(world, screen_pos, PickingOptions::default());

for hit in &hits {
    let entity = hit.entity;
    let distance = hit.distance;
}
```

### Picking Options

```rust
pub struct PickingOptions {
    pub max_distance: f32,       // Maximum ray distance (default: infinity)
    pub ignore_invisible: bool,  // Skip entities with Visibility { visible: false } (default: true)
}
```

## Triangle Mesh Picking (Precise)

For pixel-precise picking, register entities for trimesh picking. This creates a Rapier physics collider from the entity's mesh geometry in a dedicated `PickingWorld` collision set.

### Registering Entities

```rust
use nightshade::ecs::picking::commands::*;

register_entity_for_trimesh_picking(world, entity);
```

This extracts the mesh vertices and indices from the entity's `RenderMesh`, applies the global transform's scale, and creates a `SharedShape::trimesh` collider positioned at the entity's world transform. The collider is stored in the `PickingWorld` resource (a `ColliderSet` with entity-to-handle mappings).

For hierarchies (parent with child meshes):

```rust
register_entity_hierarchy_for_trimesh_picking(world, root_entity);
```

### Trimesh Raycasting

```rust
if let Some(hit) = pick_closest_entity_trimesh(world, screen_pos) {
    let entity = hit.entity;
    let distance = hit.distance;
    let position = hit.world_position;
}
```

This casts a Rapier ray against all registered trimesh colliders using `shape.cast_ray()`, returning the time of impact for each intersection.

### Updating Transforms

When a pickable entity moves, update its collider position:

```rust
update_picking_transform(world, entity);
```

### Unregistering

```rust
unregister_entity_from_picking(world, entity);
```

## Pick Result

```rust
pub struct PickingResult {
    pub entity: Entity,
    pub distance: f32,
    pub world_position: Vec3,
}
```

## Utility Functions

### Ground Plane Intersection

Get the world position where a screen ray hits a horizontal plane:

```rust
if let Some(ground_pos) = get_ground_position_from_screen(world, screen_pos, 0.0) {
    // ground_pos is on the Y=0 plane
}
```

### Frustum Picking

Test which entities from a list are visible in the camera frustum:

```rust
let visible = pick_entities_in_frustum(world, &entity_list);
```

This projects each entity's bounding sphere center into clip space and tests against NDC bounds, accounting for the sphere radius in NDC space.

### Plane Intersection

```rust
let ray = PickingRay::from_screen_position(world, screen_pos)?;

// Intersect with any plane (normal + distance from origin)
if let Some(point) = ray.intersect_plane(Vec3::y(), 0.0) {
    // point is on the plane
}

// Shorthand for horizontal ground plane
if let Some(point) = ray.intersect_ground_plane(0.0) {
    // point is on Y=0
}
```

## Mouse Click Selection

```rust
fn on_mouse_input(&mut self, world: &mut World, state: ElementState, button: MouseButton) {
    if button == MouseButton::Left && state == ElementState::Pressed {
        let screen_pos = world.resources.input.mouse.position;

        if let Some(hit) = pick_closest_entity(world, screen_pos) {
            self.selected_entity = Some(hit.entity);
        } else {
            self.selected_entity = None;
        }
    }
}
```
