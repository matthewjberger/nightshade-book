# Webview

> Requires feature: `webview`

Nightshade can embed web views inside the application window, enabling hybrid native/web UIs. The system provides bidirectional communication between the engine (host) and web content (client) using typed commands and events.

## Feature Flag

```toml
[dependencies]
nightshade = { version = "...", features = ["webview"] }
```

This pulls in `wry` (Tauri's webview library) and `tiny_http` on desktop, and `wasm-bindgen`/`web-sys` on WASM.

## Architecture

The webview system uses a generic `WebviewContext<Cmd, Evt>` where:

- `Cmd` — command type sent from the web client to the engine
- `Evt` — event type sent from the engine to the web client

Both types must implement `serde::Serialize` and `serde::Deserialize`. Messages are serialized with `postcard` (compact binary format) and encoded as base64 for transport.

## Host Side (Desktop)

### Serving Web Content

Embed static web assets and serve them via a local HTTP server:

```rust
serve_embedded_dir(embedded_assets, port);
```

### Creating the Webview

```rust
let webview_context: WebviewContext<MyCommand, MyEvent> = WebviewContext::new();
webview_context.ensure_webview(bounds, window_handle);
```

The webview is positioned within the application window at the specified bounds.

### Sending Events to the Client

```rust
webview_context.send_event(MyEvent::ScoreUpdated(42));
```

### Receiving Commands from the Client

```rust
for command in webview_context.drain_commands() {
    match command {
        MyCommand::StartGame => { /* ... */ }
        MyCommand::SetOption(key, value) => { /* ... */ }
    }
}
```

## Client Side (WASM)

The web content runs as a standard web page that communicates with the engine through IPC.

### Connecting

```rust
connect::<MyCommand, MyEvent>(|event| {
    match event {
        MyEvent::ScoreUpdated(score) => { /* update UI */ }
    }
});
```

### Sending Commands

```rust
send(MyCommand::StartGame);
```

## Transport

Communication uses the `__nwv__` IPC handler:

| Direction | Desktop | WASM |
|-----------|---------|------|
| Host → Client | `webview.evaluate_script()` | N/A |
| Client → Host | `ipc.postMessage()` | `window.__nwv__` |

Messages are serialized as: `postcard binary → base64 string`.

## Platform Support

| Platform | Backend |
|----------|---------|
| Windows | WebView2 (Edge/Chromium) |
| macOS | WKWebView |
| Linux | WebKitGTK |
| WASM | Browser-native (client only) |
