# Resource Aliasing & Memory

Transient resources with non-overlapping lifetimes can share the same GPU memory. The render graph computes this automatically to minimize VRAM usage.

## Why Aliasing Matters

A modern rendering pipeline might use 15+ intermediate textures: shadow maps, SSAO buffers, bloom mip chains, SSR buffers, selection masks, and more. At 1080p, a single Rgba16Float texture is about 16 MB. At 4K, it's 64 MB. Without aliasing, all these textures exist simultaneously in VRAM even if they're never alive at the same time.

Resource aliasing is the GPU equivalent of stack allocation: the same memory region is reused by different variables (textures) whose lifetimes don't overlap. The render graph's execution order gives a total ordering of pass execution, which makes it possible to compute exact lifetimes and find aliasing opportunities.

This technique is inspired by the Frostbite engine's frame graph (GDC 2017) and is standard practice in modern engines. The savings can be 30-50% of transient VRAM depending on the pipeline.

## How It Works

After topological sorting, the graph knows the execution order. For each transient resource, it computes:

- **first_use** - The pass index where the resource is first written
- **last_use** - The pass index where the resource is last read

If resource A's lifetime ends before resource B's lifetime begins, and they have compatible formats, they can share the same GPU texture:

```
Pass 0: writes A
Pass 1: reads A, writes B
Pass 2: reads B, writes C    <- A's memory can be reused for C
Pass 3: reads C, writes output
```

Here, A's lifetime is \[0, 1\] and C's lifetime is \[2, 3\]. Since they don't overlap and have compatible descriptors, the graph assigns them to the same pool slot.

## Compatibility Requirements

Two textures can alias if they have identical:

- Format
- Width and height
- Sample count
- Mip level count
- The reuser's usage flags are a subset of the pool's usage flags

Two buffers can alias if the pool's size is at least as large as the reuser's, and usage flags match exactly.

If a reuser needs additional usage flags, the pool texture is recreated with the combined flags.

## Pool-Based Allocation

The aliasing system uses a pool with a `BinaryHeap` for efficient slot reuse:

1. Sort transient resources by first_use
2. For each resource:
   - Check if any pool slot has a `lifetime_end` before this resource's `first_use`
   - If a compatible slot is found, reuse it
   - Otherwise, allocate a new pool slot
3. Each pool slot holds at most one GPU texture/buffer at a time

The heap is ordered by `lifetime_end` (min-heap), so the earliest-expiring slots are checked first.

## Bind Group Invalidation

When a transient resource gets a new GPU texture (because the pool slot was reallocated), any passes that reference that resource need to recreate their bind groups.

The graph tracks a **version number** per resource. When a resource's version changes between frames:

1. Find all passes that read, write, or reads_write that resource
2. Call `invalidate_bind_groups()` on those passes
3. Update the stored version

This ensures passes always reference the correct GPU texture, even after aliasing changes or window resizes.

## Memory Savings

For a typical scene with 15+ transient textures, aliasing can reduce VRAM usage significantly. For example:

- `ssao_raw` and `ssgi_raw` may never be alive at the same time
- Shadow depth maps are only needed during shadow passes, then their memory can be reused
- Intermediate blur textures from bloom can share memory with SSR blur textures

The exact savings depend on pass ordering and resource sizes.

## External Resources

External resources (swapchain, viewport outputs) are never aliased. They are always owned externally and provided fresh each frame.
