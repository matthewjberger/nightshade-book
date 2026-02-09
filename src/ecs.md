# Entity Component System

Nightshade uses `freecs`, a code-generated ECS with struct-of-arrays storage for cache-friendly access patterns.

## ECS Concepts

### Entities

Entities are unique identifiers (IDs) that group components together. An entity is just a number - it has no data of its own.

```rust
let entity: Entity = world.spawn_entities(LOCAL_TRANSFORM, 1)[0];
```

### Components

Components are plain data structs attached to entities:

```rust
pub struct LocalTransform {
    pub translation: Vec3,
    pub rotation: Quat,
    pub scale: Vec3,
}

pub struct Health {
    pub current: f32,
    pub maximum: f32,
}
```

### Systems

Systems are functions that process entities with specific components:

```rust
fn damage_system(world: &mut World) {
    for entity in world.query_entities(HEALTH | DAMAGE_OVER_TIME) {
        let dot = world.get_damage_over_time(entity).unwrap();
        if let Some(health) = world.get_health_mut(entity) {
            health.current -= dot.damage_per_second * world.resources.window.timing.delta_time;
        }
    }
}
```

## Component Flags

Each component type has a corresponding bitflag for efficient queries:

```rust
pub const LOCAL_TRANSFORM: ComponentFlags = 1 << 0;
pub const GLOBAL_TRANSFORM: ComponentFlags = 1 << 1;
pub const RENDER_MESH: ComponentFlags = 1 << 2;
pub const MATERIAL_REF: ComponentFlags = 1 << 3;
pub const CAMERA: ComponentFlags = 1 << 4;
pub const LIGHT: ComponentFlags = 1 << 5;
```

Combine flags with bitwise OR:

```rust
const RENDERABLE: ComponentFlags = LOCAL_TRANSFORM | GLOBAL_TRANSFORM | RENDER_MESH | MATERIAL_REF;

let entity = world.spawn_entities(RENDERABLE, 1)[0];
```

## Working with Components

### Setting Components

```rust
world.set_local_transform(entity, LocalTransform {
    translation: Vec3::new(0.0, 5.0, 0.0),
    rotation: Quat::identity(),
    scale: Vec3::new(1.0, 1.0, 1.0),
});

world.set_render_mesh(entity, RenderMesh {
    name: "cube".to_string(),
    id: None,
});
```

### Getting Components (Immutable)

```rust
if let Some(transform) = world.get_local_transform(entity) {
    let position = transform.translation;
}
```

### Getting Components (Mutable)

```rust
if let Some(transform) = world.get_local_transform_mut(entity) {
    transform.translation.y += 1.0;
}
```

### Checking Component Presence

```rust
if world.has_components(entity, RENDER_MESH) {
}
```

## Entity Hierarchy

Entities can form parent-child relationships:

```rust
use nightshade::ecs::transform::components::Parent;

world.update_parent(child_entity, Some(Parent(Some(parent_entity))));

world.update_parent(child_entity, Some(Parent(None)));

if let Some(children) = world.resources.children_cache.get(&parent_entity) {
    for child in children {
    }
}
```

Child transforms are relative to their parent. The engine automatically propagates transforms through the hierarchy.

## Custom Game ECS

For complex games, define a separate ECS for game-specific data:

```rust
use freecs::ecs;

ecs! {
    GameWorld {
        components {
            player_state: PlayerState => PLAYER_STATE,
            inventory: Inventory => INVENTORY,
            health: Health => HEALTH,
            enemy_ai: EnemyAI => ENEMY_AI,
        },
        resources {
            game_time: GameTime,
            score: u32,
            level: u32,
        }
    }
}
```

Then use both worlds together:

```rust
pub struct MyGame {
    game: GameWorld,
}

impl State for MyGame {
    fn run_systems(&mut self, world: &mut World) {
        update_player(&mut self.game);

        sync_positions(&self.game, world);
    }
}
```
