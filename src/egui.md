# egui Integration

> **Live Demo:** [UI](https://matthewberger.dev/nightshade/ui)

Nightshade integrates [egui](https://github.com/emilk/egui), a popular immediate-mode GUI library for Rust. Use it for debug interfaces, tools, and in-game menus.

## Enabling egui

Add the `egui` feature to your `Cargo.toml`:

```toml
nightshade = { git = "...", features = ["engine", "egui"] }
```

## The ui() Method

Implement the `ui()` method on your `State` to render egui:

```rust
impl State for MyGame {
    fn ui(&mut self, ctx: &egui::Context, world: &mut World) {
        egui::Window::new("Debug")
            .show(ctx, |ui| {
                ui.label("Hello, World!");
            });
    }
}
```

## Common Widgets

### Labels

```rust
ui.label("Static text");
ui.label(format!("FPS: {:.0}", world.resources.window.timing.fps));
ui.colored_label(egui::Color32::RED, "Warning!");
```

### Buttons

```rust
if ui.button("Click me").clicked() {
    self.counter += 1;
}

if ui.button("Spawn Enemy").clicked() {
    spawn_enemy(world);
}
```

### Sliders

```rust
ui.add(egui::Slider::new(&mut self.speed, 0.0..=10.0).text("Speed"));

ui.add(egui::Slider::new(&mut world.resources.graphics.exposure, 0.1..=5.0)
    .text("Exposure"));
```

### Checkboxes

```rust
ui.checkbox(&mut self.paused, "Paused");

ui.checkbox(&mut world.resources.graphics.bloom_enabled, "Bloom");
ui.checkbox(&mut world.resources.graphics.ssao_enabled, "SSAO");
```

### Text Input

```rust
ui.text_edit_singleline(&mut self.player_name);

ui.text_edit_multiline(&mut self.notes);
```

### Combo Boxes

```rust
egui::ComboBox::from_label("Difficulty")
    .selected_text(format!("{:?}", self.difficulty))
    .show_ui(ui, |ui| {
        ui.selectable_value(&mut self.difficulty, Difficulty::Easy, "Easy");
        ui.selectable_value(&mut self.difficulty, Difficulty::Normal, "Normal");
        ui.selectable_value(&mut self.difficulty, Difficulty::Hard, "Hard");
    });
```

### Color Picker

```rust
ui.color_edit_button_rgb(&mut self.light_color);

let mut color = [
    world.resources.graphics.ambient_color.x,
    world.resources.graphics.ambient_color.y,
    world.resources.graphics.ambient_color.z,
];
if ui.color_edit_button_rgb(&mut color).changed() {
    world.resources.graphics.ambient_color = Vec3::new(color[0], color[1], color[2]);
}
```

## Layouts

### Horizontal

```rust
ui.horizontal(|ui| {
    ui.label("Name:");
    ui.text_edit_singleline(&mut self.name);
});
```

### Vertical

```rust
ui.vertical(|ui| {
    ui.label("Line 1");
    ui.label("Line 2");
    ui.label("Line 3");
});
```

### Columns

```rust
ui.columns(2, |columns| {
    columns[0].label("Left column");
    columns[1].label("Right column");
});
```

### Spacing

```rust
ui.add_space(10.0);
ui.separator();
```

## Windows

### Basic Window

```rust
egui::Window::new("Settings")
    .show(ctx, |ui| {
        ui.label("Settings content");
    });
```

### Configurable Window

```rust
egui::Window::new("Inspector")
    .resizable(true)
    .collapsible(true)
    .default_pos([10.0, 10.0])
    .default_size([300.0, 400.0])
    .show(ctx, |ui| {
        // Content
    });
```

### Conditional Window

```rust
if self.show_inventory {
    egui::Window::new("Inventory")
        .open(&mut self.show_inventory)
        .show(ctx, |ui| {
            // Inventory content
        });
}
```

## Panels

### Side Panel

```rust
egui::SidePanel::left("left_panel")
    .default_width(200.0)
    .show(ctx, |ui| {
        ui.heading("Tools");
        if ui.button("Select").clicked() {
            self.tool = Tool::Select;
        }
        if ui.button("Move").clicked() {
            self.tool = Tool::Move;
        }
    });
```

### Top/Bottom Panel

```rust
egui::TopBottomPanel::top("menu_bar").show(ctx, |ui| {
    egui::menu::bar(ui, |ui| {
        ui.menu_button("File", |ui| {
            if ui.button("New").clicked() {
                self.new_scene();
            }
            if ui.button("Open").clicked() {
                self.open_scene();
            }
            if ui.button("Save").clicked() {
                self.save_scene();
            }
        });
    });
});
```

### Central Panel

```rust
egui::CentralPanel::default().show(ctx, |ui| {
    ui.heading("Main Content Area");
});
```

## Debug UI Example

```rust
fn ui(&mut self, ctx: &egui::Context, world: &mut World) {
    egui::Window::new("Debug Info").show(ctx, |ui| {
        ui.heading("Performance");
        ui.label(format!("FPS: {:.0}", world.resources.window.timing.fps));
        ui.label(format!("Frame Time: {:.2}ms", world.resources.window.timing.frame_time * 1000.0));
        ui.label(format!("Entities: {}", world.entity_count()));

        ui.separator();

        ui.heading("Graphics");
        ui.checkbox(&mut world.resources.graphics.bloom_enabled, "Bloom");
        ui.checkbox(&mut world.resources.graphics.ssao_enabled, "SSAO");
        ui.add(egui::Slider::new(&mut world.resources.graphics.exposure, 0.1..=5.0).text("Exposure"));

        ui.separator();

        ui.heading("Player");
        if let Some(transform) = world.get_local_transform(self.player) {
            ui.label(format!("Position: ({:.1}, {:.1}, {:.1})",
                transform.position.x,
                transform.position.y,
                transform.position.z
            ));
        }
    });
}
```

## Input Handling

Check if egui wants keyboard/mouse input:

```rust
fn run_systems(&mut self, world: &mut World) {
    if !ctx.wants_keyboard_input() {
        handle_game_keyboard(world);
    }

    if !ctx.wants_pointer_input() {
        handle_game_mouse(world);
    }
}
```

## Styling

### Dark Theme (Default)

```rust
ctx.set_visuals(egui::Visuals::dark());
```

### Light Theme

```rust
ctx.set_visuals(egui::Visuals::light());
```

### Custom Colors

```rust
let mut visuals = egui::Visuals::dark();
visuals.widgets.active.bg_fill = egui::Color32::from_rgb(60, 60, 120);
ctx.set_visuals(visuals);
```

## Best Practices

1. **Keep debug UI toggleable**: Add a key to show/hide debug windows
2. **Group related settings**: Use collapsing headers and separators
3. **Show real-time data**: FPS, entity counts, memory usage
4. **Provide quick actions**: Spawn entities, reload assets, reset state
5. **Don't block gameplay**: Check `wants_keyboard_input()` before processing game input
