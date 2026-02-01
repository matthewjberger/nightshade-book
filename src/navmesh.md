# Navigation Mesh

> **Live Demo:** [NavMesh](https://matthewberger.dev/nightshade/navmesh)

AI pathfinding using Recast navigation mesh generation.

## Enabling NavMesh

NavMesh requires the `navmesh` feature:

```toml
[dependencies]
nightshade = { git = "...", features = ["engine", "navmesh"] }
```

## Generating a NavMesh

Generate a navigation mesh from geometry:

```rust
use nightshade::ecs::navmesh::*;

fn setup_navmesh(world: &mut World) {
    // Get terrain or level geometry
    let vertices: Vec<Vec3> = get_level_vertices();
    let indices: Vec<[u32; 3]> = get_level_indices();

    let config = RecastNavMeshConfig {
        cell_size: 0.15,
        cell_height: 0.1,
        agent_height: 1.0,
        agent_radius: 0.4,
        agent_max_climb: 0.3,
        agent_max_slope: 45.0,
        region_min_size: 8,
        region_merge_size: 20,
        edge_max_len: 12.0,
        edge_max_error: 1.3,
        detail_sample_dist: 6.0,
        detail_sample_max_error: 1.0,
    };

    generate_navmesh_recast(world, &vertices, &indices, &config);
}
```

## NavMesh Configuration

| Parameter | Description |
|-----------|-------------|
| `cell_size` | Horizontal voxel resolution |
| `cell_height` | Vertical voxel resolution |
| `agent_height` | Agent height for walkability |
| `agent_radius` | Agent radius for clearance |
| `agent_max_climb` | Maximum step height |
| `agent_max_slope` | Maximum walkable slope (degrees) |

## Creating NavMesh Agents

```rust
fn spawn_npc(world: &mut World, position: Vec3) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | NAV_MESH_AGENT,
        1
    )[0];

    world.set_local_transform(entity, LocalTransform {
        translation: position,
        ..Default::default()
    });

    world.set_nav_mesh_agent(entity, NavMeshAgent {
        speed: 3.0,
        acceleration: 10.0,
        turning_speed: 8.0,
        stopping_distance: 0.5,
        target: None,
        path: Vec::new(),
        path_index: 0,
    });

    entity
}
```

## Setting Agent Destination

```rust
fn set_npc_destination(world: &mut World, agent: Entity, target: Vec3) {
    set_agent_destination(world, agent, target);
}
```

## Updating Agents

Call the navigation system each frame:

```rust
fn run_systems(&mut self, world: &mut World) {
    update_navmesh_agents(world);
}
```

## Checking Path Status

```rust
fn has_reached_destination(world: &World, agent: Entity) -> bool {
    if let Some(nav_agent) = world.get_nav_mesh_agent(agent) {
        nav_agent.target.is_none() || nav_agent.path.is_empty()
    } else {
        true
    }
}

fn get_remaining_distance(world: &World, agent: Entity) -> f32 {
    if let Some(nav_agent) = world.get_nav_mesh_agent(agent) {
        if let Some(agent_pos) = world.get_local_transform(agent).map(|t| t.translation) {
            if let Some(target) = nav_agent.target {
                return (target - agent_pos).magnitude();
            }
        }
    }
    0.0
}
```

## Pathfinding Queries

Find paths without agents:

```rust
fn find_path(world: &World, start: Vec3, end: Vec3) -> Option<Vec<Vec3>> {
    query_path(world, start, end)
}

fn is_point_walkable(world: &World, point: Vec3) -> bool {
    is_on_navmesh(world, point)
}
```

## Patrol Behavior

```rust
struct PatrolBehavior {
    waypoints: Vec<Vec3>,
    current_waypoint: usize,
}

fn update_patrol(world: &mut World, agent: Entity, patrol: &mut PatrolBehavior) {
    if has_reached_destination(world, agent) {
        patrol.current_waypoint = (patrol.current_waypoint + 1) % patrol.waypoints.len();
        let target = patrol.waypoints[patrol.current_waypoint];
        set_agent_destination(world, agent, target);
    }
}
```

## Chase Behavior

```rust
fn update_chase(world: &mut World, agent: Entity, target_entity: Entity) {
    if let Some(target_pos) = world.get_local_transform(target_entity).map(|t| t.translation) {
        // Only update path periodically to avoid constant recalculation
        set_agent_destination(world, agent, target_pos);
    }
}
```

## NavMesh Areas

Define different terrain costs:

```rust
let config = RecastNavMeshConfig {
    // Base configuration...
    ..Default::default()
};

// Areas can be marked during navmesh generation
// Higher cost = agents avoid this area
// Area 0: Ground (cost 1.0)
// Area 1: Road (cost 0.5 - preferred)
// Area 2: Mud (cost 3.0 - avoided)
```

## Off-Mesh Connections

Link disconnected navmesh regions (ladders, teleports):

```rust
fn add_ladder_connection(world: &mut World, start: Vec3, end: Vec3) {
    add_offmesh_connection(world, start, end, true);  // bidirectional = true
}

fn add_one_way_jump(world: &mut World, start: Vec3, end: Vec3) {
    add_offmesh_connection(world, start, end, false);  // one-way
}
```

## Debug Visualization

Draw the navmesh for debugging:

```rust
fn draw_navmesh_debug(world: &mut World) {
    if let Some(navmesh) = &world.resources.navmesh_world.navmesh {
        for triangle in navmesh.triangles() {
            // Draw triangle edges as lines
            draw_debug_line(world, triangle.v0, triangle.v1, Vec4::new(0.0, 1.0, 0.0, 1.0));
            draw_debug_line(world, triangle.v1, triangle.v2, Vec4::new(0.0, 1.0, 0.0, 1.0));
            draw_debug_line(world, triangle.v2, triangle.v0, Vec4::new(0.0, 1.0, 0.0, 1.0));
        }
    }
}
```
