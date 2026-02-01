# Introduction

**Nightshade** is a modern game engine written in Rust, designed for creating 3D games and interactive applications. It provides a complete toolkit for game development including rendering, physics, audio, animation, and more.

## Key Features

- **WebGPU Rendering** - Modern graphics API via wgpu, supporting Windows, macOS, Linux, and WebAssembly
- **Entity Component System** - Fast, cache-friendly ECS powered by freecs
- **Physics Simulation** - Rapier3D integration for rigid bodies, colliders, joints, and character controllers
- **Audio Engine** - Kira-based audio with spatial 3D sound support
- **Animation System** - Skeletal animation with blending and cross-fading
- **Asset Loading** - glTF/GLB model loading with automatic material and texture handling
- **Immediate Mode UI** - egui integration for tools and debug interfaces
- **Particle Systems** - GPU-accelerated particle effects
- **Terrain Generation** - Procedural terrain with LOD and tessellation
- **Navigation Mesh** - AI pathfinding with Recast integration

## Design Philosophy

Nightshade follows these core principles:

1. **Simplicity** - A minimal API surface that's easy to learn
2. **Performance** - Data-oriented design for cache efficiency
3. **Flexibility** - Feature flags to include only what you need
4. **Cross-Platform** - Write once, run on desktop, web, and VR

## Version

This documentation covers **Nightshade v0.6.69** using **Rust 2024 Edition**.

## Getting Help

- [GitHub Repository](https://github.com/matthewjberger/nightshade)
- [API Documentation](https://docs.rs/nightshade)

Let's get started!
