# OpenXR VR

> Requires feature: `openxr`

Nightshade supports VR headsets through the OpenXR standard using the Vulkan graphics backend.

## Feature Flag

```toml
[dependencies]
nightshade = { version = "...", features = ["openxr"] }
```

This pulls in `openxr`, `ash`, `wgpu-hal`, and `gpu-allocator` dependencies and forces the Vulkan backend.

## Launching in VR

Use `launch_xr()` instead of the normal application entry point:

```rust
launch_xr(MyState::default());
```

This initializes the OpenXR runtime, creates a VR session, and begins the render loop with stereo rendering.

## XR Resources

Access VR state through `world.resources.xr`:

```rust
let xr = &world.resources.xr;
```

The `XrResources` struct provides:

| Field | Description |
|-------|-------------|
| `locomotion_enabled` | Enable/disable thumbstick locomotion |
| `locomotion_speed` | Movement speed multiplier |

## Controller Input

Read controller state through `XrInput`:

```rust
let input = &world.resources.xr.input;

if input.a_button_pressed() {
    // A button on right controller
}

if input.left_trigger_pressed() {
    // Left trigger
}

let left_pos = input.left_hand_position();
let left_rot = input.left_hand_rotation();
let head_pos = input.head_position();
```

### Available Inputs

| Method | Description |
|--------|-------------|
| `left_trigger_pressed()` / `right_trigger_pressed()` | Trigger buttons |
| `left_grip_pressed()` / `right_grip_pressed()` | Grip buttons |
| `a_button_pressed()` / `b_button_pressed()` | Face buttons (right controller) |
| `x_button_pressed()` / `y_button_pressed()` | Face buttons (left controller) |
| `left_hand_position()` / `right_hand_position()` | Controller positions in world space |
| `left_hand_rotation()` / `right_hand_rotation()` | Controller orientations |
| `head_position()` / `head_rotation()` | Headset tracking |
| `left_thumbstick()` / `right_thumbstick()` | Thumbstick axes |

## Stereo Rendering

The `XrRenderer` renders the scene twice per frame (once per eye) using the same render passes as the desktop renderer. View and projection matrices are provided by the OpenXR runtime through `XrFrameContext`.

## Requirements

- An OpenXR-compatible runtime must be installed (SteamVR, Oculus, etc.)
- A VR headset must be connected
- Vulkan GPU support is required
- Desktop only (not available on WASM)

The engine configures Oculus Touch controller bindings by default.
