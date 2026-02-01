# Querying Entities

## Basic Queries

Query entities with specific components using component flags:

```rust
// Find all entities with transforms
for entity in world.query(LOCAL_TRANSFORM | GLOBAL_TRANSFORM) {
    if let Some(transform) = world.get_local_transform(entity) {
        println!("Entity at {:?}", transform.translation);
    }
}
```

## Common Query Patterns

### Renderable Entities

```rust
const RENDERABLE: ComponentFlags = LOCAL_TRANSFORM | GLOBAL_TRANSFORM | RENDER_MESH | MATERIAL_REF;

for entity in world.query(RENDERABLE) {
    let transform = world.get_global_transform(entity).unwrap();
    let mesh = world.get_render_mesh(entity).unwrap();
    // Process renderable
}
```

### Physics Entities

```rust
for entity in world.query(RIGID_BODY_COMPONENT | LOCAL_TRANSFORM) {
    if let Some(rb) = world.get_rigid_body(entity) {
        if rb.body_type == RigidBodyType::Dynamic {
            // Process dynamic body
        }
    }
}
```

### Animated Entities

```rust
for entity in world.query(ANIMATION_PLAYER) {
    if let Some(player) = world.get_animation_player_mut(entity) {
        player.speed = 1.0;
    }
}
```

## Filtering Results

Filter query results with additional checks:

```rust
for entity in world.query(LIGHT) {
    let light = world.get_light(entity).unwrap();

    // Only process point lights
    if light.light_type == LightType::Point {
        // Update point light
    }
}
```

## Checking Components

Check if an entity has specific components:

```rust
if world.has_component(entity, RENDER_MESH) {
    // Entity is renderable
}

if world.has_component(entity, ANIMATION_PLAYER | SKIN) {
    // Entity is animated
}
```

## Getting Single Entities

For singleton-like entities, query and take the first:

```rust
// Get player entity (assuming only one exists)
let player = world.query(CHARACTER_CONTROLLER).next();

if let Some(player_entity) = player {
    let controller = world.get_character_controller(player_entity);
}
```

## Entity Count

Count entities matching a query:

```rust
let renderable_count = world.query(RENDER_MESH).count();
let light_count = world.query(LIGHT).count();

println!("Renderables: {}, Lights: {}", renderable_count, light_count);
```

## Named Entity Lookup

If entities have the `Name` component:

```rust
fn find_by_name(world: &World, name: &str) -> Option<Entity> {
    for entity in world.query(NAME) {
        if let Some(entity_name) = world.get_name(entity) {
            if entity_name.0 == name {
                return Some(entity);
            }
        }
    }
    None
}

let player = find_by_name(world, "Player");
```

## Children Queries

Query children of a specific parent:

```rust
if let Some(children) = world.children_cache.get(&parent_entity) {
    for child in children {
        if let Some(transform) = world.get_local_transform(*child) {
            // Process child transform (relative to parent)
        }
    }
}
```

## Iteration with Index

When you need the iteration index:

```rust
for (index, entity) in world.query(RENDER_MESH).enumerate() {
    println!("Entity {} at index {}", entity, index);
}
```

## Collecting Entities

Collect query results for later processing:

```rust
let enemies: Vec<Entity> = world.query(ENEMY_TAG | HEALTH).collect();

for enemy in &enemies {
    // Safe to modify world here since we're not iterating
    apply_damage(world, *enemy, 10.0);
}
```
