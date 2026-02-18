# Shadow Mapping

> **Live Demos:** [Shadows](https://matthewberger.dev/nightshade/shadows) | [Spotlight Shadows](https://matthewberger.dev/nightshade/spotlight_shadows)

Nightshade uses cascaded shadow mapping for directional lights and a shadow atlas for spotlights.

## How Shadow Mapping Works

Shadow mapping is a two-pass technique. In the first pass, the scene is rendered from the light's point of view into a depth-only texture (the shadow map). In the second pass (the main geometry pass), each fragment projects itself into the light's coordinate space and compares its depth against the stored shadow map value. If the fragment is farther from the light than the shadow map records, something closer is blocking the light, and the fragment is in shadow.

The core idea is that the shadow map captures the "closest surface to the light" at every pixel. Any surface behind that closest surface must be occluded.

### The Resolution Problem

A single shadow map has finite resolution. A directional light (like the sun) illuminates the entire scene, but the shadow map must cover it all. Objects near the camera need high-resolution shadows (you can see the shadow edges clearly), while distant objects can tolerate lower resolution. A single shadow map wastes resolution on distant geometry while providing insufficient detail nearby.

## Cascaded Shadow Maps (CSM)

CSM solves this by splitting the camera's view frustum into multiple depth ranges (cascades), each with its own shadow map. Near cascades cover a small area at high texel density. Far cascades cover a large area at lower density.

The `ShadowDepthPass` renders 4 shadow cascades (`NUM_SHADOW_CASCADES = 4`) into a single large depth texture:

- **Cascade 0** - Near range, highest detail (covers roughly 0-10% of the view distance)
- **Cascade 1** - Mid-near range (covers roughly 10-30%)
- **Cascade 2** - Mid-far range (covers roughly 30-60%)
- **Cascade 3** - Far range, lowest detail (covers roughly 60-100%)

### Shadow Map Resolution

| Platform | Resolution |
|----------|-----------|
| Native | 8192 x 8192 |
| WASM | 4096 x 4096 |

Each cascade uses a quarter of the texture (rendered into its own viewport region), giving each cascade an effective resolution of 4096x4096 on native.

### How Cascades Work

Each frame, the engine:

1. **Frustum computation** - Computes the camera's view frustum (the truncated pyramid defined by the near plane, far plane, and field of view)
2. **Frustum splitting** - Divides the frustum into 4 depth ranges using a logarithmic-linear split scheme. Logarithmic splitting gives more resolution to nearby cascades, while linear splitting distributes more evenly. A blend between the two (typically 0.5-0.8 toward logarithmic) produces good results across most scenes.
3. **Tight projection fitting** - For each cascade, computes the 8 corner points of that frustum slice, transforms them into light space, and builds a tight orthographic projection matrix that just encompasses those points. This minimizes wasted shadow map texels.
4. **Shadow rendering** - Renders all shadow-casting meshes from the directional light's perspective into each cascade's viewport region of the shadow texture.

During the mesh pass, each fragment determines which cascade to sample based on its distance from the camera. The shader selects the highest-resolution cascade that contains the fragment, projects it into that cascade's light-space coordinates, and performs the depth comparison.

### Cascade Selection and Blending

At cascade boundaries, shadows can exhibit visible seams where resolution changes abruptly. The fragment shader compares the fragment's view-space depth against cascade split distances to choose the appropriate cascade. Some implementations blend between adjacent cascades at boundaries for smooth transitions.

## Spotlight Shadow Atlas

Spotlights use a separate shadow atlas:

| Platform | Atlas Size |
|----------|-----------|
| Native | 4096 x 4096 |
| WASM | 1024 x 1024 |

Each spotlight that has `cast_shadows: true` is assigned a slot in the atlas. The atlas is subdivided to accommodate multiple spotlights.

## Enabling Shadows

### Directional Light Shadows

`spawn_sun()` creates a directional light with shadows enabled by default:

```rust
let sun = spawn_sun(world);
```

To manually configure:

```rust
world.set_light(entity, Light {
    light_type: LightType::Directional,
    cast_shadows: true,
    shadow_bias: 0.005,
    ..Default::default()
});
```

### Spotlight Shadows

```rust
world.set_light(entity, Light {
    light_type: LightType::Spot,
    cast_shadows: true,
    shadow_bias: 0.002,
    inner_cone_angle: 0.2,
    outer_cone_angle: 0.5,
    ..Default::default()
});
```

### Per-Mesh Shadow Casting

Control which meshes cast shadows:

```rust
world.set_casts_shadow(entity, CastsShadow(true));
world.set_casts_shadow(entity, CastsShadow(false));
```

## Shadow Quality

### Shadow Bias

Shadow acne occurs because the shadow map has limited resolution. A surface that should be lit samples the shadow map at a slightly different position than where it was rendered, and floating-point imprecision causes the surface to falsely report itself as in shadow. This creates a Moiré-like pattern of alternating lit and shadowed stripes on surfaces.

Shadow bias adds a small depth offset during the shadow comparison, pushing the comparison point slightly toward the light so surfaces don't self-shadow. The trade-off is that too much bias causes **peter-panning**: shadows detach from the base of objects because the bias pushes them too far away.

`shadow_bias` controls this offset:

```rust
light.shadow_bias = 0.005;  // Good default for directional lights
light.shadow_bias = 0.002;  // Good default for spotlights
```

Spotlights need less bias because their shadow maps cover a smaller area with higher effective resolution.

### Cascade Settings

Shadow cascades are configured at the renderer level. The engine uses 4 cascades (`NUM_SHADOW_CASCADES = 4`) with the shadow map resolution set at initialization (8192 native, 4096 WASM). These are not runtime-configurable through `Graphics` resources.
