# API Quick Reference

Quick lookup for common Nightshade API functions and types.

## World

### Entity Management

```rust
let entities = world.spawn_entities(flags, count);
let entity = world.spawn_entities(LOCAL_TRANSFORM | RENDER_MESH, 1)[0];

world.despawn_entities(&[entity]);

for entity in world.query_entities(LOCAL_TRANSFORM | RENDER_MESH) {
    let transform = world.get_local_transform(entity);
}
```

### Component Access

```rust
world.get_local_transform(entity) -> Option<&LocalTransform>
world.get_global_transform(entity) -> Option<&GlobalTransform>
world.get_render_mesh(entity) -> Option<&RenderMesh>
world.get_material_ref(entity) -> Option<&MaterialRef>
world.get_camera(entity) -> Option<&Camera>
world.get_rigid_body(entity) -> Option<&RigidBodyComponent>
world.get_collider(entity) -> Option<&ColliderComponent>
world.get_animation_player(entity) -> Option<&AnimationPlayer>
world.get_parent(entity) -> Option<&Parent>
world.get_visibility(entity) -> Option<&Visibility>

world.get_local_transform_mut(entity) -> Option<&mut LocalTransform>
world.get_rigid_body_mut(entity) -> Option<&mut RigidBodyComponent>

world.set_local_transform(entity, LocalTransform { ... })
world.set_light(entity, Light { ... })

set_material_with_textures(world, entity, Material { ... })
```

### Resources

```rust
world.resources.window.timing.delta_time
world.resources.window.timing.frames_per_second
world.resources.window.timing.uptime_milliseconds
world.resources.input.keyboard
world.resources.input.mouse
world.resources.graphics.show_cursor
world.resources.active_camera
world.resources.graphics.ambient_light
world.resources.physics.gravity
```

## Component Flags

```rust
ANIMATION_PLAYER
NAME
LOCAL_TRANSFORM
GLOBAL_TRANSFORM
LOCAL_TRANSFORM_DIRTY
PARENT
IGNORE_PARENT_SCALE
AUDIO_SOURCE
AUDIO_LISTENER
CAMERA
PAN_ORBIT_CAMERA
LIGHT
LINES
VISIBILITY
DECAL
RENDER_MESH
MATERIAL_REF
RENDER_LAYER
SPRITE
SPRITE_ANIMATOR
TEXT
HUD_TEXT
TEXT_CHARACTER_COLORS
TEXT_CHARACTER_BACKGROUND_COLORS
BOUNDING_VOLUME
HOVERED
ROTATION
CASTS_SHADOW
RIGID_BODY
COLLIDER
PHYSICS_MATERIAL
CHARACTER_CONTROLLER
PHYSICS_INTERPOLATION
INSTANCED_MESH
PARTICLE_EMITTER
PREFAB_SOURCE
PREFAB_INSTANCE
SCRIPT
SKIN
JOINT
MORPH_WEIGHTS
NAVMESH_AGENT
LATTICE
LATTICE_INFLUENCED
WATER
GRASS_REGION
GRASS_INTERACTOR
```

## Transform

```rust
LocalTransform {
    translation: Vec3,
    rotation: nalgebra_glm::Quat,
    scale: Vec3,
}

LocalTransform::default()

LocalTransform {
    translation: Vec3::new(x, y, z),
    rotation: nalgebra_glm::quat_angle_axis(angle, &axis),
    scale: Vec3::new(1.0, 1.0, 1.0),
}
```

## Camera

```rust
Camera {
    projection: Projection,
    smoothing: Option<Smoothing>,
}

PerspectiveCamera {
    aspect_ratio: Option<f32>,
    y_fov_rad: f32,
    z_far: Option<f32>,
    z_near: f32,
}

OrthographicCamera {
    x_mag: f32,
    y_mag: f32,
    z_far: f32,
    z_near: f32,
}

spawn_camera(world, position: Vec3, name: String) -> Entity
spawn_pan_orbit_camera(world, focus: Vec3, radius: f32, yaw: f32, pitch: f32, name: String) -> Entity
spawn_ortho_camera(world, position: Vec2) -> Entity
```

## Primitives

```rust
spawn_cube_at(world, position: Vec3) -> Entity
spawn_sphere_at(world, position: Vec3) -> Entity
spawn_plane_at(world, position: Vec3) -> Entity
spawn_cylinder_at(world, position: Vec3) -> Entity
spawn_cone_at(world, position: Vec3) -> Entity
spawn_torus_at(world, position: Vec3) -> Entity
spawn_mesh_at(world, mesh_name: &str, position: Vec3, scale: Vec3) -> Entity
spawn_water_plane_at(world, position: Vec3) -> Entity
```

## Model Loading

```rust
let prefab = import_gltf_from_bytes(world, model_data, "character").unwrap();
let entity = spawn_prefab_with_animations(world, &prefab, Vec3::zeros());

for entity in entities {
    if let Some(transform) = world.get_local_transform_mut(entity) {
        transform.scale = Vec3::new(0.01, 0.01, 0.01);
    }
}
```

## Materials

```rust
Material {
    base_color: [f32; 4],
    emissive_factor: [f32; 3],
    alpha_mode: AlphaMode,
    alpha_cutoff: f32,
    base_texture: Option<String>,
    base_texture_uv_set: u32,
    emissive_texture: Option<String>,
    emissive_texture_uv_set: u32,
    normal_texture: Option<String>,
    normal_texture_uv_set: u32,
    normal_scale: f32,
    normal_map_flip_y: bool,
    normal_map_two_component: bool,
    metallic_roughness_texture: Option<String>,
    metallic_roughness_texture_uv_set: u32,
    occlusion_texture: Option<String>,
    occlusion_texture_uv_set: u32,
    occlusion_strength: f32,
    roughness: f32,
    metallic: f32,
    unlit: bool,
    double_sided: bool,
    uv_scale: [f32; 2],
    transmission_factor: f32,
    transmission_texture: Option<String>,
    transmission_texture_uv_set: u32,
    thickness: f32,
    thickness_texture: Option<String>,
    thickness_texture_uv_set: u32,
    attenuation_color: [f32; 3],
    attenuation_distance: f32,
    ior: f32,
    specular_factor: f32,
    specular_color_factor: [f32; 3],
    specular_texture: Option<String>,
    specular_texture_uv_set: u32,
    specular_color_texture: Option<String>,
    specular_color_texture_uv_set: u32,
    emissive_strength: f32,
}
```

## Lighting

```rust
spawn_sun(world) -> Entity
spawn_sun_without_shadows(world) -> Entity

Light {
    light_type: LightType,
    color: Vec3,
    intensity: f32,
    range: f32,
    inner_cone_angle: f32,
    outer_cone_angle: f32,
    cast_shadows: bool,
    shadow_bias: f32,
}
```

## Physics

```rust
world.resources.physics.add_rigid_body(rigid_body: RigidBody) -> RigidBodyHandle
world.resources.physics.add_collider(collider, parent) -> ColliderHandle

RigidBodyComponent::new_dynamic()
RigidBodyComponent::new_static()

ColliderComponent::cuboid(hx: f32, hy: f32, hz: f32)

run_physics_systems(world)
sync_transforms_from_physics_system(world)
sync_transforms_to_physics_system(world)
initialize_physics_bodies_system(world)
physics_interpolation_system(world)
character_controller_system(world)
character_controller_input_system(world)
```

### Joints

```rust
create_fixed_joint(world, body1, anchor1, body2, anchor2)
create_revolute_joint(world, body1, anchor1, body2, anchor2, axis)
create_prismatic_joint(world, body1, anchor1, body2, anchor2, axis)
create_spherical_joint(world, body1, anchor1, body2, anchor2)
create_rope_joint(world, body1, anchor1, body2, anchor2, max_distance)
create_spring_joint(world, body1, anchor1, body2, anchor2, rest_length, stiffness, damping)
```

## Animation

```rust
if let Some(player) = world.get_animation_player_mut(entity) {
    player.play(clip_index);
    player.blend_to(clip_index, duration);
    player.stop();
    player.pause();
    player.resume();
    player.looping = true;
    player.speed = 1.0;
    player.time = 0.0;
    player.playing
    player.current_clip
}

update_animation_players(world, dt: f32)
```

## Audio

Requires the `audio` feature.

```rust
let sound_data = load_sound_from_bytes(include_bytes!("sound.ogg")).unwrap();
let sound_data = load_sound_from_file("path/to/sound.wav").unwrap();
let sound_data = load_sound_from_cursor(data).unwrap();

world.resources.audio.load_sound("name", sound_data);

world.resources.audio.stop_sound(entity);

let source = world.spawn_entities(AUDIO_SOURCE | LOCAL_TRANSFORM | GLOBAL_TRANSFORM, 1)[0];
world.set_audio_source(source, AudioSource::new(sound_data).with_spatial(true));
```

## Input

```rust
world.resources.input.keyboard.is_key_pressed(KeyCode::KeyW) -> bool

world.resources.input.mouse.position -> Vec2
world.resources.input.mouse.position_delta -> Vec2
world.resources.input.mouse.wheel_delta -> Vec2
world.resources.input.mouse.state.contains(MouseState::LEFT_CLICKED) -> bool
world.resources.input.mouse.state.contains(MouseState::RIGHT_CLICKED) -> bool
world.resources.input.mouse.state.contains(MouseState::LEFT_JUST_PRESSED) -> bool

world.resources.graphics.show_cursor = false;

query_active_gamepad(world) -> Option<gilrs::Gamepad<'_>>
```

## HUD Text

```rust
spawn_hud_text(world, text: impl Into<String>, anchor: HudAnchor, position: Vec2) -> Entity
spawn_hud_text_with_properties(world, text: impl Into<String>, anchor: HudAnchor, position: Vec2, properties: TextProperties) -> Entity

TextProperties {
    font_size: f32,
    color: Vec4,
    alignment: TextAlignment,
    vertical_alignment: VerticalAlignment,
    line_height: f32,
    letter_spacing: f32,
    outline_width: f32,
    outline_color: Vec4,
    smoothing: f32,
    monospace_width: Option<f32>,
    anchor_character: Option<usize>,
}

HudAnchor::TopLeft | TopCenter | TopRight
HudAnchor::CenterLeft | Center | CenterRight
HudAnchor::BottomLeft | BottomCenter | BottomRight
```

## Particles

```rust
ParticleEmitter {
    emitter_type: EmitterType,
    shape: EmitterShape,
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

Requires the `navmesh` feature.

```rust
generate_navmesh_recast(vertices: &[[f32; 3]], indices: &[[u32; 3]], config: &RecastNavMeshConfig) -> Option<NavMeshWorld>

spawn_navmesh_agent(world, position: Vec3, radius: f32, height: f32) -> Entity
set_agent_destination(world, entity: Entity, destination: Vec3)
set_agent_speed(world, entity: Entity, speed: f32)
stop_agent(world, entity: Entity)
get_agent_state(world, entity: Entity) -> Option<NavMeshAgentState>
get_agent_path_length(world, entity: Entity) -> Option<f32>

find_closest_point_on_navmesh(navmesh: &NavMeshWorld, point: Vec3) -> Option<Vec3>
sample_navmesh_height(navmesh: &NavMeshWorld, x: f32, z: f32) -> Option<f32>
set_navmesh_debug_draw(world, enabled: bool)
clear_navmesh(world)

run_navmesh_systems(world, delta_time: f32)
```

## Math (nalgebra_glm)

```rust
Vec2::new(x, y)
Vec3::new(x, y, z)
Vec4::new(x, y, z, w)
Vec3::zeros()
Vec3::x()
Vec3::y()
Vec3::z()

vec.normalize()
vec.magnitude()
vec.dot(&other)
vec.cross(&other)

nalgebra_glm::quat_identity()
nalgebra_glm::quat_angle_axis(angle: f32, axis: &Vec3) -> Quat
nalgebra_glm::quat_slerp(from: &Quat, to: &Quat, t: f32) -> Quat

nalgebra_glm::lerp(from: &Vec3, to: &Vec3, t: f32) -> Vec3
```

## State Trait

```rust
trait State {
    fn title(&self) -> &str { "Nightshade" }
    fn icon_bytes(&self) -> Option<&'static [u8]> { ... }
    fn initialize(&mut self, world: &mut World) {}
    fn run_systems(&mut self, world: &mut World) {}
    fn ui(&mut self, world: &mut World, ctx: &egui::Context) {}
    fn secondary_ui(&mut self, world: &mut World, window_index: usize, ctx: &egui::Context) {}
    fn immediate_ui(&mut self, world: &mut World, ui: &mut ImmediateUi) {}
    fn on_keyboard_input(&mut self, world: &mut World, key_code: KeyCode, key_state: ElementState) {}
    fn on_mouse_input(&mut self, world: &mut World, state: ElementState, button: MouseButton) {}
    fn on_gamepad_event(&mut self, world: &mut World, event: gilrs::Event) {}
    fn handle_event(&mut self, world: &mut World, message: &Message) {}
    fn on_dropped_file(&mut self, world: &mut World, path: &Path) {}
    fn on_dropped_file_data(&mut self, world: &mut World, name: &str, data: &[u8]) {}
    fn on_hovered_file(&mut self, world: &mut World, path: &Path) {}
    fn on_hovered_file_cancelled(&mut self, world: &mut World) {}
    fn configure_render_graph(&mut self, graph: &mut RenderGraph<World>, device: &wgpu::Device, surface_format: wgpu::TextureFormat, resources: RenderResources) {}
    fn update_render_graph(&mut self, graph: &mut RenderGraph<World>, world: &World) {}
    fn pre_render(&mut self, renderer: &mut dyn Render, world: &mut World) {}
    fn next_state(&mut self, world: &mut World) -> Option<Box<dyn State>> { None }
    fn handle_mcp_command(&mut self, world: &mut World, command: &McpCommand) -> Option<McpResponse> { None }
    fn after_mcp_command(&mut self, world: &mut World, command: &McpCommand, response: &McpResponse) {}
}
```

## Audio Analyzer (fft feature)

```rust
let mut analyzer = AudioAnalyzer::new();
analyzer.load_samples(samples, sample_rate);

analyzer.analyze_at_time(time_seconds);

analyzer.sub_bass
analyzer.bass
analyzer.low_mids
analyzer.mids
analyzer.high_mids
analyzer.highs

analyzer.smoothed_bass
analyzer.smoothed_mids

analyzer.onset_detected
analyzer.kick_decay
analyzer.snare_decay
analyzer.hat_decay

analyzer.estimated_bpm
analyzer.beat_phase
analyzer.beat_confidence

analyzer.is_building
analyzer.is_dropping
analyzer.is_breakdown
analyzer.build_intensity
analyzer.drop_intensity

analyzer.spectral_centroid
analyzer.spectral_flatness
analyzer.spectral_flux
analyzer.intensity
```

## Effects Pass

```rust
use nightshade::render::wgpu::passes::postprocess::effects::*;

let effects_state = create_effects_state();

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
```

## Debug Lines

```rust
let lines_entity = world.spawn_entities(LOCAL_TRANSFORM | LINES, 1)[0];

world.set_lines(lines_entity, Lines {
    lines: vec![
        Line { start: Vec3::zeros(), end: Vec3::new(1.0, 0.0, 0.0), color: Vec4::new(1.0, 0.0, 0.0, 1.0) },
        Line { start: Vec3::zeros(), end: Vec3::new(0.0, 1.0, 0.0), color: Vec4::new(0.0, 1.0, 0.0, 1.0) },
        Line { start: Vec3::zeros(), end: Vec3::new(0.0, 0.0, 1.0), color: Vec4::new(0.0, 0.0, 1.0, 1.0) },
    ],
    version: 0,
});
```

## World Commands

```rust
world.queue_command(WorldCommand::LoadTexture {
    name: "my_texture".to_string(),
    rgba_data: texture_bytes,
    width: 256,
    height: 256,
});

world.queue_command(WorldCommand::DespawnRecursive { entity });
world.queue_command(WorldCommand::LoadHdrSkybox { hdr_data });
world.queue_command(WorldCommand::CaptureScreenshot { path: None });

despawn_recursive_immediate(world, entity);
```

## Running

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    nightshade::launch(MyGame::default())
}
```
