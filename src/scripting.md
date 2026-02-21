# Scripting

> **Live Demo:** [Block Breaker with Scripts](https://matthewberger.dev/nightshade/block_breaker_scripts)

Nightshade supports runtime scripting using [Rhai](https://rhai.rs/), an embedded scripting language for Rust. Scripts run each frame and communicate with the engine through scope variables — reading entity transforms, input state, and time, then writing back updated positions, rotations, and commands.

## Enabling Scripting

Add the `scripting` feature:

```toml
nightshade = { git = "...", features = ["engine", "scripting"] }
```

## Script Component

```rust
pub struct Script {
    pub source: ScriptSource,
    pub enabled: bool,
}

pub enum ScriptSource {
    File { path: String },
    Embedded { source: String },
}
```

Scripts can be loaded from a file path (with hot-reloading on native) or embedded as a string:

```rust
let script = Script::from_source(r#"
    pos_x += dt * 5.0;
"#);

let script = Script::from_file("scripts/enemy.rhai");
```

## Attaching Scripts to Entities

```rust
let entity = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | SCRIPT,
    1
)[0];

world.set_script(entity, Script::from_source(r#"
    pos_y = (time * 2.0).sin() + 1.0;
"#));
```

Scripts are disabled by default. Enable them to start execution:

```rust
if let Some(script) = world.get_script_mut(entity) {
    script.enabled = true;
}
```

## Scope Variables

Scripts communicate with the engine entirely through variables injected into the Rhai scope. The system reads these variables after script execution to apply changes.

### Transform Variables

Read and write the entity's local transform:

| Variable | Type | Description |
|----------|------|-------------|
| `pos_x`, `pos_y`, `pos_z` | `f64` | Entity position |
| `rot_x`, `rot_y`, `rot_z` | `f64` | Entity rotation (Euler angles in radians) |
| `scale_x`, `scale_y`, `scale_z` | `f64` | Entity scale |

Changes are only applied if the values actually differ from the current transform (compared with epsilon tolerance).

### Time Variables

| Variable | Type | Description |
|----------|------|-------------|
| `dt` / `delta_time` | `f64` | Frame delta time in seconds |
| `time` | `f64` | Accumulated total time since scripts started |

### Input Variables

| Variable | Type | Description |
|----------|------|-------------|
| `mouse_x`, `mouse_y` | `f64` | Current mouse position |
| `pressed_keys` | `Array` | Currently held key names (e.g., `["W", "SPACE"]`) |
| `just_pressed_keys` | `Array` | Keys pressed this frame (not held from previous) |

Key names are uppercase strings: `A`-`Z`, `0`-`9`, `SPACE`, `ENTER`, `ESCAPE`, `SHIFT`, `CTRL`, `ALT`, `TAB`, `BACKSPACE`, `UP`, `DOWN`, `LEFT`, `RIGHT`.

### Entity Access

| Variable | Type | Description |
|----------|------|-------------|
| `entity_id` | `i64` | This entity's ID (constant) |
| `entities` | `Map` | Named entities with their positions and scales |
| `entity_names` | `Array` | List of all named entity names |

Access other entities by name:

```rhai
let player = entities["Player"];
let player_x = player.x;
let player_y = player.y;
let player_z = player.z;
```

### Game State

A shared `state` map persists across frames and is accessible to all scripts:

```rhai
state["score"] = state["score"] + 1.0;
state["game_over"] = 1.0;
```

State values are `f64`. The state map is shared across all script entities.

### Spawning and Despawning

Set these variables to spawn or despawn entities:

| Variable | Type | Description |
|----------|------|-------------|
| `do_spawn_cube` | `bool` | Spawn a cube at `(spawn_cube_x/y/z)` |
| `spawn_cube_x/y/z` | `f64` | Spawn position for cube |
| `do_spawn_sphere` | `bool` | Spawn a sphere at `(spawn_sphere_x/y/z)` |
| `spawn_sphere_x/y/z` | `f64` | Spawn position for sphere |
| `do_despawn` | `bool` | Despawn this entity |
| `despawn_names` | `Array` | Names of other entities to despawn |

## Example Scripts

### Moving Object

```rhai
let speed = 5.0;
pos_x += speed * dt;

if pos_x > 10.0 {
    pos_x = -10.0;
}
```

### Keyboard Control

```rhai
let speed = 8.0;

if pressed_keys.contains("W") { pos_z -= speed * dt; }
if pressed_keys.contains("S") { pos_z += speed * dt; }
if pressed_keys.contains("A") { pos_x -= speed * dt; }
if pressed_keys.contains("D") { pos_x += speed * dt; }

if just_pressed_keys.contains("SPACE") {
    do_spawn_sphere = true;
    spawn_sphere_x = pos_x;
    spawn_sphere_y = pos_y + 1.0;
    spawn_sphere_z = pos_z;
}
```

### Follow Player

```rhai
let speed = 3.0;

if "Player" in entities {
    let player = entities["Player"];
    let dx = player.x - pos_x;
    let dz = player.z - pos_z;
    let dist = (dx * dx + dz * dz).sqrt();

    if dist > 1.0 {
        pos_x += (dx / dist) * speed * dt;
        pos_z += (dz / dist) * speed * dt;
    }
}
```

### Rotating Object

```rhai
let rotation_speed = 1.0;
rot_y += rotation_speed * dt;
```

### Bobbing Animation

```rhai
let amplitude = 0.5;
let frequency = 2.0;
pos_y = 1.0 + (time * frequency).sin() * amplitude;
```

### Scorekeeping

```rhai
if !("score" in state) {
    state["score"] = 0.0;
}

if just_pressed_keys.contains("E") {
    state["score"] = state["score"] + 10.0;
}
```

### Despawning Named Entities

```rhai
if just_pressed_keys.contains("X") {
    despawn_names.push("Enemy_1");
    despawn_names.push("Enemy_2");
}
```

## Script Runtime

The `ScriptRuntime` manages compilation, caching, and execution:

```rust
pub struct ScriptRuntime {
    pub engine: rhai::Engine,
    pub game_state: HashMap<String, f64>,
}
```

The engine automatically runs scripts each frame via the `FrameSchedule`. The scripting system is registered as `system_names::RUN_SCRIPTS` and executes after physics but before animation. No manual call is needed — attaching a `Script` component to an entity and setting `enabled = true` is sufficient.

### Script Compilation

Scripts are compiled to AST on first execution and cached by a hash of the source code. Recompilation only occurs when the source changes. For file-based scripts, modification times are tracked and the script is automatically recompiled when the file changes (hot-reloading on native only).

### Custom Functions

Register additional Rhai functions:

```rust
runtime.engine.register_fn("custom_function", |x: i64, y: i64| {
    x + y
});
```

### Game State

The runtime's `game_state` map is injected into every script's scope as the `state` variable. Values persist across frames:

```rust
runtime.set_state("difficulty".to_string(), 1.0);
let score = runtime.get_state("score");
runtime.reset_game_state();
```

## Hot Reloading

On native platforms, file-based scripts are automatically hot-reloaded when modified. The runtime tracks file modification times and invalidates the compiled cache when changes are detected. This allows editing scripts in an external editor while the game is running.
