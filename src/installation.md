# Installation

## Prerequisites

- **Rust 1.90+** with the 2024 edition
- A graphics driver supporting Vulkan 1.2, Metal, or DirectX 12

## Quick Start

Clone the template repository:

```bash
git clone https://github.com/matthewjberger/nightshade-template my-game
cd my-game
```

Run it:

```bash
just run
```

You should see a 3D scene with a nebula skybox, a grid, and a pan-orbit camera.

## What's in the Template

The template gives you a working project with:

- `src/main.rs` - A minimal Nightshade application with a camera, sun, and egui UI
- `Cargo.toml` - Nightshade dependency with `egui` feature enabled
- `justfile` - Build, run, lint, and deploy commands for native, WASM, VR, and Steam Deck
- `index.html` + `Trunk.toml` - WASM web build configuration
- `.github/workflows/` - CI (clippy, tests, WASM build) and GitHub Pages deployment
- `rust-toolchain` - Pinned Rust version with WASM target

## Starter Code

The template's `src/main.rs`:

```rust
use nightshade::prelude::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    launch(Template)?;
    Ok(())
}

#[derive(Default)]
struct Template;

impl State for Template {
    fn title(&self) -> &str { "Template" }

    fn initialize(&mut self, world: &mut World) {
        world.resources.user_interface.enabled = true;
        world.resources.graphics.show_grid = true;
        world.resources.graphics.atmosphere = Atmosphere::Nebula;
        spawn_sun(world);
        let camera_entity = spawn_pan_orbit_camera(
            world,
            Vec3::new(0.0, 0.0, 0.0),
            15.0,
            0.0,
            std::f32::consts::FRAC_PI_4,
            "Main Camera".to_string(),
        );
        world.resources.active_camera = Some(camera_entity);
    }

    fn ui(&mut self, _world: &mut World, ui_context: &egui::Context) {
        egui::Window::new("Template").show(ui_context, |_ui| {});
    }

    fn run_systems(&mut self, world: &mut World) {
        pan_orbit_camera_system(world);
    }

    fn on_keyboard_input(
        &mut self,
        world: &mut World,
        key_code: KeyCode,
        key_state: KeyState,
    ) {
        if matches!((key_code, key_state), (KeyCode::KeyQ, KeyState::Pressed)) {
            world.resources.window.should_exit = true;
        }
    }
}
```

## Justfile Commands

| Command | Description |
|---------|-------------|
| `just run` | Build and run in release mode |
| `just run-wasm` | Build for web and open in browser |
| `just lint` | Run clippy with warnings as errors |
| `just test` | Run the test suite |
| `just build-wasm` | Build WASM release only |
| `just run-openxr` | Run with VR headset support |

## Feature Flags

The template enables `egui` by default. Add more features in `Cargo.toml`:

```toml
[dependencies]
nightshade = { version = "0.6.70", features = ["egui", "physics", "audio"] }
```

| Feature | Description |
|---------|-------------|
| `egui` | Immediate-mode UI |
| `physics` | Rapier3D physics simulation |
| `audio` | Kira audio playback |
| `gamepad` | Gamepad input via gilrs |
| `openxr` | VR headset support |
| `steam` | Steamworks integration |
| `scripting` | WASM plugin system |

See the [Feature Flags](appendix-features.md) appendix for the complete list.

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

WebGPU support requires a compatible browser (Chrome 113+, Firefox 121+). The template includes `just run-wasm` which uses Trunk to build and serve.
