# Dependency Resolution & Scheduling

The render graph automatically orders passes based on their resource dependencies. This chapter explains how that works.

## Dependency Edge Construction

When `compile()` is called, the graph builds edges between passes:

1. Iterate through all passes
2. For each resource a pass reads, find the pass that last wrote to it
3. Create a directed edge from the writer to the reader

```
Pass A writes texture T
Pass B reads texture T
  => Edge: A -> B (B depends on A)
```

For `reads_writes` resources, the pass is treated as both a reader and a writer. Optional reads create edges only if a writer exists.

## Topological Sort

After building edges, the graph performs a topological sort using petgraph. A topological sort of a DAG produces a linear ordering where for every edge A -> B, A appears before B. This guarantees every pass runs after all the passes that produce its inputs.

For a graph with V passes and E dependency edges, topological sorting runs in O(V + E) time using Kahn's algorithm (iteratively remove nodes with no incoming edges) or depth-first search. petgraph implements this efficiently.

If the graph contains cycles (A depends on B, B depends on A), no valid topological ordering exists and compilation fails with `RenderGraphError::CyclicDependency`. Cycles in a render graph indicate a logical error: two passes cannot each depend on the other's output.

## Dead Pass Culling

Not all passes may contribute to the final output. The graph uses backward reachability from external resources to determine which passes are needed:

1. Start with all external resources as "required"
2. Walk backward through the execution order
3. A pass is required if it writes to a required resource (or has no writes/reads_writes, indicating side effects)
4. If a pass is required, all resources it reads become required too
5. Passes not marked as required are culled

```
Pass A writes T1
Pass B reads T1, writes T2     <- T2 is not read by anyone
Pass C reads T1, writes output  <- output is external

Result: A and C execute, B is culled
```

## Runtime Pass Toggling

Passes can be enabled or disabled at runtime without recompiling the graph:

```rust
graph.set_pass_enabled("bloom_pass", false)?;
```

When a pass is disabled, its `execute()` method receives `is_pass_enabled() == false`. The pass can check this and skip all GPU work:

```rust
fn execute<'r, 'e>(
    &mut self,
    ctx: PassExecutionContext<'r, 'e, World>,
) -> Result<Vec<SubGraphRunCommand<'r>>> {
    if !ctx.is_pass_enabled() {
        return Ok(vec![]);
    }
    // ... normal execution
}
```

## Recompilation

The graph tracks a `needs_recompile` flag. Adding or removing passes sets this flag. On the next `execute()`, the graph:

1. Removes all existing edges
2. Rebuilds dependency edges
3. Re-sorts topologically
4. Recomputes store ops, clear ops, lifetimes, and aliasing

This happens automatically - you don't need to call `compile()` again manually.

## Store and Clear Operations

### Store Operations

On tile-based GPU architectures (mobile GPUs, Apple Silicon), render pass attachments are stored in fast on-chip tile memory during rendering. At the end of the render pass, the driver must decide whether to write that tile memory back to main VRAM. This write-back is called a "store" operation and it has significant bandwidth cost.

For each resource write, the graph determines whether to store the result:

- **Store** - If any later pass reads this resource, or if it's an external resource with `force_store`. The data must survive to be read later.
- **Discard** - If no later pass reads this resource. The GPU can skip the write-back entirely, saving memory bandwidth. This is a significant optimization on tile-based architectures.

### Clear Operations

Similarly, at the start of a render pass, the GPU must decide what to do with the existing attachment contents:

- **Clear** - Write a known value (black, zero depth) into the attachment. This is cheap because the GPU can initialize tile memory without reading from VRAM.
- **Load** - Read the existing contents from VRAM into tile memory. This is necessary when a previous pass has already written data that this pass needs to preserve.

The first pass that writes to a resource with a clear value (clear_color or clear_depth) gets a `LoadOp::Clear`. All subsequent writers get `LoadOp::Load`.

These are computed during compilation and used automatically by `get_color_attachment()` and `get_depth_attachment()`. Getting these wrong is a common source of rendering bugs: using Clear when you should Load erases previous passes' work; using Load when you should Clear wastes bandwidth loading garbage data.
