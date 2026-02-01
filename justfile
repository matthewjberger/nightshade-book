set windows-shell := ["powershell.exe"]

# Displays the list of available commands
@just:
    just --list

# Build the book only (no demos)
build:
    mdbook build

# Serve the book only (no demos)
serve:
    mdbook serve --open

# Install wasm tooling for building demos
init-wasm:
    rustup target add wasm32-unknown-unknown
    cargo install --locked trunk

# Build the hello demo (Windows)
[windows]
build-demo:
    Push-Location demos/hello; trunk build --release --public-url /demos/hello/; Pop-Location

# Build the hello demo (Unix)
[unix]
build-demo:
    cd demos/hello && trunk build --release --public-url /demos/hello/

# Build the book with demos
build-all: build-demo build
    just copy-demos

# Copy built demos to book output (Windows)
[windows]
copy-demos:
    New-Item -ItemType Directory -Force -Path book/demos/hello | Out-Null
    Copy-Item -Recurse -Force demos/hello/dist/* book/demos/hello/

# Copy built demos to book output (Unix)
[unix]
copy-demos:
    mkdir -p book/demos/hello
    cp -r demos/hello/dist/* book/demos/hello/

# Serve the book with demos (Windows)
[windows]
serve-all: build-all
    Start-Process "http://localhost:3000"
    Push-Location book; python -m http.server 3000; Pop-Location

# Serve the book with demos (Unix)
[unix]
serve-all: build-all
    (sleep 1 && (open http://localhost:3000 || xdg-open http://localhost:3000)) &
    cd book && python -m http.server 3000

# Clean build artifacts (Windows)
[windows]
clean:
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue book
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue demos/hello/dist
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue demos/hello/target

# Clean build artifacts (Unix)
[unix]
clean:
    rm -rf book
    rm -rf demos/hello/dist
    rm -rf demos/hello/target

# Watch for changes and rebuild book (no demos)
watch:
    mdbook watch --open
