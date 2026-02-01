// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="introduction.html">Introduction</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Getting Started</li><li class="chapter-item expanded "><a href="installation.html"><strong aria-hidden="true">1.</strong> Installation</a></li><li class="chapter-item expanded "><a href="first-application.html"><strong aria-hidden="true">2.</strong> Your First Application</a></li><li class="chapter-item expanded "><a href="project-structure.html"><strong aria-hidden="true">3.</strong> Project Structure</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Core Concepts</li><li class="chapter-item expanded "><a href="state-trait.html"><strong aria-hidden="true">4.</strong> The State Trait</a></li><li class="chapter-item expanded "><a href="world-resources.html"><strong aria-hidden="true">5.</strong> World &amp; Resources</a></li><li class="chapter-item expanded "><a href="ecs.html"><strong aria-hidden="true">6.</strong> Entity Component System</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="components.html"><strong aria-hidden="true">6.1.</strong> Components</a></li><li class="chapter-item expanded "><a href="spawning-entities.html"><strong aria-hidden="true">6.2.</strong> Spawning Entities</a></li><li class="chapter-item expanded "><a href="querying-entities.html"><strong aria-hidden="true">6.3.</strong> Querying Entities</a></li></ol></li><li class="chapter-item expanded "><a href="scene-hierarchy.html"><strong aria-hidden="true">7.</strong> Scene Hierarchy</a></li><li class="chapter-item expanded "><a href="event-system.html"><strong aria-hidden="true">8.</strong> Event System</a></li><li class="chapter-item expanded "><a href="main-loop.html"><strong aria-hidden="true">9.</strong> Main Loop</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Rendering</li><li class="chapter-item expanded "><a href="cameras.html"><strong aria-hidden="true">10.</strong> Cameras</a></li><li class="chapter-item expanded "><a href="meshes-models.html"><strong aria-hidden="true">11.</strong> Meshes &amp; Models</a></li><li class="chapter-item expanded "><a href="materials.html"><strong aria-hidden="true">12.</strong> Materials</a></li><li class="chapter-item expanded "><a href="lighting.html"><strong aria-hidden="true">13.</strong> Lighting</a></li><li class="chapter-item expanded "><a href="post-processing.html"><strong aria-hidden="true">14.</strong> Post-Processing</a></li><li class="chapter-item expanded "><a href="render-graph.html"><strong aria-hidden="true">15.</strong> Render Graph</a></li><li class="chapter-item expanded "><a href="water.html"><strong aria-hidden="true">16.</strong> Water</a></li><li class="chapter-item expanded "><a href="decals.html"><strong aria-hidden="true">17.</strong> Decals</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Physics</li><li class="chapter-item expanded "><a href="physics-overview.html"><strong aria-hidden="true">18.</strong> Physics Overview</a></li><li class="chapter-item expanded "><a href="rigid-bodies.html"><strong aria-hidden="true">19.</strong> Rigid Bodies</a></li><li class="chapter-item expanded "><a href="colliders.html"><strong aria-hidden="true">20.</strong> Colliders</a></li><li class="chapter-item expanded "><a href="character-controllers.html"><strong aria-hidden="true">21.</strong> Character Controllers</a></li><li class="chapter-item expanded "><a href="physics-joints.html"><strong aria-hidden="true">22.</strong> Physics Joints</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Animation</li><li class="chapter-item expanded "><a href="loading-animations.html"><strong aria-hidden="true">23.</strong> Loading Animated Models</a></li><li class="chapter-item expanded "><a href="animation-playback.html"><strong aria-hidden="true">24.</strong> Animation Playback</a></li><li class="chapter-item expanded "><a href="animation-blending.html"><strong aria-hidden="true">25.</strong> Blending &amp; Transitions</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Audio</li><li class="chapter-item expanded "><a href="audio-system.html"><strong aria-hidden="true">26.</strong> Audio System</a></li><li class="chapter-item expanded "><a href="spatial-audio.html"><strong aria-hidden="true">27.</strong> Spatial Audio</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Input</li><li class="chapter-item expanded "><a href="keyboard-mouse.html"><strong aria-hidden="true">28.</strong> Keyboard &amp; Mouse</a></li><li class="chapter-item expanded "><a href="gamepad.html"><strong aria-hidden="true">29.</strong> Gamepad Support</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">User Interface</li><li class="chapter-item expanded "><a href="egui.html"><strong aria-hidden="true">30.</strong> egui Integration</a></li><li class="chapter-item expanded "><a href="immediate-ui.html"><strong aria-hidden="true">31.</strong> Immediate Mode UI</a></li><li class="chapter-item expanded "><a href="hud-text.html"><strong aria-hidden="true">32.</strong> HUD Text</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Advanced Features</li><li class="chapter-item expanded "><a href="terrain.html"><strong aria-hidden="true">33.</strong> Terrain</a></li><li class="chapter-item expanded "><a href="particles.html"><strong aria-hidden="true">34.</strong> Particle Systems</a></li><li class="chapter-item expanded "><a href="navmesh.html"><strong aria-hidden="true">35.</strong> Navigation Mesh</a></li><li class="chapter-item expanded "><a href="grass.html"><strong aria-hidden="true">36.</strong> Grass System</a></li><li class="chapter-item expanded "><a href="lines.html"><strong aria-hidden="true">37.</strong> Lines Rendering</a></li><li class="chapter-item expanded "><a href="audio-analyzer.html"><strong aria-hidden="true">38.</strong> Audio Analyzer</a></li><li class="chapter-item expanded "><a href="effects-pass.html"><strong aria-hidden="true">39.</strong> Effects Pass</a></li><li class="chapter-item expanded "><a href="picking.html"><strong aria-hidden="true">40.</strong> Picking System</a></li><li class="chapter-item expanded "><a href="sdf-sculpting.html"><strong aria-hidden="true">41.</strong> SDF Sculpting</a></li><li class="chapter-item expanded "><a href="lattice.html"><strong aria-hidden="true">42.</strong> Lattice Deformation</a></li><li class="chapter-item expanded "><a href="scripting.html"><strong aria-hidden="true">43.</strong> Scripting</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Examples</li><li class="chapter-item expanded "><a href="example-minimal.html"><strong aria-hidden="true">44.</strong> Minimal Example</a></li><li class="chapter-item expanded "><a href="example-first-person.html"><strong aria-hidden="true">45.</strong> First Person Game</a></li><li class="chapter-item expanded "><a href="example-third-person.html"><strong aria-hidden="true">46.</strong> Third Person Game</a></li><li class="chapter-item expanded "><a href="example-physics.html"><strong aria-hidden="true">47.</strong> Physics Playground</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Appendix</li><li class="chapter-item expanded "><a href="appendix-features.html"><strong aria-hidden="true">48.</strong> Feature Flags</a></li><li class="chapter-item expanded "><a href="appendix-platforms.html"><strong aria-hidden="true">49.</strong> Platform Support</a></li><li class="chapter-item expanded "><a href="appendix-api.html"><strong aria-hidden="true">50.</strong> API Quick Reference</a></li><li class="chapter-item expanded "><a href="appendix-cookbook.html"><strong aria-hidden="true">51.</strong> Cookbook</a></li><li class="chapter-item expanded "><a href="appendix-glossary.html"><strong aria-hidden="true">52.</strong> Glossary</a></li><li class="chapter-item expanded "><a href="appendix-troubleshooting.html"><strong aria-hidden="true">53.</strong> Troubleshooting</a></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0].split("?")[0];
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);
