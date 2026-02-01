# Materials

Materials define the visual appearance of meshes using PBR (Physically Based Rendering).

## Material Structure

```rust
pub struct Material {
    pub base_color: [f32; 4],
    pub base_color_texture: Option<String>,
    pub metallic: f32,
    pub roughness: f32,
    pub metallic_roughness_texture: Option<String>,
    pub normal_texture: Option<String>,
    pub normal_scale: f32,
    pub occlusion_texture: Option<String>,
    pub occlusion_strength: f32,
    pub emissive_factor: [f32; 3],
    pub emissive_texture: Option<String>,
    pub alpha_mode: AlphaMode,
    pub alpha_cutoff: f32,
    pub double_sided: bool,
}
```

## Creating Materials

### Basic Colored Material

```rust
use nightshade::ecs::material::*;

let red_material = Material {
    base_color: [1.0, 0.0, 0.0, 1.0],
    roughness: 0.5,
    metallic: 0.0,
    ..Default::default()
};

material_registry_insert(
    &mut world.resources.material_registry,
    "red".to_string(),
    red_material,
);
```

### Metallic Material

```rust
let gold_material = Material {
    base_color: [1.0, 0.84, 0.0, 1.0],
    roughness: 0.3,
    metallic: 1.0,
    ..Default::default()
};
```

### Emissive Material

```rust
let glowing_material = Material {
    base_color: [0.2, 0.8, 1.0, 1.0],
    emissive_factor: [2.0, 8.0, 10.0],
    roughness: 0.8,
    metallic: 0.0,
    ..Default::default()
};
```

### Transparent Material

```rust
let glass_material = Material {
    base_color: [0.9, 0.95, 1.0, 0.3],
    alpha_mode: AlphaMode::Blend,
    roughness: 0.1,
    metallic: 0.0,
    ..Default::default()
};
```

## Alpha Modes

```rust
pub enum AlphaMode {
    Opaque,       // Fully opaque, alpha ignored
    Mask,         // Binary transparency using alpha_cutoff
    Blend,        // Full alpha blending
}
```

### Alpha Cutoff (Mask Mode)

```rust
let foliage_material = Material {
    base_color: [0.2, 0.8, 0.2, 1.0],
    alpha_mode: AlphaMode::Mask,
    alpha_cutoff: 0.5,  // Pixels with alpha < 0.5 are discarded
    double_sided: true,
    ..Default::default()
};
```

## Textured Materials

### Loading Textures

```rust
// From embedded bytes
let texture_bytes = include_bytes!("../assets/wood.png");
let image = image::load_from_memory(texture_bytes).unwrap().to_rgba8();

world.queue_command(WorldCommand::LoadTexture {
    name: "wood".to_string(),
    rgba_data: image.to_vec(),
    width: image.width(),
    height: image.height(),
});
```

### Applying Textures

```rust
let wood_material = Material {
    base_color: [1.0, 1.0, 1.0, 1.0],
    base_color_texture: Some("wood".to_string()),
    roughness: 0.8,
    metallic: 0.0,
    ..Default::default()
};
```

### With Normal Map

```rust
let brick_material = Material {
    base_color: [1.0, 1.0, 1.0, 1.0],
    base_color_texture: Some("brick_color".to_string()),
    normal_texture: Some("brick_normal".to_string()),
    normal_scale: 1.0,
    roughness: 0.9,
    metallic: 0.0,
    ..Default::default()
};
```

## Assigning Materials to Entities

```rust
// Register material
material_registry_insert(
    &mut world.resources.material_registry,
    "my_material".to_string(),
    my_material,
);

// Add reference
if let Some(&index) = world.resources.material_registry.registry.name_to_index.get("my_material") {
    world.resources.material_registry.registry.add_reference(index);
}

// Assign to entity
world.set_material_ref(entity, MaterialRef::new("my_material".to_string()));
```

## Procedural Textures

Generate textures at runtime:

```rust
fn create_checkerboard(size: usize) -> Vec<u8> {
    let mut data = vec![0u8; size * size * 4];

    for y in 0..size {
        for x in 0..size {
            let idx = (y * size + x) * 4;
            let checker = ((x / 32) + (y / 32)) % 2 == 0;
            let value = if checker { 255 } else { 64 };
            data[idx] = value;
            data[idx + 1] = value;
            data[idx + 2] = value;
            data[idx + 3] = 255;
        }
    }

    data
}

let checkerboard = create_checkerboard(256);
world.queue_command(WorldCommand::LoadTexture {
    name: "checkerboard".to_string(),
    rgba_data: checkerboard,
    width: 256,
    height: 256,
});
```

## Common Material Presets

```rust
fn create_plastic(color: Vec3) -> Material {
    Material {
        base_color: [color.x, color.y, color.z, 1.0],
        roughness: 0.4,
        metallic: 0.0,
        ..Default::default()
    }
}

fn create_metal(color: Vec3) -> Material {
    Material {
        base_color: [color.x, color.y, color.z, 1.0],
        roughness: 0.2,
        metallic: 1.0,
        ..Default::default()
    }
}

fn create_rough(color: Vec3) -> Material {
    Material {
        base_color: [color.x, color.y, color.z, 1.0],
        roughness: 0.95,
        metallic: 0.0,
        ..Default::default()
    }
}
```
