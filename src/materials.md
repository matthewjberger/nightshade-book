# Materials

> **Live Demos:** [Textures](https://matthewberger.dev/nightshade/textures) | [Alpha Blending](https://matthewberger.dev/nightshade/alpha_blending)

Materials define the visual appearance of meshes using PBR (Physically Based Rendering) following the glTF 2.0 metallic-roughness workflow. Nightshade supports the full glTF PBR model plus several extensions: KHR_materials_transmission, KHR_materials_volume, KHR_materials_specular, and KHR_materials_emissive_strength.

## Material Structure

```rust
pub struct Material {
    // Core PBR
    pub base_color: [f32; 4],
    pub roughness: f32,
    pub metallic: f32,
    pub emissive_factor: [f32; 3],
    pub emissive_strength: f32,
    pub alpha_mode: AlphaMode,
    pub alpha_cutoff: f32,
    pub unlit: bool,
    pub double_sided: bool,
    pub uv_scale: [f32; 2],

    // Textures
    pub base_texture: Option<String>,
    pub base_texture_uv_set: u32,
    pub emissive_texture: Option<String>,
    pub emissive_texture_uv_set: u32,
    pub normal_texture: Option<String>,
    pub normal_texture_uv_set: u32,
    pub normal_scale: f32,
    pub normal_map_flip_y: bool,
    pub normal_map_two_component: bool,
    pub metallic_roughness_texture: Option<String>,
    pub metallic_roughness_texture_uv_set: u32,
    pub occlusion_texture: Option<String>,
    pub occlusion_texture_uv_set: u32,
    pub occlusion_strength: f32,

    // Transmission (KHR_materials_transmission)
    pub transmission_factor: f32,
    pub transmission_texture: Option<String>,
    pub transmission_texture_uv_set: u32,

    // Volume (KHR_materials_volume)
    pub thickness: f32,
    pub thickness_texture: Option<String>,
    pub thickness_texture_uv_set: u32,
    pub attenuation_color: [f32; 3],
    pub attenuation_distance: f32,
    pub ior: f32,

    // Specular (KHR_materials_specular)
    pub specular_factor: f32,
    pub specular_color_factor: [f32; 3],
    pub specular_texture: Option<String>,
    pub specular_texture_uv_set: u32,
    pub specular_color_texture: Option<String>,
    pub specular_color_texture_uv_set: u32,
}
```

### Core PBR Fields

| Field | Default | Description |
|-------|---------|-------------|
| `base_color` | `[0.7, 0.7, 0.7, 1.0]` | RGBA albedo color, multiplied with `base_texture` |
| `roughness` | `0.5` | Surface roughness (0 = mirror, 1 = fully diffuse) |
| `metallic` | `0.0` | Metalness (0 = dielectric, 1 = conductor) |
| `emissive_factor` | `[0.0, 0.0, 0.0]` | RGB emissive color, multiplied with `emissive_texture` |
| `emissive_strength` | `1.0` | HDR intensity multiplier for emissive output |
| `alpha_mode` | `Opaque` | Transparency handling mode |
| `alpha_cutoff` | `0.5` | Alpha threshold for `AlphaMode::Mask` |
| `unlit` | `false` | Skip lighting calculations (flat shaded) |
| `double_sided` | `false` | Render both sides of faces |
| `uv_scale` | `[1.0, 1.0]` | UV coordinate scale multiplier |

### Normal Map Options

| Field | Default | Description |
|-------|---------|-------------|
| `normal_scale` | `1.0` | Normal map intensity multiplier |
| `normal_map_flip_y` | `false` | Flip the Y (green) channel for DirectX-style normal maps |
| `normal_map_two_component` | `false` | Two-component normal map (RG only, B reconstructed) |
| `occlusion_strength` | `1.0` | Ambient occlusion effect strength (0 = none, 1 = full) |

### Transmission and Volume

These fields implement light transmission through surfaces (glass, water, thin-shell materials):

| Field | Default | Description |
|-------|---------|-------------|
| `transmission_factor` | `0.0` | Fraction of light transmitted through the surface (0 = opaque, 1 = fully transmissive) |
| `thickness` | `0.0` | Volume thickness for refraction (0 = thin-wall) |
| `attenuation_color` | `[1.0, 1.0, 1.0]` | Color of light absorbed inside the volume |
| `attenuation_distance` | `0.0` | Distance at which light is attenuated to `attenuation_color` |
| `ior` | `1.5` | Index of refraction (1.0 = air, 1.33 = water, 1.5 = glass, 2.42 = diamond) |

### Specular

Overrides the default Fresnel reflectance for dielectric materials:

| Field | Default | Description |
|-------|---------|-------------|
| `specular_factor` | `1.0` | Specular intensity override (0 = no specular, 1 = default F0) |
| `specular_color_factor` | `[1.0, 1.0, 1.0]` | Tints the specular reflection color |

## Alpha Modes

```rust
pub enum AlphaMode {
    Opaque,  // Fully opaque, alpha ignored
    Mask,    // Binary transparency using alpha_cutoff
    Blend,   // Full alpha blending
}
```

## Creating Materials

### Basic Colored Material

```rust
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
let gold = Material {
    base_color: [1.0, 0.84, 0.0, 1.0],
    roughness: 0.3,
    metallic: 1.0,
    ..Default::default()
};
```

### Emissive Material

The final emissive output is `emissive_factor * emissive_strength * emissive_texture`:

```rust
let neon = Material {
    base_color: [0.2, 0.8, 1.0, 1.0],
    emissive_factor: [0.2, 0.8, 1.0],
    emissive_strength: 10.0,
    roughness: 0.8,
    ..Default::default()
};
```

### Glass / Transmissive Material

```rust
let glass = Material {
    base_color: [0.95, 0.95, 1.0, 1.0],
    roughness: 0.05,
    metallic: 0.0,
    transmission_factor: 0.95,
    ior: 1.5,
    ..Default::default()
};
```

### Colored Glass with Volume Absorption

```rust
let stained_glass = Material {
    base_color: [0.8, 0.2, 0.2, 1.0],
    roughness: 0.05,
    transmission_factor: 0.9,
    thickness: 0.02,
    attenuation_color: [0.8, 0.1, 0.1],
    attenuation_distance: 0.05,
    ior: 1.52,
    ..Default::default()
};
```

### Transparent (Alpha Blended) Material

```rust
let ghost = Material {
    base_color: [0.9, 0.95, 1.0, 0.3],
    alpha_mode: AlphaMode::Blend,
    roughness: 0.1,
    ..Default::default()
};
```

### Foliage (Alpha Mask)

```rust
let foliage = Material {
    base_texture: Some("leaf_color".to_string()),
    alpha_mode: AlphaMode::Mask,
    alpha_cutoff: 0.5,
    double_sided: true,
    ..Default::default()
};
```

## Textured Materials

### Loading Textures

```rust
let texture_bytes = include_bytes!("../assets/wood.png");
let image = image::load_from_memory(texture_bytes).unwrap().to_rgba8();

world.queue_command(WorldCommand::LoadTexture {
    name: "wood".to_string(),
    rgba_data: image.to_vec(),
    width: image.width(),
    height: image.height(),
});
```

### Full PBR Texture Set

```rust
let brick = Material {
    base_texture: Some("brick_color".to_string()),
    normal_texture: Some("brick_normal".to_string()),
    normal_scale: 1.0,
    metallic_roughness_texture: Some("brick_metallic_roughness".to_string()),
    occlusion_texture: Some("brick_ao".to_string()),
    roughness: 1.0,
    metallic: 1.0,
    ..Default::default()
};
```

When a `metallic_roughness_texture` is present, the `roughness` and `metallic` values are multiplied with the texture's green and blue channels respectively.

### UV Scaling

Tile a texture by scaling UV coordinates:

```rust
let tiled = Material {
    base_texture: Some("tile".to_string()),
    uv_scale: [4.0, 4.0],
    ..Default::default()
};
```

### DirectX Normal Maps

Some normal maps (e.g., from Substance or older tools) use a flipped Y channel:

```rust
let material = Material {
    normal_texture: Some("dx_normal".to_string()),
    normal_map_flip_y: true,
    ..Default::default()
};
```

For two-component normal maps (RG only, B reconstructed from RG):

```rust
let material = Material {
    normal_texture: Some("bc5_normal".to_string()),
    normal_map_two_component: true,
    ..Default::default()
};
```

## Assigning Materials to Entities

```rust
material_registry_insert(
    &mut world.resources.material_registry,
    "my_material".to_string(),
    my_material,
);

if let Some(&index) = world.resources.material_registry.registry.name_to_index.get("my_material") {
    world.resources.material_registry.registry.add_reference(index);
}

world.set_material_ref(entity, MaterialRef::new("my_material"));
```

## Procedural Textures

Generate textures at runtime:

```rust
fn create_checkerboard(size: usize) -> Vec<u8> {
    let mut data = vec![0u8; size * size * 4];

    for y in 0..size {
        for x in 0..size {
            let index = (y * size + x) * 4;
            let checker = ((x / 32) + (y / 32)) % 2 == 0;
            let value = if checker { 255 } else { 64 };
            data[index] = value;
            data[index + 1] = value;
            data[index + 2] = value;
            data[index + 3] = 255;
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
