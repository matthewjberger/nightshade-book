use nightshade::prelude::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    launch(HelloNightshade::default())
}

#[derive(Default)]
struct HelloNightshade {
    cube: Option<Entity>,
    sphere: Option<Entity>,
    torus: Option<Entity>,
    time: f32,
}

impl State for HelloNightshade {
    fn title(&self) -> &str {
        "Hello Nightshade"
    }

    fn initialize(&mut self, world: &mut World) {
        world.resources.user_interface.enabled = false;
        world.resources.graphics.atmosphere = Atmosphere::Nebula;
        capture_procedural_atmosphere_ibl(world, Atmosphere::Nebula, 0.0);
        world.resources.graphics.bloom_enabled = true;
        world.resources.graphics.bloom_intensity = 0.15;
        world.resources.graphics.show_grid = true;

        let camera = spawn_pan_orbit_camera(
            world,
            Vec3::new(0.0, 0.0, 0.0),
            8.0,
            0.5,
            0.3,
            "Camera".to_string(),
        );
        world.resources.active_camera = Some(camera);

        spawn_sun(world);

        let cube = spawn_mesh_at(
            world,
            "Cube",
            Vec3::new(-3.0, 0.0, 0.0),
            Vec3::new(1.0, 1.0, 1.0),
        );
        spawn_material(
            world,
            cube,
            "CubeMaterial".to_string(),
            Material {
                base_color: [0.2, 0.6, 1.0, 1.0],
                metallic: 0.8,
                roughness: 0.2,
                emissive_factor: [0.1, 0.3, 0.5],
                emissive_strength: 2.0,
                ..Default::default()
            },
        );
        self.cube = Some(cube);

        let sphere = spawn_mesh_at(
            world,
            "Sphere",
            Vec3::new(0.0, 0.0, 0.0),
            Vec3::new(1.2, 1.2, 1.2),
        );
        spawn_material(
            world,
            sphere,
            "SphereMaterial".to_string(),
            Material {
                base_color: [1.0, 1.0, 1.0, 1.0],
                metallic: 1.0,
                roughness: 0.0,
                ..Default::default()
            },
        );
        self.sphere = Some(sphere);

        let torus = spawn_mesh_at(
            world,
            "Torus",
            Vec3::new(3.0, 0.0, 0.0),
            Vec3::new(0.8, 0.8, 0.8),
        );
        spawn_material(
            world,
            torus,
            "TorusMaterial".to_string(),
            Material {
                base_color: [0.3, 1.0, 0.4, 1.0],
                metallic: 0.7,
                roughness: 0.3,
                emissive_factor: [0.15, 0.5, 0.2],
                emissive_strength: 2.0,
                ..Default::default()
            },
        );
        self.torus = Some(torus);
    }

    fn run_systems(&mut self, world: &mut World) {
        pan_orbit_camera_system(world);

        let dt = world.resources.window.timing.delta_time;
        self.time += dt;

        if let Some(entity) = self.cube {
            if let Some(transform) = world.get_local_transform_mut(entity) {
                transform.rotation = nalgebra_glm::quat_angle_axis(self.time * 0.8, &Vec3::y())
                    * nalgebra_glm::quat_angle_axis(self.time * 0.5, &Vec3::x());
                transform.translation.y = (self.time * 1.5).sin() * 0.5;
            }
            world.mark_local_transform_dirty(entity);
        }

        if let Some(entity) = self.sphere {
            if let Some(transform) = world.get_local_transform_mut(entity) {
                transform.rotation = nalgebra_glm::quat_angle_axis(self.time * 0.3, &Vec3::y());
                let pulse = 1.0 + (self.time * 2.0).sin() * 0.1;
                transform.scale = Vec3::new(1.2 * pulse, 1.2 * pulse, 1.2 * pulse);
            }
            world.mark_local_transform_dirty(entity);
        }

        if let Some(entity) = self.torus {
            if let Some(transform) = world.get_local_transform_mut(entity) {
                transform.rotation = nalgebra_glm::quat_angle_axis(self.time * 1.2, &Vec3::z())
                    * nalgebra_glm::quat_angle_axis(self.time * 0.7, &Vec3::x());
                transform.translation.y = (self.time * 1.2 + 2.0).sin() * 0.5;
            }
            world.mark_local_transform_dirty(entity);
        }
    }
}
