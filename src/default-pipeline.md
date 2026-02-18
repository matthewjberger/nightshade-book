# The Default Pipeline

The engine constructs a default render graph with all built-in passes. This chapter shows the complete pass ordering and data flow.

## Pass Execution Order

The graph topologically sorts these passes based on their dependencies. The typical execution order is:

```
1.  ClearPass           - Clear scene_color and depth
2.  ShadowDepthPass     - Render cascaded shadow maps + spotlight shadows
3.  SkyPass             - Render procedural atmosphere to scene_color
4.  ScenePass           - Render scene objects (simple path) to scene_color
5.  MeshPass            - Render PBR meshes with shadows and lighting
6.  SkinnedMeshPass     - Render animated skeletal meshes
7.  WaterPass           - Render water surface
8.  WaterMeshPass       - Render water mesh displacement
9.  GrassPass           - Render GPU-instanced grass
10. GridPass            - Render infinite ground grid
11. LinesPass           - Render debug lines
12. SelectionMaskPass   - Generate selection mask for editor
13. OutlinePass         - Render selection outline

    --- User passes (from configure_render_graph) ---

14. BloomPass           - HDR bloom (default)
15. PostProcessPass     - Tonemapping and compositing (default)
16. BlitPass            - Copy to swapchain (default)

    --- UI passes ---

17. EguiPass            - egui UI (if egui feature enabled)
```

## Data Flow Diagram

```
                    shadow_depth
ShadowDepthPass --> spotlight_shadow_atlas
                        |
                        v
SkyPass ----------> scene_color <-- ClearPass
                        |
MeshPass ----------> scene_color, depth, entity_id, view_normals
                        |
SkinnedMeshPass --> scene_color, depth
                        |
WaterPass --------> scene_color, depth
GrassPass --------> scene_color, depth
GridPass ---------> scene_color, depth
LinesPass --------> scene_color, depth
                        |
                        v
BloomPass --------> bloom (half-res)
                        |
PostProcessPass --> compute_output
    reads: scene_color, bloom, ssao
                        |
BlitPass ---------> swapchain
```

## Core Passes (Always Present)

These passes are added by the engine during renderer initialization. They cannot be removed, but can be disabled at runtime.

### ClearPass
Clears `scene_color` to black and `depth` to 0.0 (reversed-Z far plane).

### SkyPass
Renders the procedural atmosphere or solid background color. Controlled by `world.resources.graphics.atmosphere`.

### ScenePass
A simple scene rendering pass for basic objects.

### ShadowDepthPass
Renders the shadow map. See [Shadow Mapping](shadows.md).

### MeshPass
The main PBR mesh rendering pass. See [Geometry Passes](geometry-passes.md).

### SkinnedMeshPass
Renders animated skeletal meshes with GPU skinning.

### Selection Passes
`SelectionMaskPass` and `OutlinePass` generate and render editor selection outlines.

## User-Configurable Passes (Default)

These passes are added by the default `configure_render_graph()` implementation. Override this method to replace them.

### BloomPass
Reads `scene_color`, writes a half-resolution `bloom` texture.

### PostProcessPass
Reads `scene_color`, `bloom`, and `ssao`. Performs tonemapping and compositing. Writes to `compute_output`.

### BlitPass
Copies `compute_output` to `swapchain` for presentation.

## Adding SSAO/SSGI/SSR

The default pipeline only includes bloom and tonemapping. To enable SSAO, SSGI, or SSR, override `configure_render_graph()` and add the appropriate passes. See [Post-Processing](post-processing.md) for the full list of available post-processing passes and [Custom Passes](render-graph-custom.md) for examples.
