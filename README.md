# Nightshade Game Engine Documentation

Comprehensive documentation for the [Nightshade](https://github.com/matthewjberger/nightshade) game engine, built with [mdBook](https://rust-lang.github.io/mdBook/).

## Building

Install mdBook:

```bash
cargo install mdbook
```

Build and serve locally:

```bash
mdbook serve --open
```

## Contents

- **Getting Started** - Installation, first application, project structure
- **Core Concepts** - State trait, World/Resources, ECS architecture
- **Rendering** - Cameras, meshes, materials, lighting, post-processing, render graph
- **Physics** - Rigid bodies, colliders, character controllers, joints (Rapier3D)
- **Animation** - Model loading, playback, blending
- **Audio** - Sound system, spatial audio, FFT analysis
- **Input** - Keyboard, mouse, gamepad support
- **Advanced Features** - Terrain, particles, navmesh, grass, HUD text, debug lines, effects pass

## Examples

The documentation includes complete game examples:

- Minimal application
- First-person shooter
- Third-person action game
- Physics playground

## License

MIT
