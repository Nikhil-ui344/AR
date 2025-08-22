/**
 * Main application - WebXR AR Earth Experience
 * Integrates Three.js, MediaPipe Hands, and WebXR for an interactive AR Earth
 */
class AREarthApp {
    constructor() {
        // Core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        // Application modules
        this.earthModel = null;
        this.gestureController = null;
        this.arManager = null;
        
        // UI elements
        this.arButton = null;
        this.loadingElement = null;
        this.uiOverlay = null;
        
        // Application state
        this.isInitialized = false;
        this.isLoading = true;
        this.lastGestureTime = 0;
        this.gestureDebounce = 100; // ms
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 0;
    }
    
    async init() {
        try {
            console.log('Initializing AR Earth Experience...');
            
            this.setupUI();
            console.log('UI setup complete');
            
            this.setupThreeJS();
            console.log('Three.js setup complete');
            
            await this.initializeModules();
            console.log('Modules initialized');
            
            this.setupEventListeners();
            console.log('Event listeners setup complete');
            
            this.isInitialized = true;
            this.isLoading = false;
            this.updateUI();
            
            console.log('AR Earth Experience initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }
    
    setupUI() {
        this.arButton = document.getElementById('ar-button');
        this.loadingElement = document.getElementById('loading');
        this.uiOverlay = document.getElementById('ui-overlay');
        
        // Set initial UI state
        this.arButton.textContent = 'Checking AR Support...';
        this.arButton.disabled = true;
    }
    
    setupThreeJS() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.01,
            1000
        );
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.physicallyCorrectLights = true;
        
        // Add renderer to DOM
        document.getElementById('container').appendChild(this.renderer.domElement);
        
        // Add basic lighting for fallback mode
        this.setupLighting();
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Point light for better illumination
        const pointLight = new THREE.PointLight(0xffffff, 0.6);
        pointLight.position.set(-5, 3, 2);
        this.scene.add(pointLight);
    }
    
    async initializeModules() {
        // Initialize Earth model
        console.log('Loading Earth model...');
        try {
            this.earthModel = new EarthModel(this.scene, {
                radius: 0.5,
                position: new THREE.Vector3(0, 0, -2)
            });
            
            await this.earthModel.init();
            console.log('Earth model loaded successfully');
        } catch (error) {
            console.error('Earth model failed to load:', error);
            // Continue anyway - create a basic fallback
            this.createBasicEarthFallback();
        }
        
        // Initialize AR Manager
        console.log('Initializing AR Manager...');
        try {
            this.arManager = new ARManager();
            const arSupported = await this.arManager.init(this.scene, this.camera, this.renderer);
            
            if (arSupported) {
                console.log('AR supported and initialized');
                // Set up AR callbacks
                this.arManager.setOnFrameUpdate(this.onARFrame.bind(this));
                this.arManager.setOnAnchorUpdate(this.onAnchorUpdate.bind(this));
                this.arManager.setOnSessionEnd(this.onARSessionEnd.bind(this));
            } else {
                console.log('AR not supported, enabling fallback mode');
                // Enable fallback mode
                this.arManager.enableFallbackMode();
            }
        } catch (error) {
            console.error('AR Manager initialization failed:', error);
            // Create basic fallback
            this.enableBasicFallback();
        }
        
        // Initialize gesture controller
        console.log('Initializing gesture controller...');
        try {
            this.gestureController = new GestureController(this.onGesture.bind(this));
            const gesturesSupported = await this.gestureController.init();
            
            if (gesturesSupported) {
                console.log('Gesture controller initialized successfully');
            } else {
                console.warn('Gesture control not available - continuing without gestures');
            }
        } catch (error) {
            console.warn('Gesture controller failed to initialize:', error);
            // Continue without gestures - not critical
            this.gestureController = null;
        }
        
        console.log('All modules initialization complete');
    }
    
    setupEventListeners() {
        // AR button click
        this.arButton.addEventListener('click', this.toggleAR.bind(this));
        
        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Keyboard shortcuts for testing
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Touch events for mobile fallback
        this.setupTouchControls();
    }
    
    setupTouchControls() {
        let lastTouchTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.renderer.domElement.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        this.renderer.domElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (!this.arManager.isSessionActive()) {
                const deltaX = e.touches[0].clientX - touchStartX;
                const deltaY = e.touches[0].clientY - touchStartY;
                
                if (this.earthModel) {
                    this.earthModel.rotate(deltaX * 0.01, deltaY * 0.01);
                }
                
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        });
        
        // Pinch-to-zoom
        this.renderer.domElement.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            const now = Date.now();
            if (now - lastTouchTime < 300) {
                // Double tap - reset
                if (this.earthModel) {
                    this.earthModel.resetOrientation();
                }
            }
            lastTouchTime = now;
        });
    }
    
    onKeyDown(event) {
        if (!this.earthModel) return;
        
        switch (event.code) {
            case 'KeyR':
                this.earthModel.resetOrientation();
                break;
            case 'Equal':
            case 'NumpadAdd':
                this.earthModel.zoom(1.1);
                break;
            case 'Minus':
            case 'NumpadSubtract':
                this.earthModel.zoom(0.9);
                break;
            case 'ArrowLeft':
                this.earthModel.rotate(-10, 0);
                break;
            case 'ArrowRight':
                this.earthModel.rotate(10, 0);
                break;
        }
    }
    
    async toggleAR() {
        if (!this.arManager.isARSupported) {
            alert('AR is not supported on this device');
            return;
        }
        
        if (this.arManager.isARActive) {
            await this.arManager.endARSession();
        } else {
            const success = await this.arManager.startARSession();
            if (success) {
                this.arButton.textContent = 'Exit AR';
            }
        }
    }
    
    onGesture(gestureData) {
        const now = Date.now();
        
        // Debounce gestures
        if (now - this.lastGestureTime < this.gestureDebounce) {
            return;
        }
        
        if (!this.earthModel) return;
        
        switch (gestureData.type) {
            case 'zoom':
                this.earthModel.zoom(gestureData.value);
                if (!gestureData.continuous) {
                    this.lastGestureTime = now;
                }
                break;
                
            case 'rotate':
                this.earthModel.rotate(gestureData.deltaX, gestureData.deltaY);
                this.lastGestureTime = now;
                break;
                
            case 'reset':
                this.earthModel.resetOrientation();
                this.lastGestureTime = now;
                break;
        }
    }
    
    onARFrame(time, frame) {
        const deltaTime = this.clock.getDelta();
        
        // Update Earth model
        if (this.earthModel) {
            this.earthModel.update(deltaTime * 1000);
        }
        
        // Update performance metrics
        this.updatePerformanceMetrics(time);
    }
    
    onAnchorUpdate(position, orientation) {
        if (this.earthModel) {
            this.earthModel.setPosition(position.x, position.y, position.z);
        }
    }
    
    onARSessionEnd() {
        this.arButton.textContent = 'Enter AR';
        this.updateUI();
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    updateUI() {
        if (this.isLoading) {
            this.loadingElement.style.display = 'block';
            this.arButton.style.display = 'none';
        } else {
            this.loadingElement.style.display = 'none';
            this.arButton.style.display = 'block';
            
            if (this.arManager.isARSupported) {
                this.arButton.disabled = false;
                this.arButton.textContent = this.arManager.isARActive ? 'Exit AR' : 'Enter AR';
            } else {
                this.arButton.disabled = true;
                this.arButton.textContent = 'AR Not Supported';
            }
        }
    }
    
    updatePerformanceMetrics(time) {
        this.frameCount++;
        
        if (time - this.lastFPSUpdate > 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = time;
            
            // Optional: Update FPS display in UI
            this.updateFPSDisplay();
        }
    }
    
    createBasicEarthFallback() {
        console.log('Creating basic Earth fallback');
        // Create a simple sphere as fallback
        const geometry = new THREE.SphereGeometry(0.5, 32, 16);
        const material = new THREE.MeshPhongMaterial({
            color: 0x4a90e2,
            shininess: 100
        });
        
        const earthMesh = new THREE.Mesh(geometry, material);
        earthMesh.position.set(0, 0, -2);
        this.scene.add(earthMesh);
        
        // Create a basic controller object
        this.earthModel = {
            isLoaded: true,
            update: () => {
                earthMesh.rotation.y += 0.005;
            },
            zoom: (factor) => {
                const newScale = earthMesh.scale.x * factor;
                const clampedScale = THREE.MathUtils.clamp(newScale, 0.1, 3.0);
                earthMesh.scale.setScalar(clampedScale);
            },
            rotate: (deltaX, deltaY) => {
                earthMesh.rotation.y += deltaX * 0.01;
                earthMesh.rotation.x += deltaY * 0.01;
            },
            resetOrientation: () => {
                earthMesh.rotation.set(0, 0, 0);
                earthMesh.scale.set(1, 1, 1);
            },
            setPosition: (x, y, z) => {
                earthMesh.position.set(x, y, z);
            },
            dispose: () => {
                this.scene.remove(earthMesh);
            }
        };
    }
    
    enableBasicFallback() {
        console.log('Enabling basic fallback mode');
        // Create a minimal AR manager fallback
        this.arManager = {
            isARSupported: false,
            isARActive: false,
            enableFallbackMode: () => {
                console.log('Basic fallback mode enabled');
                
                // Set up basic 3D scene
                this.camera.position.set(0, 0, 5);
                this.camera.lookAt(0, 0, 0);
                
                // Start basic render loop
                const animate = () => {
                    requestAnimationFrame(animate);
                    
                    if (this.onARFrame) {
                        this.onARFrame(performance.now(), null);
                    }
                    
                    this.renderer.render(this.scene, this.camera);
                };
                
                animate();
            },
            startARSession: () => Promise.resolve(false),
            endARSession: () => Promise.resolve(),
            isSessionActive: () => false,
            dispose: () => {}
        };
        
        this.arManager.enableFallbackMode();
    }
    
    handleInitializationError(error) {
        this.isLoading = false;
        this.loadingElement.textContent = 'Failed to load AR experience. Please refresh and try again.';
        
        console.error('Initialization error:', error);
        
        // Show error in UI
        if (this.arButton) {
            this.arButton.textContent = 'Initialization Failed';
            this.arButton.disabled = true;
        }
    }
    
    // Method to replace Earth with another 3D object
    async replaceEarthModel(newModelConfig) {
        if (this.earthModel) {
            await this.earthModel.replaceModel(newModelConfig);
            console.log('Earth model replaced successfully');
        }
    }
    
    // Cleanup method
    dispose() {
        if (this.gestureController) {
            this.gestureController.dispose();
        }
        
        if (this.arManager) {
            this.arManager.dispose();
        }
        
        if (this.earthModel) {
            this.earthModel.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, starting initialization...');
    
    // Check for required features
    if (!window.THREE) {
        console.error('Three.js not loaded');
        document.getElementById('loading').textContent = 'Error: Three.js not loaded. Please refresh.';
        return;
    }
    
    // Create and initialize the application with timeout
    window.arEarthApp = new AREarthApp();
    
    // Add initialization timeout
    const initTimeout = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error('Initialization timeout - taking too long'));
        }, 15000); // 15 second timeout
    });
    
    try {
        await Promise.race([
            window.arEarthApp.init(),
            initTimeout
        ]);
    } catch (error) {
        console.error('Initialization failed:', error);
        
        // Show error message to user
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `
                <div style="color: #ff6b6b; text-align: center;">
                    <h3>Initialization Failed</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="
                        background: #007acc; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 5px; 
                        cursor: pointer;
                        margin-top: 10px;
                    ">Try Again</button>
                </div>
            `;
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.arEarthApp) {
        window.arEarthApp.dispose();
    }
});
