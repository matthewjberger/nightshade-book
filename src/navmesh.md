# Navigation Mesh

> **Live Demo:** [NavMesh](https://matthewberger.dev/nightshade/navmesh)

AI pathfinding using Recast navigation mesh generation, A*/Dijkstra/Greedy pathfinding, funnel path smoothing, and agent movement with local avoidance.

## How Navigation Meshes Work

A navigation mesh (navmesh) is a set of convex polygons (usually triangles) that represent the walkable surfaces of a level. Instead of testing every point in the world for walkability, AI agents pathfind through connected triangles, then smooth the resulting path through shared edges.

### Navmesh Generation (Recast Pipeline)

Nightshade uses the Recast algorithm (via the `rerecast` crate) to automatically generate a navmesh from world geometry. The pipeline has 13 steps:

1. **Build trimesh** - Collect all mesh vertices and indices from the scene
2. **Mark walkable triangles** - Classify each triangle by its slope angle against the walkable threshold
3. **Create heightfield** - Rasterize the scene into a voxel grid with configurable cell size and height
4. **Rasterize triangles** - Project each walkable triangle into the heightfield
5. **Filter obstacles** - Remove low-hanging obstacles, ledge spans, and low-height spans that agents can't traverse
6. **Compact heightfield** - Convert to a more efficient representation for region building
7. **Erode walkable area** - Shrink walkable areas by the agent radius to prevent wall clipping
8. **Build distance field** - Compute the distance from each cell to the nearest boundary
9. **Create regions** - Group connected cells into regions using watershed partitioning. `min_region_size` (default 8) filters tiny regions, `merge_region_size` (default 20) combines small adjacent regions
10. **Build contours** - Trace region boundaries into simplified contour polygons, controlled by `max_simplification_error`
11. **Convert to polygon mesh** - Triangulate contours into convex polygons (up to `max_vertices_per_polygon`, default 6)
12. **Generate detail mesh** - Add interior detail vertices for height accuracy, controlled by `detail_sample_dist` and `detail_sample_max_error`
13. **Convert to NavMeshWorld** - Build the engine's navmesh data structure with adjacency and spatial hash

### Pathfinding Algorithms

Three algorithms are available:

**A\*** (default) - Explores nodes ordered by `f = g + h` where `g` is the cost so far and `h` is the heuristic (straight-line distance to goal). Finds the optimal path efficiently by prioritizing nodes closer to the destination.

**Dijkstra** - Explores nodes ordered only by `g` cost, ignoring direction to goal. Explores more nodes but guarantees the shortest path even with complex cost functions.

**Greedy Best-First** - Explores nodes ordered only by heuristic `h`, ignoring path cost. Very fast but may not find optimal paths, especially around concave obstacles.

All three operate on the triangle adjacency graph, where edges connect triangles that share an edge and costs are the distances between triangle centers.

### Funnel Algorithm (Path Smoothing)

Raw paths through the navmesh are sequences of triangle centers, which zig-zag unnecessarily. The **funnel algorithm** produces smooth, natural-looking paths:

1. **Portal collection** - Extract the shared edges (portals) between consecutive triangles in the path
2. **Funnel narrowing** - Maintain a funnel (left and right boundaries) that starts wide at the first portal. As you advance through portals, narrow the funnel. When a portal would flip the funnel inside-out, emit the funnel apex as a waypoint and restart
3. **Simplification** - Remove waypoints that don't improve the path within an epsilon tolerance (collinear point removal)

The result is the shortest path through the triangle corridor that doesn't cross any triangle boundaries.

### Agent Movement System

Five systems run each frame via `run_navmesh_systems`:

1. **Triangle tracking** - Finds which navmesh triangle each agent currently occupies using point-in-triangle tests with barycentric coordinates
2. **Path processing** - Agents in `PathPending` state get their path computed, smoothed, and simplified. State transitions to `Moving` or `NoPath`
3. **Local avoidance** - Repulsive forces between nearby agents (within `agent_radius * 2.5`) prevent crowding. Avoidance velocity is blended at 25% with the primary movement direction
4. **Movement** - Advances agents along waypoints at their configured speed. Samples navmesh height at each new position using barycentric interpolation for vertical alignment. Maximum step height of 1.0 unit prevents teleporting through terrain
5. **Surface snapping** - Idle and arrived agents are snapped to the navmesh surface when their Y position drifts more than 0.01 units

## Enabling NavMesh

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "navmesh"] }
```

## Generating a NavMesh

```rust
use nightshade::ecs::navmesh::*;

fn setup_navmesh(world: &mut World) {
    let config = RecastNavMeshConfig::default();
    generate_navmesh_recast(world, &config);
}
```

## NavMesh Configuration

```rust
pub struct RecastNavMeshConfig {
    pub agent_radius: f32,              // Character collision radius (0.4)
    pub agent_height: f32,              // Character height (1.8)
    pub cell_size_fraction: f32,        // XZ voxel resolution divisor (3.0)
    pub cell_height_fraction: f32,      // Y voxel resolution divisor (6.0)
    pub walkable_climb: f32,            // Max step height (0.4)
    pub walkable_slope_angle: f32,      // Max walkable slope in degrees (45)
    pub min_region_size: i32,           // Min region area (8)
    pub merge_region_size: i32,         // Region merge threshold (20)
    pub max_simplification_error: f32,  // Contour simplification (1.3)
    pub max_vertices_per_polygon: i32,  // Polygon complexity (6)
    pub detail_sample_dist: f32,        // Detail mesh sampling (6.0)
    pub detail_sample_max_error: f32,   // Detail mesh error (1.0)
}
```

## Agent State Machine

```
Idle → PathPending → Moving → Arrived
              ↓
           NoPath
```

## Creating Agents

```rust
let agent = spawn_navmesh_agent(world, position, speed);
```

## Setting Destinations

```rust
set_agent_destination(world, agent, target_position);
```

## Running the Navigation System

```rust
fn run_systems(&mut self, world: &mut World) {
    run_navmesh_systems(world);
}
```

## Checking Agent Status

```rust
match get_agent_state(world, agent) {
    NavMeshAgentState::Idle => { /* waiting */ }
    NavMeshAgentState::PathPending => { /* computing */ }
    NavMeshAgentState::Moving => { /* walking */ }
    NavMeshAgentState::Arrived => { /* at destination */ }
    NavMeshAgentState::NoPath => { /* unreachable */ }
}
```

## Patrol Behavior

```rust
struct PatrolBehavior {
    waypoints: Vec<Vec3>,
    current_waypoint: usize,
}

fn update_patrol(world: &mut World, agent: Entity, patrol: &mut PatrolBehavior) {
    if matches!(get_agent_state(world, agent), NavMeshAgentState::Arrived) {
        patrol.current_waypoint = (patrol.current_waypoint + 1) % patrol.waypoints.len();
        set_agent_destination(world, agent, patrol.waypoints[patrol.current_waypoint]);
    }
}
```

## Debug Visualization

```rust
set_navmesh_debug_draw(world, true);
```

The debug visualization draws:
- Navmesh triangles as green wireframe (offset 0.15 units above surface)
- Agent paths as yellow lines between waypoints
- Current path segment as cyan from agent to next waypoint
- Waypoints as orange crosses
- Destination as a magenta diamond marker with a vertical pole

## NavMeshWorld Resource

The generated navmesh is stored in `world.resources.navmesh` as a `NavMeshWorld`:

- **Vertices** - All navmesh vertex positions
- **Triangles** - Walkable triangles with center, normal, area, and edge indices
- **Edges** - Triangle edges with indices of the two triangles they belong to (for portal detection)
- **Adjacency** - `HashMap<usize, Vec<NavMeshConnection>>` mapping each triangle to its neighbors with traversal costs
- **Spatial Hash** - Grid-based spatial index for fast point-in-triangle queries
