# Tags, Events & Commands

This chapter covers the communication and deferred-operation patterns in Nightshade's ECS.

## Event Bus

The event bus provides decoupled communication between systems via `world.resources.event_bus`:

```rust
pub struct EventBus {
    pub messages: VecDeque<Message>,
}

pub enum Message {
    Input { event: InputEvent },
    App {
        type_name: &'static str,
        payload: Box<dyn Any + Send + Sync>,
    },
}
```

### Publishing Events

Define event structs and publish them:

```rust
pub struct EnemyDied {
    pub entity: Entity,
    pub position: Vec3,
}

pub struct ItemPickedUp {
    pub item_type: ItemType,
    pub quantity: u32,
}

fn combat_system(world: &mut World) {
    for enemy in world.query_entities(ENEMY | HEALTH) {
        let health = world.get_health(enemy).unwrap();
        if health.current <= 0.0 {
            let position = world.get_global_transform(enemy)
                .map(|t| t.0.column(3).xyz())
                .unwrap_or(Vec3::zeros());

            publish_app_event(world, EnemyDied {
                entity: enemy,
                position,
            });

            world.despawn_entities(&[enemy]);
        }
    }
}
```

### Consuming Events

Process events in your game loop:

```rust
fn run_systems(&mut self, world: &mut World) {
    while let Some(msg) = world.resources.event_bus.messages.pop_front() {
        match msg {
            Message::App { payload, .. } => {
                if let Some(died) = payload.downcast_ref::<EnemyDied>() {
                    self.handle_enemy_death(world, died);
                }
                if let Some(pickup) = payload.downcast_ref::<ItemPickedUp>() {
                    self.update_inventory(pickup);
                }
            }
            Message::Input { event } => {
                self.handle_input_event(event);
            }
        }
    }
}
```

### Event Patterns

Events enable one-to-many communication without coupling:

```rust
// One system publishes
publish_app_event(world, DoorOpened { door_id: 42 });

// Multiple handlers respond independently
if let Some(door) = payload.downcast_ref::<DoorOpened>() {
    trigger_cutscene(world, door.door_id);
}

if let Some(door) = payload.downcast_ref::<DoorOpened>() {
    play_door_sound(world, door.door_id);
}
```

## World Commands

Commands are deferred operations that require GPU access or must happen at a specific point in the frame. They are queued during `run_systems` and processed later during the render phase.

```rust
world.queue_command(WorldCommand::LoadTexture {
    name: "brick".to_string(),
    rgba_data: texture_bytes,
    width: 512,
    height: 512,
});

world.queue_command(WorldCommand::DespawnRecursive { entity });
world.queue_command(WorldCommand::LoadHdrSkybox { hdr_data });
world.queue_command(WorldCommand::CaptureScreenshot { path: None });
```

### Available Commands

| Command | Description |
|---------|-------------|
| `LoadTexture` | Upload RGBA texture data to the GPU |
| `DespawnRecursive` | Remove entity and all children |
| `LoadHdrSkybox` | Load an HDR environment map |
| `CaptureScreenshot` | Save the next frame to a PNG |

### Immediate vs Deferred

For operations that don't need GPU access, use immediate functions:

```rust
// Immediate - happens right now
world.despawn_entities(&[entity]);
despawn_recursive_immediate(world, entity);

// Deferred - happens during render phase
world.queue_command(WorldCommand::DespawnRecursive { entity });
```

## State Trait Event Handling

The `State` trait provides a dedicated `handle_event` method for processing event bus messages:

```rust
fn handle_event(&mut self, world: &mut World, message: &Message) {
    match message {
        Message::App { payload, .. } => {
            if let Some(event) = payload.downcast_ref::<MyEvent>() {
                self.process_event(world, event);
            }
        }
        _ => {}
    }
}
```

This is called by the engine after `run_systems` during the event dispatch phase of the frame lifecycle.

## Input Events

The event bus also carries input events:

```rust
pub enum InputEvent {
    KeyboardInput { key_code: u32, state: KeyState },
    GamepadConnected { gamepad_id: usize },
    GamepadDisconnected { gamepad_id: usize },
}

pub enum KeyState {
    Pressed,
    Released,
}
```

## Best Practices

1. Keep events small - only include necessary data
2. Process events each frame - don't let the queue grow unbounded
3. Avoid circular events - A handling B which triggers A causes infinite loops
4. Use commands for GPU operations, immediate functions for pure ECS operations
