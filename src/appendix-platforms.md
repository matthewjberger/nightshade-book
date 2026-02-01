# Platform Support

Nightshade supports multiple platforms through wgpu's cross-platform abstractions.

## Supported Platforms

| Platform | Status | Backend | Notes |
|----------|--------|---------|-------|
| Windows 10/11 | Full Support | Vulkan, DX12 | Primary development platform |
| Linux | Full Support | Vulkan | X11 and Wayland |
| macOS | Full Support | Metal | Requires macOS 10.13+ |
| Web (WASM) | Experimental | WebGPU | Modern browsers only |

## Windows

### Requirements

- Windows 10 version 1903 or later (for DX12)
- Windows 10 version 1607 or later (for Vulkan)
- GPU with Vulkan 1.1 or DirectX 12 support

### Graphics Backends

Windows supports multiple backends in order of preference:

1. **Vulkan** - Best performance and feature support
2. **DirectX 12** - Native Windows API, good compatibility
3. **DirectX 11** - Fallback for older hardware

### Building

```bash
cargo build --release
```

### Distribution

The executable is self-contained. Include your `assets` folder alongside the executable.

```
game/
├── game.exe
└── assets/
    ├── models/
    ├── textures/
    └── audio/
```

## Linux

### Requirements

- X11 or Wayland display server
- Vulkan 1.1 compatible GPU and drivers
- Common distributions: Ubuntu 20.04+, Fedora 33+, Arch Linux

### Dependencies

Install Vulkan development packages:

**Ubuntu/Debian:**
```bash
sudo apt install libvulkan1 vulkan-tools libvulkan-dev
sudo apt install libasound2-dev  # For audio feature
```

**Fedora:**
```bash
sudo dnf install vulkan-loader vulkan-tools vulkan-headers
sudo dnf install alsa-lib-devel  # For audio feature
```

**Arch Linux:**
```bash
sudo pacman -S vulkan-icd-loader vulkan-tools vulkan-headers
sudo pacman -S alsa-lib  # For audio feature
```

### Building

```bash
cargo build --release
```

### Wayland Support

Nightshade uses winit which supports both X11 and Wayland. The backend is selected automatically based on environment:

```bash
# Force X11
WINIT_UNIX_BACKEND=x11 ./game

# Force Wayland
WINIT_UNIX_BACKEND=wayland ./game
```

### Distribution

Create an AppImage or distribute with a shell script:

```bash
#!/bin/bash
cd "$(dirname "$0")"
./game
```

## macOS

### Requirements

- macOS 10.13 (High Sierra) or later
- Metal-capable GPU (most Macs from 2012+)

### Building

```bash
cargo build --release
```

### Code Signing

For distribution, sign your application:

```bash
codesign --deep --force --sign "Developer ID Application: Your Name" target/release/game
```

### App Bundle

Create a macOS app bundle:

```
Game.app/
└── Contents/
    ├── Info.plist
    ├── MacOS/
    │   └── game
    └── Resources/
        └── assets/
```

**Info.plist:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>game</string>
    <key>CFBundleIdentifier</key>
    <string>com.yourcompany.game</string>
    <key>CFBundleName</key>
    <string>Game</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
</dict>
</plist>
```

## Web (WebAssembly)

### Requirements

- Modern browser with WebGPU support
- Chrome 113+, Edge 113+, Firefox (Nightly with flag)

### Building

Install wasm-pack:

```bash
cargo install wasm-pack
```

Build for web:

```bash
wasm-pack build --target web
```

### HTML Template

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Game</title>
    <style>
        body { margin: 0; overflow: hidden; }
        canvas { width: 100vw; height: 100vh; display: block; }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <script type="module">
        import init from './pkg/game.js';
        init();
    </script>
</body>
</html>
```

### Limitations

Web builds have some limitations:

| Feature | Status |
|---------|--------|
| Rendering | Supported |
| Input | Supported |
| Audio | Supported (Web Audio) |
| Gamepad | Supported (Gamepad API) |
| Physics | Supported |
| File System | Limited (no direct access) |
| Threads | Limited (requires SharedArrayBuffer) |

### Asset Loading

Assets must be served over HTTP. Use fetch API for loading:

```rust
#[cfg(target_arch = "wasm32")]
async fn load_assets() {
    // Assets loaded via HTTP fetch
}
```

## Cross-Compilation

### Windows from Linux

Install the MinGW toolchain:

```bash
sudo apt install mingw-w64
rustup target add x86_64-pc-windows-gnu
cargo build --release --target x86_64-pc-windows-gnu
```

### Linux from Windows

Use WSL2 or Docker:

```bash
# In WSL2
cargo build --release --target x86_64-unknown-linux-gnu
```

### macOS Cross-Compilation

Cross-compiling to macOS is complex due to SDK requirements. Consider using CI/CD services like GitHub Actions with macOS runners.

## GPU Requirements

### Minimum Requirements

| Feature | Requirement |
|---------|-------------|
| API | Vulkan 1.1 / DX12 / Metal |
| VRAM | 2 GB |
| Shader Model | 5.0 |

### Recommended Requirements

| Feature | Requirement |
|---------|-------------|
| API | Vulkan 1.2+ |
| VRAM | 4+ GB |
| Shader Model | 6.0 |

### Feature Support by GPU Generation

| GPU | Basic Rendering | Tessellation | Compute Culling |
|-----|----------------|--------------|-----------------|
| Intel HD 4000+ | Yes | Yes | Yes |
| NVIDIA GTX 600+ | Yes | Yes | Yes |
| AMD GCN 1.0+ | Yes | Yes | Yes |
| Apple M1+ | Yes | Yes | Yes |

## Performance by Platform

Relative performance (higher is better):

| Platform | Performance | Notes |
|----------|-------------|-------|
| Windows (Vulkan) | 100% | Best overall |
| Windows (DX12) | 95% | Slightly more overhead |
| Linux (Vulkan) | 98% | Excellent with proper drivers |
| macOS (Metal) | 90% | Good, but Metal has different characteristics |
| Web (WebGPU) | 70% | JavaScript overhead |

## Troubleshooting

### Windows: "No suitable adapter found"

- Update GPU drivers
- Install Vulkan Runtime
- Try forcing DX12: `WGPU_BACKEND=dx12 ./game.exe`

### Linux: "Failed to create Vulkan instance"

- Install Vulkan drivers for your GPU
- Check `vulkaninfo` command works
- Verify ICD loader: `ls /usr/share/vulkan/icd.d/`

### macOS: "Metal not available"

- Update macOS to 10.13+
- Check GPU supports Metal: Apple Menu > About This Mac > System Report > Graphics

### Web: "WebGPU not supported"

- Use Chrome 113+ or Edge 113+
- Enable WebGPU flag in browser settings if needed
- Check `navigator.gpu` exists in browser console
