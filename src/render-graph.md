# The Render Graph

> **Live Demos:** [Custom Pass](https://matthewberger.dev/nightshade/custom_pass) | [Custom Multipass](https://matthewberger.dev/nightshade/custom_multipass) | [Render Layers](https://matthewberger.dev/nightshade/render_layers)

The render graph is a dependency-driven frame graph that automatically schedules GPU work. Instead of manually ordering render passes, you declare what each pass reads and writes, and the graph figures out the rest.

## The Problem: Manual Pass Ordering

A modern renderer has dozens of passes: shadow maps, geometry, SSAO, SSR, bloom, tonemapping, UI. Each reads from and writes to intermediate textures. Without automation, you must:

1. **Manually order passes** - Shadow maps before geometry, geometry before SSAO, SSAO before compositing. Add one pass and you must figure out where it fits in the chain. Reorder one pass and you break three others.
2. **Manually manage textures** - Allocate intermediate textures, track which ones are alive when, decide when to clear vs load, when to store vs discard. Get it wrong and you see black screens or stale data from previous frames.
3. **Manually optimize memory** - SSAO's intermediate texture and SSR's intermediate texture might never be alive at the same time. Without aliasing, you waste VRAM on textures that could share the same memory.
4. **Manually handle dynamic passes** - Disabling bloom shouldn't require rewriting the compositing pass's inputs. But with hardcoded ordering, every conditional pass is an `if` statement that must be threaded through the entire pipeline.

A render graph (also called a frame graph, as described in the Frostbite GDC 2017 talk "FrameGraph: Extensible Rendering Architecture in Frostbite") solves all of this. You describe what each pass needs, and the graph handles ordering, memory, and lifecycle.

## How It Works

The render graph models the frame as a **directed acyclic graph (DAG)** where:

- **Nodes** are render passes
- **Edges** are resource dependencies (an edge from A to B means "A produces data that B consumes")

This is the same abstraction as a build system (Make, Bazel) or a task scheduler. Given the dependency edges, a topological sort produces a valid execution order. The graph can then analyze resource lifetimes across that order to alias memory, compute load/store operations, and cull unused passes.

The key insight is that passes declare their dependencies **declaratively** through named slots, not **imperatively** through explicit ordering. This makes the system composable: adding a new pass means declaring what it reads and writes, not editing every other pass that touches the same resources.

## Why a Render Graph?

- **Automatic ordering** - Passes are topologically sorted based on read/write dependencies
- **Automatic memory management** - Transient textures with non-overlapping lifetimes share GPU memory
- **Automatic load/store ops** - The graph determines whether to Clear, Load, Store, or Discard each attachment
- **Dead pass culling** - Passes that don't contribute to any external output are automatically skipped
- **Runtime toggling** - Passes can be enabled/disabled at runtime without recompiling the graph

## The RenderGraph Struct

```rust
pub struct RenderGraph<C = ()> {
    graph: DiGraph<GraphNode<C>, ResourceId>,  // petgraph directed graph
    pass_nodes: HashMap<String, NodeIndex>,     // pass name -> graph node
    resources: RenderGraphResources,            // texture/buffer descriptors and handles
    execution_order: Vec<NodeIndex>,            // topologically sorted pass order
    store_ops: HashMap<ResourceId, StoreOp>,    // per-resource store operations
    clear_ops: HashSet<(NodeIndex, ResourceId)>,// which passes clear which resources
    aliasing_info: Option<ResourceAliasingInfo>,// memory sharing between transients
    culled_passes: HashSet<NodeIndex>,          // passes removed by dead-pass culling
    // ...
}
```

The generic parameter `C` is the "configs" type passed to passes during execution. Nightshade uses `RenderGraph<World>` so passes can read ECS state.

## Lifecycle

### 1. Setup Phase (once at startup)

```rust
let mut graph = RenderGraph::new();

// Declare textures
let depth = graph.add_depth_texture("depth")
    .size(1920, 1080)
    .clear_depth(0.0)
    .transient();

let scene_color = graph.add_color_texture("scene_color")
    .format(wgpu::TextureFormat::Rgba16Float)
    .size(1920, 1080)
    .clear_color(wgpu::Color::BLACK)
    .transient();

let swapchain = graph.add_color_texture("swapchain")
    .format(surface_format)
    .external();

// Add passes with slot bindings
graph.add_pass(
    Box::new(clear_pass),
    &[("color", scene_color), ("depth", depth)],
)?;

graph.add_pass(
    Box::new(mesh_pass),
    &[("color", scene_color), ("depth", depth)],
)?;

graph.add_pass(
    Box::new(blit_pass),
    &[("input", scene_color), ("output", swapchain)],
)?;

// Compile: build edges, sort, compute aliasing
graph.compile()?;
```

### 2. Per-Frame Execution

```rust
// Provide the swapchain texture for this frame
graph.set_external_texture(swapchain_id, swapchain_view, width, height);

// Execute all passes, get command buffers
let command_buffers = graph.execute(&device, &queue, &world)?;

// Submit to GPU
queue.submit(command_buffers);
```

## Key Methods

| Method | Description |
|--------|-------------|
| `new()` | Create an empty graph |
| `add_color_texture()` | Declare a color render target (returns builder) |
| `add_depth_texture()` | Declare a depth buffer (returns builder) |
| `add_buffer()` | Declare a GPU buffer (returns builder) |
| `add_pass()` | Add a pass with slot-to-resource bindings |
| `pass()` | Fluent pass builder (alternative to `add_pass`) |
| `compile()` | Build dependency graph, topological sort, compute aliasing |
| `execute()` | Prepare and run all passes, return command buffers |
| `set_external_texture()` | Provide an external texture (e.g. swapchain) each frame |
| `set_pass_enabled()` | Enable/disable a pass at runtime |
| `get_pass_mut()` | Access a pass for runtime configuration |
| `resize_transient_resource()` | Change dimensions of a transient texture |

## Compilation Steps

When `compile()` is called:

1. **Build dependency edges** - For each resource, the graph creates an edge from writer to reader
2. **Topological sort** - Passes are sorted so every pass executes after its dependencies
3. **Compute store ops** - Determine Store vs Discard for each resource write
4. **Compute clear ops** - Determine which pass performs the initial Clear for each resource
5. **Compute resource lifetimes** - Track first_use and last_use for each transient resource
6. **Compute resource aliasing** - Transient resources with non-overlapping lifetimes share GPU memory
7. **Dead pass culling** - Passes that don't contribute to external outputs are marked for skipping

## Sub-Chapters

- [Resources & Textures](render-graph-resources.md) - Resource types, builders, external vs transient
- [Passes & the PassNode Trait](render-graph-passes.md) - Implementing custom passes
- [Dependency Resolution & Scheduling](render-graph-scheduling.md) - How passes are ordered
- [Resource Aliasing & Memory](render-graph-aliasing.md) - GPU memory sharing
- [Custom Passes](render-graph-custom.md) - Full examples of custom rendering
