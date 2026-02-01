# Lighting

> **Live Demos:** [Lights](https://matthewberger.dev/nightshade/lights) | [Shadows](https://matthewberger.dev/nightshade/shadows) | [Spotlight Shadows](https://matthewberger.dev/nightshade/spotlight_shadows)

Nightshade supports three types of lights: directional, point, and spot lights.

## Light Types

### Directional Light (Sun)

Illuminates the entire scene from a direction, simulating distant light sources like the sun:

```rust
fn spawn_sun(world: &mut World) -> Entity {
    let entity = world.spawn_entities(
        LIGHT | LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY,
        1
    )[0];

    world.set_light(entity, Light {
        light_type: LightType::Directional,
        color: Vec3::new(1.0, 0.98, 0.95),
        intensity: 2.0,
        cast_shadows: true,
        shadow_bias: 0.001,
        ..Default::default()
    });

    // Point light downward at an angle
    world.set_local_transform(entity, LocalTransform {
        rotation: nalgebra_glm::quat_look_at(
            &Vec3::new(-0.5, -1.0, -0.3).normalize(),
            &Vec3::y(),
        ),
        ..Default::default()
    });

    entity
}
```

### Point Light

Emits light in all directions from a point:

```rust
fn spawn_point_light(world: &mut World, position: Vec3, color: Vec3, intensity: f32) -> Entity {
    let entity = world.spawn_entities(
        LIGHT | LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY,
        1
    )[0];

    world.set_light(entity, Light {
        light_type: LightType::Point,
        color,
        intensity,
        range: 10.0,
        cast_shadows: false,
        ..Default::default()
    });

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        ..Default::default()
    });

    entity
}
```

### Spot Light

Cone-shaped light, perfect for flashlights or stage lighting:

```rust
fn spawn_spotlight(world: &mut World, position: Vec3, direction: Vec3) -> Entity {
    let entity = world.spawn_entities(
        LIGHT | LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LOCAL_TRANSFORM_DIRTY,
        1
    )[0];

    world.set_light(entity, Light {
        light_type: LightType::Spot,
        color: Vec3::new(1.0, 0.95, 0.9),
        intensity: 15.0,
        range: 20.0,
        inner_cone_angle: 0.2,  // Full intensity cone
        outer_cone_angle: 0.5,  // Falloff cone
        cast_shadows: true,
        shadow_bias: 0.002,
    });

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        rotation: nalgebra_glm::quat_look_at(&direction.normalize(), &Vec3::y()),
        ..Default::default()
    });

    entity
}
```

## Light Properties

| Property | Description |
|----------|-------------|
| `color` | RGB color of the light |
| `intensity` | Brightness multiplier |
| `range` | Maximum distance for point/spot lights |
| `cast_shadows` | Whether this light creates shadows |
| `shadow_bias` | Offset to reduce shadow acne |
| `inner_cone_angle` | Spot light inner cone (full intensity) |
| `outer_cone_angle` | Spot light outer cone (falloff edge) |

## Dynamic Lighting

### Flickering Light

Create a flickering fire/torch effect:

```rust
fn update_flickering_light(world: &mut World, light_entity: Entity) {
    let time = world.resources.window.timing.uptime_milliseconds as f32 / 1000.0;

    if let Some(light) = world.get_light_mut(light_entity) {
        let flicker1 = (time * 8.0).sin() * 0.15;
        let flicker2 = (time * 12.5).sin() * 0.1;
        let flicker3 = (time * 23.0).sin() * 0.08;

        let base_intensity = 3.5;
        light.intensity = base_intensity + flicker1 + flicker2 + flicker3;
    }
}
```

### Color Cycling

Animated color changes:

```rust
fn update_disco_light(world: &mut World, light_entity: Entity) {
    let time = world.resources.window.timing.uptime_milliseconds as f32 / 1000.0;

    if let Some(light) = world.get_light_mut(light_entity) {
        light.color = Vec3::new(
            (time * 2.0).sin() * 0.5 + 0.5,
            (time * 2.0 + 2.094).sin() * 0.5 + 0.5,
            (time * 2.0 + 4.188).sin() * 0.5 + 0.5,
        );
    }
}
```

## Flashlight (Camera-Attached Spotlight)

Attach a spotlight to the camera for a flashlight effect:

```rust
fn update_flashlight(world: &mut World, flashlight: Entity) {
    let Some(camera) = world.resources.active_camera else { return };
    let Some(camera_transform) = world.get_global_transform(camera) else { return };

    let position = camera_transform.translation();
    let forward = camera_transform.forward();

    if let Some(transform) = world.get_local_transform_mut(flashlight) {
        transform.translation = position;
        transform.rotation = nalgebra_glm::quat_look_at(&forward, &Vec3::y());
    }
    world.mark_local_transform_dirty(flashlight);
}
```

## Shadow Settings

Configure shadow quality through graphics resources:

```rust
world.resources.graphics.shadow_map_size = 2048;
world.resources.graphics.shadow_cascades = 4;
world.resources.graphics.shadow_distance = 100.0;
```

## Ambient Light

Set ambient lighting through the atmosphere:

```rust
world.resources.graphics.atmosphere = Atmosphere::Sky;
world.resources.graphics.ambient_intensity = 0.3;
```

## Multiple Lights

Nightshade supports multiple lights in a scene:

```rust
fn setup_lighting(world: &mut World) {
    // Main sun
    spawn_sun(world);

    // Fill lights
    spawn_point_light(world, Vec3::new(5.0, 3.0, 5.0), Vec3::new(0.8, 0.9, 1.0), 2.0);
    spawn_point_light(world, Vec3::new(-5.0, 3.0, -5.0), Vec3::new(1.0, 0.8, 0.7), 1.5);

    // Accent spotlight
    spawn_spotlight(world, Vec3::new(0.0, 5.0, 0.0), Vec3::new(0.0, -1.0, 0.0));
}
```
