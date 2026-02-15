# Particle Systems

> **Live Demo:** [Fireworks](https://matthewberger.dev/nightshade/fireworks)

GPU-accelerated particle systems for fire, smoke, snow, and other effects.

## Creating a Particle Emitter

```rust
use nightshade::ecs::particles::components::*;

let entity = world.spawn_entities(PARTICLE_EMITTER, 1)[0];

world.set_particle_emitter(entity, ParticleEmitter {
    max_particles: 1000,
    emission_rate: 50.0,
    lifetime: 1.5,
    initial_velocity: Vec3::new(0.0, 1.0, 0.0),
    velocity_randomness: 0.3,
    size: 0.2,
    color: fire_gradient(),
    shape: EmitterShape::Point,
    ..Default::default()
});
```

## Emitter Types

| Type | Description |
|------|-------------|
| `EmitterType::Continuous` | Emits particles continuously at the configured rate |
| `EmitterType::Burst { count }` | Emits a fixed number of particles at once |

## Emitter Shapes

```rust
// Single point
EmitterShape::Point

// Emit from sphere surface
EmitterShape::Sphere { radius: 0.5 }

// Emit from box volume
EmitterShape::Box { half_extents: Vec3::new(1.0, 0.1, 1.0) }

// Emit from cone
EmitterShape::Cone { angle: 0.5, radius: 0.5 }
```

## Color Gradients

Define how particles change color over their lifetime:

```rust
fn fire_gradient() -> ColorGradient {
    ColorGradient::new(
        Vec4::new(1.0, 0.95, 0.7, 1.0),
        Vec4::new(0.5, 0.05, 0.0, 0.0),
    )
}

fn smoke_gradient() -> ColorGradient {
    ColorGradient::new(
        Vec4::new(0.3, 0.28, 0.25, 0.4),
        Vec4::new(0.65, 0.63, 0.6, 0.0),
    )
}
```

## Fire Effect

Complete campfire with multiple emitters:

```rust
fn spawn_campfire(world: &mut World, position: Vec3) {
    let core = world.spawn_entities(PARTICLE_EMITTER | LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];
    world.set_local_transform(core, LocalTransform {
        translation: position,
        ..Default::default()
    });
    world.set_particle_emitter(core, ParticleEmitter {
        max_particles: 2000,
        emission_rate: 50.0,
        lifetime: 0.5,
        initial_velocity: Vec3::new(0.0, 1.5, 0.0),
        velocity_randomness: 0.12,
        size: 0.12,
        color: fire_gradient(),
        shape: EmitterShape::Sphere { radius: 0.04 },
        ..Default::default()
    });

    let smoke = world.spawn_entities(PARTICLE_EMITTER | LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];
    world.set_local_transform(smoke, LocalTransform {
        translation: position + Vec3::new(0.0, 0.5, 0.0),
        ..Default::default()
    });
    world.set_particle_emitter(smoke, ParticleEmitter {
        max_particles: 500,
        emission_rate: 25.0,
        lifetime: 10.0,
        initial_velocity: Vec3::new(0.1, 0.7, 0.05),
        velocity_randomness: 0.3,
        size: 0.2,
        color: smoke_gradient(),
        shape: EmitterShape::Sphere { radius: 0.1 },
        ..Default::default()
    });

    let embers = world.spawn_entities(PARTICLE_EMITTER | LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];
    world.set_local_transform(embers, LocalTransform {
        translation: position + Vec3::new(0.0, 0.1, 0.0),
        ..Default::default()
    });
    world.set_particle_emitter(embers, ParticleEmitter {
        max_particles: 200,
        emission_rate: 8.0,
        lifetime: 4.0,
        initial_velocity: Vec3::new(0.0, 2.0, 0.0),
        velocity_randomness: 0.5,
        size: 0.02,
        color: ColorGradient::default(),
        shape: EmitterShape::Sphere { radius: 0.15 },
        ..Default::default()
    });
}
```

## Snow/Weather Effect

```rust
fn spawn_snow_blizzard(world: &mut World) {
    let snow = world.spawn_entities(PARTICLE_EMITTER | LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];
    world.set_local_transform(snow, LocalTransform {
        translation: Vec3::new(0.0, 30.0, 0.0),
        ..Default::default()
    });

    world.set_particle_emitter(snow, ParticleEmitter {
        max_particles: 10000,
        emission_rate: 500.0,
        lifetime: 15.0,
        initial_velocity: Vec3::new(-0.1, -1.0, -0.05),
        velocity_randomness: 0.3,
        size: 0.03,
        color: ColorGradient::default(),
        shape: EmitterShape::Box {
            half_extents: Vec3::new(50.0, 0.1, 50.0),
        },
        ..Default::default()
    });
}
```

## Updating Emitters

Call the particle update system each frame:

```rust
fn run_systems(&mut self, world: &mut World) {
    let dt = world.resources.window.timing.delta_time;
    update_particle_emitters(world, dt);
}
```

## Controlling Emitters

```rust
if let Some(emitter) = world.get_particle_emitter_mut(entity) {
    emitter.emission_rate = 0.0;
}

if let Some(transform) = world.get_local_transform_mut(entity) {
    transform.translation = new_position;
}
```

## Particle Properties

| Property | Description |
|----------|-------------|
| `max_particles` | Maximum active particles |
| `emission_rate` | Particles per second |
| `lifetime` | Particle lifetime in seconds |
| `initial_velocity` | Starting velocity vector |
| `velocity_randomness` | Direction randomization |
| `size` | Particle size |
| `color` | ColorGradient over lifetime |
| `shape` | EmitterShape for spawn region |
