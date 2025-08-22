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
            this.setupThreeJS();
            await this.initializeModules();
            this.setupEventListeners();
            
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
        this.earthModel = new EarthModel(this.scene, {
            radius: 0.5,
            position: new THREE.Vector3(0, 0, -2)
        });
        
        await this.earthModel.init();
        console.log('Earth model loaded');
        
        // Initialize AR Manager
        console.log('Initializing AR...');
        this.arManager = new ARManager();
        const arSupported = await this.arManager.init(this.scene, this.camera, this.renderer);
        
        if (arSupported) {
            // Set up AR callbacks
            this.arManager.setOnFrameUpdate(this.onARFrame.bind(this));
            this.arManager.setOnAnchorUpdate(this.onAnchorUpdate.bind(this));
            this.arManager.setOnSessionEnd(this.onARSessionEnd.bind(this));
        } else {
            // Enable fallback mode
            this.arManager.enableFallbackMode();
        }
        
        // Initialize gesture controller
        console.log('Initializing gesture controller...');
        this.gestureController = new GestureController(this.onGesture.bind(this));
        const gesturesSupported = await this.gestureController.init();
        
        if (!gesturesSupported) {
            console.warn('Gesture control not available');
        }
        
        console.log('All modules initialized');
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
    
    updateFPSDisplay() {
        // This could update a FPS counter in the UI
        // For now, just log to console in debug mode
        if (window.location.search.includes('debug')) {
            console.log(`FPS: ${this.currentFPS}`);
        }
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
    // Check for required features
    if (!window.THREE) {
        console.error('Three.js not loaded');
        return;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera access not available');
        return;
    }
    
    // Create and initialize the application
    window.arEarthApp = new AREarthApp();
    await window.arEarthApp.init();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.arEarthApp) {
        window.arEarthApp.dispose();
    }
});
