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

Generate a navigation mesh from world geometry:

```rust
use nightshade::ecs::navmesh::*;

fn setup_navmesh(world: &mut World) {
    let config = RecastNavMeshConfig::default();
    generate_navmesh_recast(world, &config);
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
    let agent = spawn_navmesh_agent(world, position, 0.4, 1.0);
    agent
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
    let dt = world.resources.window.timing.delta_time;
    run_navmesh_systems(world, dt);
}
```

## Checking Path Status

```rust
fn has_reached_destination(world: &World, agent: Entity) -> bool {
    if let Some(nav_agent) = world.get_navmesh_agent(agent) {
        nav_agent.target_position.is_none() || nav_agent.current_path.is_empty()
    } else {
        true
    }
}

fn get_remaining_distance(world: &World, agent: Entity) -> f32 {
    if let Some(nav_agent) = world.get_navmesh_agent(agent) {
        if let Some(agent_pos) = world.get_local_transform(agent).map(|t| t.translation) {
            if let Some(target) = nav_agent.target_position {
                return (target - agent_pos).magnitude();
            }
        }
    }
    0.0
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

## Debug Visualization

Draw the navmesh for debugging:

```rust
fn draw_navmesh_debug(world: &mut World) {
    if let Some(navmesh) = &world.resources.navmesh.navmesh {
        for triangle in navmesh.triangles() {
            // Draw triangle edges as lines
            draw_debug_line(world, triangle.v0, triangle.v1, Vec4::new(0.0, 1.0, 0.0, 1.0));
            draw_debug_line(world, triangle.v1, triangle.v2, Vec4::new(0.0, 1.0, 0.0, 1.0));
            draw_debug_line(world, triangle.v2, triangle.v0, Vec4::new(0.0, 1.0, 0.0, 1.0));
        }
    }
}
```
