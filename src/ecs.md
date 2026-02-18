# Entity Component System

Nightshade uses **freecs**, a compile-time code-generated ECS with struct-of-arrays (SoA) storage. freecs generates all entity management, component storage, and query methods at compile time via the `ecs!` macro, with zero `unsafe` code.

## What is an ECS?

An Entity Component System separates data from behavior:

- **Entities** are unique identifiers (IDs). They have no data of their own.
- **Components** are plain data structs attached to entities. Each component type is stored in its own contiguous array.
- **Systems** are functions that query entities by their component masks and process matching entities.

This is fundamentally different from object-oriented game architectures where a `GameObject` class owns its data and behavior through inheritance. The OOP approach leads to deep inheritance hierarchies (the "diamond problem"), poor cache locality (objects scattered across the heap), and rigid coupling between data and logic. ECS inverts this: data is organized by type, not by object, and logic operates on slices of data rather than individual objects.

## How Archetype Storage Works

freecs uses **archetype-based SoA (struct-of-arrays) storage**. To understand why this matters, consider how data layouts affect performance.

### Array of Structs vs Struct of Arrays

In a traditional OOP game, entities are stored as an **array of structs (AoS)**:

```
Memory: [Entity0{pos,vel,hp,mesh}] [Entity1{pos,vel,hp,mesh}] [Entity2{pos,vel,hp,mesh}]
```

When a system iterates over all positions, it loads entire entity structs into cache lines even though it only needs the `pos` field. The rest is wasted bandwidth.

In **SoA storage**, each component type gets its own contiguous array:

```
Positions:  [pos0] [pos1] [pos2] [pos3] ...
Velocities: [vel0] [vel1] [vel2] [vel3] ...
Health:     [hp0]  [hp1]  [hp2]  [hp3]  ...
```

Now a system iterating over positions reads a dense, contiguous block of memory. Every byte loaded into a cache line is useful. This can be 5-10x faster for large entity counts due to CPU cache prefetching.

### Archetype Tables

Not every entity has the same components. An entity with `Position | Velocity` is different from one with `Position | Velocity | Health`. freecs groups entities by their **component mask** (the exact set of components they have) into **archetype tables**.

Each table stores only entities with identical component masks. Within a table, components are stored in SoA layout:

```
Table A (mask: Position | Velocity):
  positions:  [p0, p1, p2]
  velocities: [v0, v1, v2]

Table B (mask: Position | Velocity | Health):
  positions:  [p3, p4]
  velocities: [v3, v4]
  healths:    [h3, h4]
```

When querying for `Position | Velocity`, the ECS checks each table's mask with a single bitwise AND. Table A matches, Table B also matches (it has a superset of the requested components). Tables whose masks don't include all requested components are skipped entirely without examining any entities.

### Component Masks as Bitflags

Each component is assigned a bit position at compile time. An entity's component mask is a single integer where bit N is set if the entity has component N:

```
LOCAL_TRANSFORM    = 0b0001
GLOBAL_TRANSFORM   = 0b0010
RENDER_MESH        = 0b0100
MATERIAL_REF       = 0b1000
```

Querying `query_entities(RENDER_MESH | LOCAL_TRANSFORM)` becomes `table_mask & query_mask == query_mask`, which is two CPU instructions (AND + CMP). This is why ECS queries scale to millions of entities.

## Why freecs?

freecs generates all ECS infrastructure at compile time from a single macro invocation. This means:

- **No runtime overhead** for component lookups - everything is statically dispatched, no vtables, no hash lookups
- **SoA storage** - components of the same type are stored in contiguous arrays, optimal for CPU cache utilization
- **Archetype tables** - entities with the same component mask share a table, so queries skip irrelevant entities entirely
- **Zero `unsafe`** - the generated code uses only safe Rust
- **Bitflag queries** - component presence is checked with bitmask operations, which is a single CPU instruction
- **Compile-time monomorphization** - accessor methods like `get_local_transform()` compile down to a direct array index with no indirection

## Quick Overview

```rust
use nightshade::prelude::*;

// Spawn an entity with transform and mesh components
let entity = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | RENDER_MESH | MATERIAL_REF,
    1,
)[0];

// Set component values
world.set_local_transform(entity, LocalTransform {
    translation: Vec3::new(0.0, 5.0, 0.0),
    rotation: Quat::identity(),
    scale: Vec3::new(1.0, 1.0, 1.0),
});
world.set_render_mesh(entity, RenderMesh {
    name: "cube".to_string(),
    id: None,
});
world.set_material_ref(entity, MaterialRef::new("Default"));

// Query all entities with a specific set of components
for entity in world.query_entities(RENDER_MESH | LOCAL_TRANSFORM) {
    let transform = world.get_local_transform(entity).unwrap();
    let mesh = world.get_render_mesh(entity).unwrap();
}
```

## Component Flags

Each component has a corresponding bitflag constant. Combine flags with `|` to describe which components an entity has:

```rust
const RENDERABLE: ComponentFlags =
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | RENDER_MESH | MATERIAL_REF;

let entity = world.spawn_entities(RENDERABLE, 1)[0];
```

The full list of built-in component flags is in the [Components](components.md) chapter.

## Custom Game ECS

For complex games, define a separate ECS for game-specific data:

```rust
use freecs::ecs;

ecs! {
    GameWorld {
        player_state: PlayerState => PLAYER_STATE,
        inventory: Inventory => INVENTORY,
        health: Health => HEALTH,
        enemy_ai: EnemyAI => ENEMY_AI,
    }
    Resources {
        game_time: GameTime,
        score: u32,
        level: u32,
    }
}
```

Then use both worlds together in your State:

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

## Chapter Guide

- [The freecs Macro](ecs-macro.md) - Full macro syntax and what gets generated
- [Entities](entities.md) - Spawning, despawning, and entity IDs
- [Components](components.md) - All 48 built-in components
- [Queries & Iteration](queries.md) - Querying and iterating over entities
- [Resources](ecs-resources.md) - Global singleton data
- [Tags, Events & Commands](tags-events-commands.md) - Events, command buffers, and deferred operations
