# API Quick Reference

Quick lookup for common Nightshade API functions and types.

## World

### Entity Management

```rust
// Spawn entities with components
let entities = world.spawn_entities(flags, count);
let entity = world.spawn_entities(LOCAL_TRANSFORM | MESH_COMPONENT, 1)[0];

// Despawn entity
world.despawn_entities(&[entity]);

// Query entities by components
for entity in world.query_entities(LOCAL_TRANSFORM | MESH_COMPONENT) {
    // Process entity
}
```

### Component Access

```rust
// Get component (immutable)
world.get_local_transform(entity) -> Option<&LocalTransform>
world.get_global_transform(entity) -> Option<&GlobalTransform>
world.get_mesh(entity) -> Option<&MeshComponent>
world.get_material(entity) -> Option<&Material>
world.get_camera(entity) -> Option<&Camera>
world.get_rigid_body(entity) -> Option<&RigidBodyComponent>
world.get_collider(entity) -> Option<&ColliderComponent>
world.get_animation_player(entity) -> Option<&AnimationPlayer>
world.get_parent(entity) -> Option<&Parent>
world.get_children(entity) -> &[Entity]
world.get_visible(entity) -> Option<&Visible>

// Get component (mutable)
world.get_local_transform_mut(entity) -> Option<&mut LocalTransform>
world.get_rigid_body_mut(entity) -> Option<&mut RigidBodyComponent>
// ... same pattern for all components

// Set component
world.set_local_transform(entity, LocalTransform { ... })
world.set_material(entity, Material { ... })
// ... same pattern for all components
```

### Resources

```rust
world.resources.window.timing.delta_time           // Frame time in seconds
world.resources.window.timing.frames_per_second    // Current FPS
world.resources.window.timing.uptime_milliseconds  // Total elapsed time in ms
world.resources.input.keyboard           // Keyboard state
world.resources.input.mouse              // Mouse state
world.resources.input.cursor_locked      // Lock cursor to window
world.resources.input.cursor_visible     // Show/hide cursor
world.resources.active_camera            // Current active camera entity
world.resources.graphics.ambient_intensity
world.resources.physics.gravity
```

## Component Flags

```rust
LOCAL_TRANSFORM         // Position, rotation, scale
GLOBAL_TRANSFORM        // World-space transform
MESH_COMPONENT          // Renderable mesh
MATERIAL_COMPONENT      // PBR material
CAMERA                  // Camera component
RIGID_BODY              // Physics rigid body
COLLIDER_COMPONENT      // Physics collider
CHARACTER_CONTROLLER    // Character movement
ANIMATION_PLAYER        // Skeletal animation
PARENT                  // Parent entity reference
CHILDREN                // Child entities
VISIBLE                 // Visibility flag
DIRECTIONAL_LIGHT       // Directional light
POINT_LIGHT             // Point light
SPOT_LIGHT              // Spot light
AUDIO_SOURCE            // Sound emitter
AUDIO_LISTENER          // Sound receiver
PARTICLE_EMITTER        // Particle system
NAV_MESH_AGENT          // Navigation agent
HUD_TEXT                // Screen-space text
TEXT_COMPONENT          // 3D world text
LINES_COMPONENT         // Debug lines
GRASS_REGION            // Grass rendering
GRASS_INTERACTOR        // Grass bending
```

## Transform

```rust
LocalTransform {
    translation: Vec3,
    rotation: nalgebra_glm::Quat,
    scale: Vec3,
}

// Create identity transform
LocalTransform::default()

// Create with values
LocalTransform {
    translation: Vec3::new(x, y, z),
    rotation: nalgebra_glm::quat_angle_axis(angle, &axis),
    scale: Vec3::new(1.0, 1.0, 1.0),
}
```

## Camera

```rust
Camera {
    projection: Projection,          // Perspective or Orthographic
    smoothing: Option<Smoothing>,    // Optional camera smoothing
}

PerspectiveCamera {
    aspect_ratio: Option<f32>,  // None = auto from window
    y_fov_rad: f32,             // Vertical field of view in radians
    z_far: Option<f32>,         // Far clip plane (None = infinite)
    z_near: f32,                // Near clip plane
}

OrthographicCamera {
    x_mag: f32,    // Horizontal magnification
    y_mag: f32,    // Vertical magnification
    z_far: f32,    // Far clip plane
    z_near: f32,   // Near clip plane
}

// Spawn cameras
spawn_camera(world, position: Vec3, name: String) -> Entity
spawn_fly_camera(world) -> Entity
spawn_pan_orbit_camera(world, focus: Vec3, radius: f32, yaw: f32, pitch: f32, name: String) -> Entity
```

## Primitives

```rust
spawn_cube_at(world, position: Vec3) -> Entity
spawn_sphere_at(world, position: Vec3) -> Entity
spawn_plane_at(world, position: Vec3) -> Entity
spawn_capsule_at(world, position: Vec3) -> Entity
```

## Model Loading

```rust
load_gltf(world, "path/to/model.glb") -> Vec<Entity>
load_gltf(world, "path/to/model.gltf") -> Vec<Entity>

// With custom transform
let entities = load_gltf(world, "model.glb");
for entity in entities {
    if let Some(transform) = world.get_local_transform_mut(entity) {
        transform.scale = Vec3::new(0.01, 0.01, 0.01);
    }
}
```

## Materials

```rust
Material {
    base_color: [f32; 4],        // RGBA
    roughness: f32,              // 0.0 (smooth) to 1.0 (rough)
    metallic: f32,               // 0.0 (dielectric) to 1.0 (metal)
    emissive_factor: [f32; 3],   // RGB emission
    emissive_strength: f32,      // Emission intensity
    alpha_mode: AlphaMode,       // Opaque, Mask, Blend
    alpha_cutoff: f32,           // For Mask mode
    double_sided: bool,          // Render both faces
    base_texture: Option<String>,
    normal_texture: Option<String>,
    metallic_roughness_texture: Option<String>,
    emissive_texture: Option<String>,
    occlusion_texture: Option<String>,
}
```

## Lighting

```rust
// Sun light
spawn_sun(world) -> Entity
```

## Physics

```rust
// Rigid bodies
add_rigid_body(world, entity, RigidBodyType::Dynamic, mass: f32)
add_rigid_body(world, entity, RigidBodyType::Static, 0.0)
add_rigid_body(world, entity, RigidBodyType::Kinematic, 0.0)

// Colliders
add_collider(world, entity, ColliderShape::Box { half_extents: Vec3 })
add_collider(world, entity, ColliderShape::Sphere { radius: f32 })
add_collider(world, entity, ColliderShape::Capsule { half_height: f32, radius: f32 })
add_collider(world, entity, ColliderShape::Cylinder { half_height: f32, radius: f32 })
add_collider(world, entity, ColliderShape::Cone { half_height: f32, radius: f32 })
add_collider(world, entity, ColliderShape::ConvexHull { points: Vec<Vec3> })
add_collider(world, entity, ColliderShape::TriMesh { vertices: Vec<Vec3>, indices: Vec<[u32; 3]> })
add_collider(world, entity, ColliderShape::Heightfield { heights: Vec<Vec<f32>>, scale: Vec3 })

// Joints
create_fixed_joint(world, body1, anchor1, body2, anchor2)
create_revolute_joint(world, body1, anchor1, body2, anchor2, axis)
create_prismatic_joint(world, body1, anchor1, body2, anchor2, axis)
create_spherical_joint(world, body1, anchor1, body2, anchor2)
create_rope_joint(world, body1, anchor1, body2, anchor2, max_distance)
create_spring_joint(world, body1, anchor1, body2, anchor2, rest_length, stiffness, damping)

// Raycasting
raycast(world, origin: Vec3, direction: Vec3, max_distance: f32) -> Option<RaycastHit>
raycast_all(world, origin, direction, max_distance) -> Vec<RaycastHit>

// Update
update_physics(world, dt: f32)
update_character_controller(world)
```

## Animation

```rust
// Get animation player
if let Some(player) = world.get_animation_player_mut(entity) {
    player.play("animation_name");
    player.blend_to("other_animation", blend_time: f32);
    player.stop();
    player.pause();
    player.resume();
    player.set_looping(true);
    player.set_speed(1.0);
    player.seek(time: f32);
    player.current_animation() -> Option<&str>
    player.is_playing() -> bool
}

// Update all animation players
update_animation_players(world, dt: f32)
```

## Audio

```rust
// Load sounds
load_sound(world, "name", "path/to/sound.wav")
load_sound(world, "music", "path/to/music.ogg")

// Play sounds
play_sound(world, "name")
play_sound_with_volume(world, "name", volume: f32)
play_sound_looped(world, "name")
stop_sound(world, "name")

// Spatial audio
spawn_audio_source(world, position: Vec3, sound_name: &str) -> Entity
```

## Input

```rust
// Keyboard
world.resources.input.keyboard.is_key_pressed(KeyCode::KeyW) -> bool
world.resources.input.keyboard.is_key_just_pressed(KeyCode::Space) -> bool
world.resources.input.keyboard.is_key_just_released(KeyCode::ShiftLeft) -> bool

// Mouse
world.resources.input.mouse.position -> Vec2
world.resources.input.mouse.delta -> Vec2
world.resources.input.mouse.scroll_delta -> Vec2
world.resources.input.mouse.state.contains(MouseState::LEFT_CLICKED) -> bool
world.resources.input.mouse.state.contains(MouseState::RIGHT_CLICKED) -> bool
world.resources.input.mouse.state.contains(MouseState::LEFT_JUST_PRESSED) -> bool

// Cursor
world.resources.input.cursor_locked = true;
world.resources.input.cursor_visible = false;

// Gamepad (with feature)
query_active_gamepad(world) -> Option<&Gamepad>
gamepad.is_pressed(gilrs::Button::South) -> bool
gamepad.axis_value(gilrs::Axis::LeftStickX) -> f32
```

## HUD Text

```rust
spawn_hud_text(world, text: &str, anchor: HudAnchor, offset: Vec2) -> Entity
spawn_hud_text_with_properties(world, text, anchor, offset, properties: TextProperties) -> Entity

TextProperties {
    font_size: f32,
    color: [f32; 4],
    text_alignment: TextAlignment,      // Left, Center, Right
    vertical_alignment: VerticalAlignment,
    line_height: f32,
    letter_spacing: f32,
    outline_width: f32,
    outline_color: [f32; 4],
}

HudAnchor::TopLeft | TopCenter | TopRight
HudAnchor::CenterLeft | Center | CenterRight
HudAnchor::BottomLeft | BottomCenter | BottomRight
```

## Particles

```rust
ParticleEmitter {
    emitter_type: EmitterType,     // Fire, Smoke, Sparks, Snow, Dust
    shape: EmitterShape,           // Point, Sphere, Box, Cone
    position: Vec3,
    direction: Vec3,
    spawn_rate: f32,
    burst_count: u32,
    particle_lifetime_min: f32,
    particle_lifetime_max: f32,
    initial_velocity_min: f32,
    initial_velocity_max: f32,
    velocity_spread: f32,
    gravity: Vec3,
    drag: f32,
    size_start: f32,
    size_end: f32,
    color_gradient: ColorGradient,
    emissive_strength: f32,
    turbulence_strength: f32,
    turbulence_frequency: f32,
    enabled: bool,
}
```

## Navigation

```rust
generate_navmesh_recast(world, vertices: &[Vec3], indices: &[[u32; 3]], config: &RecastNavMeshConfig)
set_agent_destination(world, agent: Entity, target: Vec3)
query_path(world, start: Vec3, end: Vec3) -> Option<Vec<Vec3>>
is_on_navmesh(world, point: Vec3) -> bool
add_offmesh_connection(world, start: Vec3, end: Vec3, bidirectional: bool)
update_navmesh_agents(world)
```

## Math (nalgebra_glm)

```rust
// Vectors
Vec2::new(x, y)
Vec3::new(x, y, z)
Vec4::new(x, y, z, w)
Vec3::zeros()
Vec3::x()  // Unit X
Vec3::y()  // Unit Y
Vec3::z()  // Unit Z

// Vector operations
vec.normalize()
vec.magnitude()
vec.dot(&other)
vec.cross(&other)

// Quaternions
nalgebra_glm::quat_identity()
nalgebra_glm::quat_angle_axis(angle: f32, axis: &Vec3) -> Quat
nalgebra_glm::quat_slerp(from: &Quat, to: &Quat, t: f32) -> Quat

// Interpolation
nalgebra_glm::lerp(from: &Vec3, to: &Vec3, t: f32) -> Vec3
```

## State Trait

```rust
trait State {
    fn title(&self) -> &str { "Nightshade" }
    fn initialize(&mut self, world: &mut World) {}
    fn run_systems(&mut self, world: &mut World) {}
    fn ui(&mut self, world: &mut World, ctx: &egui::Context) {}
    fn immediate_ui(&mut self, world: &mut World, ui: &mut ImmediateUi) {}
    fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: ElementState) {}
    fn on_mouse_input(&mut self, world: &mut World, state: ElementState, button: MouseButton) {}
    fn on_gamepad_event(&mut self, world: &mut World, event: gilrs::Event) {}
    fn handle_event(&mut self, world: &mut World, message: &Message) {}
    fn on_dropped_file(&mut self, world: &mut World, path: &Path) {}
    fn on_dropped_file_data(&mut self, world: &mut World, name: &str, data: &[u8]) {}
    fn configure_render_graph(&mut self, graph: &mut RenderGraph<World>, device: &wgpu::Device, surface_format: wgpu::TextureFormat, resources: RenderResources) {}
    fn update_render_graph(&mut self, graph: &mut RenderGraph<World>, world: &World) {}
    fn pre_render(&mut self, renderer: &mut dyn Render, world: &mut World) {}
    fn next_state(&mut self, world: &mut World) -> Option<Box<dyn State>> { None }
}
```

## Audio Analyzer (fft feature)

```rust
// Create analyzer
let mut analyzer = AudioAnalyzer::new();
analyzer.load_samples(samples, sample_rate);

// Analyze at playback position
analyzer.analyze_at_time(time_seconds);

// Frequency bands (0.0-1.0)
analyzer.sub_bass           // 20-60 Hz
analyzer.bass               // 60-250 Hz
analyzer.low_mids           // 250-500 Hz
analyzer.mids               // 500-2000 Hz
analyzer.high_mids          // 2000-4000 Hz
analyzer.highs              // 4000-12000 Hz

// Smoothed versions
analyzer.smoothed_bass
analyzer.smoothed_mids
// ... etc

// Beat detection (decay from 1.0)
analyzer.onset_detected     // bool
analyzer.kick_decay
analyzer.snare_decay
analyzer.hat_decay

// Tempo
analyzer.estimated_bpm      // 60-200
analyzer.beat_phase         // 0.0-1.0
analyzer.beat_confidence

// Structure detection
analyzer.is_building
analyzer.is_dropping
analyzer.is_breakdown
analyzer.build_intensity
analyzer.drop_intensity

// Spectral features
analyzer.spectral_centroid  // Brightness
analyzer.spectral_flatness  // Noise vs tonal
analyzer.spectral_flux      // Rate of change
analyzer.intensity          // Energy relative to average
```

## Effects Pass

```rust
use nightshade::render::wgpu::passes::postprocess::effects::*;

// Create state
let effects_state = create_effects_state();

// Modify effects
if let Ok(mut state) = effects_state.write() {
    state.uniforms.chromatic_aberration = 0.02;
    state.uniforms.vignette = 0.3;
    state.uniforms.glitch_intensity = 0.5;
    state.uniforms.wave_distortion = 0.2;
    state.uniforms.crt_scanlines = 0.3;
    state.uniforms.film_grain = 0.1;
    state.uniforms.hue_rotation = 0.5;
    state.uniforms.saturation = 1.2;
    state.uniforms.color_grade_mode = ColorGradeMode::Cyberpunk as f32;
    state.uniforms.raymarch_mode = RaymarchMode::Tunnel as f32;
    state.uniforms.raymarch_blend = 0.5;
    state.enabled = true;
}

// Color grade modes: None, Cyberpunk, Sunset, Grayscale, Sepia, Matrix, HotMetal
// Raymarch modes: Off, Tunnel, Fractal, Mandelbulb, PlasmaVortex, Geometric
```

## Debug Lines

```rust
// Spawn lines entity
let lines = world.spawn_entities(LOCAL_TRANSFORM | LINES_COMPONENT, 1)[0];

// Set line data
world.set_lines(lines, LinesComponent {
    lines: vec![
        Line { start: Vec3::zeros(), end: Vec3::new(1.0, 0.0, 0.0), color: [1.0, 0.0, 0.0, 1.0] },
        Line { start: Vec3::zeros(), end: Vec3::new(0.0, 1.0, 0.0), color: [0.0, 1.0, 0.0, 1.0] },
        Line { start: Vec3::zeros(), end: Vec3::new(0.0, 0.0, 1.0), color: [0.0, 0.0, 1.0, 1.0] },
    ],
});

// Gizmos
draw_gizmo_box(world, center, half_extents, color);
draw_gizmo_sphere(world, center, radius, color);
draw_gizmo_ray(world, origin, direction, length, color);
```

## Running

```rust
fn main() {
    nightshade::launch(MyGame::default());
}
```
