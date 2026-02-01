# Scripting

> **Live Demo:** [Block Breaker with Scripts](https://matthewberger.dev/nightshade/block_breaker_scripts)

Nightshade supports runtime scripting using [Rhai](https://rhai.rs/), an embedded scripting language for Rust.

## Enabling Scripting

Add the `scripting` feature:

```toml
nightshade = { git = "...", features = ["engine", "scripting"] }
```

## Script Component

```rust
pub struct Script {
    pub code: String,
    pub compiled: Option<rhai::AST>,
}
```

## Attaching Scripts to Entities

```rust
let entity = world.spawn_entities(LOCAL_TRANSFORM | GLOBAL_TRANSFORM | SCRIPT, 1)[0];

world.set_script(entity, Script {
    code: r#"
        fn update(dt) {
            let pos = get_position(self);
            set_position(self, pos.x + dt, pos.y, pos.z);
        }
    "#.to_string(),
    compiled: None,
});
```

## Script API

Scripts have access to engine functions:

### Transform Functions

```rust
let pos = get_position(entity);
set_position(entity, x, y, z);

let rot = get_rotation(entity);
set_rotation(entity, x, y, z, w);

let scale = get_scale(entity);
set_scale(entity, x, y, z);
```

### Entity Functions

```rust
let new_entity = spawn_entity("cube", x, y, z);

despawn_entity(entity);

let parent = get_parent(entity);
set_parent(child, parent);
```

### Component Access

```rust
let health = get_component(entity, "health");
set_component(entity, "health", health - 10);

let has_enemy = has_component(entity, "enemy");
```

### Audio

```rust
play_sound("explosion");
play_sound_at(entity, "footstep");
stop_sound(entity);
```

### Physics

```rust
apply_impulse(entity, x, y, z);
apply_force(entity, x, y, z);
set_velocity(entity, x, y, z);
let vel = get_velocity(entity);
```

### Input

```rust
let pressed = is_key_pressed("W");
let just_pressed = is_key_just_pressed("Space");
let mouse_x = get_mouse_x();
let mouse_y = get_mouse_y();
let left_click = is_mouse_pressed("Left");
```

### Math

```rust
let dist = distance(x1, y1, z1, x2, y2, z2);
let lerped = lerp(a, b, t);
let clamped = clamp(value, min, max);
let rand = random();
let rand_range = random_range(min, max);
```

## Script Lifecycle

### update(dt)

Called every frame:

```rust
world.set_script(entity, Script {
    code: r#"
        fn update(dt) {
            // Move forward
            let pos = get_position(self);
            let speed = 5.0;
            set_position(self, pos.x + speed * dt, pos.y, pos.z);
        }
    "#.to_string(),
    compiled: None,
});
```

### on_collision(other)

Called when colliding with another entity:

```rust
world.set_script(entity, Script {
    code: r#"
        fn on_collision(other) {
            if has_component(other, "player") {
                play_sound("pickup");
                despawn_entity(self);
            }
        }
    "#.to_string(),
    compiled: None,
});
```

### on_trigger_enter(other) / on_trigger_exit(other)

Called when entering/exiting a trigger volume:

```rust
world.set_script(trigger, Script {
    code: r#"
        fn on_trigger_enter(other) {
            if has_component(other, "player") {
                open_door();
            }
        }

        fn on_trigger_exit(other) {
            if has_component(other, "player") {
                close_door();
            }
        }
    "#.to_string(),
    compiled: None,
});
```

## Example Scripts

### Rotating Object

```rust
r#"
    let rotation_speed = 1.0;

    fn update(dt) {
        let rot = get_rotation(self);
        let angle = rotation_speed * dt;
        rotate_y(self, angle);
    }
"#
```

### Follow Player

```rust
r#"
    let speed = 3.0;
    let player = null;

    fn init() {
        player = find_entity("Player");
    }

    fn update(dt) {
        if player == null { return; }

        let my_pos = get_position(self);
        let player_pos = get_position(player);

        let dx = player_pos.x - my_pos.x;
        let dz = player_pos.z - my_pos.z;
        let dist = sqrt(dx * dx + dz * dz);

        if dist > 1.0 {
            let nx = dx / dist;
            let nz = dz / dist;
            set_position(self,
                my_pos.x + nx * speed * dt,
                my_pos.y,
                my_pos.z + nz * speed * dt
            );
        }
    }
"#
```

### Patrol Between Points

```rust
r#"
    let waypoints = [];
    let current_waypoint = 0;
    let speed = 2.0;
    let threshold = 0.5;

    fn init() {
        waypoints = [
            [0.0, 0.0, 0.0],
            [10.0, 0.0, 0.0],
            [10.0, 0.0, 10.0],
            [0.0, 0.0, 10.0]
        ];
    }

    fn update(dt) {
        let pos = get_position(self);
        let target = waypoints[current_waypoint];

        let dx = target[0] - pos.x;
        let dz = target[2] - pos.z;
        let dist = sqrt(dx * dx + dz * dz);

        if dist < threshold {
            current_waypoint = (current_waypoint + 1) % waypoints.len();
        } else {
            let nx = dx / dist;
            let nz = dz / dist;
            set_position(self,
                pos.x + nx * speed * dt,
                pos.y,
                pos.z + nz * speed * dt
            );
        }
    }
"#
```

### Health Pickup

```rust
r#"
    let heal_amount = 25;
    let respawn_time = 10.0;
    let timer = 0.0;
    let active = true;

    fn update(dt) {
        if !active {
            timer -= dt;
            if timer <= 0.0 {
                active = true;
                set_visible(self, true);
            }
        }
    }

    fn on_trigger_enter(other) {
        if !active { return; }

        if has_component(other, "player") {
            let health = get_component(other, "health");
            set_component(other, "health", health + heal_amount);
            play_sound("heal");

            active = false;
            timer = respawn_time;
            set_visible(self, false);
        }
    }
"#
```

## Script Runtime

The script runtime manages compilation and execution:

```rust
pub struct ScriptRuntime {
    engine: rhai::Engine,
    scope: rhai::Scope<'static>,
}
```

### Registering Custom Functions

```rust
runtime.engine.register_fn("custom_function", |x: i64, y: i64| {
    x + y
});
```

### Global Variables

```rust
runtime.scope.push("game_difficulty", 1);
runtime.scope.push("player_score", 0);
```

## Debugging Scripts

### Print Statements

```rust
r#"
    fn update(dt) {
        print("Entity position: " + get_position(self).x);
    }
"#
```

### Error Handling

Script errors are logged to the console:

```
[ERROR] Script error in entity 42: Variable 'undefined_var' not found
```

## Performance Tips

- Scripts are compiled once and reused
- Avoid heavy computation in update()
- Use native Rust for performance-critical code
- Minimize entity queries in scripts
