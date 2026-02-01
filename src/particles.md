# Particle Systems

GPU-accelerated particle systems for fire, smoke, snow, and other effects.

## Creating a Particle Emitter

```rust
use nightshade::ecs::particles::components::*;

let entity = world.spawn_entities(PARTICLE_EMITTER, 1)[0];

world.set_particle_emitter(entity, ParticleEmitter {
    emitter_type: EmitterType::Fire,
    shape: EmitterShape::Point,
    position: Vec3::new(0.0, 0.0, 0.0),
    direction: Vec3::new(0.0, 1.0, 0.0),
    spawn_rate: 50.0,
    particle_lifetime_min: 0.5,
    particle_lifetime_max: 1.5,
    initial_velocity_min: 1.0,
    initial_velocity_max: 3.0,
    velocity_spread: 0.3,
    gravity: Vec3::new(0.0, -1.0, 0.0),
    size_start: 0.2,
    size_end: 0.05,
    color_gradient: fire_gradient(),
    enabled: true,
    ..Default::default()
});
```

## Emitter Types

| Type | Description |
|------|-------------|
| `Fire` | Additive blending, upward motion |
| `Smoke` | Alpha blending, slow rise |
| `Sparks` | Point sprites, fast motion |
| `Snow` | Falling particles, drift |
| `Dust` | Ground-level particles |

## Emitter Shapes

```rust
// Single point
EmitterShape::Point

// Emit from sphere surface
EmitterShape::Sphere { radius: 0.5 }

// Emit from box volume
EmitterShape::Box { half_extents: Vec3::new(1.0, 0.1, 1.0) }

// Emit from cone
EmitterShape::Cone { radius: 0.5, height: 1.0 }
```

## Color Gradients

Define how particles change color over their lifetime:

```rust
fn fire_gradient() -> ColorGradient {
    ColorGradient {
        colors: vec![
            (0.0, Vec4::new(1.0, 1.0, 0.9, 0.0)),    // Start: white, transparent
            (0.1, Vec4::new(1.0, 0.95, 0.7, 1.0)),   // Bright yellow
            (0.3, Vec4::new(1.0, 0.8, 0.4, 0.9)),    // Orange-yellow
            (0.6, Vec4::new(1.0, 0.5, 0.1, 0.6)),    // Orange
            (0.85, Vec4::new(0.9, 0.2, 0.02, 0.2)),  // Red
            (1.0, Vec4::new(0.5, 0.05, 0.0, 0.0)),   // Dark red, fade out
        ],
    }
}

fn smoke_gradient() -> ColorGradient {
    ColorGradient {
        colors: vec![
            (0.0, Vec4::new(0.15, 0.12, 0.1, 0.0)),
            (0.15, Vec4::new(0.3, 0.28, 0.25, 0.4)),
            (0.7, Vec4::new(0.5, 0.49, 0.47, 0.2)),
            (1.0, Vec4::new(0.65, 0.63, 0.6, 0.0)),
        ],
    }
}
```

## Fire Effect

Complete campfire with multiple emitters:

```rust
fn spawn_campfire(world: &mut World, position: Vec3) {
    // Fire core (bright, fast)
    let core = world.spawn_entities(PARTICLE_EMITTER, 1)[0];
    world.set_particle_emitter(core, ParticleEmitter {
        emitter_type: EmitterType::Fire,
        shape: EmitterShape::Sphere { radius: 0.04 },
        position,
        direction: Vec3::new(0.0, 1.0, 0.0),
        spawn_rate: 50.0,
        particle_lifetime_min: 0.25,
        particle_lifetime_max: 0.5,
        initial_velocity_min: 0.8,
        initial_velocity_max: 1.5,
        velocity_spread: 0.12,
        gravity: Vec3::new(0.0, 2.5, 0.0),
        size_start: 0.12,
        size_end: 0.04,
        color_gradient: fire_gradient(),
        emissive_strength: 18.0,
        turbulence_strength: 1.2,
        turbulence_frequency: 4.5,
        ..Default::default()
    });

    // Smoke (slow, expanding)
    let smoke = world.spawn_entities(PARTICLE_EMITTER, 1)[0];
    world.set_particle_emitter(smoke, ParticleEmitter {
        emitter_type: EmitterType::Smoke,
        shape: EmitterShape::Sphere { radius: 0.1 },
        position: position + Vec3::new(0.0, 0.5, 0.0),
        direction: Vec3::new(0.1, 1.0, 0.05).normalize(),
        spawn_rate: 25.0,
        particle_lifetime_min: 5.0,
        particle_lifetime_max: 10.0,
        initial_velocity_min: 0.3,
        initial_velocity_max: 0.7,
        gravity: Vec3::new(0.05, 0.2, 0.02),
        drag: 0.05,
        size_start: 0.2,
        size_end: 2.5,
        color_gradient: smoke_gradient(),
        turbulence_strength: 0.6,
        turbulence_frequency: 0.2,
        ..Default::default()
    });

    // Embers (sparks)
    let embers = world.spawn_entities(PARTICLE_EMITTER, 1)[0];
    world.set_particle_emitter(embers, ParticleEmitter {
        emitter_type: EmitterType::Sparks,
        shape: EmitterShape::Sphere { radius: 0.15 },
        position: position + Vec3::new(0.0, 0.1, 0.0),
        spawn_rate: 8.0,
        particle_lifetime_min: 2.0,
        particle_lifetime_max: 4.0,
        initial_velocity_min: 0.5,
        initial_velocity_max: 2.0,
        gravity: Vec3::new(0.0, -0.3, 0.0),
        size_start: 0.02,
        size_end: 0.01,
        emissive_strength: 25.0,
        ..Default::default()
    });
}
```

## Snow/Weather Effect

```rust
fn spawn_snow_blizzard(world: &mut World) {
    let snow = world.spawn_entities(PARTICLE_EMITTER, 1)[0];

    world.set_particle_emitter(snow, ParticleEmitter {
        emitter_type: EmitterType::Snow,
        shape: EmitterShape::Box {
            half_extents: Vec3::new(50.0, 0.1, 50.0),
        },
        position: Vec3::new(0.0, 30.0, 0.0),
        direction: Vec3::new(-0.1, -1.0, -0.05).normalize(),
        spawn_rate: 500.0,
        particle_lifetime_min: 8.0,
        particle_lifetime_max: 15.0,
        initial_velocity_min: 0.5,
        initial_velocity_max: 2.0,
        velocity_spread: 0.3,
        gravity: Vec3::new(-0.1, -0.5, -0.05),
        drag: 0.02,
        size_start: 0.03,
        size_end: 0.02,
        turbulence_strength: 0.8,
        turbulence_frequency: 0.5,
        ..Default::default()
    });
}
```

## Controlling Emitters

```rust
// Enable/disable
if let Some(emitter) = world.get_particle_emitter_mut(entity) {
    emitter.enabled = false;
}

// Burst spawn
if let Some(emitter) = world.get_particle_emitter_mut(entity) {
    emitter.burst_count = 50;  // Spawn 50 particles immediately
}

// Change position
if let Some(emitter) = world.get_particle_emitter_mut(entity) {
    emitter.position = new_position;
}
```

## Particle Properties

| Property | Description |
|----------|-------------|
| `spawn_rate` | Particles per second |
| `burst_count` | One-time particle spawn |
| `particle_lifetime_min/max` | Random lifetime range |
| `initial_velocity_min/max` | Random speed range |
| `velocity_spread` | Direction randomization |
| `gravity` | Constant acceleration |
| `drag` | Air resistance |
| `size_start/end` | Size over lifetime |
| `emissive_strength` | Glow intensity |
| `turbulence_strength` | Noise movement |
| `turbulence_frequency` | Noise frequency |
