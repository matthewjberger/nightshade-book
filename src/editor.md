# Editor Infrastructure

The `editor` feature provides reusable scene-editor infrastructure for building custom editors on top of the Nightshade engine. It powers the official Nightshade Editor and can be used to build specialized tools with the same gizmo, undo, inspector, and picking capabilities.

```toml
nightshade = { git = "...", features = ["editor"] }
```

The `editor` feature requires `mosaic` (which requires `egui`) and `picking`.

## Architecture

The editor module is organized into focused submodules:

| Module | Purpose |
|--------|---------|
| `context` | `EditorContext` — central state struct holding selection, undo history, gizmo state, snap settings, and transform edit state |
| `undo` | Undo/redo system with entity snapshots and hierarchy capture |
| `selection` | Entity selection, multi-select, delete, duplicate, copy/paste, select all |
| `clipboard` | System clipboard integration via arboard (native only) |
| `gizmo` | Transform gizmos (translate, rotate, scale) with drag math and modal operations |
| `input` | Keyboard shortcut handler returning `InputSignal` values for app-level actions (Blender-style G/R/S keys, Delete, Ctrl+Z, etc.) |
| `picking` | GPU-based entity picking, marquee selection, context menu trigger |
| `camera_controls` | View presets (front, back, left, right, top, bottom), ortho toggle |
| `inspector` | `ComponentInspector` trait, `InspectorContext`, and UI for all built-in component types |
| `tree` | Scene tree widget with drag-and-drop reparenting and prefab instantiation |
| `menus` | Context menus, add-node modal, add-primitive popup |
| `spawning` | Entity spawning helpers (primitives, lines, text) |
| `asset_loading` | glTF/FBX loading and viewport spawn |
| `code_editor` | Code editor widget with syntax highlighting (syntect, native only) |
| `add_node` | Add node modal dialog |

## EditorContext

`EditorContext` holds the core editor state that the engine needs:

```rust
use nightshade::editor::EditorContext;

let mut context = EditorContext::default();

// Selection
context.selection.set_single(entity);
context.selection.clear();

// Undo
context.undo_history.push(operation, "description".to_string());

// Gizmo mode
context.gizmo_interaction.mode = nightshade::ecs::gizmos::GizmoMode::Rotation;

// Snap settings
context.snap_settings.enabled = true;
context.snap_settings.translation_snap = 0.5;
```

Fields on `EditorContext`:

| Field | Type | Purpose |
|-------|------|---------|
| `gizmo_interaction` | `GizmoInteraction` | Active gizmo state, mode, hover axis, drag state |
| `transform_edit` | `TransformEdit` | Pending transform edits and modal transform state |
| `selection` | `EntitySelection` | Selected entities |
| `marquee` | `MarqueeState` | Marquee (box) selection state |
| `coordinate_space` | `CoordinateSpace` | World or Local coordinate space |
| `snap_settings` | `SnapSettings` | Translation, rotation, scale snap values |
| `undo_history` | `UndoHistory` | Undo/redo stack |

Methods on `EditorContext`:

```rust
context.gizmo_root()                                       // Option<Entity>
context.capture_selection_transforms(world)                 // HashMap<Entity, LocalTransform>
context.begin_selection_transform_tracking(world)           // Start tracking single-entity transform
context.commit_selection_transforms(world, initial, desc)   // Commit transforms to undo history
```

App-level concerns like UI visibility, popup state, project state, and notification management are intended to be owned by the application layer (e.g., in your `AppContext`), not stored in `EditorContext`.

## Input Handling

The keyboard handler returns an `InputResult` instead of directly mutating app-level state. This lets the engine handle editor-internal shortcuts (gizmo, undo, selection) while the app decides what to do with signals like quit confirmations and popup triggers:

```rust
use nightshade::editor::{on_keyboard_input_handler, InputResult, InputSignal};

let result = on_keyboard_input_handler(
    &mut context,
    world,
    key_code,
    key_state,
);

if result.tree_dirty {
    // Scene tree needs rebuilding
}

if result.project_modified {
    // Project has unsaved changes
}

match result.signal {
    Some(InputSignal::QuitRequested) => {
        // Show quit confirmation dialog
    }
    Some(InputSignal::AddPrimitiveRequested(position)) => {
        // Open add-primitive popup at position
    }
    None => {}
}
```

## Component Inspectors

The inspector system uses a trait-based approach. Each component type implements `ComponentInspector`, which receives an `InspectorContext` containing only the fields inspectors need:

```rust
use nightshade::editor::{ComponentInspector, InspectorContext};

pub trait ComponentInspector {
    fn name(&self) -> &str;
    fn has_component(&self, world: &World, entity: Entity) -> bool;
    fn add_component(&self, world: &mut World, entity: Entity);
    fn remove_component(&self, world: &mut World, entity: Entity);
    fn ui(
        &mut self,
        world: &mut World,
        entity: Entity,
        ui: &mut egui::Ui,
        context: &mut InspectorContext,
    );
}
```

`InspectorContext` provides narrowly-scoped access to the specific editor state that inspectors need:

```rust
pub struct InspectorContext<'a> {
    pub transform_edit_pending: &'a mut Option<(Entity, LocalTransform)>,
    pub undo_history: &'a mut UndoHistory,
    pub pending_notifications: &'a mut Vec<(ToastKind, String)>,
    pub actions: &'a mut Vec<InspectorAction>,
    pub selection: &'a EntitySelection,
}
```

`InspectorAction` is an enum for deferred inspector side effects:

```rust
pub enum InspectorAction {
    LookupMaterial(String),
}
```

### Using ComponentInspectorUi

`ComponentInspectorUi` renders inspectors for all components on the selected entity:

```rust
use nightshade::editor::ComponentInspectorUi;

let mut inspector_ui = ComponentInspectorUi::default();

// Add custom inspectors
inspector_ui.add_inspector(Box::new(MyCustomInspector));

// In your right panel (returns true if project was modified):
let modified = inspector_ui.ui(
    &mut inspector_context,
    world,
    ui,
);
```

Built-in inspectors: transform, material, light, camera, mesh, text, water, animation, lines, render layer, and name.

Feature-gated inspectors:
- NavMesh inspector requires the `navmesh` feature
- Script inspector requires the `scripting` feature

## Gizmo System

The gizmo system supports three interaction modes:

- **Direct manipulation**: Click and drag gizmo handles in the viewport
- **Modal transform**: Press G (grab/translate), R (rotate), or S (scale) then move the mouse, with optional axis constraints (X, Y, Z)

```rust
use nightshade::editor::{update_gizmo, recreate_gizmo_for_mode};

// Per-frame gizmo update
nightshade::editor::gizmo::update::update_gizmo(&mut context, &mut project_state, world);

// Change gizmo mode
context.gizmo_interaction.mode = nightshade::ecs::gizmos::GizmoMode::Scale;
recreate_gizmo_for_mode(&mut context, world);
```

## Undo/Redo

The undo system captures entity state as snapshots and supports hierarchy-aware operations:

```rust
use nightshade::editor::{UndoHistory, UndoableOperation, capture_hierarchy};

// Capture state before a destructive operation
let hierarchy = Box::new(capture_hierarchy(world, entity));

// Push an undoable operation
context.undo_history.push(
    UndoableOperation::EntityCreated {
        hierarchy,
        current_entity: entity,
    },
    "Spawn cube".to_string(),
);

// Undo/redo
nightshade::editor::selection::undo_with_selection_update(&mut context, &mut project_state, world);
nightshade::editor::selection::redo_with_selection_update(&mut context, &mut project_state, world);
```

## Scene Tree

The `WorldTreeUi` renders a hierarchical tree view of all entities in the scene:

```rust
use nightshade::editor::{WorldTreeUi, TreeCache};

let mut tree_cache = TreeCache::default();

let open_modal = WorldTreeUi::ui_with_context(
    world,
    &mut context.selection,
    &mut context.undo_history,
    &mut project_state,
    &mut tree_cache,
    gizmo_root,
    ui,
);
```

## Picking

GPU-based entity picking with support for single click, marquee selection, and context menu:

```rust
use nightshade::editor::picking;

// Entity picking (click to select)
picking::update_picking(&mut context, world);

// Marquee selection (drag to box-select)
picking::update_marquee_selection(&mut context, world);

// Draw the marquee rectangle overlay
picking::draw_marquee_selection(&context.marquee, ui_context);

// Check for right-click context menu (returns mouse position if triggered)
if let Some(position) = picking::check_context_menu_trigger(&context, world) {
    // Open context menu at position
}
```

## Add Node Modal

The add node modal takes individual parameters rather than the full `EditorContext`. Returns `true` if an entity was created:

```rust
use nightshade::editor::render_add_node_modal;

let created = render_add_node_modal(
    &mut selection,
    &mut undo_history,
    &mut add_node_open,
    &mut add_node_search,
    &mut tree_cache,
    world,
    ui_context,
);
```

## Building a Custom Editor

To build a custom editor using the infrastructure:

1. Enable the `editor` feature (and `mosaic` for the multi-pane layout)
2. Create your own `State` implementation
3. Instantiate `EditorContext`
4. Own app-level state (project state, UI visibility, popup state, notifications) separately from `EditorContext`
5. Use the provided widgets (tree, inspector, gizmo, picking) in your layout
6. Handle `InputSignal` values from the keyboard handler in your app
7. Define your own `Widget` enum and panel layout using the Mosaic framework

The official Nightshade Editor (`apps/editor/`) serves as a complete reference implementation.
