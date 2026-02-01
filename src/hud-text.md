# HUD Text

Screen-space text rendering for UI, scores, and debug information.

## Creating HUD Text

```rust
use nightshade::ecs::text::*;

fn initialize(&mut self, world: &mut World) {
    spawn_hud_text(world, "Score: 0", HudAnchor::TopLeft, Vec2::new(20.0, 20.0));
}
```

## HUD Anchors

Text can be anchored to any screen position:

```rust
pub enum HudAnchor {
    TopLeft,
    TopCenter,
    TopRight,
    CenterLeft,
    Center,
    CenterRight,
    BottomLeft,
    BottomCenter,
    BottomRight,
}
```

### Anchor Examples

```rust
// Score in top-left corner
spawn_hud_text(world, "Score: 0", HudAnchor::TopLeft, Vec2::new(20.0, 20.0));

// Centered title
spawn_hud_text(world, "GAME OVER", HudAnchor::Center, Vec2::zeros());

// Health bar label bottom-left
spawn_hud_text(world, "HP", HudAnchor::BottomLeft, Vec2::new(20.0, -60.0));

// Timer top-center
spawn_hud_text(world, "3:00", HudAnchor::TopCenter, Vec2::new(0.0, 30.0));
```

## Text Properties

Customize text appearance:

```rust
let properties = TextProperties {
    font_size: 32.0,
    color: [1.0, 1.0, 1.0, 1.0],
    text_alignment: TextAlignment::Left,
    vertical_alignment: VerticalAlignment::Top,
    line_height: 1.2,
    letter_spacing: 0.0,
    outline_width: 0.0,
    outline_color: [0.0, 0.0, 0.0, 1.0],
    smoothing: 0.003,
    monospace_width: None,
    anchor_character: None,
};

spawn_hud_text_with_properties(
    world,
    "Custom Text",
    HudAnchor::TopLeft,
    Vec2::new(20.0, 20.0),
    properties,
);
```

### Text Alignment

```rust
// Left aligned (default)
TextAlignment::Left

// Center aligned
TextAlignment::Center

// Right aligned
TextAlignment::Right
```

### Vertical Alignment

```rust
VerticalAlignment::Top      // Align to top
VerticalAlignment::Middle   // Center vertically
VerticalAlignment::Bottom   // Align to bottom
VerticalAlignment::Baseline // Align to text baseline
```

## Updating Text

```rust
fn run_systems(&mut self, world: &mut World) {
    if let Some(text_entity) = self.score_text {
        if let Some(hud_text) = world.get_hud_text_mut(text_entity) {
            let text = format!("Score: {}", self.score);
            world.resources.text_cache.set_text(hud_text.text_index, &text);
            hud_text.dirty = true;
        }
    }
}
```

## Text Outlines

Add outlines for better visibility:

```rust
let properties = TextProperties {
    font_size: 24.0,
    color: [1.0, 1.0, 1.0, 1.0],
    outline_width: 2.0,
    outline_color: [0.0, 0.0, 0.0, 1.0],
    ..Default::default()
};
```

## Loading Custom Fonts

```rust
fn initialize(&mut self, world: &mut World) {
    let font_bytes = include_bytes!("assets/fonts/custom.ttf");
    let font_index = load_font_from_bytes(world, font_bytes);

    self.custom_font = Some(font_index);
}

fn spawn_custom_text(&self, world: &mut World) {
    let entity = world.spawn_entities(HUD_TEXT, 1)[0];

    let text_index = world.resources.text_cache.add_text("Custom Font Text");

    world.set_hud_text(entity, HudText {
        text_index,
        properties: TextProperties::default(),
        font_index: self.custom_font.unwrap(),
        position: Vec2::new(100.0, 100.0),
        anchor: HudAnchor::TopLeft,
        cached_mesh: None,
        dirty: true,
    });
}
```

## HudText Component

```rust
pub struct HudText {
    pub text_index: usize,              // Index in TextCache
    pub properties: TextProperties,     // Visual properties
    pub font_index: usize,              // Which font to use
    pub position: Vec2,                 // Offset from anchor
    pub anchor: HudAnchor,              // Screen anchor point
    pub cached_mesh: Option<TextMesh>,  // Pre-generated mesh
    pub dirty: bool,                    // Needs regeneration
}
```

## Multi-line Text

```rust
let multiline = "Line 1\nLine 2\nLine 3";
spawn_hud_text(world, multiline, HudAnchor::TopLeft, Vec2::new(20.0, 20.0));
```

Line height is controlled by `TextProperties::line_height`:

```rust
let properties = TextProperties {
    line_height: 1.5,  // 150% of font size
    ..Default::default()
};
```

## Colored Text Spans

For per-character coloring, modify the text cache:

```rust
world.resources.text_cache.set_character_colors(
    text_index,
    vec![
        [1.0, 0.0, 0.0, 1.0],  // Red
        [0.0, 1.0, 0.0, 1.0],  // Green
        [0.0, 0.0, 1.0, 1.0],  // Blue
    ],
);
```

## 3D World-Space Text

For text in 3D space (billboards, signs):

```rust
let entity = world.spawn_entities(
    LOCAL_TRANSFORM | GLOBAL_TRANSFORM | TEXT_COMPONENT,
    1
)[0];

world.set_local_transform(entity, LocalTransform {
    translation: Vec3::new(0.0, 2.0, 0.0),
    ..Default::default()
});

let text_index = world.resources.text_cache.add_text("Hello World");

world.set_text(entity, Text {
    text_index,
    properties: TextProperties {
        font_size: 0.5,  // World units
        ..Default::default()
    },
    billboard: true,  // Face camera
    dirty: true,
});
```

## Common UI Patterns

### Score Display

```rust
struct GameState {
    score: u32,
    score_text: Option<Entity>,
}

impl State for GameState {
    fn initialize(&mut self, world: &mut World) {
        self.score_text = Some(spawn_hud_text(
            world,
            "Score: 0",
            HudAnchor::TopRight,
            Vec2::new(-20.0, 20.0),
        ));
    }

    fn run_systems(&mut self, world: &mut World) {
        if let Some(entity) = self.score_text {
            update_hud_text(world, entity, &format!("Score: {}", self.score));
        }
    }
}

fn update_hud_text(world: &mut World, entity: Entity, text: &str) {
    if let Some(hud_text) = world.get_hud_text_mut(entity) {
        world.resources.text_cache.set_text(hud_text.text_index, text);
        hud_text.dirty = true;
    }
}
```

### FPS Counter

```rust
struct FpsCounter {
    text_entity: Option<Entity>,
    frame_times: Vec<f32>,
}

impl FpsCounter {
    fn update(&mut self, world: &mut World, dt: f32) {
        self.frame_times.push(dt);
        if self.frame_times.len() > 60 {
            self.frame_times.remove(0);
        }

        let avg_dt: f32 = self.frame_times.iter().sum::<f32>() / self.frame_times.len() as f32;
        let fps = (1.0 / avg_dt) as u32;

        if let Some(entity) = self.text_entity {
            update_hud_text(world, entity, &format!("FPS: {}", fps));
        }
    }
}
```

### Health Bar Label

```rust
fn spawn_health_ui(world: &mut World) -> Entity {
    let properties = TextProperties {
        font_size: 18.0,
        color: [1.0, 0.2, 0.2, 1.0],
        outline_width: 1.0,
        outline_color: [0.0, 0.0, 0.0, 1.0],
        ..Default::default()
    };

    spawn_hud_text_with_properties(
        world,
        "100 / 100",
        HudAnchor::BottomLeft,
        Vec2::new(80.0, -30.0),
        properties,
    )
}
```

### Centered Message

```rust
fn show_game_over(world: &mut World) -> Entity {
    let properties = TextProperties {
        font_size: 64.0,
        color: [1.0, 0.0, 0.0, 1.0],
        text_alignment: TextAlignment::Center,
        outline_width: 3.0,
        outline_color: [0.0, 0.0, 0.0, 1.0],
        ..Default::default()
    };

    spawn_hud_text_with_properties(
        world,
        "GAME OVER\nPress R to Restart",
        HudAnchor::Center,
        Vec2::zeros(),
        properties,
    )
}
```

## Removing HUD Text

```rust
fn remove_text(world: &mut World, entity: Entity) {
    world.despawn(entity);
}
```

## Visibility Control

```rust
if let Some(visible) = world.get_visible_mut(text_entity) {
    visible.0 = false;  // Hide text
}
```
