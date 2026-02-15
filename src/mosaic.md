# Mosaic Framework

The `mosaic` feature provides a multi-pane desktop application framework built on `egui_tiles`. It handles dockable tile-based layouts, serializable widgets, theming, modals, notifications, and more.

## Enabling Mosaic

```toml
nightshade = { git = "...", features = ["mosaic"] }
```

The `mosaic` feature requires `egui` (pulled in automatically).

## Architecture

| Component | Description |
|-----------|-------------|
| `Widget<C, M>` trait | Implement for each widget type - title, ui, lifecycle hooks, closability, camera requirements, catalog |
| `Mosaic<W, C, M>` | Manages the tile tree, rendering, widget lifecycle, modals, layout persistence, messaging, and tree walking |
| `MosaicConfig` | Configurable behavior - tab bar height, gap width, closability, add button visibility |
| `TileBehavior<W, C, M>` | Implements `egui_tiles::Behavior` with closable tabs, drag-and-drop, and an add-widget popup with search |
| `ViewportWidget` | Built-in 3D viewport with camera rendering, selection, and multi-camera selector |
| `WidgetContext<C, M>` | Passed to widgets during rendering with world access, modal service, viewport state, app context, and message sending |
| `Modals` | Modal dialog service for confirm and text input dialogs |
| `Pane<W>` | Wraps a widget instance for the tile tree |

## Core Concepts

### The Widget Trait

Every pane in a mosaic layout implements the `Widget` trait. Widgets must be `Clone + serde::Serialize + serde::Deserialize + 'static` so layouts can be saved and restored.

```rust
use nightshade::prelude::*;
use nightshade::mosaic::{Widget, WidgetContext, WidgetEntry, Pane, ViewportWidget};

#[derive(Clone, serde::Serialize, serde::Deserialize)]
enum AppWidget {
    Viewport(ViewportWidget),
    Inspector(InspectorWidget),
}

impl Widget for AppWidget {
    fn title(&self) -> String {
        match self {
            AppWidget::Viewport(v) => v.title(),
            AppWidget::Inspector(_) => "Inspector".to_string(),
        }
    }

    fn ui(&mut self, ui: &mut egui::Ui, context: &mut WidgetContext) {
        match self {
            AppWidget::Viewport(v) => v.ui(ui, context),
            AppWidget::Inspector(v) => v.ui(ui, context),
        }
    }

    fn catalog() -> Vec<WidgetEntry<Self>> {
        vec![
            WidgetEntry {
                name: "Viewport".to_string(),
                create: || AppWidget::Viewport(ViewportWidget::default()),
            },
            WidgetEntry {
                name: "Inspector".to_string(),
                create: || AppWidget::Inspector(InspectorWidget),
            },
        ]
    }
}
```

The `catalog()` method defines the list of widgets available in the "+" add-widget popup.

Full trait definition:

```rust
trait Widget<C = (), M = ()>: Clone + Serialize + DeserializeOwned + 'static {
    fn title(&self) -> String;
    fn ui(&mut self, ui: &mut egui::Ui, context: &mut WidgetContext<C, M>);

    fn on_add(&mut self, _context: &mut WidgetContext<C, M>) {}
    fn on_remove(&mut self, _context: &mut WidgetContext<C, M>) {}
    fn closable(&self) -> bool { true }
    fn required_camera(&self, _world: &World) -> Option<Entity> { None }

    fn catalog() -> Vec<WidgetEntry<Self>>;
}
```

### The Mosaic Struct

`Mosaic<W, C, M>` manages a tile tree of widgets. The three type parameters are:

- `W` - your widget enum (implements `Widget<C, M>`)
- `C` - shared application context passed to all widgets (default `()`)
- `M` - message type for inter-widget communication (default `()`)

```rust
use nightshade::mosaic::Mosaic;

struct MyApp {
    mosaic: Mosaic<AppWidget>,
}
```

Construction:

```rust
Mosaic::new()                              // Empty mosaic
Mosaic::with_panes(vec![...])              // Single tab group with panes
Mosaic::with_tree(tree)                    // Custom egui_tiles::Tree
Mosaic::from_window_layout(layout)         // From a saved WindowLayout
mosaic.with_config(config)                 // Builder: set MosaicConfig
mosaic.with_title(title)                   // Builder: set window title
```

Create with initial panes:

```rust
let mosaic = Mosaic::with_panes(vec![
    AppWidget::Viewport(ViewportWidget::default()),
    AppWidget::Inspector(InspectorWidget),
]);
```

Or with an explicit `egui_tiles::Tree`:

```rust
let mut tiles = egui_tiles::Tiles::default();
let viewport = tiles.insert_pane(Pane::new(AppWidget::Viewport(ViewportWidget::default())));
let inspector = tiles.insert_pane(Pane::new(AppWidget::Inspector(InspectorWidget)));
let root = tiles.insert_tab_tile(vec![viewport, inspector]);
let tree = egui_tiles::Tree::new("my_tree", root, tiles);
let mosaic = Mosaic::with_tree(tree);
```

### Rendering

Call `mosaic.show()` inside your `State::ui()` method:

```rust
impl State for MyApp {
    fn ui(&mut self, world: &mut World, ctx: &egui::Context) {
        self.mosaic.show(world, ctx, &mut ());
    }
}
```

For rendering inside a specific `egui::Ui` region instead of the full window, use `show_inside`:

```rust
self.mosaic.show_inside(world, ui, &mut ());
```

### WidgetContext

Every widget receives a `WidgetContext` in its `ui()` method:

```rust
context.world()                            // &World
context.world_mut()                        // &mut World
context.world_and_app()                    // (&mut World, &mut C)
context.send(message)                      // Send an M message to the app
context.receive()                          // Receive messages sent to this widget
context.has_incoming()                     // Check if there are pending messages
context.viewport_textures                  // Rendered viewport textures
context.current_tile_id                    // This widget's tile ID
context.selected_viewport_tile             // Currently selected viewport
context.modals                             // &mut Modals for showing dialogs
context.app                                // &mut C application context
context.window_index                       // Optional window index
context.is_active_window                   // Whether this is the active window
```

## Application Context and Messages

For non-trivial apps, use the context and message type parameters to share state and communicate between widgets and the app.

```rust
struct AppContext {
    selected_entity: Option<Entity>,
    fps_counter: FpsCounter,
}

enum AppMessage {
    EntitySelected(Entity),
    Log(String),
}

struct MyApp {
    mosaic: Mosaic<AppWidget, AppContext, AppMessage>,
    context: AppContext,
}

impl State for MyApp {
    fn ui(&mut self, world: &mut World, ctx: &egui::Context) {
        self.mosaic.show(world, ctx, &mut self.context);

        for message in self.mosaic.drain_messages() {
            match message {
                AppMessage::EntitySelected(entity) => {
                    self.context.selected_entity = Some(entity);
                }
                AppMessage::Log(text) => {
                    // ...
                }
            }
        }
    }
}
```

### Targeted Messaging

Send messages to specific widgets or broadcast to all:

```rust
mosaic.send_to(tile_id, AppMessage::Refresh);
mosaic.broadcast(AppMessage::ThemeChanged);
mosaic.send_matching(|w| matches!(w, AppWidget::Log(_)), AppMessage::NewEntry);
```

Widgets receive targeted messages via `context.receive()`:

```rust
fn ui(&mut self, ui: &mut egui::Ui, context: &mut WidgetContext<AppContext, AppMessage>) {
    for message in context.receive() {
        match message {
            AppMessage::Refresh => { /* handle */ }
            _ => {}
        }
    }
}
```

## Built-in ViewportWidget

`ViewportWidget` renders a camera's output into a pane. It supports camera selection when multiple cameras exist, viewport selection highlighting, and automatic active camera management.

```rust
use nightshade::mosaic::ViewportWidget;

let viewport = ViewportWidget { camera_index: 0 };
```

Implement `required_camera` on your widget enum to tell the mosaic which cameras need rendering:

```rust
fn required_camera(&self, world: &World) -> Option<Entity> {
    match self {
        AppWidget::Viewport(v) => v.required_camera(world),
        _ => None,
    }
}
```

## Configuration

`MosaicConfig` controls layout behavior:

```rust
use nightshade::mosaic::MosaicConfig;

let config = MosaicConfig {
    tab_bar_height: 24.0,
    close_button_size: 16.0,
    gap_width: 1.0,
    min_size: 32.0,
    all_closable: true,
    show_add_button: true,
    simplification_options: egui_tiles::SimplificationOptions {
        all_panes_must_have_tabs: true,
        ..Default::default()
    },
};

let mosaic = Mosaic::with_panes(vec![/* ... */]).with_config(config);
```

## Theming

The mosaic module includes a theme system with 11 built-in presets and a visual theme editor.

Built-in presets: Dark, Light, Dracula, Nord, Gruvbox Dark, Solarized Dark, Solarized Light, Monokai, One Dark, Tokyo Night, Catppuccin Mocha.

`ThemeConfig` supports ~80 override fields covering all egui visual properties: colors, stroke widths, corner radii, expansion, shadow sizes, and miscellaneous flags (button frames, striped backgrounds, slider trailing fill, etc.).

The preset combo box supports hover-to-preview - hovering a preset temporarily applies its visuals so you can see the effect before committing.

```rust
use nightshade::mosaic::{ThemeState, ThemeConfig, apply_theme, get_active_theme_visuals, render_theme_editor_window};

let mut theme_state = ThemeState::default();

// Apply theme each frame (uses preview theme when hovering presets)
apply_theme(ctx, &theme_state);

// Show the editor window
if render_theme_editor_window(ctx, &mut theme_state) {
    // theme changed - save if desired
}

// Switch preset by name
theme_state.select_preset_by_name("Dracula");

// Get the effective visuals (preview-aware)
let visuals = get_active_theme_visuals(&theme_state);
```

## Modals

Show confirmation dialogs and text input prompts:

```rust
fn ui(&mut self, ui: &mut egui::Ui, context: &mut WidgetContext<AppContext, AppMessage>) {
    if ui.button("Delete").clicked() {
        context.modals.show_confirm("delete", "Confirm Delete", "Are you sure?");
    }

    if let Some(result) = context.modals.take_result("delete") {
        match result {
            ModalResult::Confirmed => { /* delete */ }
            ModalResult::Cancelled => {}
            _ => {}
        }
    }
}
```

Text input modals:

```rust
context.modals.show_text_input("rename", "Rename", "Enter new name:", "default");

if let Some(ModalResult::TextInput(name)) = context.modals.take_result("rename") {
    // use name
}
```

Full `Modals` API:

```rust
modals.show_confirm(id, title, body)
modals.show_confirm_with_text(id, title, body, confirm_text, cancel_text)
modals.show_text_input(id, title, prompt, default_text)
modals.show_text_input_with_text(id, title, prompt, default_text, confirm_text, cancel_text)
modals.take_result(id) -> Option<ModalResult>
modals.has_open_modal() -> bool
```

## Toast Notifications

Four toast kinds: Info, Success, Warning, Error - each with a distinct accent color and fade-out animation.

```rust
use nightshade::mosaic::{Toasts, ToastKind};

let mut toasts = Toasts::new();
toasts.push(ToastKind::Success, "Project saved", 3.0);
toasts.push(ToastKind::Error, "Failed to load file", 4.0);
toasts.push(ToastKind::Warning, "Low disk space", 3.0);
toasts.push(ToastKind::Info, "Update available", 3.0);

// Each frame:
toasts.tick(delta_time);
toasts.render(ctx);
```

## Status Bar

```rust
use nightshade::mosaic::StatusBar;

let mut status_bar = StatusBar::new();
status_bar.add_left("FPS: 60");
status_bar.add_left_colored("Ready", egui::Color32::GREEN);
status_bar.add_right("Theme: Nord");
status_bar.add_right_with_tooltip("v1.0", "Application version");
status_bar.render(ctx);
```

## Command Palette

```rust
use nightshade::mosaic::CommandPalette;

let mut palette = CommandPalette::new();
palette.register("New File", Some("Ctrl+N".to_string()), || { /* ... */ });
palette.register("Save", Some("Ctrl+S".to_string()), || { /* ... */ });

// Toggle with a keybinding
palette.toggle();

// Each frame:
palette.render(ctx);
```

## Keyboard Shortcuts

```rust
use nightshade::mosaic::{ShortcutManager, KeyBinding};

let mut shortcuts = ShortcutManager::new();
shortcuts.register("Save", KeyBinding::ctrl(egui::Key::S), || { /* ... */ });
shortcuts.register("Undo", KeyBinding::ctrl(egui::Key::Z), || { /* ... */ });
shortcuts.register("Redo", KeyBinding::ctrl_shift(egui::Key::Z), || { /* ... */ });

// Each frame:
shortcuts.process(ctx);
```

`KeyBinding` constructors: `new(key)`, `ctrl(key)`, `shift(key)`, `ctrl_shift(key)`, `alt(key)`.

## File Dialogs

File dialog functions are available on native platforms when the `file_dialog` feature is also enabled (included in `engine` by default):

```rust
use nightshade::mosaic::{FileFilter, pick_file, pick_folder, save_file_dialog, read_file, write_file};

let filters = [FileFilter {
    name: "JSON".to_string(),
    extensions: vec!["json".to_string()],
}];

if let Some(path) = pick_file(&filters) {
    let bytes = read_file(&path).unwrap();
}

if let Some(path) = save_file_dialog(&filters) {
    write_file(&path, data.as_bytes()).unwrap();
}

if let Some(folder) = pick_folder() {
    // use folder path
}
```

## Settings Persistence

Save and load application settings to `<config_dir>/app_name/settings.json`. Falls back to `T::default()` on missing or corrupt files.

```rust
use nightshade::mosaic::Settings;

#[derive(Default, serde::Serialize, serde::Deserialize)]
struct AppSettings {
    theme_name: Option<String>,
    recent_files: Vec<String>,
}

let settings: Settings<AppSettings> = Settings::load("my-app-name");
// settings.data.theme_name ...
settings.save().ok();
```

## FPS Counter

```rust
use nightshade::mosaic::FpsCounter;

let mut fps = FpsCounter::new(0.5); // update every 0.5 seconds
// or: let mut fps = FpsCounter::default(); // same 0.5s interval

// Each frame:
fps.tick(delta_time);

// Read smoothed FPS:
let fps_value = fps.fps();           // f32
let fps_rounded = fps.fps_rounded(); // u32
```

## Event Log

Timestamped event log with category coloring and automatic scroll-to-bottom.

```rust
use nightshade::mosaic::EventLog;

let mut log = EventLog::new(500);
log.log("SYS", "Application started");
log.tick(delta_time);
log.render(ui, |category| match category {
    "SYS" => egui::Color32::GRAY,
    "ERR" => egui::Color32::RED,
    _ => egui::Color32::WHITE,
});
```

## Recent Files

```rust
use nightshade::mosaic::RecentFiles;

let mut recent = RecentFiles::new(10);
recent.add(path);
for path in recent.paths() { /* render menu items */ }
```

## Clipboard

```rust
use nightshade::mosaic::{get_clipboard_text, set_clipboard_text};

set_clipboard_text(ctx, "copied text");
if let Some(text) = get_clipboard_text(ctx) { /* paste */ }
```

## Drag and Drop

```rust
use nightshade::mosaic::{get_dropped_files, is_file_hovering, render_drop_overlay};

render_drop_overlay(ctx, "Drop files here");
for file in get_dropped_files(ctx) {
    if let Some(path) = file.path { /* handle file */ }
    if let Some(bytes) = file.bytes { /* handle raw bytes */ }
}
```

## Undo/Redo History

```rust
use nightshade::mosaic::History;

let mut history: History<MyState> = History::new(100);

// Before a change:
history.push(current_state.clone());

// Undo:
if let Some(previous) = history.undo(&current_state) {
    current_state = previous;
}

// Redo:
if let Some(next) = history.redo(&current_state) {
    current_state = next;
}

history.can_undo();    // bool
history.can_redo();    // bool
history.undo_count();  // usize
history.redo_count();  // usize
history.clear();
```

## Project Save/Load

Save and load entire mosaic layouts:

```rust
use nightshade::mosaic::{save_project, load_project};

// Save
let project = save_project("My Project", "1.0", &[&mosaic]);
let json = serde_json::to_string_pretty(&project).unwrap();

// Load
let project = serde_json::from_str(&json).unwrap();
let windows = load_project(project);
for window in windows {
    let mosaic = Mosaic::from_window_layout(window);
}
```

Or save/load just the tile tree:

```rust
let tree_json = mosaic.save_tree().unwrap();
mosaic.load_tree(tree_json).unwrap();
```

Or save/load a named layout:

```rust
let save = mosaic.save_layout("Main", "1.0.0");
mosaic.load_layout(save);
```

## Widget Management

Add and remove widgets programmatically:

```rust
mosaic.insert_pane(widget)                     // Add widget to root container
mosaic.insert_pane_in(container_id, widget)    // Add widget to specific container
mosaic.remove_pane(tile_id)                    // Remove widget, returns owned widget
mosaic.find_widget(|w| predicate)              // Find first matching widget's TileId
mosaic.get_widget(tile_id)                     // Get &W by TileId
mosaic.get_widget_mut(tile_id)                 // Get &mut W by TileId
mosaic.activate_tab(tile_id)                   // Focus a widget's tab
mosaic.widget_count()                          // Number of widget panes
```

### Tree Walking

```rust
mosaic.for_each_widget(|widget| { ... });
mosaic.for_each_widget_mut(|widget| { ... });
mosaic.for_each_widget_with_id(|tile_id, widget| { ... });
mosaic.for_each_widget_with_id_mut(|tile_id, widget| { ... });
```

## Layout State

```rust
mosaic.layout_modified()                   // Check if layout changed (drag, close, add)
mosaic.take_layout_modified()              // Check and reset layout flag
mosaic.layout_name()                       // Current layout name
mosaic.set_layout_name(name)               // Set layout name
mosaic.title()                             // Window title
mosaic.set_title(title)                    // Set window title
mosaic.viewport_rects()                    // Rendered pane rectangles by TileId
mosaic.selected_viewport_tile()            // Currently selected viewport
mosaic.required_cameras(world)             // Cameras needed by visible viewports
Mosaic::clear_required_cameras(world)      // Clear the required cameras list
mosaic.modals()                            // Get &mut Modals
```

## Multi-Window Support

Create one `Mosaic` per window. Each has its own layout, modals, and config:

```rust
mosaic.set_active_window(is_active)        // Set whether this window is active
mosaic.set_window_index(index)             // Set the window index
mosaic.set_viewport_textures(textures)     // Set viewport textures for secondary windows
```

Use nightshade's secondary window system to spawn additional windows:

```rust
impl State for MyApp {
    fn ui(&mut self, world: &mut World, ctx: &egui::Context) {
        self.primary.show(world, ctx, &mut self.context);
    }

    fn secondary_ui(&mut self, world: &mut World, window_index: usize, ctx: &egui::Context) {
        let mosaic = self.secondary.entry(window_index).or_insert_with(|| {
            let mut m = Mosaic::with_panes(vec![AppWidget::Viewport(ViewportWidget::default())]);
            m.set_window_index(Some(window_index));
            m
        });
        mosaic.show(world, ctx, &mut self.context);
    }

    fn pre_render(&mut self, renderer: &mut dyn Render, world: &mut World) {
        let cameras = world.resources.user_interface.required_cameras.clone();
        for (&window_index, mosaic) in &mut self.secondary {
            let textures = renderer.register_camera_viewports_for_secondary(window_index, &cameras);
            mosaic.set_viewport_textures(textures);
        }
    }
}
```

Use `save_project` / `load_project` to persist all windows together.
