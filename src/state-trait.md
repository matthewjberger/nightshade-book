# The State Trait

The `State` trait is the primary interface between your game and the Nightshade engine. Every game implements this trait to define its behavior.

## Trait Definition

```rust
pub trait State: 'static {
    fn title(&self) -> &str;
    fn initialize(&mut self, world: &mut World);
    fn run_systems(&mut self, world: &mut World);

    // Optional methods with default implementations
    fn ui(&mut self, ctx: &egui::Context, world: &mut World) {}
    fn immediate_ui(&mut self, world: &mut World, ui: &mut ImmediateUi) {}
    fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: KeyState) {}
    fn on_mouse_input(&mut self, world: &mut World, button: MouseButton, state: ElementState) {}
    fn on_gamepad_event(&mut self, world: &mut World, event: gilrs::Event) {}
    fn on_dropped_file(&mut self, world: &mut World, path: PathBuf) {}
    fn configure_render_graph(
        &mut self,
        graph: &mut RenderGraph<World>,
        device: &wgpu::Device,
        surface_format: wgpu::TextureFormat,
        resources: RenderResources,
    ) {}
}
```

## Required Methods

### title()

Returns the window title:

```rust
fn title(&self) -> &str {
    "My Awesome Game"
}
```

### initialize()

Called once when the application starts. Use this to set up your initial game state:

```rust
fn initialize(&mut self, world: &mut World) {
    world.resources.graphics.atmosphere = Atmosphere::Sky;

    let camera = spawn_camera(world, Vec3::new(0.0, 5.0, 10.0), "Camera".to_string());
    world.resources.active_camera = Some(camera);

    self.player = Some(spawn_player(world));
}
```

### run_systems()

Called every frame. This is where your game logic lives:

```rust
fn run_systems(&mut self, world: &mut World) {
    player_movement_system(world);
    enemy_ai_system(world);
    collision_response_system(world);
}
```

## Optional Methods

### ui()

For egui-based user interfaces:

```rust
fn ui(&mut self, ctx: &egui::Context, world: &mut World) {
    egui::Window::new("Debug").show(ctx, |ui| {
        ui.label(format!("FPS: {:.0}", world.resources.window.timing.frames_per_second));
        ui.label(format!("Entities: {}", world.entity_count()));
    });
}
```

### immediate_ui()

For the built-in immediate mode UI (menus, HUD):

```rust
fn immediate_ui(&mut self, world: &mut World, ui: &mut ImmediateUi) {
    if self.paused {
        ui.panel("Pause Menu", |ui| {
            if ui.button("Resume") {
                self.paused = false;
            }
            if ui.button("Quit") {
                std::process::exit(0);
            }
        });
    }
}
```

### on_keyboard_input()

Handle keyboard events directly:

```rust
fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: KeyState) {
    if state == KeyState::Pressed {
        match key {
            KeyCode::Escape => self.paused = !self.paused,
            KeyCode::F11 => toggle_fullscreen(world),
            _ => {}
        }
    }
}
```

### on_gamepad_event()

Handle gamepad button presses:

```rust
fn on_gamepad_event(&mut self, world: &mut World, event: gilrs::Event) {
    if let gilrs::EventType::ButtonPressed(button, _) = event.event {
        match button {
            gilrs::Button::Start => self.paused = !self.paused,
            gilrs::Button::South => self.player_jump(),
            _ => {}
        }
    }
}
```

### configure_render_graph()

Customize the rendering pipeline:

```rust
fn configure_render_graph(
    &mut self,
    graph: &mut RenderGraph<World>,
    device: &wgpu::Device,
    surface_format: wgpu::TextureFormat,
    resources: RenderResources,
) {
    let bloom_pass = passes::BloomPass::new(device, 1920, 1080);
    graph
        .pass(Box::new(bloom_pass))
        .read("hdr", resources.scene_color)
        .write("bloom", resources.bloom);
}
```

## Launching Your Game

Use the `nightshade::run` function to run your game:

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    nightshade::run(MyGame::default())
}
```

Or with an HDR skybox:

```rust
fn initialize(&mut self, world: &mut World) {
    load_hdr_skybox(world, include_bytes!("../assets/sky.hdr").to_vec());
}
```
