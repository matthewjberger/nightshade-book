# Water

Nightshade includes a procedural water system supporting both planar water surfaces and volumetric water bodies.

## Water Component

```rust
pub struct Water {
    pub water_type: WaterType,
    pub base_color: Vec3,
    pub water_color: Vec3,
    pub wave_height: f32,
    pub wave_speed: f32,
    pub wave_frequency: f32,
    pub choppiness: f32,
    pub foam_threshold: f32,
    pub reflectivity: f32,
    pub edge_softness: f32,
}
```

## Water Types

### Planar Water

Flat water surface extending infinitely in X and Z:

```rust
pub enum WaterType {
    Planar,
    Volumetric { shape: VolumetricShape },
}

let water_entity = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | WATER,
    1
)[0];

world.set_local_transform(water_entity, LocalTransform {
    position: Vec3::new(0.0, 0.0, 0.0),
    ..Default::default()
});

world.set_water(water_entity, Water {
    water_type: WaterType::Planar,
    base_color: Vec3::new(0.0, 0.1, 0.2),
    water_color: Vec3::new(0.0, 0.3, 0.5),
    wave_height: 0.5,
    wave_speed: 1.0,
    wave_frequency: 0.5,
    choppiness: 1.0,
    foam_threshold: 0.8,
    reflectivity: 0.5,
    edge_softness: 1.0,
});
```

### Volumetric Water

Water contained within a shape:

```rust
pub enum VolumetricShape {
    Box { half_extents: Vec3 },
    Sphere { radius: f32 },
    Cylinder { radius: f32, height: f32 },
}

world.set_water(pool_entity, Water {
    water_type: WaterType::Volumetric {
        shape: VolumetricShape::Box {
            half_extents: Vec3::new(5.0, 2.0, 5.0),
        },
    },
    base_color: Vec3::new(0.0, 0.15, 0.25),
    water_color: Vec3::new(0.1, 0.4, 0.6),
    wave_height: 0.1,
    wave_speed: 0.5,
    wave_frequency: 2.0,
    choppiness: 0.3,
    foam_threshold: 0.9,
    reflectivity: 0.3,
    edge_softness: 0.5,
});
```

## Wave Properties

### Wave Height

Controls the amplitude of waves:

```rust
water.wave_height = 0.5;
```

### Wave Speed

How fast waves travel:

```rust
water.wave_speed = 1.0;
```

### Wave Frequency

Number of waves per unit distance:

```rust
water.wave_frequency = 0.5;
```

### Choppiness

How peaked the wave crests are:

```rust
water.choppiness = 1.0;
```

## Visual Properties

### Colors

```rust
water.base_color = Vec3::new(0.0, 0.1, 0.2);
water.water_color = Vec3::new(0.0, 0.3, 0.5);
```

### Foam

White foam appears on wave crests above the threshold:

```rust
water.foam_threshold = 0.8;
```

### Reflectivity

How much the water reflects the environment:

```rust
water.reflectivity = 0.5;
```

### Edge Softness

Soft blending at water edges (shore):

```rust
water.edge_softness = 1.0;
```

## Ocean Preset

```rust
fn spawn_ocean(world: &mut World) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | WATER,
        1
    )[0];

    world.set_water(entity, Water {
        water_type: WaterType::Planar,
        base_color: Vec3::new(0.0, 0.05, 0.1),
        water_color: Vec3::new(0.0, 0.2, 0.4),
        wave_height: 1.5,
        wave_speed: 0.8,
        wave_frequency: 0.3,
        choppiness: 1.5,
        foam_threshold: 0.7,
        reflectivity: 0.6,
        edge_softness: 2.0,
    });

    entity
}
```

## Pool Preset

```rust
fn spawn_pool(world: &mut World, position: Vec3, size: Vec3) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | WATER,
        1
    )[0];

    world.set_local_transform(entity, LocalTransform {
        position,
        ..Default::default()
    });

    world.set_water(entity, Water {
        water_type: WaterType::Volumetric {
            shape: VolumetricShape::Box {
                half_extents: size * 0.5,
            },
        },
        base_color: Vec3::new(0.1, 0.2, 0.3),
        water_color: Vec3::new(0.2, 0.5, 0.7),
        wave_height: 0.05,
        wave_speed: 0.3,
        wave_frequency: 3.0,
        choppiness: 0.1,
        foam_threshold: 0.95,
        reflectivity: 0.4,
        edge_softness: 0.3,
    });

    entity
}
```

## Animating Water

Water animates automatically based on elapsed time. You can dynamically adjust properties:

```rust
fn stormy_weather(world: &mut World, water: Entity) {
    if let Some(w) = world.get_water_mut(water) {
        w.wave_height = 3.0;
        w.wave_speed = 2.0;
        w.choppiness = 2.5;
        w.foam_threshold = 0.5;
    }
}

fn calm_weather(world: &mut World, water: Entity) {
    if let Some(w) = world.get_water_mut(water) {
        w.wave_height = 0.3;
        w.wave_speed = 0.5;
        w.choppiness = 0.5;
        w.foam_threshold = 0.9;
    }
}
```

## Performance Considerations

- Planar water is cheaper than volumetric
- Reduce `wave_frequency` for better performance
- Lower `reflectivity` reduces reflection calculations
- Water rendering uses a dedicated render pass
