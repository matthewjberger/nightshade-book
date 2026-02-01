# Picking System

> **Live Demo:** [Picking](https://matthewberger.dev/nightshade/picking)

Picking allows you to select entities in the 3D world using mouse clicks or screen positions. Nightshade supports both CPU ray-based picking and GPU pixel-perfect picking.

## Ray Picking

Convert a screen position to a ray and test against entity bounds.

### Screen to Ray

```rust
pub struct PickingRay {
    pub origin: Vec3,
    pub direction: Vec3,
}

let ray = screen_to_ray(world, screen_x, screen_y);
```

### Pick Closest Entity (AABB)

Fast picking using axis-aligned bounding boxes:

```rust
if let Some(hit) = pick_closest_entity(world, ray) {
    let entity = hit.entity;
    let distance = hit.distance;
    let point = hit.point;

    select_entity(world, entity);
}
```

### Pick Closest Entity (Trimesh)

Precise picking using actual mesh geometry:

```rust
if let Some(hit) = pick_closest_entity_trimesh(world, ray) {
    let entity = hit.entity;
    let point = hit.point;
    let normal = hit.normal;

    spawn_decal(world, point, normal);
}
```

### Pick Result

```rust
pub struct PickResult {
    pub entity: Entity,
    pub distance: f32,
    pub point: Vec3,
    pub normal: Option<Vec3>,
}
```

## GPU Picking

Pixel-perfect picking using a dedicated render pass. More accurate but requires a frame delay.

### Request Pick

```rust
world.resources.gpu_picking.request_pick(screen_x, screen_y);
```

### Get Result

Check for results in the next frame:

```rust
if let Some(result) = world.resources.gpu_picking.take_result() {
    let world_position = result.position;
    let normal = result.normal;
    let depth = result.depth;
    let entity_id = result.entity_id;
}
```

### GPU Pick Result

```rust
pub struct GpuPickResult {
    pub entity_id: u32,
    pub position: Vec3,
    pub normal: Vec3,
    pub depth: f32,
}
```

## Mouse Click Selection

```rust
fn on_mouse_input(&mut self, world: &mut World, button: MouseButton, state: ElementState) {
    if button == MouseButton::Left && state == ElementState::Pressed {
        let mouse_pos = world.resources.input.mouse_position;
        let ray = screen_to_ray(world, mouse_pos.x, mouse_pos.y);

        if let Some(hit) = pick_closest_entity(world, ray) {
            self.selected_entity = Some(hit.entity);
            mark_as_selected(world, hit.entity);
        } else {
            self.selected_entity = None;
            clear_selection(world);
        }
    }
}
```

## Hover Detection

```rust
fn run_systems(&mut self, world: &mut World) {
    let mouse_pos = world.resources.input.mouse_position;
    let ray = screen_to_ray(world, mouse_pos.x, mouse_pos.y);

    for entity in world.query(HOVERED) {
        world.remove_hovered(entity);
    }

    if let Some(hit) = pick_closest_entity(world, ray) {
        world.set_hovered(hit.entity, Hovered);
    }
}
```

## Raycast Filtering

Pick only specific entity types:

```rust
fn pick_enemies_only(world: &World, ray: PickingRay) -> Option<PickResult> {
    let mut closest: Option<PickResult> = None;

    for entity in world.query(ENEMY | BOUNDING_VOLUME) {
        let bounds = world.get_bounding_volume(entity).unwrap();
        if let Some(distance) = ray_aabb_intersection(&ray, &bounds.aabb) {
            let point = ray.origin + ray.direction * distance;
            if closest.is_none() || distance < closest.as_ref().unwrap().distance {
                closest = Some(PickResult {
                    entity,
                    distance,
                    point,
                    normal: None,
                });
            }
        }
    }

    closest
}
```

## Drag Selection (Box Select)

```rust
struct BoxSelect {
    start: Option<Vec2>,
    end: Option<Vec2>,
}

fn run_systems(&mut self, world: &mut World) {
    let input = &world.resources.input;

    if input.mouse_buttons.left_just_pressed {
        self.box_select.start = Some(input.mouse_position);
    }

    if input.mouse_buttons.left {
        self.box_select.end = Some(input.mouse_position);
    }

    if input.mouse_buttons.left_just_released {
        if let (Some(start), Some(end)) = (self.box_select.start, self.box_select.end) {
            let selected = entities_in_screen_rect(world, start, end);
            self.selected_entities = selected;
        }
        self.box_select.start = None;
        self.box_select.end = None;
    }
}

fn entities_in_screen_rect(world: &World, start: Vec2, end: Vec2) -> Vec<Entity> {
    let min_x = start.x.min(end.x);
    let max_x = start.x.max(end.x);
    let min_y = start.y.min(end.y);
    let max_y = start.y.max(end.y);

    let mut result = Vec::new();

    for entity in world.query(LOCAL_TRANSFORM | GLOBAL_TRANSFORM) {
        let screen_pos = world_to_screen(world, entity);
        if let Some(pos) = screen_pos {
            if pos.x >= min_x && pos.x <= max_x && pos.y >= min_y && pos.y <= max_y {
                result.push(entity);
            }
        }
    }

    result
}
```

## 3D Gizmo Interaction

Pick transform gizmo handles:

```rust
pub enum GizmoHandle {
    None,
    TranslateX,
    TranslateY,
    TranslateZ,
    RotateX,
    RotateY,
    RotateZ,
    ScaleX,
    ScaleY,
    ScaleZ,
}

fn pick_gizmo_handle(world: &World, ray: PickingRay, gizmo_position: Vec3) -> GizmoHandle {
    let x_axis = create_axis_collider(gizmo_position, Vec3::x_axis());
    let y_axis = create_axis_collider(gizmo_position, Vec3::y_axis());
    let z_axis = create_axis_collider(gizmo_position, Vec3::z_axis());

    if ray_cylinder_intersection(&ray, &x_axis).is_some() {
        return GizmoHandle::TranslateX;
    }
    if ray_cylinder_intersection(&ray, &y_axis).is_some() {
        return GizmoHandle::TranslateY;
    }
    if ray_cylinder_intersection(&ray, &z_axis).is_some() {
        return GizmoHandle::TranslateZ;
    }

    GizmoHandle::None
}
```

## Performance Tips

1. **Use AABB picking first**: Only use trimesh for precision when needed
2. **Spatial partitioning**: Use octrees or grids for many entities
3. **Layer filtering**: Skip entities that can't be picked
4. **GPU picking for complex scenes**: Better for dense geometry
5. **Cache bounding volumes**: Don't recompute every frame
