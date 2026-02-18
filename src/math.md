# Math & Coordinates

Nightshade uses **nalgebra_glm** exclusively for all linear algebra. This chapter covers the types, conventions, and common operations you'll use throughout the engine.

## Core Types

| Type | Description | Example |
|------|-------------|---------|
| `Vec2` | 2D vector | Screen positions, UV coordinates |
| `Vec3` | 3D vector | Positions, directions, colors |
| `Vec4` | 4D vector | Homogeneous coordinates, RGBA colors |
| `Mat4` | 4x4 matrix | Transform matrices |
| `Quat` | Quaternion | Rotations |

All types are re-exported through the prelude:

```rust
use nightshade::prelude::*;

let position = Vec3::new(1.0, 2.0, 3.0);
let direction = Vec3::y();
let identity = Mat4::identity();
let rotation = Quat::identity();
```

## Coordinate System

Nightshade uses a **right-handed Y-up** coordinate system:

```
    +Y (up)
     |
     |
     +--- +X (right)
    /
   /
  +Z (forward, toward camera)
```

- **+X** points right
- **+Y** points up
- **+Z** points toward the camera (out of the screen)
- **-Z** points into the screen (forward into the scene)

This matches the glTF convention and nalgebra_glm's default handedness.

## Vector Operations

### Construction

```rust
let a = Vec3::new(1.0, 2.0, 3.0);
let zero = Vec3::zeros();
let one = Vec3::new(1.0, 1.0, 1.0);
let up = Vec3::y();
let right = Vec3::x();
let forward = -Vec3::z();
```

### Arithmetic

```rust
let sum = a + b;
let difference = a - b;
let scaled = a * 2.0;

// Element-wise multiplication requires component_mul
let element_wise = a.component_mul(&b);
```

The `*` operator on `Vec2`/`Vec3` performs scalar multiplication, not element-wise. Use `component_mul()` when you need per-component multiplication.

### Common Operations

```rust
let length = nalgebra_glm::length(&v);
let normalized = nalgebra_glm::normalize(&v);
let dot = nalgebra_glm::dot(&a, &b);
let cross = nalgebra_glm::cross(&a, &b);
let distance = nalgebra_glm::distance(&a, &b);
let lerped = nalgebra_glm::lerp(&a, &b, 0.5);
```

## Quaternion Rotations

Nightshade uses quaternions for all rotations. They avoid gimbal lock and interpolate smoothly.

```rust
// Rotation around an axis
let rotation = nalgebra_glm::quat_angle_axis(
    std::f32::consts::FRAC_PI_4,  // 45 degrees
    &Vec3::y(),                     // around Y axis
);

// Look-at rotation
let forward = nalgebra_glm::normalize(&(target - position));
let rotation = nalgebra_glm::quat_look_at(&forward, &Vec3::y());

// Interpolation
let blended = rotation_a.slerp(&rotation_b, 0.5);

// Apply rotation to a vector
let rotated = nalgebra_glm::quat_rotate_vec3(&rotation, &direction);
```

## Transform Matrices

`GlobalTransform` stores a 4x4 matrix. `LocalTransform` stores decomposed translation/rotation/scale:

```rust
pub struct LocalTransform {
    pub translation: Vec3,
    pub rotation: Quat,
    pub scale: Vec3,
}

pub struct GlobalTransform(pub Mat4);
```

### Building Matrices

```rust
let translation = nalgebra_glm::translation(&Vec3::new(1.0, 2.0, 3.0));
let rotation = nalgebra_glm::quat_to_mat4(&some_quat);
let scale = nalgebra_glm::scaling(&Vec3::new(2.0, 2.0, 2.0));
let combined = translation * rotation * scale;
```

### Extracting from Matrices

```rust
let global = world.get_global_transform(entity).unwrap();
let position = global.0.column(3).xyz();
```

## Angles

nalgebra_glm works in **radians**. Convert from degrees when needed:

```rust
let radians = nalgebra_glm::radians(&nalgebra_glm::vec1(45.0)).x;
let degrees = nalgebra_glm::degrees(&nalgebra_glm::vec1(std::f32::consts::FRAC_PI_4)).x;
```

## Depth Range and Reversed-Z

wgpu uses a **\[0, 1\]** depth range (not \[-1, 1\] like OpenGL).

Nightshade uses **reversed-Z** depth, where `0.0` is the far plane and `1.0` is the near plane. This is the opposite of the traditional convention where 0 is near and 1 is far.

### Why Reversed-Z?

Floating-point numbers have more precision near zero and less precision near one (because of how the exponent and mantissa are distributed). In a standard depth buffer, the near plane maps to 0 and the far plane maps to 1. But perspective projection is highly nonlinear: most of the \[0, 1\] range is consumed by geometry close to the near plane, leaving very little precision for distant objects. This causes z-fighting (flickering surfaces) at medium to far distances.

Reversed-Z exploits the floating-point distribution by mapping the far plane to 0 (where float precision is highest) and the near plane to 1. The perspective nonlinearity and the floating-point precision curve partially cancel each other out, resulting in nearly uniform depth precision across the entire view range. This is especially important for large outdoor scenes.

Practically, this means:
- Depth clear value is `0.0` (far plane)
- Depth comparison function is `Greater` or `GreaterEqual` (closer objects have larger depth values)
- Projection matrices are constructed with `reversed_infinite_perspective_rh_zo`
