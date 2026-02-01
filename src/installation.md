# Installation

## Prerequisites

Before using Nightshade, ensure you have:

- **Rust 1.90+** with the 2024 edition
- A graphics driver supporting Vulkan 1.2, Metal, or DirectX 12

## Adding Nightshade to Your Project

Add Nightshade to your `Cargo.toml`:

```toml
[dependencies]
nightshade = { git = "https://github.com/matthewjberger/nightshade.git" }
```

### With Specific Features

```toml
[dependencies]
nightshade = { git = "https://github.com/matthewjberger/nightshade.git", features = ["engine", "physics", "audio"] }
```

### Feature Sets

| Feature | Description |
|---------|-------------|
| `default` | Engine + wgpu backend |
| `engine` | Full game engine capabilities |
| `runtime` | Minimal rendering without asset loading |
| `full` | Everything including niche features |

See the [Feature Flags](appendix-features.md) appendix for a complete list.

## Verifying Installation

Create a minimal application to verify everything works:

```rust
use nightshade::prelude::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    launch(MyGame::default())
}

#[derive(Default)]
struct MyGame;

impl State for MyGame {
    fn title(&self) -> &str {
        "Nightshade Test"
    }

    fn initialize(&mut self, world: &mut World) {
        spawn_camera(world, Vec3::new(0.0, 5.0, 10.0), "Camera".to_string());
    }

    fn run_systems(&mut self, _world: &mut World) {}
}
```

Run with:

```bash
cargo run
```

You should see a window with a default sky background.

## Platform-Specific Notes

### Windows

DirectX 12 is the default backend. Ensure your graphics drivers are up to date.

### macOS

Metal is used automatically. No additional setup required.

### Linux

Vulkan is required. Install Vulkan drivers for your GPU:

```bash
# Ubuntu/Debian
sudo apt install vulkan-tools libvulkan-dev

# Fedora
sudo dnf install vulkan-tools vulkan-loader-devel

# Arch
sudo pacman -S vulkan-tools vulkan-icd-loader
```

### WebAssembly

WebGPU support requires a compatible browser (Chrome 113+, Firefox 121+). Build with:

```bash
cargo build --target wasm32-unknown-unknown
```
