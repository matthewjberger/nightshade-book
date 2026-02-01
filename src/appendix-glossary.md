# Glossary

Common terms used in game development and Nightshade.

## A

**Alpha Blending**
Technique for rendering transparent objects by mixing colors based on alpha (transparency) values.

**Alpha Cutoff**
Threshold for alpha testing. Pixels with alpha below this value are discarded entirely.

**Ambient Light**
Constant, directionless light that illuminates all surfaces equally. Simulates indirect illumination.

**Ambient Occlusion (AO)**
Technique that darkens creases and corners where ambient light would be blocked. See SSAO.

**Animation Blending**
Smoothly transitioning between two animations by interpolating their transforms.

**Animation Clip**
A single named animation (e.g., "walk", "run", "idle") containing keyframed transforms.

**Aspect Ratio**
Width divided by height of the viewport (e.g., 16:9 = 1.777).

## B

**Billboard**
A sprite that always faces the camera, commonly used for particles and distant objects.

**Bind Pose**
The default pose of a skeletal mesh before any animation is applied.

**Bloom**
Post-processing effect that creates a glow around bright areas.

**Bone**
A joint in a skeletal hierarchy used for animation. Also called a joint.

## C

**Cascaded Shadow Maps (CSM)**
Technique using multiple shadow maps at different resolutions for different distances.

**CCD (Continuous Collision Detection)**
Physics technique to prevent fast-moving objects from passing through thin surfaces.

**Character Controller**
A kinematic physics body designed for player movement with special handling for steps and slopes.

**Collider**
A simplified shape used for physics collision detection (box, sphere, capsule, etc.).

**Component**
Data attached to an entity in an ECS. Contains no logic, only state.

**Culling**
Excluding objects from rendering if they're outside the view or occluded.

## D

**Delta Time (dt)**
Time elapsed since the previous frame. Used to make movement frame-rate independent.

**Depth Buffer (Z-Buffer)**
Texture storing the distance of each pixel from the camera. Used for depth testing.

**Diffuse**
The base color of a surface, independent of view angle.

**Dynamic Body**
A physics body affected by forces, gravity, and collisions.

## E

**ECS (Entity Component System)**
Architecture where entities are IDs, components are data, and systems are logic.

**Emission/Emissive**
Light that a surface produces itself, independent of external lighting.

**Entity**
A unique identifier that groups related components together. Has no data itself.

**Euler Angles**
Representation of rotation as three angles (pitch, yaw, roll). Can suffer from gimbal lock.

**Exposure**
Brightness adjustment simulating camera exposure settings.

## F

**Far Plane**
Maximum distance from the camera at which objects are rendered.

**FFT (Fast Fourier Transform)**
Algorithm to convert audio from time domain to frequency domain.

**Field of View (FOV)**
Angle of the visible area. Typically 60-90 degrees for games.

**Forward Rendering**
Rendering each object completely in one pass. Simple but expensive with many lights.

**Frame**
One complete update and render cycle.

**Frustum**
The 3D region visible to the camera, shaped like a truncated pyramid.

## G

**G-Buffer**
Textures storing geometry information (normals, depth, albedo) for deferred rendering.

**Gimbal Lock**
Loss of one degree of freedom when two rotation axes align. Quaternions avoid this.

**glTF/GLB**
Standard 3D model format. glTF is JSON + binary, GLB is single binary file.

**Global Transform**
World-space transformation after parent transforms are applied.

## H

**HDR (High Dynamic Range)**
Color values exceeding 0-1 range, allowing for realistic lighting before tonemapping.

**Heightfield**
A 2D grid of height values representing terrain or other surfaces.

**Hierarchy**
Parent-child relationships between entities where child transforms are relative to parents.

## I

**Index Buffer**
List of vertex indices defining triangles. Allows vertex reuse.

**Instancing**
Rendering many copies of the same mesh efficiently in a single draw call.

**Interpolation**
Smoothly blending between two values. Linear interpolation (lerp) is most common.

## J

**Joint**
Connection point between physics bodies with constraints on movement.

## K

**Keyframe**
A specific value at a specific time in an animation. Values are interpolated between keyframes.

**Kinematic Body**
A physics body moved by code that affects dynamic bodies but isn't affected by physics.

## L

**LDR (Low Dynamic Range)**
Standard 0-1 color range suitable for display.

**Lerp (Linear Interpolation)**
Blending between two values: `result = a + (b - a) * t` where t is 0-1.

**LOD (Level of Detail)**
Using simpler meshes for distant objects to improve performance.

**Local Transform**
Position, rotation, scale relative to the parent entity (or world if no parent).

## M

**Material**
Defines how a surface looks: color, roughness, metallic, textures, etc.

**Mesh**
Geometry defined by vertices and indices forming triangles.

**Metallic**
PBR property indicating whether a surface is metal (1.0) or dielectric (0.0).

**Mipmaps**
Pre-calculated, progressively smaller versions of a texture for efficient sampling at distance.

**Morph Targets**
Vertex positions for blending between shapes (facial expressions, etc.). Also called blend shapes.

## N

**NavMesh (Navigation Mesh)**
Simplified geometry representing walkable areas for AI pathfinding.

**Near Plane**
Minimum distance from camera at which objects are rendered. Objects closer are clipped.

**Normal Map**
Texture encoding surface direction variations to simulate detail without geometry.

## O

**Occlusion**
When one object blocks another from view or light.

**Orthographic Projection**
Parallel projection with no perspective. Objects don't get smaller with distance.

## P

**PBR (Physically Based Rendering)**
Material model based on real-world physics for consistent, realistic lighting.

**Perspective Projection**
Projection where distant objects appear smaller, simulating human vision.

**Pitch**
Rotation around the X (left-right) axis. Looking up/down.

**Point Light**
Light emitting equally in all directions from a point.

**Prefab**
Pre-configured entity template that can be instantiated multiple times.

## Q

**Quaternion**
4D number representing rotation without gimbal lock. Used for smooth interpolation.

**Query**
Finding entities that have specific components.

## R

**Raycast**
Tracing a line through space to find intersections with geometry.

**Render Graph**
Declarative system for defining rendering passes and their dependencies.

**Render Pass**
A single stage of rendering (shadow pass, color pass, post-processing pass).

**Rigid Body**
Physics object that doesn't deform. Can be dynamic, kinematic, or static.

**Roll**
Rotation around the Z (forward) axis. Tilting sideways.

**Roughness**
PBR property controlling how scattered light reflections are. 0=mirror, 1=diffuse.

## S

**Skinning**
Deforming mesh vertices based on bone positions. Used for character animation.

**Skybox**
Cubemap texture surrounding the scene representing distant environment.

**Slerp (Spherical Linear Interpolation)**
Interpolation for quaternions that maintains constant angular velocity.

**Specular**
Mirror-like reflection of light. Intensity depends on view angle.

**Spot Light**
Light emitting in a cone shape, like a flashlight.

**SSAO (Screen-Space Ambient Occlusion)**
Post-processing technique approximating ambient occlusion from depth buffer.

**Static Body**
Physics body that never moves. Used for floors, walls, terrain.

**System**
Logic that operates on entities with specific components.

## T

**Tessellation**
Subdividing geometry into smaller triangles for detail.

**Texture**
2D image mapped onto 3D geometry.

**Tonemapping**
Converting HDR colors to displayable LDR range.

**Transform**
Position, rotation, and scale of an object in 3D space.

**Transparency**
See Alpha Blending.

**Trimesh (Triangle Mesh)**
Collision shape using actual mesh geometry. Accurate but expensive.

## U

**UV Coordinates**
2D texture coordinates mapping texture pixels to mesh vertices.

**Uniform**
Shader constant that's the same for all vertices/pixels in a draw call.

## V

**Vertex**
Point in 3D space with position, normal, texture coordinates, etc.

**Vertex Buffer**
GPU memory containing vertex data.

**Vignette**
Post-processing effect darkening screen edges.

**Vulkan**
Low-level graphics API. Used by wgpu on Windows/Linux.

## W

**WebGPU**
Modern web graphics API. Used by wgpu for cross-platform rendering.

**World Space**
Global coordinate system. Contrast with local/object space.

**wgpu**
Rust graphics library providing cross-platform GPU access.

## Y

**Yaw**
Rotation around the Y (up) axis. Looking left/right.

## Z

**Z-Buffer**
See Depth Buffer.

**Z-Fighting**
Visual artifacts when two surfaces are at nearly the same depth.
