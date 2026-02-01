# Introduction

**Nightshade** is a modern game engine written in Rust, designed for creating 3D games and interactive applications. It provides a complete toolkit for game development including rendering, physics, audio, animation, and more.

## What is Nightshade?

Nightshade is a batteries-included game engine that handles the complexity of modern 3D graphics while remaining approachable for developers of all skill levels. Whether you're building a simple visualizer, a physics playground, or a complete 3D game, Nightshade provides the foundation you need.

The engine is built on top of industry-standard libraries:

- **wgpu** for cross-platform GPU access (Vulkan, Metal, DirectX 12, WebGPU)
- **Rapier3D** for physics simulation
- **Kira** for audio playback and spatial sound
- **egui** for immediate-mode UI
- **glTF** for 3D model loading

## Key Features

### Rendering

- **Physically Based Rendering (PBR)** - Metallic-roughness workflow with support for all standard texture maps
- **Dynamic Lighting** - Directional, point, and spot lights with real-time shadows
- **Post-Processing** - Bloom, SSAO, depth of field, tonemapping, and custom effects
- **Skeletal Animation** - Smooth blending and crossfading between animations
- **Particle Systems** - GPU-accelerated particles with configurable emitters
- **Terrain** - Procedural generation with tessellation and LOD
- **Grass** - Thousands of interactive grass blades with wind simulation

### Physics

- **Rigid Body Dynamics** - Dynamic, kinematic, and static bodies
- **Collision Shapes** - Box, sphere, capsule, cylinder, convex hull, trimesh, heightfield
- **Character Controllers** - Built-in player movement with slopes, steps, and jumping
- **Physics Joints** - Fixed, revolute, prismatic, spherical, rope, and spring joints
- **Raycasting** - Query the physics world for line-of-sight and hit detection

### Audio

- **Sound Playback** - WAV, OGG, MP3, FLAC support
- **Spatial Audio** - 3D positioned sound sources with distance attenuation
- **FFT Analysis** - Real-time spectral analysis for music visualizers

### Input

- **Keyboard & Mouse** - Full key detection with press/release states
- **Gamepad** - Controller support with analog sticks, triggers, and rumble
- **Cursor Control** - Lock and hide cursor for FPS-style games

### Tools

- **Navigation Mesh** - AI pathfinding with Recast integration
- **Debug Rendering** - Lines, boxes, spheres for visualization
- **HUD Text** - Screen-space text rendering with anchoring
- **Screenshot Capture** - Save frames to PNG

## Architecture Overview

Nightshade follows a simple architecture centered around the `State` trait and the `World` container:

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Game (State)                       │
├─────────────────────────────────────────────────────────────┤
│  initialize()  │  run_systems()  │  ui()  │  input handlers │
└────────────────┴─────────────────┴────────┴─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          World                               │
├──────────────────┬──────────────────┬───────────────────────┤
│     Entities     │    Components    │      Resources        │
│  (unique IDs)    │  (data arrays)   │  (global singletons)  │
└──────────────────┴──────────────────┴───────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Renderer    │    │    Physics    │    │     Audio     │
│    (wgpu)     │    │   (Rapier)    │    │    (Kira)     │
└───────────────┘    └───────────────┘    └───────────────┘
```

### The Game Loop

Each frame, Nightshade:

1. Processes window and input events
2. Calls your `run_systems()` method
3. Updates physics simulation
4. Propagates transform hierarchies
5. Renders the scene
6. Presents to the screen

You control game logic in `run_systems()`, and the engine handles everything else.

## Design Philosophy

Nightshade follows these core principles:

### Simplicity

The API surface is minimal and consistent. Common tasks like spawning entities, loading models, and handling input should be intuitive. If something feels overly complex, it's probably a bug.

### Performance

The engine uses data-oriented design throughout. The ECS stores components in contiguous arrays for cache-friendly access. The renderer batches draw calls and uses GPU instancing where possible.

### Flexibility

Feature flags let you include only what you need. Building a simple visualizer? Just use `engine`. Need physics? Add `physics`. Everything is opt-in.

### Cross-Platform

Write once, run everywhere. The same code runs on Windows, macOS, Linux, and WebAssembly. The engine automatically selects the appropriate graphics backend.

## When to Use Nightshade

Nightshade is well-suited for:

- **3D Games** - Action games, platformers, simulations
- **Visualizers** - Music-reactive graphics, data visualization
- **Prototypes** - Quickly test game ideas
- **Learning** - Understanding game engine concepts

Nightshade may not be ideal for:

- **2D-only games** - Consider a dedicated 2D engine
- **AAA production** - Missing some advanced features (GI, complex animation graphs)
- **Mobile** - Not yet optimized for mobile platforms

## Version

This documentation covers **Nightshade v0.6.69** using **Rust 2024 Edition**.

## Getting Help

- [GitHub Repository](https://github.com/matthewjberger/nightshade) - Source code and issue tracker
- [API Documentation](https://docs.rs/nightshade) - Generated API docs

Let's get started!
