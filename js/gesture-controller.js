/**
 * GestureController class - Handles MediaPipe hand tracking and gesture recognition
 * Recognizes: index finger (zoom in), two fingers (zoom out), swipe (rotate), open palm (reset)
 */
class GestureController {
    constructor(onGestureCallback) {
        this.onGesture = onGestureCallback;
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        
        // Gesture state
        this.lastHandPosition = null;
        this.gestureHistory = [];
        this.currentGesture = null;
        this.gestureStartTime = 0;
        
        // Gesture thresholds
        this.swipeThreshold = 0.1;
        this.gestureTimeThreshold = 200; // ms
        this.palmOpenThreshold = 0.15;
        
        // Gesture smoothing
        this.gestureQueue = [];
        this.maxGestureHistory = 5;
        
        this.isInitialized = false;
    }
    
    async init() {
        try {
            console.log('Starting gesture controller initialization...');
            
            // Check if MediaPipe is available
            if (typeof Hands === 'undefined') {
                console.warn('MediaPipe Hands not loaded - continuing without gestures');
                return false;
            }
            
            // Check camera availability
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('Camera not available - continuing without gestures');
                return false;
            }
            
            await this.setupCamera();
            console.log('Camera setup complete');
            
            await this.setupMediaPipe();
            console.log('MediaPipe setup complete');
            
            this.isInitialized = true;
            console.log('Gesture controller initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize gesture controller:', error);
            // Don't throw - just return false so app continues
            return false;
        }
    }
    
    async setupCamera() {
        return new Promise((resolve, reject) => {
            // Create video element for camera feed (hidden)
            this.videoElement = document.createElement('video');
            this.videoElement.style.position = 'absolute';
            this.videoElement.style.top = '-9999px';
            this.videoElement.autoplay = true;
            this.videoElement.playsInline = true;
            document.body.appendChild(this.videoElement);
            
            // Access back camera if available
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: { ideal: 'environment' }, // Back camera
                    frameRate: { ideal: 30 }
                }
            };
            
            navigator.mediaDevices.getUserMedia(constraints)
                .then(stream => {
                    this.videoElement.srcObject = stream;
                    this.videoElement.onloadedmetadata = () => {
                        this.videoElement.play();
                        resolve();
                    };
                })
                .catch(error => {
                    console.warn('Back camera not available, trying front camera');
                    // Fallback to front camera
                    const fallbackConstraints = {
                        video: {
                            width: { ideal: 640 },
                            height: { ideal: 480 },
                            facingMode: 'user'
                        }
                    };
                    
                    navigator.mediaDevices.getUserMedia(fallbackConstraints)
                        .then(stream => {
                            this.videoElement.srcObject = stream;
                            this.videoElement.onloadedmetadata = () => {
                                this.videoElement.play();
                                resolve();
                            };
                        })
                        .catch(reject);
                });
        });
    }
    
    async setupMediaPipe() {
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        
        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.hands.onResults(this.onHandsResults.bind(this));
        
        // Start camera processing
        const camera = new Camera(this.videoElement, {
            onFrame: async () => {
                if (this.hands) {
                    await this.hands.send({ image: this.videoElement });
                }
            },
            width: 640,
            height: 480
        });
        
        this.camera = camera;
        camera.start();
    }
    
    onHandsResults(results) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.currentGesture = null;
            this.updateGestureIndicator(null);
            return;
        }
        
        const landmarks = results.multiHandLandmarks[0];
        const gesture = this.recognizeGesture(landmarks);
        
        if (gesture !== this.currentGesture) {
            this.currentGesture = gesture;
            this.gestureStartTime = Date.now();
            this.updateGestureIndicator(gesture);
        }
        
        if (gesture && this.onGesture) {
            this.processGesture(gesture, landmarks);
        }
    }
    
    recognizeGesture(landmarks) {
        const fingerTips = [
            landmarks[4],  // Thumb
            landmarks[8],  // Index
            landmarks[12], // Middle
            landmarks[16], // Ring
            landmarks[20]  // Pinky
        ];
        
        const fingerBases = [
            landmarks[3],  // Thumb
            landmarks[6],  // Index
            landmarks[10], // Middle
            landmarks[14], // Ring
            landmarks[18]  // Pinky
        ];
        
        // Calculate which fingers are extended
        const extendedFingers = this.getExtendedFingers(landmarks);
        const extendedCount = extendedFingers.filter(Boolean).length;
        
        // Gesture recognition logic
        if (extendedCount === 1 && extendedFingers[1]) {
            // Index finger only
            return 'zoom_in';
        } else if (extendedCount === 2 && extendedFingers[1] && extendedFingers[2]) {
            // Index and middle finger
            return 'zoom_out';
        } else if (extendedCount >= 4) {
            // Open palm (4 or 5 fingers extended)
            return 'reset';
        } else if (extendedCount >= 2) {
            // Check for swipe gesture
            const swipeGesture = this.detectSwipe(landmarks[8]); // Use index finger tip
            if (swipeGesture) {
                return swipeGesture;
            }
        }
        
        return null;
    }
    
    getExtendedFingers(landmarks) {
        const extended = [false, false, false, false, false];
        
        // Thumb (special case - check x-axis)
        extended[0] = landmarks[4].x > landmarks[3].x;
        
        // Other fingers (check y-axis)
        for (let i = 1; i < 5; i++) {
            const tipIndex = 4 + (i * 4);
            const baseIndex = tipIndex - 2;
            extended[i] = landmarks[tipIndex].y < landmarks[baseIndex].y;
        }
        
        return extended;
    }
    
    detectSwipe(indexTip) {
        if (!this.lastHandPosition) {
            this.lastHandPosition = { x: indexTip.x, y: indexTip.y, time: Date.now() };
            return null;
        }
        
        const deltaX = indexTip.x - this.lastHandPosition.x;
        const deltaY = indexTip.y - this.lastHandPosition.y;
        const deltaTime = Date.now() - this.lastHandPosition.time;
        
        // Update last position
        this.lastHandPosition = { x: indexTip.x, y: indexTip.y, time: Date.now() };
        
        // Check for significant movement
        if (Math.abs(deltaX) > this.swipeThreshold && deltaTime < 500) {
            if (deltaX > 0) {
                return 'swipe_right';
            } else {
                return 'swipe_left';
            }
        }
        
        return null;
    }
    
    processGesture(gesture, landmarks) {
        const now = Date.now();
        
        // Add gesture to queue for smoothing
        this.gestureQueue.push({ gesture, time: now, landmarks });
        
        // Keep only recent gestures
        this.gestureQueue = this.gestureQueue.filter(g => now - g.time < 1000);
        
        // Process gesture based on type
        switch (gesture) {
            case 'zoom_in':
                this.onGesture({
                    type: 'zoom',
                    value: 1.02,
                    continuous: true
                });
                break;
                
            case 'zoom_out':
                this.onGesture({
                    type: 'zoom',
                    value: 0.98,
                    continuous: true
                });
                break;
                
            case 'swipe_left':
                this.onGesture({
                    type: 'rotate',
                    deltaX: -5,
                    deltaY: 0,
                    continuous: false
                });
                break;
                
            case 'swipe_right':
                this.onGesture({
                    type: 'rotate',
                    deltaX: 5,
                    deltaY: 0,
                    continuous: false
                });
                break;
                
            case 'reset':
                // Only trigger reset if gesture is held for a short time
                if (now - this.gestureStartTime > 500) {
                    this.onGesture({
                        type: 'reset',
                        continuous: false
                    });
                }
                break;
        }
    }
    
    updateGestureIndicator(gesture) {
        const indicator = document.getElementById('gesture-indicator');
        if (!indicator) return;
        
        if (gesture) {
            let text = '';
            switch (gesture) {
                case 'zoom_in':
                    text = '👆 Zooming In';
                    break;
                case 'zoom_out':
                    text = '✌️ Zooming Out';
                    break;
                case 'swipe_left':
                    text = '← Rotating Left';
                    break;
                case 'swipe_right':
                    text = '→ Rotating Right';
                    break;
                case 'reset':
                    text = '🖐️ Reset (Hold)';
                    break;
                default:
                    text = '👋 Gesture Detected';
            }
            
            indicator.textContent = text;
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    }
    
    // Calibration method for gesture sensitivity
    calibrate(options = {}) {
        if (options.swipeThreshold !== undefined) {
            this.swipeThreshold = options.swipeThreshold;
        }
        
        if (options.gestureTimeThreshold !== undefined) {
            this.gestureTimeThreshold = options.gestureTimeThreshold;
        }
        
        if (options.palmOpenThreshold !== undefined) {
            this.palmOpenThreshold = options.palmOpenThreshold;
        }
    }
    
    dispose() {
        if (this.camera) {
            this.camera.stop();
        }
        
        if (this.hands) {
            this.hands.close();
        }
        
        if (this.videoElement && this.videoElement.srcObject) {
            const stream = this.videoElement.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
            document.body.removeChild(this.videoElement);
        }
        
        this.isInitialized = false;
    }
}
