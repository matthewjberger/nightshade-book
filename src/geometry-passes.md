# Geometry Passes

Geometry passes render scene objects into the HDR color buffer and depth buffer. Each pass handles a different type of geometry.

## ClearPass

Clears `scene_color` to black and `depth` to 0.0 (reversed-Z far plane). Always runs first.

**Writes:** `scene_color`, `depth`

## SkyPass

Renders the sky/atmosphere background. Controlled by `world.resources.graphics.atmosphere`:

- `Atmosphere::None` - Solid background color (default)
- `Atmosphere::Sky` - Procedural clear sky gradient
- `Atmosphere::CloudySky` - Procedural sky with volumetric clouds
- `Atmosphere::Space` - Procedural starfield
- `Atmosphere::Nebula` - Procedural nebula with stars
- `Atmosphere::Sunset` - Procedural sunset gradient
- `Atmosphere::DayNight` - Procedural day/night cycle driven by hour parameter
- `Atmosphere::Hdr` - HDR environment cubemap

**Writes:** `scene_color`

## ScenePass

Basic scene rendering pass for simple objects.

**Reads/Writes:** `scene_color`, `depth`

## MeshPass

The main PBR mesh rendering pass. Renders all entities with `RENDER_MESH | MATERIAL_REF | GLOBAL_TRANSFORM`. Features:

- **PBR shading** with metallic-roughness workflow
- **Cascaded shadow mapping** - Samples the shadow depth texture
- **Spotlight shadows** - Samples the spotlight shadow atlas
- **Normal mapping** - Per-pixel normals from normal textures
- **Alpha modes** - Opaque, mask (alpha cutoff), and blend
- **Entity ID output** - Writes entity IDs for GPU picking
- **View normals output** - Writes view-space normals for SSAO/SSGI

**Reads:** `shadow_depth`, `spotlight_shadow_atlas`
**Writes:** `scene_color`, `depth`, `entity_id`, `view_normals`

## SkinnedMeshPass

Renders animated skeletal meshes. Reads bone matrices from the skinning buffer and transforms vertices on the GPU.

**Reads:** `shadow_depth`, `spotlight_shadow_atlas`
**Writes:** `scene_color`, `depth`

## WaterPass

Renders water surfaces with procedural wave displacement, reflections, and refractions.

**Reads/Writes:** `scene_color`, `depth`

## WaterMeshPass

Renders water mesh geometry with tessellation and displacement.

**Reads/Writes:** `scene_color`, `depth`

## GrassPass

GPU-instanced grass rendering. Renders thousands of grass blades using instance data from `GrassRegion` components. Supports wind animation and interactive bending via `GrassInteractor` components.

**Reads/Writes:** `scene_color`, `depth`

## DecalPass

Renders projected decals onto scene geometry. Decals sample the depth buffer to project textures onto surfaces.

**Reads/Writes:** `scene_color`, `depth`

## ParticlePass

GPU billboard particle rendering. Reads `ParticleEmitter` component data and renders camera-facing quads.

**Reads/Writes:** `scene_color`, `depth`

## TextPass

Renders 3D world-space text using the font atlas.

**Reads/Writes:** `scene_color`, `depth`

## HudPass

Renders screen-space HUD text. Unlike `TextPass`, HUD text is rendered in screen coordinates with configurable anchoring.

**Reads/Writes:** `scene_color`, `depth`

## LinesPass

Renders debug lines from `Lines` components. Useful for visualization, bounding boxes, and debugging.

**Reads/Writes:** `scene_color`, `depth`

## GridPass

Renders an infinite ground grid. Controlled by `world.resources.graphics.show_grid`.

**Reads/Writes:** `scene_color`, `depth`

## UiRectPass

Renders UI rectangles for the immediate-mode UI system.

## SelectionMaskPass

Generates a selection mask texture for selected entities. Used by the editor for selection outlines.

**Reads:** `depth`
**Writes:** `selection_mask`

## OutlinePass

Reads the selection mask and renders outlines around selected entities by detecting edges in the mask.

**Reads:** `selection_mask`
**Writes:** `scene_color`

## SDF Passes (feature: sdf_sculpt)

### SdfComputePass

Computes SDF brick maps on the GPU.

### SdfPass

Raymarches signed distance fields for real-time sculpting visualization.

## InteriorMappingPass

Renders interior mapping (parallax cubemap) for building windows.

## ProjectionPass / HiZPass

Hierarchical-Z buffer generation for occlusion culling.
