# Tutorial: Building a Terminal Game

This tutorial walks through building a Snake game that runs entirely in the terminal. Nightshade's TUI framework provides an ECS, double-buffered rendering, input handling, and collision detection — the same architecture as the 3D engine, but rendering characters instead of meshes.

## Project Setup

```bash
cargo init terminal-snake
```

`Cargo.toml`:

```toml
[package]
name = "terminal-snake"
version = "0.1.0"
edition = "2024"

[dependencies]
nightshade = { git = "https://github.com/user/nightshade", features = ["terminal"] }
rand = "0.9"
```

The `terminal` feature enables the crossterm-based terminal renderer. No GPU, no window — just your terminal emulator.

## Step 1: The Empty Terminal App

```rust
use nightshade::tui::prelude::*;

struct SnakeGame;

impl State for SnakeGame {
    fn title(&self) -> &str {
        "Snake"
    }

    fn initialize(&mut self, world: &mut World) {
        world.resources.timing.target_fps = 60;
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    launch(Box::new(SnakeGame))
}
```

The TUI `State` trait mirrors the 3D engine's trait:
- `initialize` — called once at startup
- `run_systems` — called every frame
- `on_keyboard_input` — key press/release events
- `next_state` — state transitions (title screen → gameplay → game over)

`launch` takes a `Box<dyn State>`, enters raw terminal mode, hides the cursor, enables mouse capture, and runs the game loop. On exit (or panic), it restores the terminal.

## Step 2: The TUI ECS

The TUI has its own ECS with components designed for character-cell rendering:

| Component | Flag | Description |
|-----------|------|-------------|
| `Position` | `POSITION` | Column/row coordinates (f64 for sub-cell movement) |
| `Velocity` | `VELOCITY` | Column/row per tick (used by `movement_system`) |
| `Sprite` | `SPRITE` | Single character with foreground/background color |
| `Label` | `LABEL` | Multi-character text string |
| `Tilemap` | `TILEMAP` | Grid of characters for larger structures |
| `Collider` | `COLLIDER` | AABB collision box (width, height, layer, mask) |
| `ZIndex` | `Z_INDEX` | Render ordering (higher = on top) |
| `Visibility` | `VISIBILITY` | Show/hide toggle |
| `Parent` | `PARENT` | Parent entity reference |
| `LocalOffset` | `LOCAL_OFFSET` | Offset from parent position |
| `Name` | `NAME` | Entity name string |
| `SpriteAnimation` | `SPRITE_ANIMATION` | Frame-based character animation |

Resources are accessed through `world.resources`:

| Resource | Description |
|----------|-------------|
| `terminal_size` | Current terminal dimensions (columns, rows) |
| `timing` | `delta_seconds`, `elapsed`, `frame_count`, `target_fps` |
| `keyboard` | `is_pressed()`, `is_just_pressed()`, `is_just_released()` |
| `mouse` | Position, button states, scroll delta |
| `camera` | Viewport offset (offset_column, offset_row) |
| `should_exit` | Set to `true` to quit |

## Step 3: Game State

```rust
use nightshade::tui::prelude::*;
use rand::Rng;

const BOARD_WIDTH: i32 = 40;
const BOARD_HEIGHT: i32 = 20;
const TICK_INTERVAL: f64 = 0.12;

#[derive(Clone, Copy, PartialEq, Eq)]
enum Direction {
    Up,
    Down,
    Left,
    Right,
}

struct SnakeGame {
    segments: Vec<(i32, i32)>,
    direction: Direction,
    next_direction: Direction,
    food_position: (i32, i32),
    score: u32,
    game_over: bool,
    tick_timer: f64,
    board_offset_x: i32,
    board_offset_y: i32,
    segment_entities: Vec<Entity>,
    food_entity: Option<Entity>,
    wall_entities: Vec<Entity>,
    score_entities: Vec<Entity>,
}

impl SnakeGame {
    fn new() -> Self {
        Self {
            segments: vec![(BOARD_WIDTH / 2, BOARD_HEIGHT / 2)],
            direction: Direction::Right,
            next_direction: Direction::Right,
            food_position: (0, 0),
            score: 0,
            game_over: false,
            tick_timer: 0.0,
            board_offset_x: 0,
            board_offset_y: 0,
            segment_entities: Vec::new(),
            food_entity: None,
            wall_entities: Vec::new(),
            score_entities: Vec::new(),
        }
    }
}
```

The snake is a `Vec<(i32, i32)>` of grid positions. The head is `segments[0]`. Each frame the game logic ticks on a fixed interval — the tick timer accumulates `delta_seconds` and advances the snake when it exceeds `TICK_INTERVAL`.

## Step 4: Drawing the Board

```rust
impl SnakeGame {
    fn spawn_walls(&mut self, world: &mut World) {
        for column in 0..BOARD_WIDTH {
            self.spawn_wall_cell(world, column, 0, '=');
            self.spawn_wall_cell(world, column, BOARD_HEIGHT - 1, '=');
        }

        for row in 1..(BOARD_HEIGHT - 1) {
            self.spawn_wall_cell(world, 0, row, '|');
            self.spawn_wall_cell(world, BOARD_WIDTH - 1, row, '|');
        }
    }

    fn spawn_wall_cell(&mut self, world: &mut World, column: i32, row: i32, character: char) {
        let entity = world.spawn_entities(POSITION | SPRITE | Z_INDEX, 1)[0];
        world.set_position(entity, Position {
            column: (self.board_offset_x + column) as f64,
            row: (self.board_offset_y + row) as f64,
        });
        world.set_sprite(entity, Sprite {
            character,
            foreground: TermColor::Grey,
            background: TermColor::Black,
        });
        world.set_z_index(entity, ZIndex(1));
        self.wall_entities.push(entity);
    }
}
```

Each wall cell is its own entity with a `Position`, `Sprite`, and `ZIndex`. The `Position` uses f64 coordinates — for grid-based games, cast to integer. The `ZIndex` determines draw order when entities overlap.

## Step 5: Spawning the Snake and Food

```rust
impl SnakeGame {
    fn spawn_food(&mut self, world: &mut World) {
        let mut rng = rand::rng();
        loop {
            let column = rng.random_range(1..(BOARD_WIDTH - 1));
            let row = rng.random_range(1..(BOARD_HEIGHT - 1));

            if !self.segments.contains(&(column, row)) {
                self.food_position = (column, row);
                break;
            }
        }

        if let Some(entity) = self.food_entity {
            if let Some(position) = world.get_position_mut(entity) {
                position.column = (self.board_offset_x + self.food_position.0) as f64;
                position.row = (self.board_offset_y + self.food_position.1) as f64;
            }
        } else {
            let entity = world.spawn_entities(POSITION | SPRITE | Z_INDEX, 1)[0];
            world.set_position(entity, Position {
                column: (self.board_offset_x + self.food_position.0) as f64,
                row: (self.board_offset_y + self.food_position.1) as f64,
            });
            world.set_sprite(entity, Sprite {
                character: '*',
                foreground: TermColor::Red,
                background: TermColor::Black,
            });
            world.set_z_index(entity, ZIndex(2));
            self.food_entity = Some(entity);
        }
    }

    fn sync_snake_entities(&mut self, world: &mut World) {
        while self.segment_entities.len() > self.segments.len() {
            let entity = self.segment_entities.pop().unwrap();
            world.despawn_entities(&[entity]);
        }

        while self.segment_entities.len() < self.segments.len() {
            let entity = world.spawn_entities(POSITION | SPRITE | Z_INDEX, 1)[0];
            world.set_z_index(entity, ZIndex(3));
            self.segment_entities.push(entity);
        }

        for (index, &(column, row)) in self.segments.iter().enumerate() {
            let entity = self.segment_entities[index];
            world.set_position(entity, Position {
                column: (self.board_offset_x + column) as f64,
                row: (self.board_offset_y + row) as f64,
            });

            let (character, color) = if index == 0 {
                ('@', TermColor::Green)
            } else {
                ('o', TermColor::DarkGreen)
            };

            world.set_sprite(entity, Sprite {
                character,
                foreground: color,
                background: TermColor::Black,
            });
        }
    }
}
```

The snake head renders as `@` in bright green, body segments as `o` in dark green, and food as `*` in red. The entity list grows and shrinks to match the snake length — entities are spawned or despawned as needed.

## Step 6: Game Logic

```rust
impl SnakeGame {
    fn tick(&mut self, world: &mut World) {
        self.direction = self.next_direction;

        let (head_column, head_row) = self.segments[0];
        let (new_column, new_row) = match self.direction {
            Direction::Up => (head_column, head_row - 1),
            Direction::Down => (head_column, head_row + 1),
            Direction::Left => (head_column - 1, head_row),
            Direction::Right => (head_column + 1, head_row),
        };

        if new_column <= 0
            || new_column >= BOARD_WIDTH - 1
            || new_row <= 0
            || new_row >= BOARD_HEIGHT - 1
        {
            self.game_over = true;
            return;
        }

        if self.segments.contains(&(new_column, new_row)) {
            self.game_over = true;
            return;
        }

        self.segments.insert(0, (new_column, new_row));

        if (new_column, new_row) == self.food_position {
            self.score += 1;
            self.spawn_food(world);
        } else {
            self.segments.pop();
        }

        self.sync_snake_entities(world);
    }
}
```

Each tick: move the head one cell in the current direction, check for wall/self collision, and either grow (if eating food) or remove the tail. The `next_direction` buffer prevents reversing into yourself — it's set by input but only applied at tick time.

## Step 7: Input Handling

```rust
impl State for SnakeGame {
    fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, pressed: bool) {
        if !pressed {
            return;
        }

        match key {
            KeyCode::Up | KeyCode::Char('w') => {
                if self.direction != Direction::Down {
                    self.next_direction = Direction::Up;
                }
            }
            KeyCode::Down | KeyCode::Char('s') => {
                if self.direction != Direction::Up {
                    self.next_direction = Direction::Down;
                }
            }
            KeyCode::Left | KeyCode::Char('a') => {
                if self.direction != Direction::Right {
                    self.next_direction = Direction::Left;
                }
            }
            KeyCode::Right | KeyCode::Char('d') => {
                if self.direction != Direction::Left {
                    self.next_direction = Direction::Right;
                }
            }
            KeyCode::Escape | KeyCode::Char('q') => {
                world.resources.should_exit = true;
            }
            _ => {}
        }
    }
}
```

TUI key events use `KeyCode::Char('w')` for letter keys and `KeyCode::Up` for arrow keys. The `pressed` parameter distinguishes press from release. Setting `world.resources.should_exit = true` cleanly exits the game loop and restores the terminal.

## Step 8: Score Display

```rust
impl SnakeGame {
    fn update_score_display(&mut self, world: &mut World) {
        for &entity in &self.score_entities {
            world.despawn_entities(&[entity]);
        }
        self.score_entities.clear();

        let text = format!("Score: {}", self.score);
        let start_column = self.board_offset_x;
        let row = self.board_offset_y - 1;

        for (index, character) in text.chars().enumerate() {
            let entity = world.spawn_entities(POSITION | SPRITE | Z_INDEX, 1)[0];
            world.set_position(entity, Position {
                column: (start_column + index as i32) as f64,
                row: row as f64,
            });
            world.set_sprite(entity, Sprite {
                character,
                foreground: TermColor::White,
                background: TermColor::Black,
            });
            world.set_z_index(entity, ZIndex(10));
            self.score_entities.push(entity);
        }
    }
}
```

There's no built-in text rendering for the terminal — text is rendered character by character as individual `Sprite` entities. For text that changes every frame, despawn the old entities and spawn new ones. For static text, spawn once in `initialize`.

## Step 9: Putting It All Together

```rust
impl State for SnakeGame {
    fn title(&self) -> &str {
        "Snake"
    }

    fn initialize(&mut self, world: &mut World) {
        world.resources.timing.target_fps = 60;

        let terminal = world.resources.terminal_size;
        self.board_offset_x = (terminal.columns as i32 - BOARD_WIDTH) / 2;
        self.board_offset_y = (terminal.rows as i32 - BOARD_HEIGHT) / 2;
        if self.board_offset_x < 0 { self.board_offset_x = 0; }
        if self.board_offset_y < 1 { self.board_offset_y = 1; }

        self.spawn_walls(world);
        self.spawn_food(world);
        self.sync_snake_entities(world);
        self.update_score_display(world);
    }

    fn run_systems(&mut self, world: &mut World) {
        if self.game_over {
            return;
        }

        let delta = world.resources.timing.delta_seconds;
        self.tick_timer += delta;

        if self.tick_timer >= TICK_INTERVAL {
            self.tick_timer -= TICK_INTERVAL;
            self.tick(world);
            self.update_score_display(world);
        }
    }

    fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, pressed: bool) {
        // ... (from Step 7)
    }

    fn next_state(&mut self, world: &mut World) -> Option<Box<dyn State>> {
        if self.game_over {
            let score = self.score;
            let all_entities: Vec<Entity> = world.query_entities(POSITION | SPRITE).collect();
            world.despawn_entities(&all_entities);
            return Some(Box::new(GameOverState { score, restart: false }));
        }
        None
    }
}
```

The board is centered in the terminal using `world.resources.terminal_size`. The game ticks on a fixed interval (`TICK_INTERVAL = 0.12` seconds, about 8 moves per second), while the render loop runs at 60 FPS for smooth input response.

## Step 10: State Transitions

The `next_state` method enables screen transitions. Return `Some(Box::new(...))` to switch states:

```rust
struct GameOverState {
    score: u32,
    restart: bool,
}

impl State for GameOverState {
    fn title(&self) -> &str {
        "Snake - Game Over"
    }

    fn initialize(&mut self, world: &mut World) {
        world.resources.timing.target_fps = 30;

        let terminal = world.resources.terminal_size;
        let center_column = terminal.columns as i32 / 2;
        let center_row = terminal.rows as i32 / 2;

        let lines = [
            ("GAME OVER", TermColor::Red),
            ("", TermColor::Black),
            (&format!("Score: {}", self.score), TermColor::White),
            ("", TermColor::Black),
            ("Press R to restart", TermColor::White),
            ("Press ESC to quit", TermColor::Grey),
        ];

        for (line_index, (text, color)) in lines.iter().enumerate() {
            if text.is_empty() { continue; }
            let start_col = center_column - text.len() as i32 / 2;
            for (char_index, character) in text.chars().enumerate() {
                let entity = world.spawn_entities(POSITION | SPRITE | Z_INDEX, 1)[0];
                world.set_position(entity, Position {
                    column: (start_col + char_index as i32) as f64,
                    row: (center_row - 3 + line_index as i32) as f64,
                });
                world.set_sprite(entity, Sprite {
                    character,
                    foreground: *color,
                    background: TermColor::Black,
                });
                world.set_z_index(entity, ZIndex(10));
            }
        }
    }

    fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, pressed: bool) {
        if !pressed { return; }
        match key {
            KeyCode::Char('r') => self.restart = true,
            KeyCode::Escape | KeyCode::Char('q') => world.resources.should_exit = true,
            _ => {}
        }
    }

    fn next_state(&mut self, world: &mut World) -> Option<Box<dyn State>> {
        if self.restart {
            let all_entities: Vec<Entity> = world.query_entities(POSITION | SPRITE).collect();
            world.despawn_entities(&all_entities);
            return Some(Box::new(SnakeGame::new()));
        }
        None
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    launch(Box::new(SnakeGame::new()))
}
```

When transitioning, despawn all entities from the current state before returning the new state. The engine calls `initialize` on the new state with a fresh world (but the same world instance — entities persist unless you remove them).

## Available Colors

```rust
pub enum TermColor {
    Black, DarkGrey, Red, DarkRed, Green, DarkGreen,
    Yellow, DarkYellow, Blue, DarkBlue, Magenta, DarkMagenta,
    Cyan, DarkCyan, White, Grey,
    Rgb { r: u8, g: u8, b: u8 },
}
```

The 16 named colors work in all terminals. `Rgb` requires true-color terminal support (most modern terminals).

## Built-In Systems

The TUI framework provides these systems you can call in `run_systems`:

| System | Description |
|--------|-------------|
| `movement_system(world)` | Applies `Velocity` to `Position` each frame |
| `collision_pairs(world)` | Returns `Vec<Contact>` for all overlapping `Collider` pairs |
| `resolve_collision(world, &contact)` | Pushes both entities apart equally |
| `resolve_collision_static(world, &contact, static_entity)` | Pushes only the non-static entity |
| `parent_transform_system(world)` | Updates child positions from `Parent` + `LocalOffset` |
| `cascade_despawn(world, entity)` | Despawns entity and all its children |

## Key Differences from 3D Engine

| 3D Engine | TUI Framework |
|-----------|---------------|
| `nightshade::prelude::*` | `nightshade::tui::prelude::*` |
| `launch(state)` | `launch(Box::new(state))` |
| `world.resources.window.timing.delta_time` | `world.resources.timing.delta_seconds` |
| `KeyCode::KeyW` | `KeyCode::Char('w')` |
| `KeyState` (Pressed/Released) | `bool` (pressed) |
| `LocalTransform` (Vec3 position) | `Position` (column/row f64) |
| 3D meshes + materials | `Sprite` (char + colors) |
| `mark_local_transform_dirty()` | Not needed — positions take effect immediately |

## Where to Go Next

The TUI framework supports much more than Snake:

- **Tilemaps**: Use `Tilemap` for efficient grid rendering (roguelikes, RPGs)
- **Sprite Animation**: Use `SpriteAnimation` with a list of frame characters
- **Collision Detection**: Use `Collider` with layers and masks for selective collision
- **Mouse Input**: Handle clicks and movement with `on_mouse_input` and `on_mouse_move`
- **Camera Scrolling**: Set `world.resources.camera.offset_column/row` for viewport scrolling

See the 40+ terminal examples in the `nightshade-examples` repository for complete implementations of roguelikes, platformers, puzzle games, strategy games, and more.
