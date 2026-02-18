# Passes & the PassNode Trait

Every render pass implements the `PassNode` trait to declare its resource dependencies and execute GPU commands.

## The PassNode Trait

```rust
pub trait PassNode<C = ()>: Send + Sync + Any {
    fn name(&self) -> &str;
    fn reads(&self) -> Vec<&str>;
    fn writes(&self) -> Vec<&str>;
    fn reads_writes(&self) -> Vec<&str> { Vec::new() }
    fn optional_reads(&self) -> Vec<&str> { Vec::new() }
    fn prepare(&mut self, _device: &Device, _queue: &wgpu::Queue, _configs: &C) {}
    fn invalidate_bind_groups(&mut self) {}
    fn execute<'r, 'e>(
        &mut self,
        context: PassExecutionContext<'r, 'e, C>,
    ) -> Result<Vec<SubGraphRunCommand<'r>>>;
}
```

On WASM, the `Send + Sync` bounds are removed.

## Slot-Based Resource Binding

Passes declare named **slots** that map to graph resources. The slot names are strings that match the keys in the `add_pass()` bindings:

```rust
impl PassNode<World> for MyPass {
    fn name(&self) -> &str { "my_pass" }

    // Slots this pass reads from (input textures)
    fn reads(&self) -> Vec<&str> { vec!["input"] }

    // Slots this pass writes to (output attachments)
    fn writes(&self) -> Vec<&str> { vec!["output"] }

    // Slots that are both read and written (read-modify-write)
    fn reads_writes(&self) -> Vec<&str> { vec![] }

    // Slots that are read if available, but don't create dependencies if absent
    fn optional_reads(&self) -> Vec<&str> { vec![] }
    // ...
}
```

When adding the pass to the graph, you bind slot names to resource IDs:

```rust
graph.add_pass(
    Box::new(my_pass),
    &[("input", scene_color_id), ("output", swapchain_id)],
)?;
```

## PassExecutionContext

The context provides access to resources during execution:

```rust
pub struct PassExecutionContext<'r, 'e, C = ()> {
    pub encoder: &'e mut CommandEncoder,
    pub resources: &'r RenderGraphResources,
    pub device: &'r Device,
    pub queue: &'r wgpu::Queue,
    pub configs: &'r C,  // For Nightshade, this is &World
    // ... internal fields
}
```

### Context Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `get_texture_view(slot)` | `&TextureView` | Get a texture view for sampling |
| `get_color_attachment(slot)` | `(view, LoadOp, StoreOp)` | Get color attachment with automatic load/store ops |
| `get_depth_attachment(slot)` | `(view, LoadOp, StoreOp)` | Get depth attachment with automatic load/store ops |
| `get_buffer(slot)` | `&Buffer` | Get a GPU buffer |
| `get_texture_size(slot)` | `(u32, u32)` | Get texture dimensions |
| `is_pass_enabled()` | `bool` | Check if this pass is currently enabled |
| `run_sub_graph(name, inputs)` | - | Execute a sub-graph |

### Automatic Load/Store Operations

The graph automatically determines the correct load and store operations:

- **LoadOp::Clear** - Used when this pass is the first writer and the resource has a clear value
- **LoadOp::Load** - Used when a previous pass already wrote to this resource
- **StoreOp::Store** - Used when another pass will read this resource later
- **StoreOp::Discard** - Used when no subsequent pass reads this resource

You don't choose these yourself - the `get_color_attachment()` and `get_depth_attachment()` methods return the correct ops.

## Prepare Phase

`prepare()` is called before execution for each non-culled pass. Use it to upload uniforms:

```rust
fn prepare(&mut self, device: &Device, queue: &wgpu::Queue, configs: &World) {
    let camera_data = extract_camera_uniforms(configs);
    queue.write_buffer(&self.uniform_buffer, 0, bytemuck::bytes_of(&camera_data));
}
```

## Bind Group Invalidation

When the graph reallocates resources (e.g. after resize), `invalidate_bind_groups()` is called on affected passes. Clear any cached bind groups:

```rust
fn invalidate_bind_groups(&mut self) {
    self.bind_group = None;
}
```

The graph tracks resource versions and only invalidates passes that reference changed resources.

## Full Example

```rust
pub struct BlurPass {
    pipeline: wgpu::RenderPipeline,
    bind_group_layout: wgpu::BindGroupLayout,
    bind_group: Option<wgpu::BindGroup>,
    sampler: wgpu::Sampler,
}

impl PassNode<World> for BlurPass {
    fn name(&self) -> &str { "blur_pass" }
    fn reads(&self) -> Vec<&str> { vec!["input"] }
    fn writes(&self) -> Vec<&str> { vec!["output"] }

    fn invalidate_bind_groups(&mut self) {
        self.bind_group = None;
    }

    fn execute<'r, 'e>(
        &mut self,
        ctx: PassExecutionContext<'r, 'e, World>,
    ) -> Result<Vec<SubGraphRunCommand<'r>>> {
        if !ctx.is_pass_enabled() {
            return Ok(vec![]);
        }

        let input_view = ctx.get_texture_view("input")?;
        let (output_view, load_op, store_op) = ctx.get_color_attachment("output")?;

        if self.bind_group.is_none() {
            self.bind_group = Some(ctx.device.create_bind_group(&wgpu::BindGroupDescriptor {
                layout: &self.bind_group_layout,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::TextureView(input_view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::Sampler(&self.sampler),
                    },
                ],
                label: Some("blur_bind_group"),
            }));
        }

        let mut pass = ctx.encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("blur_pass"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: output_view,
                resolve_target: None,
                ops: wgpu::Operations { load: load_op, store: store_op },
            })],
            depth_stencil_attachment: None,
            ..Default::default()
        });

        pass.set_pipeline(&self.pipeline);
        pass.set_bind_group(0, self.bind_group.as_ref().unwrap(), &[]);
        pass.draw(0..3, 0..1);  // Fullscreen triangle

        Ok(vec![])
    }
}
```

## Sub-Graph Execution

Passes can trigger sub-graph execution for multi-pass effects:

```rust
fn execute<'r, 'e>(
    &mut self,
    mut ctx: PassExecutionContext<'r, 'e, World>,
) -> Result<Vec<SubGraphRunCommand<'r>>> {
    ctx.run_sub_graph("bloom_mip_chain".to_string(), vec![
        SlotValue::TextureView {
            view: ctx.get_texture_view("hdr")?,
            width: self.width,
            height: self.height,
        },
    ]);

    Ok(ctx.into_sub_graph_commands())
}
```
