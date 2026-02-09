# Immediate Mode UI

> **Live Demo:** [Menu](https://matthewberger.dev/nightshade/menu)

In addition to egui, Nightshade provides a lightweight custom immediate-mode UI system for simple in-game interfaces.

## The immediate_ui() Method

Implement the `immediate_ui()` method on your `State`:

```rust
impl State for MyGame {
    fn immediate_ui(&mut self, world: &mut World, ui: &mut ImmediateUi) {
        ui.panel(PanelPosition::Left, 200.0, |ui| {
            ui.label("Left Panel");
            if ui.button("Click me") {
                self.counter += 1;
            }
        });
    }
}
```

## Panel Positions

```rust
pub enum PanelPosition {
    Left,
    Right,
    Top,
    Bottom,
    Central,
    Floating { x: f32, y: f32 },
}
```

### Side Panels

```rust
ui.panel(PanelPosition::Left, 250.0, |ui| {
    ui.label("Tools");
});

ui.panel(PanelPosition::Right, 300.0, |ui| {
    ui.label("Inspector");
});
```

### Top/Bottom Panels

```rust
ui.panel(PanelPosition::Top, 50.0, |ui| {
    ui.horizontal(|ui| {
        ui.label("Menu Bar");
    });
});

ui.panel(PanelPosition::Bottom, 100.0, |ui| {
    ui.label("Status Bar");
});
```

### Floating Panels

```rust
ui.panel(PanelPosition::Floating { x: 100.0, y: 100.0 }, 200.0, |ui| {
    ui.label("Floating Window");
});
```

### Central Panel

```rust
ui.panel(PanelPosition::Central, 0.0, |ui| {
    ui.label("Main content area");
});
```

## Widgets

### Labels

```rust
ui.label("Simple text");
ui.label(format!("Score: {}", self.score));
```

### Buttons

```rust
if ui.button("Start Game") {
    self.start_game();
}

if ui.button("Exit") {
    std::process::exit(0);
}
```

### Sliders

```rust
ui.slider("Volume", &mut self.volume, 0.0..100.0);
ui.slider("Brightness", &mut self.brightness, 0.0..2.0);
```

### Text Input

```rust
ui.horizontal(|ui| {
    ui.label("Name:");
    ui.text_input(&mut self.player_name);
});
```

### Checkboxes

```rust
ui.checkbox("Fullscreen", &mut self.fullscreen);
ui.checkbox("VSync", &mut self.vsync);
```

## Layouts

### Horizontal Layout

```rust
ui.horizontal(|ui| {
    if ui.button("Previous") {
        self.page -= 1;
    }
    ui.label(format!("Page {}", self.page));
    if ui.button("Next") {
        self.page += 1;
    }
});
```

### Vertical Layout

```rust
ui.vertical(|ui| {
    ui.label("Option 1");
    ui.label("Option 2");
    ui.label("Option 3");
});
```

### Spacing

```rust
ui.space(10.0);
ui.separator();
```

## Pause Menu Example

```rust
fn immediate_ui(&mut self, world: &mut World, ui: &mut ImmediateUi) {
    if self.paused {
        ui.panel(PanelPosition::Central, 300.0, |ui| {
            ui.label("PAUSED");
            ui.space(20.0);

            if ui.button("Resume") {
                self.paused = false;
            }

            if ui.button("Settings") {
                self.show_settings = true;
            }

            if ui.button("Quit to Menu") {
                self.quit_to_menu();
            }
        });
    }
}
```

## Settings Menu Example

```rust
fn immediate_ui(&mut self, world: &mut World, ui: &mut ImmediateUi) {
    if self.show_settings {
        ui.panel(PanelPosition::Central, 400.0, |ui| {
            ui.label("Settings");
            ui.separator();

            ui.label("Audio");
            ui.slider("Master Volume", &mut self.master_volume, 0.0..100.0);
            ui.slider("Music Volume", &mut self.music_volume, 0.0..100.0);
            ui.slider("SFX Volume", &mut self.sfx_volume, 0.0..100.0);

            ui.separator();

            ui.label("Graphics");
            ui.checkbox("Fullscreen", &mut self.fullscreen);
            ui.checkbox("VSync", &mut self.vsync);
            ui.slider("Brightness", &mut self.brightness, 0.5..1.5);

            ui.separator();

            ui.horizontal(|ui| {
                if ui.button("Apply") {
                    self.apply_settings(world);
                }
                if ui.button("Cancel") {
                    self.show_settings = false;
                }
            });
        });
    }
}
```

## Inventory UI Example

```rust
fn immediate_ui(&mut self, world: &mut World, ui: &mut ImmediateUi) {
    ui.panel(PanelPosition::Right, 250.0, |ui| {
        ui.label("Inventory");
        ui.separator();

        for (index, item) in self.inventory.items.iter().enumerate() {
            ui.horizontal(|ui| {
                ui.label(&item.name);
                ui.label(format!("x{}", item.quantity));
                if ui.button("Use") {
                    self.use_item(index);
                }
            });
        }

        ui.separator();
        ui.label(format!("Gold: {}", self.gold));
    });
}
```

## Dialog Box Example

```rust
fn immediate_ui(&mut self, world: &mut World, ui: &mut ImmediateUi) {
    if let Some(dialog) = &self.current_dialog {
        ui.panel(PanelPosition::Bottom, 150.0, |ui| {
            ui.label(&dialog.speaker);
            ui.separator();
            ui.label(&dialog.text);
            ui.space(10.0);

            ui.horizontal(|ui| {
                for (index, choice) in dialog.choices.iter().enumerate() {
                    if ui.button(choice) {
                        self.select_dialog_choice(index);
                    }
                }
            });
        });
    }
}
```

## Styling

The immediate UI uses the engine's built-in styling. Colors and fonts are controlled through the `UserInterface` resource:

```rust
world.resources.user_interface.text_color = Vec4::new(1.0, 1.0, 1.0, 1.0);
world.resources.user_interface.background_color = Vec4::new(0.1, 0.1, 0.1, 0.9);
world.resources.user_interface.button_color = Vec4::new(0.2, 0.2, 0.2, 1.0);
world.resources.user_interface.button_hover_color = Vec4::new(0.3, 0.3, 0.3, 1.0);
```

## When to Use

Use the immediate UI for:

- Simple in-game menus (pause, settings)
- HUD elements that don't need complex layouts
- Quick prototyping

Use egui for:

- Complex debug tools
- Editor interfaces
- Forms with many input types
- Dockable windows
