# Queries & Iteration

Queries find entities by their component masks. Since component presence is tracked as bitflags, queries are extremely fast - a single bitmask comparison per archetype table.

## Basic Queries

Query entities with specific components using component flags:

```rust
for entity in world.query_entities(LOCAL_TRANSFORM | GLOBAL_TRANSFORM) {
    if let Some(transform) = world.get_local_transform(entity) {
        let position = transform.translation;
    }
}
```

The query returns all entities that have **at least** the specified components. An entity with `LOCAL_TRANSFORM | GLOBAL_TRANSFORM | RENDER_MESH` will match a query for `LOCAL_TRANSFORM | GLOBAL_TRANSFORM`.

## Common Query Patterns

### Renderable Entities

```rust
const RENDERABLE: ComponentFlags =
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | RENDER_MESH | MATERIAL_REF;

for entity in world.query_entities(RENDERABLE) {
    let transform = world.get_global_transform(entity).unwrap();
    let mesh = world.get_render_mesh(entity).unwrap();
}
```

### Physics Entities

```rust
for entity in world.query_entities(RIGID_BODY | LOCAL_TRANSFORM) {
    if let Some(rb) = world.get_rigid_body(entity) {
        if rb.body_type == RigidBodyType::Dynamic {
            // Process dynamic bodies
        }
    }
}
```

### Animated Entities

```rust
for entity in world.query_entities(ANIMATION_PLAYER) {
    if let Some(player) = world.get_animation_player_mut(entity) {
        player.speed = 1.0;
    }
}
```

## First Match

For singleton-like entities, use iterator methods:

```rust
let player = world.query_entities(CHARACTER_CONTROLLER).next();

if let Some(player_entity) = player {
    let controller = world.get_character_controller(player_entity);
}
```

## Filtering

Combine queries with additional runtime checks:

```rust
for entity in world.query_entities(LIGHT) {
    let light = world.get_light(entity).unwrap();
    if light.light_type == LightType::Point {
        // Process point lights only
    }
}
```

## Entity Count

```rust
let renderable_count = world.query_entities(RENDER_MESH).count();
let light_count = world.query_entities(LIGHT).count();
```

## Named Entity Lookup

If entities have the `Name` component:

```rust
fn find_by_name(world: &World, name: &str) -> Option<Entity> {
    for entity in world.query_entities(NAME) {
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

The engine also maintains `world.resources.entity_names` as a `HashMap<String, Entity>` for fast name-based lookups.

## Children Queries

Query children of a specific parent:

```rust
if let Some(children) = world.resources.children_cache.get(&parent_entity) {
    for child in children {
        if let Some(transform) = world.get_local_transform(*child) {
            // Process child
        }
    }
}
```

## Collecting Results

Collect query results for later processing (useful when you need to mutate during iteration):

```rust
let enemies: Vec<Entity> = world.query_entities(ENEMY_TAG | HEALTH).collect();

for enemy in &enemies {
    apply_damage(world, *enemy, 10.0);
}
```

## Iteration with Index

```rust
for (index, entity) in world.query_entities(RENDER_MESH).enumerate() {
    // index is the iteration position, not the entity ID
}
```
