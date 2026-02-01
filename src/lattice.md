# Lattice Deformation

Lattice deformation (also called Free-Form Deformation or FFD) allows you to deform meshes by manipulating a grid of control points surrounding the mesh.

## Enabling Lattice

Add the `lattice` feature:

```toml
nightshade = { git = "...", features = ["engine", "lattice"] }
```

## Lattice Component

```rust
pub struct Lattice {
    pub resolution: UVec3,
    pub bounds: Aabb,
    pub control_points: Vec<Vec3>,
    pub interpolation: LatticeInterpolation,
}

pub enum LatticeInterpolation {
    Linear,
    Bezier,
}
```

## Creating a Lattice

```rust
fn spawn_lattice(world: &mut World, bounds: Aabb, resolution: UVec3) -> Entity {
    let entity = world.spawn_entities(
        LOCAL_TRANSFORM | GLOBAL_TRANSFORM | LATTICE,
        1
    )[0];

    let total_points = (resolution.x * resolution.y * resolution.z) as usize;
    let mut control_points = Vec::with_capacity(total_points);

    for z in 0..resolution.z {
        for y in 0..resolution.y {
            for x in 0..resolution.x {
                let t = Vec3::new(
                    x as f32 / (resolution.x - 1) as f32,
                    y as f32 / (resolution.y - 1) as f32,
                    z as f32 / (resolution.z - 1) as f32,
                );
                let pos = bounds.min + (bounds.max - bounds.min).component_mul(&t);
                control_points.push(pos);
            }
        }
    }

    world.set_lattice(entity, Lattice {
        resolution,
        bounds,
        control_points,
        interpolation: LatticeInterpolation::Bezier,
    });

    entity
}
```

## Influenced Meshes

Mark meshes to be deformed by a lattice:

```rust
pub struct LatticeInfluenced {
    pub lattice_entity: Entity,
    pub original_positions: Vec<Vec3>,
}

world.set_lattice_influenced(mesh_entity, LatticeInfluenced {
    lattice_entity: lattice,
    original_positions: mesh_positions.clone(),
});
```

## Manipulating Control Points

```rust
fn bend_lattice(world: &mut World, lattice: Entity, amount: f32) {
    if let Some(lat) = world.get_lattice_mut(lattice) {
        let res = lat.resolution;

        for z in 0..res.z {
            for y in 0..res.y {
                for x in 0..res.x {
                    let index = (z * res.y * res.x + y * res.x + x) as usize;

                    let t = x as f32 / (res.x - 1) as f32;
                    let bend = (t * std::f32::consts::PI).sin() * amount;

                    lat.control_points[index].y += bend;
                }
            }
        }
    }
}
```

## Deformation System

The deformation is applied automatically each frame:

```rust
fn lattice_deformation_system(world: &mut World) {
    for entity in world.query(LATTICE_INFLUENCED | RENDER_MESH) {
        let influenced = world.get_lattice_influenced(entity).unwrap();
        let lattice = world.get_lattice(influenced.lattice_entity).unwrap();

        let deformed_positions = compute_deformed_positions(
            &influenced.original_positions,
            lattice
        );

        update_mesh_positions(world, entity, &deformed_positions);
    }
}
```

## Interpolation Modes

### Linear

Faster but produces faceted results:

```rust
lattice.interpolation = LatticeInterpolation::Linear;
```

### Bezier

Smoother results using Bernstein polynomials:

```rust
lattice.interpolation = LatticeInterpolation::Bezier;
```

## Common Effects

### Bulge

```rust
fn bulge_center(world: &mut World, lattice: Entity, strength: f32) {
    if let Some(lat) = world.get_lattice_mut(lattice) {
        let center = (lat.bounds.min + lat.bounds.max) * 0.5;
        let max_dist = (lat.bounds.max - lat.bounds.min).magnitude() * 0.5;

        for point in &mut lat.control_points {
            let to_center = center - *point;
            let dist = to_center.magnitude();
            let factor = 1.0 - (dist / max_dist).min(1.0);
            let displacement = to_center.normalize() * factor * factor * strength;
            *point -= displacement;
        }
    }
}
```

### Twist

```rust
fn twist_lattice(world: &mut World, lattice: Entity, angle: f32) {
    if let Some(lat) = world.get_lattice_mut(lattice) {
        let height = lat.bounds.max.y - lat.bounds.min.y;

        for point in &mut lat.control_points {
            let t = (point.y - lat.bounds.min.y) / height;
            let twist_angle = t * angle;

            let x = point.x;
            let z = point.z;
            point.x = x * twist_angle.cos() - z * twist_angle.sin();
            point.z = x * twist_angle.sin() + z * twist_angle.cos();
        }
    }
}
```

### Taper

```rust
fn taper_lattice(world: &mut World, lattice: Entity, top_scale: f32) {
    if let Some(lat) = world.get_lattice_mut(lattice) {
        let center_x = (lat.bounds.min.x + lat.bounds.max.x) * 0.5;
        let center_z = (lat.bounds.min.z + lat.bounds.max.z) * 0.5;
        let height = lat.bounds.max.y - lat.bounds.min.y;

        for point in &mut lat.control_points {
            let t = (point.y - lat.bounds.min.y) / height;
            let scale = 1.0 + (top_scale - 1.0) * t;

            point.x = center_x + (point.x - center_x) * scale;
            point.z = center_z + (point.z - center_z) * scale;
        }
    }
}
```

### Wave

```rust
fn wave_lattice(world: &mut World, lattice: Entity, amplitude: f32, frequency: f32, time: f32) {
    if let Some(lat) = world.get_lattice_mut(lattice) {
        for point in &mut lat.control_points {
            let wave = (point.x * frequency + time).sin() * amplitude;
            point.y += wave;
        }
    }
}
```

## Animated Deformation

```rust
struct BreathingEffect {
    lattice: Entity,
    time: f32,
}

fn run_systems(&mut self, world: &mut World) {
    let dt = world.resources.time.delta_seconds;
    self.breathing.time += dt;

    if let Some(lat) = world.get_lattice_mut(self.breathing.lattice) {
        let breath = (self.breathing.time * 2.0).sin() * 0.1 + 1.0;

        for point in &mut lat.control_points {
            let original = get_original_point(point);
            *point = original * breath;
        }
    }
}
```

## Performance Tips

- Use lower lattice resolutions (4x4x4 is often sufficient)
- Linear interpolation is faster than Bezier
- Cache original positions to avoid recomputation
- Only update lattice when control points actually change
