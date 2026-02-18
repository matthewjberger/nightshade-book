# Textures & the Texture Cache

Nightshade manages GPU textures through a centralized `TextureCache` with generational indexing and reference counting. Textures can be loaded synchronously, asynchronously, or generated procedurally.

## Texture Cache

The `TextureCache` stores all loaded textures as `TextureEntry` values (wgpu texture + view + sampler) in a `GenerationalRegistry`. Each texture is identified by a `TextureId` containing an index and generation counter, ensuring stale references are detected.

### Loading Textures

The most common way to load a texture is through `WorldCommand::LoadTexture`:

```rust
world.queue_command(WorldCommand::LoadTexture {
    name: "my_texture".to_string(),
    rgba_data: image_bytes,
    width: 512,
    height: 512,
});
```

The renderer processes this command and uploads the RGBA data to the GPU. The texture is stored in the cache under the given name.

### Procedural Textures

The engine provides built-in procedural textures loaded at startup via `load_procedural_textures()`:

```rust
load_procedural_textures(world);
```

This creates three textures:

| Name | Description |
|------|-------------|
| `"checkerboard"` | Black and white checkerboard pattern |
| `"gradient"` | Horizontal gradient |
| `"uv_test"` | UV coordinate visualization |

### Looking Up Textures

Find a loaded texture by name:

```rust
let texture_id = texture_cache_lookup_id(&cache, "my_texture");
```

### Reference Counting

Textures use reference counting for lifecycle management:

```rust
texture_cache_add_reference(&mut cache, "my_texture");
texture_cache_remove_reference(&mut cache, "my_texture");
texture_cache_remove_unused(&mut cache);
```

When a texture's reference count reaches zero, `texture_cache_remove_unused()` will free it.

### Dummy Textures

If a texture is missing, `texture_cache_ensure_dummy()` creates a 64x64 purple-and-black checkerboard placeholder. This prevents rendering errors from missing assets.

## Async Texture Loading

For loading textures without blocking the main thread, use the `TextureLoadQueue` system.

### Setup

```rust
use nightshade::ecs::texture_loader::*;

struct MyState {
    queue: SharedTextureQueue,
    loading_state: AssetLoadingState,
}

fn initialize(&mut self, world: &mut World) {
    self.queue = create_shared_queue();

    queue_texture_from_path(&self.queue, "assets/textures/albedo.png");
    queue_texture_from_path(&self.queue, "assets/textures/normal.png");

    self.loading_state = AssetLoadingState::new(2);
}
```

### Processing Each Frame

```rust
fn run_systems(&mut self, world: &mut World) {
    let status = process_and_load_textures(
        &self.queue,
        world,
        &mut self.loading_state,
        4,
    );

    if status == AssetLoadingStatus::Complete {
        // All textures loaded
    }
}
```

### Loading Progress

Track loading progress for loading screens:

```rust
let progress = self.loading_state.progress(); // 0.0 to 1.0
let is_done = self.loading_state.is_complete();
let loaded = self.loading_state.loaded_textures;
let failed = self.loading_state.failed_textures;
```

### Platform Behavior

| Platform | Loading Method |
|----------|----------------|
| Desktop | Synchronous file read from disk |
| WASM | Async HTTP fetch via ehttp |

### Asset Search Paths

Configure where texture files are searched:

```rust
set_asset_search_paths(vec![
    "assets/".to_string(),
    "content/textures/".to_string(),
]);

queue_texture_from_path(&queue, "player.png");
// Searches: assets/player.png, content/textures/player.png
```

## Sprite Texture Atlas

Sprites use a separate texture atlas rather than the main texture cache. The atlas is a single large GPU texture divided into a grid of slots.

| Constant | Value |
|----------|-------|
| `SPRITE_ATLAS_TOTAL_SLOTS` | 128 |
| `SPRITE_ATLAS_SLOT_SIZE` | 512 x 512 pixels |

Upload textures to specific atlas slots via `WorldCommand::UploadSpriteTexture`:

```rust
world.queue_command(WorldCommand::UploadSpriteTexture {
    slot: 0,
    rgba_data: image_bytes,
    width: 256,
    height: 256,
});
```

The `Sprite` component references textures by their slot index. See [Sprites](sprites.md) for details.

## Material Textures

PBR materials reference textures by name through `MaterialRef`:

```rust
let material = Material {
    base_texture: Some("albedo".to_string()),
    normal_texture: Some("normal_map".to_string()),
    metallic_roughness_texture: Some("metallic_roughness".to_string()),
    ..Default::default()
};
```

See [Materials](materials.md) for the full PBR material workflow.
