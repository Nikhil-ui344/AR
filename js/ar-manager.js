/**
 * ARManager class - Handles WebXR AR session management and anchoring
 */
class ARManager {
    constructor() {
        this.xrSession = null;
        this.xrRefSpace = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        
        // AR state
        this.isARSupported = false;
        this.isARActive = false;
        this.anchor = null;
        this.anchorSpace = null;
        
        // Frame data
        this.lastFrameTime = 0;
        this.frameData = {
            pose: null,
            viewMatrix: null,
            projectionMatrix: null
        };
        
        // Anchoring system
        this.anchorPosition = new THREE.Vector3(0, 0, -2);
        this.anchorOrientation = new THREE.Quaternion();
        this.hasAnchor = false;
    }
    
    async init(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // Check WebXR support
        this.isARSupported = await this.checkARSupport();
        
        if (this.isARSupported) {
            this.setupRenderer();
            console.log('AR support detected');
            return true;
        } else {
            console.warn('AR not supported on this device');
            return false;
        }
    }
    
    async checkARSupport() {
        if (!navigator.xr) {
            console.warn('WebXR not supported');
            return false;
        }
        
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            return supported;
        } catch (error) {
            console.warn('Error checking AR support:', error);
            return false;
        }
    }
    
    setupRenderer() {
        // Configure renderer for WebXR
        this.renderer.xr.enabled = true;
        this.renderer.setAnimationLoop(this.render.bind(this));
        
        // Set up AR-specific settings
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
    }
    
    async startARSession() {
        if (!this.isARSupported || this.isARActive) {
            return false;
        }
        
        try {
            // Request AR session
            this.xrSession = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['local', 'hit-test'],
                optionalFeatures: ['dom-overlay', 'anchors'],
                domOverlay: { root: document.getElementById('ui-overlay') }
            });
            
            // Set up reference space
            this.xrRefSpace = await this.xrSession.requestReferenceSpace('local');
            
            // Configure renderer for XR
            await this.renderer.xr.setSession(this.xrSession);
            
            // Set up session event listeners
            this.xrSession.addEventListener('end', this.onARSessionEnd.bind(this));
            this.xrSession.addEventListener('select', this.onARSelect.bind(this));
            
            this.isARActive = true;
            console.log('AR session started successfully');
            
            // Initialize anchoring
            await this.initializeAnchoring();
            
            return true;
        } catch (error) {
            console.error('Failed to start AR session:', error);
            return false;
        }
    }
    
    async initializeAnchoring() {
        // Create a default anchor position in front of the user
        try {
            const anchorPose = new XRRigidTransform(
                {
                    x: this.anchorPosition.x,
                    y: this.anchorPosition.y,
                    z: this.anchorPosition.z
                },
                {
                    x: this.anchorOrientation.x,
                    y: this.anchorOrientation.y,
                    z: this.anchorOrientation.z,
                    w: this.anchorOrientation.w
                }
            );
            
            if (this.xrSession.requestHitTestSource) {
                // Use hit-testing if available
                this.initializeHitTesting();
            } else {
                // Fallback to fixed anchor
                this.createFixedAnchor(anchorPose);
            }
            
        } catch (error) {
            console.warn('Anchoring not supported, using fixed positioning');
            this.hasAnchor = false;
        }
    }
    
    async initializeHitTesting() {
        try {
            const hitTestSource = await this.xrSession.requestHitTestSource({
                space: this.xrRefSpace
            });
            
            this.hitTestSource = hitTestSource;
        } catch (error) {
            console.warn('Hit testing not available:', error);
        }
    }
    
    createFixedAnchor(pose) {
        // Create a virtual anchor for older devices
        this.hasAnchor = true;
        this.anchorSpace = {
            pose: pose,
            transform: pose
        };
        console.log('Fixed anchor created');
    }
    
    onARSelect(event) {
        // Handle user tap to place anchor
        if (this.hitTestSource) {
            this.placeAnchorAtHitTest(event.frame);
        }
    }
    
    placeAnchorAtHitTest(frame) {
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);
        
        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(this.xrRefSpace);
            
            if (pose) {
                this.updateAnchorPosition(pose);
                console.log('Anchor placed at hit test result');
            }
        }
    }
    
    updateAnchorPosition(pose) {
        this.anchorPosition.set(
            pose.transform.position.x,
            pose.transform.position.y,
            pose.transform.position.z
        );
        
        this.anchorOrientation.set(
            pose.transform.orientation.x,
            pose.transform.orientation.y,
            pose.transform.orientation.z,
            pose.transform.orientation.w
        );
        
        this.hasAnchor = true;
        
        // Update Earth position if it exists
        if (this.onAnchorUpdate) {
            this.onAnchorUpdate(this.anchorPosition, this.anchorOrientation);
        }
    }
    
    render(time, frame) {
        this.lastFrameTime = time;
        
        if (frame && this.isARActive) {
            // Get pose information
            const pose = frame.getViewerPose(this.xrRefSpace);
            
            if (pose) {
                this.frameData.pose = pose;
                
                // Update camera based on XR pose
                this.updateCameraFromPose(pose);
                
                // Handle hit testing
                if (this.hitTestSource && !this.hasAnchor) {
                    this.handleHitTesting(frame);
                }
            }
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        
        // Call external update callback if available
        if (this.onFrameUpdate) {
            this.onFrameUpdate(time, frame);
        }
    }
    
    updateCameraFromPose(pose) {
        // XR handles camera automatically, but we can access pose data
        this.frameData.viewMatrix = pose.views[0].transform.matrix;
        this.frameData.projectionMatrix = pose.views[0].projectionMatrix;
    }
    
    handleHitTesting(frame) {
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);
        
        // Visual feedback for hit testing could be added here
        if (hitTestResults.length > 0) {
            // Show placement indicator
            this.showPlacementIndicator(hitTestResults[0]);
        }
    }
    
    showPlacementIndicator(hitResult) {
        // This could create a visual indicator showing where the Earth would be placed
        // Implementation depends on UI requirements
    }
    
    async endARSession() {
        if (!this.isARActive) {
            return;
        }
        
        try {
            await this.xrSession.end();
        } catch (error) {
            console.error('Error ending AR session:', error);
        }
    }
    
    onARSessionEnd() {
        this.isARActive = false;
        this.xrSession = null;
        this.xrRefSpace = null;
        this.anchor = null;
        this.anchorSpace = null;
        this.hasAnchor = false;
        
        console.log('AR session ended');
        
        // Notify external systems
        if (this.onSessionEnd) {
            this.onSessionEnd();
        }
    }
    
    // Utility methods
    getAnchorPosition() {
        return this.anchorPosition.clone();
    }
    
    getAnchorOrientation() {
        return this.anchorOrientation.clone();
    }
    
    isSessionActive() {
        return this.isARActive;
    }
    
    getFrameData() {
        return { ...this.frameData };
    }
    
    // Event callbacks (set by external code)
    setOnAnchorUpdate(callback) {
        this.onAnchorUpdate = callback;
    }
    
    setOnFrameUpdate(callback) {
        this.onFrameUpdate = callback;
    }
    
    setOnSessionEnd(callback) {
        this.onSessionEnd = callback;
    }
    
    // Fallback methods for non-AR mode
    enableFallbackMode() {
        console.log('Running in fallback mode (no AR)');
        
        // Set up basic 3D scene without AR
        this.camera.position.set(0, 0, 5);
        this.camera.lookAt(0, 0, 0);
        
        // Create basic lighting for non-AR mode
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Start regular render loop
        const animate = () => {
            requestAnimationFrame(animate);
            
            if (this.onFrameUpdate) {
                this.onFrameUpdate(performance.now(), null);
            }
            
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
    }
    
    dispose() {
        if (this.isARActive) {
            this.endARSession();
        }
        
        if (this.hitTestSource) {
            this.hitTestSource.cancel();
        }
        
        // Clean up callbacks
        this.onAnchorUpdate = null;
        this.onFrameUpdate = null;
        this.onSessionEnd = null;
    }
}
