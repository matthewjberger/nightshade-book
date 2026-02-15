# File System

The `nightshade::filesystem` module provides a cross-platform file I/O abstraction. On native platforms it wraps the [`rfd`](https://crates.io/crates/rfd) crate for file dialogs and `std::fs` for reading/writing. On WebAssembly it uses browser download/upload APIs (Blob anchors for save, `<input type="file">` for load) behind the same function signatures.

## Feature Requirements

| Function | Native | WASM |
|---|---|---|
| `save_file` | `file_dialog` feature | always available |
| `request_file_load` | `file_dialog` feature | always available |
| `pick_file` | `file_dialog` feature | not available |
| `pick_folder` | `file_dialog` feature | not available |
| `save_file_dialog` | `file_dialog` feature | not available |
| `read_file` | `file_dialog` feature | not available |
| `write_file` | `file_dialog` feature | not available |

The `engine` aggregate feature includes `file_dialog` by default.

## Types

### `FileFilter`

Describes a file type filter for dialog boxes and browser accept strings.

```rust
use nightshade::filesystem::FileFilter;

let filters = [
    FileFilter {
        name: "JSON".to_string(),
        extensions: vec!["json".to_string()],
    },
    FileFilter {
        name: "Images".to_string(),
        extensions: vec!["png".to_string(), "jpg".to_string()],
    },
];
```

### `FileError`

Error type returned by file operations.

- `FileError::NotFound(String)` — file does not exist at the given path
- `FileError::ReadError(String)` — read operation failed
- `FileError::WriteError(String)` — write operation failed

Implements `Display` for convenient error formatting.

### `LoadedFile`

Represents a file that has been read into memory.

```rust
pub struct LoadedFile {
    pub name: String,   // filename
    pub bytes: Vec<u8>, // raw contents
}
```

### `PendingFileLoad`

A handle for an asynchronous file load operation. On native platforms the load completes synchronously during `request_file_load`, but on WASM the browser reads the file asynchronously, so you poll for completion each frame.

```rust
pub struct PendingFileLoad { /* ... */ }

impl PendingFileLoad {
    pub fn empty() -> Self;
    pub fn ready(file: LoadedFile) -> Self;
    pub fn is_ready(&self) -> bool;
    pub fn take(&self) -> Option<LoadedFile>;
}
```

## Cross-Platform Functions

These two functions have implementations on both native and WASM. Use them when you want a single code path with no `#[cfg]` gates.

### `save_file`

Opens a save dialog (native) or triggers a browser download (WASM).

```rust
use nightshade::filesystem::{save_file, FileFilter};

let filters = [FileFilter {
    name: "JSON".to_string(),
    extensions: vec!["json".to_string()],
}];

save_file("my_data.json", &bytes, &filters)?;
```

### `request_file_load`

Opens a file picker and returns a `PendingFileLoad`. On native, the file is read immediately. On WASM, the file is read asynchronously after the user selects it.

```rust
use nightshade::filesystem::{request_file_load, FileFilter, PendingFileLoad};

let filters = [FileFilter {
    name: "JSON".to_string(),
    extensions: vec!["json".to_string()],
}];

let pending: PendingFileLoad = request_file_load(&filters);

// Poll each frame:
if let Some(loaded) = pending.take() {
    println!("Loaded {} ({} bytes)", loaded.name, loaded.bytes.len());
}
```

## Native-Only Functions

These functions are available only on non-WASM targets with the `file_dialog` feature enabled. They provide `PathBuf`-based access for workflows that need the filesystem path (e.g., loading assets by path, tracking recent files).

### `pick_file`

Opens a file picker dialog. Returns `Option<PathBuf>`.

```rust
use nightshade::filesystem::{pick_file, FileFilter};

let filters = [FileFilter {
    name: "Scene files".to_string(),
    extensions: vec!["json".to_string(), "bin".to_string()],
}];

if let Some(path) = pick_file(&filters) {
    // use path
}
```

### `pick_folder`

Opens a folder picker dialog. Returns `Option<PathBuf>`.

```rust
use nightshade::filesystem::pick_folder;

if let Some(folder) = pick_folder() {
    // use folder path
}
```

### `save_file_dialog`

Opens a save dialog. Returns `Option<PathBuf>` without writing anything. An optional default filename can be suggested to the user.

```rust
use nightshade::filesystem::{save_file_dialog, FileFilter};

let filters = [FileFilter {
    name: "Project".to_string(),
    extensions: vec!["project.json".to_string()],
}];

if let Some(path) = save_file_dialog(&filters, Some("my_project.json")) {
    // write to path yourself
}
```

### `read_file`

Reads a file into a byte vector. Returns `Result<Vec<u8>, FileError>`.

```rust
use nightshade::filesystem::read_file;

let bytes = read_file(std::path::Path::new("settings.json"))?;
let settings: MySettings = serde_json::from_slice(&bytes)?;
```

### `write_file`

Writes bytes to a file, creating parent directories as needed. Returns `Result<(), FileError>`.

```rust
use nightshade::filesystem::write_file;

let json = serde_json::to_vec_pretty(&settings)?;
write_file(std::path::Path::new("settings.json"), &json)?;
```

## Polling Pattern

For cross-platform file loading, store a `PendingFileLoad` in your application state and poll it each frame:

```rust
struct MyApp {
    pending_load: Option<nightshade::filesystem::PendingFileLoad>,
}

// When the user clicks "Load":
self.pending_load = Some(nightshade::filesystem::request_file_load(&filters));

// Each frame in ui() or run_systems():
if let Some(ref pending) = self.pending_load {
    if let Some(file) = pending.take() {
        self.pending_load = None;
        self.process_loaded_file(&file.name, &file.bytes);
    }
}
```

This pattern works identically on native and WASM with no conditional compilation.
