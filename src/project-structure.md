# Project Structure

## Recommended Layout

A typical Nightshade project follows this structure:

```
my_game/
├── Cargo.toml
├── src/
│   ├── main.rs           # Entry point
│   ├── game.rs           # Game state
│   └── systems/          # Game systems
│       ├── player.rs
│       ├── camera.rs
│       └── ...
├── assets/
│   ├── models/           # glTF/GLB files
│   ├── textures/         # PNG, JPG, HDR
│   └── sounds/           # Audio files
└── README.md
```

## Cargo.toml

```toml
[package]
name = "my_game"
version = "0.1.0"
edition = "2024"

[dependencies]
nightshade = { git = "https://github.com/matthewjberger/nightshade.git", features = ["engine", "wgpu"] }
```

## Entry Point (main.rs)

Keep `main.rs` minimal:

```rust
mod game;

use nightshade::prelude::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    nightshade::launch(game::MyGame::default())
}
```

## Game State (game.rs)

Implement your game logic:

```rust
use nightshade::prelude::*;

#[derive(Default)]
pub struct MyGame {
    player: Option<Entity>,
    score: u32,
}

impl State for MyGame {
    fn title(&self) -> &str {
        "My Game"
    }

    fn initialize(&mut self, world: &mut World) {
        // Setup code
    }

    fn run_systems(&mut self, world: &mut World) {
        // Per-frame logic
    }
}
```

## Embedding Assets

For distribution, embed assets directly in the binary:

```rust
const MODEL_BYTES: &[u8] = include_bytes!("../assets/models/character.glb");
const SKY_HDR: &[u8] = include_bytes!("../assets/textures/sky.hdr");
```

## Custom ECS

For complex games, create a separate game ECS alongside the engine's World:

```rust
use freecs::ecs;

ecs! {
    GameWorld {
        components {
            player_state: PlayerState,
            inventory: Inventory,
            health: Health,
        },
        resources {
            game_time: GameTime,
            score: u32,
        }
    }
}

pub struct MyGame {
    game: GameWorld,
}
```

This keeps game-specific data separate from engine data while allowing both to coexist.

## Module Organization

For larger projects, organize systems into modules:

```rust
// src/systems/mod.rs
pub mod camera;
pub mod player;
pub mod enemies;
pub mod ui;

// src/game.rs
mod systems;

impl State for MyGame {
    fn run_systems(&mut self, world: &mut World) {
        systems::player::update(&mut self.game, world);
        systems::camera::follow(&self.game, world);
        systems::enemies::ai(&mut self.game, world);
        systems::ui::update(&self.game, world);
    }
}
```
