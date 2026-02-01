# Event System

Nightshade provides an event bus for decoupled communication between systems. Events are published to a queue and consumed by interested systems.

## EventBus

The event bus is accessible through `world.resources.event_bus`:

```rust
pub struct EventBus {
    pub messages: VecDeque<Message>,
}

pub enum Message {
    Input(InputMessage),
    App(Box<dyn Any + Send + Sync>),
}
```

## Defining Custom Events

Create a struct for your event:

```rust
pub struct EnemyDied {
    pub entity: Entity,
    pub position: Vec3,
    pub killer: Option<Entity>,
}

pub struct PlayerLeveledUp {
    pub new_level: u32,
    pub skills_unlocked: Vec<String>,
}

pub struct ItemPickedUp {
    pub item_type: ItemType,
    pub quantity: u32,
}
```

## Publishing Events

Use `publish_app_event` to send events:

```rust
fn combat_system(world: &mut World, game: &mut GameState) {
    for enemy in world.query(ENEMY | HEALTH) {
        let health = world.get_health(enemy).unwrap();
        if health.current <= 0 {
            let position = world.get_global_transform(enemy)
                .map(|t| t.matrix.column(3).xyz())
                .unwrap_or(Vec3::zeros());

            publish_app_event(world, EnemyDied {
                entity: enemy,
                position,
                killer: game.last_attacker,
            });

            world.despawn(enemy);
        }
    }
}
```

## Consuming Events

Process events in your game loop:

```rust
fn run_systems(&mut self, world: &mut World) {
    while let Some(msg) = world.resources.event_bus.messages.pop_front() {
        match msg {
            Message::App(event) => {
                if let Some(died) = event.downcast_ref::<EnemyDied>() {
                    self.handle_enemy_death(world, died);
                }
                if let Some(levelup) = event.downcast_ref::<PlayerLeveledUp>() {
                    self.show_levelup_ui(levelup);
                }
                if let Some(pickup) = event.downcast_ref::<ItemPickedUp>() {
                    self.update_inventory(pickup);
                }
            }
            Message::Input(input_msg) => {
                self.handle_input_message(input_msg);
            }
        }
    }
}

fn handle_enemy_death(&mut self, world: &mut World, event: &EnemyDied) {
    spawn_explosion_effect(world, event.position);
    play_sound(world, "enemy_death", PlaybackSettings::default());
    self.score += 100;
    self.enemies_killed += 1;
}
```

## Event Patterns

### One-to-Many Communication

Events allow one system to notify multiple listeners without direct coupling:

```rust
publish_app_event(world, DoorOpened { door_id: 42 });
```

```rust
if let Some(door) = event.downcast_ref::<DoorOpened>() {
    trigger_cutscene(world, door.door_id);
}

if let Some(door) = event.downcast_ref::<DoorOpened>() {
    play_door_sound(world, door.door_id);
}

if let Some(door) = event.downcast_ref::<DoorOpened>() {
    update_minimap(world, door.door_id);
}
```

### Deferred Actions

Events let you schedule actions without immediate execution:

```rust
pub struct SpawnEnemy {
    pub enemy_type: EnemyType,
    pub position: Vec3,
    pub delay_frames: u32,
}

fn wave_spawner_system(world: &mut World, pending: &mut Vec<SpawnEnemy>) {
    pending.retain_mut(|spawn| {
        if spawn.delay_frames == 0 {
            spawn_enemy(world, spawn.enemy_type, spawn.position);
            false
        } else {
            spawn.delay_frames -= 1;
            true
        }
    });
}
```

### Request-Response Pattern

For queries that need responses, use a shared resource:

```rust
pub struct DamageRequest {
    pub target: Entity,
    pub amount: f32,
    pub damage_type: DamageType,
}

pub struct DamageResult {
    pub target: Entity,
    pub actual_damage: f32,
    pub killed: bool,
}

fn damage_system(world: &mut World, requests: &[DamageRequest]) -> Vec<DamageResult> {
    requests.iter().map(|req| {
        let actual = apply_damage(world, req.target, req.amount, req.damage_type);
        let killed = is_dead(world, req.target);
        DamageResult {
            target: req.target,
            actual_damage: actual,
            killed,
        }
    }).collect()
}
```

## Input Messages

The event bus also handles input-related messages:

```rust
pub enum InputMessage {
    KeyPressed(KeyCode),
    KeyReleased(KeyCode),
    MouseMoved { x: f32, y: f32 },
    MouseButton { button: MouseButton, pressed: bool },
    GamepadButton { button: GamepadButton, pressed: bool },
}
```

## Best Practices

1. **Keep events small**: Only include necessary data
2. **Use descriptive names**: `PlayerDied` not `Event1`
3. **Process events each frame**: Don't let the queue grow unbounded
4. **Consider event ordering**: Events are processed in FIFO order
5. **Avoid circular events**: A handling B which triggers A can cause infinite loops
