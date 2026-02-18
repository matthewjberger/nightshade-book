# Steam Integration

> Requires feature: `steam`

Nightshade provides Steam platform integration including achievements, stats, friends, P2P networking, and rich presence.

## Feature Flag

```toml
[dependencies]
nightshade = { version = "...", features = ["steam"] }
```

This pulls in the `steamworks` and `steamworks-sys` dependencies. Desktop only.

## Initialization

Access Steam through `world.resources.steam`:

```rust
fn initialize(&mut self, world: &mut World) {
    world.resources.steam.initialize();
}
```

Call `run_callbacks()` each frame to process Steam events:

```rust
fn run_systems(&mut self, world: &mut World) {
    world.resources.steam.run_callbacks();
}
```

## Achievements

```rust
let steam = &mut world.resources.steam;

steam.unlock_achievement("FIRST_BLOOD");
steam.clear_achievement("FIRST_BLOOD");
steam.refresh_achievements();

for achievement in &steam.achievements {
    let name = &achievement.api_name;
    let unlocked = achievement.achieved;
}
```

## Stats

```rust
let steam = &mut world.resources.steam;

steam.set_stat_int("kills", 42);
steam.set_stat_float("play_time", 3.5);
steam.store_stats();

steam.refresh_stats();
for stat in &steam.stats {
    match &stat.value {
        StatValue::Int(value) => { /* ... */ }
        StatValue::Float(value) => { /* ... */ }
    }
}
```

## Friends

```rust
let steam = &mut world.resources.steam;
steam.refresh_friends();

for friend in &steam.friends {
    let name = &friend.name;
    let state = &friend.persona_state; // Online, Offline, Busy, Away, etc.
}
```

## P2P Networking

Send and receive messages between players:

```rust
let steam = &mut world.resources.steam;

steam.setup_networking_callbacks();
steam.send_message(peer_steam_id, data_bytes, channel);

let messages = steam.receive_messages(channel);
for message in messages {
    let sender = message.sender;
    let data = &message.data;
}
```

### Session Management

```rust
steam.close_session(peer_steam_id);
let state = steam.get_session_state(peer_steam_id);
steam.refresh_session_states();
```

Session states: `None`, `Connecting`, `Connected`, `ClosedByPeer`, `ProblemDetected`, `Failed`.

## Rich Presence

```rust
steam.set_rich_presence("status", "In Battle - Level 5");
steam.clear_rich_presence();
```

## Overlays

```rust
steam.open_invite_dialog();
steam.open_overlay_to_user(friend_steam_id);
```

## Platform Notes

- Requires Steam client running on the user's machine
- Desktop only (not available on WASM)
- Graceful handling if Steam is unavailable — check `is_initialized()` before using
