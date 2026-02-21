# AI Integration

Nightshade provides two features for AI integration: `mcp` for exposing the engine as a Model Context Protocol server, and `claude` for embedding Claude Code CLI as a subprocess. Both are native-only (not available on WASM).

## MCP Server

The `mcp` feature starts an HTTP-based MCP server on `http://127.0.0.1:3333/mcp` when the application launches. Any MCP-compatible client can connect and manipulate the running scene through structured tool calls.

### Setup

Enable the feature in `Cargo.toml`:

```toml
nightshade = { git = "...", features = ["mcp"] }
```

The server starts automatically during engine initialization. No code changes are needed beyond enabling the feature.

### Connecting Claude Code

Register the running engine as an MCP server:

```bash
claude mcp add --transport http nightshade http://127.0.0.1:3333/mcp
```

Claude Code can then call any of the engine's MCP tools directly during a conversation.

### Available Tools

The MCP server exposes 50+ tools organized by category:

**Entity Management**

| Tool | Description |
|------|-------------|
| `list_entities` | List all named entities in the scene |
| `query_entity` | Query detailed info about a specific entity (transform, material, components) |
| `spawn_entity` | Spawn a new entity with mesh, position, scale, color, emissive, parent, and alpha mode |
| `despawn_entity` | Remove an entity by name |
| `clear_scene` | Remove all named entities |

**Transforms**

| Tool | Description |
|------|-------------|
| `set_position` | Set entity position as [x, y, z] |
| `set_rotation` | Set entity rotation using euler angles in radians |
| `set_scale` | Set entity scale as [x, y, z] |
| `set_parent` | Set or clear the parent of an entity |
| `set_visibility` | Show or hide an entity |

**Materials**

| Tool | Description |
|------|-------------|
| `set_material_color` | Set the base color of an entity |
| `set_emissive` | Set emissive color (values > 1.0 create HDR bloom) |
| `set_material` | Set full material properties (roughness, metallic, colors, alpha mode) |
| `set_casts_shadow` | Toggle shadow casting |

**Lighting**

| Tool | Description |
|------|-------------|
| `spawn_light` | Spawn a point, spot, or directional light |
| `set_light` | Modify existing light properties (color, intensity, range, cone angles, shadows) |

**Camera**

| Tool | Description |
|------|-------------|
| `set_camera` | Set main camera position, target, and field of view |

**Assets**

| Tool | Description |
|------|-------------|
| `load_asset` | Load a 3D asset from file (.glb, .gltf, or .fbx) |
| `spawn_prefab` | Spawn a loaded asset as a named entity |
| `list_loaded_assets` | List all assets available for spawning |

**Environment**

| Tool | Description |
|------|-------------|
| `set_atmosphere` | Set skybox type (none, sky, cloudy_sky, space, nebula, sunset, hdr) |
| `load_hdr` | Load an HDR skybox from file |
| `set_graphics` | Configure bloom, SSAO, fog, tonemapping, DOF, gamma, saturation, grid, and more |

**Effects**

| Tool | Description |
|------|-------------|
| `spawn_water` | Spawn a water plane with wave parameters |
| `spawn_particles` | Spawn a particle emitter with preset (fire, smoke, sparks, firework variants) |
| `set_particles` | Modify emitter settings (enabled, spawn rate, emissive strength) |
| `spawn_decal` | Spawn a projected texture decal |

**Text**

| Tool | Description |
|------|-------------|
| `spawn_hud_text` | Spawn a 2D HUD text element with anchor, font size, color, alignment |
| `set_hud_text` | Modify an existing HUD text element |
| `spawn_3d_text` | Spawn text in world space (optionally billboard) |

**Physics** (requires `physics` feature)

| Tool | Description |
|------|-------------|
| `add_rigid_body` | Add a rigid body (dynamic, kinematic, or static) |
| `add_collider` | Add a collider shape (ball, cuboid, capsule, cylinder) |
| `apply_impulse` | Apply an instant impulse or torque impulse |
| `apply_force` | Apply a continuous force or torque |
| `set_velocity` | Set linear and/or angular velocity |

**Animation**

| Tool | Description |
|------|-------------|
| `play_animation` | Play an animation clip (by name or index) with looping, speed, and blend duration |
| `stop_animation` | Stop animation playback |
| `list_animations` | List available animation clips on an entity |

**Scripting** (requires `scripting` feature)

| Tool | Description |
|------|-------------|
| `set_script` | Add or update a Rhai script on an entity |
| `remove_script` | Remove a script from an entity |
| `set_game_state` | Set values in the shared game state |
| `get_game_state` | Read values from the shared game state |

**Debug**

| Tool | Description |
|------|-------------|
| `add_line` | Draw a debug line |
| `add_lines` | Draw multiple debug lines |
| `clear_lines` | Clear all debug lines |
| `get_input` | Get current input state (pressed keys, mouse position) |
| `get_time` | Get delta time and elapsed time |

**Batch Operations**

| Tool | Description |
|------|-------------|
| `batch` | Execute multiple operations atomically in a single frame |
| `run` | Execute concise text commands (e.g. `spawn sun Sphere 0,0,0 scale:2 emissive:5,4,0`) |

### Intercepting MCP Commands

Applications can intercept MCP commands before the engine processes them by implementing `handle_mcp_command` on the `State` trait:

```rust
#[cfg(all(feature = "mcp", not(target_arch = "wasm32")))]
fn handle_mcp_command(
    &mut self,
    world: &mut World,
    command: &McpCommand,
) -> Option<McpResponse> {
    match command {
        McpCommand::SpawnEntity { name, .. } => {
            // Update editor scene tree after engine handles the spawn
            self.pending_scene_refresh = true;
            None // let engine handle it
        }
        McpCommand::DespawnEntity { name } => {
            self.scene_tree.remove(name);
            None // let engine handle it
        }
        McpCommand::ClearScene => {
            self.scene_tree.clear();
            None
        }
        _ => None,
    }
}
```

Return `Some(McpResponse)` to fully handle a command yourself (the engine skips its default handler), or `None` to let the engine process it normally. This is useful for blocking certain commands or implementing custom command handling.

### Reacting to MCP Results

`after_mcp_command` is called after a command has been processed (by the engine or your pre-hook). It receives both the command and the response, making it the right place to record undo entries, refresh scene trees, or trigger other side effects based on whether the command succeeded:

```rust
#[cfg(all(feature = "mcp", not(target_arch = "wasm32")))]
fn after_mcp_command(
    &mut self,
    world: &mut World,
    command: &McpCommand,
    response: &McpResponse,
) {
    let is_success = matches!(response, McpResponse::Success(_));

    match command {
        McpCommand::SpawnEntity { name, .. } => {
            if is_success {
                if let Some(&entity) = world.resources.entity_names.get(name) {
                    let hierarchy = capture_hierarchy(world, entity);
                    self.undo_history.push(
                        UndoableOperation::EntityCreated {
                            hierarchy: Box::new(hierarchy),
                            current_entity: entity,
                        },
                        format!("MCP: Spawn {}", name),
                    );
                }
            }
            self.scene_tree_dirty = true;
        }
        McpCommand::DespawnEntity { .. } | McpCommand::ClearScene => {
            self.scene_tree_dirty = true;
        }
        _ => {}
    }
}
```

The pre-hook/post-hook pattern works together: use `handle_mcp_command` to capture before-state (e.g. an entity's transform before it changes), then use `after_mcp_command` to create undo entries by comparing the before-state with the result.

### Architecture

The MCP server runs on a background thread using tokio and axum. Communication with the main engine thread happens through synchronized queues:

1. MCP client sends a tool call via HTTP
2. The server deserializes the request into an `McpCommand` and pushes it to the command queue
3. On the next frame, the engine drains the queue and processes each command
4. Responses are written to the response queue
5. The server reads the response and returns it to the MCP client

Commands are processed once per frame, after `run_systems()` and before the `FrameSchedule` dispatch. This means MCP-driven changes are visible to the same frame's transform, physics, and rendering systems.

## Claude Code CLI

The `claude` feature provides a background worker for spawning Claude Code as a subprocess and streaming its JSON output. This lets applications embed an AI chat interface.

### Setup

```toml
nightshade = { git = "...", features = ["claude"] }
```

Requires the `claude` CLI to be installed and available on `PATH`.

### Usage

Create channels and spawn the worker:

```rust
let (command_sender, command_receiver, event_sender, event_receiver) =
    nightshade::claude::create_cli_channels();

nightshade::claude::spawn_cli_worker(
    command_receiver,
    event_sender,
    ClaudeConfig {
        system_prompt: Some("You are a scene designer.".to_string()),
        mcp_config: McpConfig::Auto,
        ..Default::default()
    },
);
```

Send a query:

```rust
command_sender.send(CliCommand::StartQuery {
    prompt: "Create a forest scene with 10 trees".to_string(),
    session_id: None,
    model: None,
}).ok();
```

Poll for events each frame:

```rust
while let Ok(event) = event_receiver.try_recv() {
    match event {
        CliEvent::TextDelta { text } => self.chat_buffer.push_str(&text),
        CliEvent::ThinkingDelta { text } => self.thinking_buffer.push_str(&text),
        CliEvent::ToolUseStarted { tool_name, .. } => {
            self.status = format!("Using tool: {}", tool_name);
        }
        CliEvent::Complete { total_cost_usd, num_turns, .. } => {
            self.status = format!("Done ({} turns)", num_turns);
        }
        CliEvent::Error { message } => {
            self.status = format!("Error: {}", message);
        }
        _ => {}
    }
}
```

### ClaudeConfig

| Field | Type | Description |
|-------|------|-------------|
| `system_prompt` | `Option<String>` | Appended to Claude's system prompt via `--append-system-prompt` |
| `allowed_tools` | `Option<Vec<String>>` | Restrict which tools Claude can use (`--allowedTools`) |
| `disallowed_tools` | `Option<Vec<String>>` | Block specific tools (`--disallowedTools`) |
| `mcp_config` | `McpConfig` | `Auto` (auto-connect to engine MCP), `Custom(json)`, or `None` |
| `custom_args` | `Vec<String>` | Additional CLI arguments passed directly to `claude` |

### Auto MCP Configuration

When both `claude` and `mcp` features are enabled and `mcp_config` is set to `McpConfig::Auto` (the default), the worker automatically passes `--mcp-config` with a JSON payload pointing at `http://127.0.0.1:3333/mcp`. This means Claude Code can call engine tools without any manual `mcp add` step.

### CliEvent Types

| Event | Fields | Description |
|-------|--------|-------------|
| `SessionStarted` | `session_id` | A new Claude session was created |
| `TextDelta` | `text` | Incremental text output from Claude |
| `ThinkingDelta` | `text` | Incremental thinking/reasoning output |
| `ToolUseStarted` | `tool_name`, `tool_id` | Claude began calling a tool |
| `ToolUseInputDelta` | `tool_id`, `partial_json` | Streaming tool input JSON |
| `ToolUseFinished` | `tool_id` | Tool call completed |
| `TurnComplete` | `session_id` | Claude finished a turn (may continue) |
| `Complete` | `session_id`, `total_cost_usd`, `num_turns` | Full query completed |
| `Error` | `message` | An error occurred |
