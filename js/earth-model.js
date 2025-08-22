/**
 * EarthModel class - Handles the 3D Earth model with realistic textures
 * This class is designed to be modular so the Earth can be replaced with other 3D objects
 */
class EarthModel {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.earthGroup = new THREE.Group();
        this.originalPosition = new THREE.Vector3(0, 0, -2);
        this.originalRotation = new THREE.Euler(0, 0, 0);
        this.originalScale = new THREE.Vector3(0.5, 0.5, 0.5);
        
        // Configuration
        this.config = {
            radius: options.radius || 0.5,
            position: options.position || this.originalPosition.clone(),
            useGLTF: options.useGLTF || false,
            gltfPath: options.gltfPath || null,
            texturePaths: options.texturePaths || {
                diffuse: 'assets/earth_diffuse.jpg',
                normal: 'assets/earth_normal.jpg',
                specular: 'assets/earth_specular.jpg',
                clouds: 'assets/earth_clouds.jpg'
            }
        };
        
        this.earthMesh = null;
        this.cloudsMesh = null;
        this.isLoaded = false;
        this.loadingPromise = null;
        
        // Animation properties
        this.rotationSpeed = 0.005;
        this.cloudsRotationSpeed = 0.003;
        
        this.init();
    }
    
    async init() {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }
        
        this.loadingPromise = this.config.useGLTF ? 
            this.loadGLTFModel() : 
            this.createProceduralEarth();
            
        try {
            await this.loadingPromise;
            this.setupEarthGroup();
            this.isLoaded = true;
        } catch (error) {
            console.error('Failed to load Earth model:', error);
            // Fallback to basic sphere
            this.createBasicEarth();
            this.setupEarthGroup();
            this.isLoaded = true;
        }
        
        return this.earthGroup;
    }
    
    async loadGLTFModel() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            loader.load(
                this.config.gltfPath,
                (gltf) => {
                    this.earthMesh = gltf.scene;
                    this.earthMesh.scale.setScalar(this.config.radius);
                    resolve();
                },
                (progress) => {
                    console.log('Loading progress:', progress);
                },
                reject
            );
        });
    }
    
    async createProceduralEarth() {
        const textureLoader = new THREE.TextureLoader();
        const geometry = new THREE.SphereGeometry(this.config.radius, 64, 32);
        
        try {
            // Load Earth textures
            const textures = await this.loadTextures(textureLoader);
            
            // Create Earth material
            const earthMaterial = new THREE.MeshPhongMaterial({
                map: textures.diffuse,
                normalMap: textures.normal,
                specularMap: textures.specular,
                shininess: 100,
                transparent: false
            });
            
            this.earthMesh = new THREE.Mesh(geometry, earthMaterial);
            
            // Create clouds layer if cloud texture exists
            if (textures.clouds) {
                const cloudGeometry = new THREE.SphereGeometry(this.config.radius * 1.01, 32, 16);
                const cloudMaterial = new THREE.MeshPhongMaterial({
                    map: textures.clouds,
                    transparent: true,
                    opacity: 0.3,
                    depthWrite: false
                });
                
                this.cloudsMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
            }
            
        } catch (error) {
            console.warn('Failed to load textures, creating basic Earth:', error);
            this.createBasicEarth();
        }
    }
    
    async loadTextures(textureLoader) {
        const texturePromises = {};
        
        for (const [key, path] of Object.entries(this.config.texturePaths)) {
            if (path) {
                texturePromises[key] = new Promise((resolve, reject) => {
                    textureLoader.load(
                        path,
                        resolve,
                        undefined,
                        () => {
                            console.warn(`Failed to load ${key} texture: ${path}`);
                            resolve(null);
                        }
                    );
                });
            }
        }
        
        const results = await Promise.all(Object.values(texturePromises));
        const textureKeys = Object.keys(texturePromises);
        const textures = {};
        
        results.forEach((texture, index) => {
            textures[textureKeys[index]] = texture;
        });
        
        // Generate procedural textures as fallback
        if (!textures.diffuse && typeof generateProceduralEarthTexture === 'function') {
            console.log('Using procedural Earth texture as fallback');
            const proceduralCanvas = generateProceduralEarthTexture(1024);
            textures.diffuse = new THREE.CanvasTexture(proceduralCanvas);
        }
        
        if (!textures.clouds && typeof generateCloudTexture === 'function') {
            console.log('Using procedural cloud texture as fallback');
            const cloudCanvas = generateCloudTexture(512);
            textures.clouds = new THREE.CanvasTexture(cloudCanvas);
        }
        
        return textures;
    }
    
    createBasicEarth() {
        const geometry = new THREE.SphereGeometry(this.config.radius, 32, 16);
        const material = new THREE.MeshPhongMaterial({
            color: 0x4a90e2,
            shininess: 100
        });
        
        this.earthMesh = new THREE.Mesh(geometry, material);
        
        // Add some basic visual interest
        const wireframe = new THREE.WireframeGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00, 
            opacity: 0.3, 
            transparent: true 
        });
        const wireframeMesh = new THREE.LineSegments(wireframe, lineMaterial);
        
        this.earthMesh.add(wireframeMesh);
    }
    
    setupEarthGroup() {
        this.earthGroup.add(this.earthMesh);
        
        if (this.cloudsMesh) {
            this.earthGroup.add(this.cloudsMesh);
        }
        
        this.earthGroup.position.copy(this.config.position);
        this.earthGroup.scale.copy(this.originalScale);
        
        this.scene.add(this.earthGroup);
    }
    
    // Animation methods
    update(deltaTime) {
        if (!this.isLoaded) return;
        
        // Rotate Earth
        if (this.earthMesh) {
            this.earthMesh.rotation.y += this.rotationSpeed * deltaTime;
        }
        
        // Rotate clouds slightly faster for realism
        if (this.cloudsMesh) {
            this.cloudsMesh.rotation.y += this.cloudsRotationSpeed * deltaTime;
        }
    }
    
    // Gesture control methods
    zoom(factor) {
        const newScale = this.earthGroup.scale.x * factor;
        const clampedScale = THREE.MathUtils.clamp(newScale, 0.1, 3.0);
        this.earthGroup.scale.setScalar(clampedScale);
    }
    
    rotate(deltaX, deltaY) {
        this.earthGroup.rotation.y += deltaX * 0.01;
        this.earthGroup.rotation.x += deltaY * 0.01;
        
        // Clamp X rotation to prevent flipping
        this.earthGroup.rotation.x = THREE.MathUtils.clamp(
            this.earthGroup.rotation.x, 
            -Math.PI / 2, 
            Math.PI / 2
        );
    }
    
    resetOrientation() {
        // Smooth reset animation
        const targetRotation = this.originalRotation.clone();
        const targetScale = this.originalScale.clone();
        
        this.animateToTransform(targetRotation, targetScale, 1000);
    }
    
    animateToTransform(targetRotation, targetScale, duration = 1000) {
        const startRotation = this.earthGroup.rotation.clone();
        const startScale = this.earthGroup.scale.clone();
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate rotation
            this.earthGroup.rotation.x = THREE.MathUtils.lerp(
                startRotation.x, 
                targetRotation.x, 
                easeOutCubic
            );
            this.earthGroup.rotation.y = THREE.MathUtils.lerp(
                startRotation.y, 
                targetRotation.y, 
                easeOutCubic
            );
            this.earthGroup.rotation.z = THREE.MathUtils.lerp(
                startRotation.z, 
                targetRotation.z, 
                easeOutCubic
            );
            
            // Interpolate scale
            this.earthGroup.scale.lerpVectors(startScale, targetScale, easeOutCubic);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    // Utility methods
    getPosition() {
        return this.earthGroup.position;
    }
    
    setPosition(x, y, z) {
        this.earthGroup.position.set(x, y, z);
    }
    
    getRotation() {
        return this.earthGroup.rotation;
    }
    
    getScale() {
        return this.earthGroup.scale.x;
    }
    
    // Method to replace the Earth with another 3D object
    async replaceModel(newConfig) {
        // Remove current model
        this.scene.remove(this.earthGroup);
        
        // Update configuration
        this.config = { ...this.config, ...newConfig };
        
        // Reset state
        this.earthMesh = null;
        this.cloudsMesh = null;
        this.isLoaded = false;
        this.loadingPromise = null;
        this.earthGroup = new THREE.Group();
        
        // Load new model
        return await this.init();
    }
    
    dispose() {
        if (this.earthMesh) {
            this.earthMesh.geometry?.dispose();
            this.earthMesh.material?.dispose();
        }
        
        if (this.cloudsMesh) {
            this.cloudsMesh.geometry?.dispose();
            this.cloudsMesh.material?.dispose();
        }
        
        this.scene.remove(this.earthGroup);
    }
}
