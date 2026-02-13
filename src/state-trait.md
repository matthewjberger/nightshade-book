# The State Trait

The `State` trait is the primary interface between your game and the Nightshade engine. Every game implements this trait to define its behavior.

## Trait Definition

```rust
pub trait State {
    fn title(&self) -> &str { "Nightshade" }
    fn icon_bytes(&self) -> Option<&'static [u8]> { Some(LOGO_BYTES) }
    fn initialize(&mut self, world: &mut World) {}
    fn run_systems(&mut self, world: &mut World) {}
    fn ui(&mut self, world: &mut World, ctx: &egui::Context) {}
    fn immediate_ui(&mut self, world: &mut World, ui: &mut ImmediateUi) {}
    fn configure_render_graph(
        &mut self,
        graph: &mut RenderGraph<World>,
        device: &wgpu::Device,
        surface_format: wgpu::TextureFormat,
        resources: RenderResources,
    ) {}
    fn update_render_graph(&mut self, graph: &mut RenderGraph<World>, world: &World) {}
    fn pre_render(&mut self, renderer: &mut dyn Render, world: &mut World) {}
    fn handle_event(&mut self, world: &mut World, message: &Message) {}
    fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: ElementState) {}
    fn on_dropped_file(&mut self, world: &mut World, path: &Path) {}
    fn on_dropped_file_data(&mut self, world: &mut World, name: &str, data: &[u8]) {}
    fn on_hovered_file(&mut self, world: &mut World, path: &Path) {}
    fn on_hovered_file_cancelled(&mut self, world: &mut World) {}
    fn on_mouse_input(&mut self, world: &mut World, state: ElementState, button: MouseButton) {}
    fn on_gamepad_event(&mut self, world: &mut World, event: gilrs::Event) {}
    fn next_state(&mut self, world: &mut World) -> Option<Box<dyn State>> { None }
}
```

All methods have default implementations, so you only need to implement the ones relevant to your game.

## Commonly Used Methods

### title()

Returns the window title. Defaults to `"Nightshade"` if not overridden:

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

For egui-based user interfaces. Note that `world` comes before `ctx`:

```rust
fn ui(&mut self, world: &mut World, ctx: &egui::Context) {
    egui::Window::new("Debug").show(ctx, |ui| {
        ui.label(format!("FPS: {:.0}", world.resources.window.timing.frames_per_second));
        ui.label(format!("Entities: {}", world.query_entities(RENDER_MESH).count()));
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
fn on_keyboard_input(&mut self, world: &mut World, key: KeyCode, state: ElementState) {
    if state == ElementState::Pressed {
        match key {
            KeyCode::Escape => self.paused = !self.paused,
            KeyCode::F11 => toggle_fullscreen(world),
            _ => {}
        }
    }
}
```

### on_mouse_input()

Handle mouse button events:

```rust
fn on_mouse_input(&mut self, world: &mut World, state: ElementState, button: MouseButton) {
    if state == ElementState::Pressed {
        match button {
            MouseButton::Left => self.shoot(world),
            MouseButton::Right => self.aim(world),
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

Customize the rendering pipeline. Called once during initialization:

```rust
fn configure_render_graph(
    &mut self,
    graph: &mut RenderGraph<World>,
    device: &wgpu::Device,
    surface_format: wgpu::TextureFormat,
    resources: RenderResources,
) {
    let bloom_pass = passes::BloomPass::new(device, 1920, 1080);
    graph.add_pass(
        Box::new(bloom_pass),
        &[("input", resources.scene_color), ("output", resources.bloom)],
    );
}
```

### update_render_graph()

Called each frame to update render graph state dynamically:

```rust
fn update_render_graph(&mut self, graph: &mut RenderGraph<World>, world: &World) {
    if self.bloom_changed {
        graph.set_enabled("bloom_pass", self.bloom_enabled);
        self.bloom_changed = false;
    }
}
```

### pre_render()

Called before rendering begins each frame. Useful for custom GPU uploads or renderer state changes:

```rust
fn pre_render(&mut self, renderer: &mut dyn Render, world: &mut World) {
    renderer.update_custom_buffer(world, &self.custom_data);
}
```

### next_state()

Allows transitioning to a different State. Return `Some(new_state)` to switch:

```rust
fn next_state(&mut self, world: &mut World) -> Option<Box<dyn State>> {
    if self.transition_to_gameplay {
        Some(Box::new(GameplayState::new()))
    } else {
        None
    }
}
```

### on_dropped_file() / on_dropped_file_data()

Handle files dropped onto the window:

```rust
fn on_dropped_file(&mut self, world: &mut World, path: &Path) {
    if path.extension() == Some("glb".as_ref()) {
        self.load_model(world, path);
    }
}

fn on_dropped_file_data(&mut self, world: &mut World, name: &str, data: &[u8]) {
    self.process_dropped_data(world, name, data);
}
```

### on_hovered_file() / on_hovered_file_cancelled()

Handle file drag hover events:

```rust
fn on_hovered_file(&mut self, world: &mut World, path: &Path) {
    self.show_drop_indicator = true;
}

fn on_hovered_file_cancelled(&mut self, world: &mut World) {
    self.show_drop_indicator = false;
}
```

### handle_event()

Handle custom EventBus messages:

```rust
fn handle_event(&mut self, world: &mut World, message: &Message) {
    match message {
        Message::Custom(data) => self.process_event(world, data),
        _ => {}
    }
}
```

## Launching Your Game

Use the `nightshade::launch` function to run your game:

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    nightshade::launch(MyGame::default())
}
```

Or with an HDR skybox:

```rust
fn initialize(&mut self, world: &mut World) {
    load_hdr_skybox(world, include_bytes!("../assets/sky.hdr").to_vec());
}
```
