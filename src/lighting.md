# Lighting

> **Live Demos:** [Lights](https://matthewberger.dev/nightshade/lights) | [Shadows](https://matthewberger.dev/nightshade/shadows) | [Spotlight Shadows](https://matthewberger.dev/nightshade/spotlight_shadows)

Nightshade supports three types of lights: directional, point, and spot lights.

## Light Types

### Directional Light (Sun)

Illuminates the entire scene from a direction, simulating distant light sources like the sun:

```rust
use nightshade::prelude::*;

let sun = spawn_sun(world);
```

`spawn_sun` returns the `Entity` for the directional light, which you can further configure:

```rust
if let Some(light) = world.get_light_mut(sun) {
    light.color = Vec3::new(1.0, 0.98, 0.95);
    light.intensity = 2.0;
}
```

### Point Light

Emits light in all directions from a point:

```rust
fn create_point_light(world: &mut World, position: Vec3, color: Vec3, intensity: f32) -> Entity {
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
fn create_spotlight(world: &mut World, position: Vec3, direction: Vec3) -> Entity {
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
    let forward = camera_transform.forward_vector();

    if let Some(transform) = world.get_local_transform_mut(flashlight) {
        transform.translation = position;
        transform.rotation = nalgebra_glm::quat_look_at(&forward, &Vec3::y());
    }
    world.mark_local_transform_dirty(flashlight);
}
```

## How Lighting Works

Nightshade uses a **clustered forward rendering** pipeline. The view frustum is divided into a 16x9x24 grid of clusters. A compute shader assigns each light to the clusters it overlaps, producing a per-cluster light list (up to 256 lights per cluster). During the mesh pass, each fragment looks up its cluster and only evaluates the lights assigned to it, avoiding the cost of testing every light for every pixel.

### PBR Lighting Model

All lights are evaluated using the **Cook-Torrance microfacet BRDF**:

- **Normal Distribution Function (D)**: Trowbridge-Reitz GGX models the statistical distribution of microfacet orientations. The squared roughness parameter (`a = roughness * roughness`) controls how concentrated the specular highlight is.

- **Geometry Function (G)**: Schlick-Beckmann approximation with Smith's method accounts for self-shadowing between microfacets. Two terms are combined: one for the view direction and one for the light direction.

- **Fresnel (F)**: Schlick's approximation computes how reflectivity changes with viewing angle. For dielectrics, F0 is derived from the index of refraction. For metals, F0 equals the base color.

The final light contribution per light is:

```
(kD * albedo / PI + specular) * radiance * NdotL
```

where `kD = (1 - F) * (1 - metallic)` ensures metals have no diffuse component.

### Image-Based Lighting

Ambient lighting comes from two pre-computed cubemaps:

- **Irradiance map**: Pre-convolved diffuse environment lighting, sampled in the surface normal direction
- **Prefiltered environment map**: 5 mip levels of increasingly blurred specular reflections, sampled in the reflection direction at a mip level determined by roughness

A 2D BRDF lookup texture (computed via the split-sum approximation) combines with the prefiltered map to produce the final specular IBL contribution.

## Atmosphere

Set the sky rendering mode:

```rust
world.resources.graphics.atmosphere = Atmosphere::Sky;
```

## Multiple Lights

Nightshade supports multiple lights in a scene. Create point and spot lights manually as shown above:

```rust
fn setup_lighting(world: &mut World) {
    spawn_sun(world);

    create_point_light(world, Vec3::new(5.0, 3.0, 5.0), Vec3::new(0.8, 0.9, 1.0), 2.0);
    create_point_light(world, Vec3::new(-5.0, 3.0, -5.0), Vec3::new(1.0, 0.8, 0.7), 1.5);

    create_spotlight(world, Vec3::new(0.0, 5.0, 0.0), Vec3::new(0.0, -1.0, 0.0));
}
```
