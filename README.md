# 🌍 WebXR AR Earth Experience

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://your-app.netlify.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/yourusername/webxr-ar-earth)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An interactive WebXR AR experience featuring a realistic 3D Earth model controlled by MediaPipe hand gestures. Users can place and interact with Earth in augmented reality using natural hand gestures.

🚀 **[Try the Live Demo](https://your-app.netlify.app)** (Use Chrome on Android for AR)

## ✨ Features

- **WebXR AR Integration**: Full WebXR support for mobile AR browsers
- **Hand Gesture Controls**: MediaPipe-powered gesture recognition
  - Index finger: Zoom in
  - Two fingers: Zoom out  
  - Swipe left/right: Rotate Earth
  - Open palm: Reset orientation
- **Realistic Earth Model**: Support for GLTF/GLB models with satellite textures
- **Modular Design**: Easy to replace Earth with other 3D objects
- **Mobile Optimized**: Works on Android Chrome and other WebXR-enabled browsers
- **Fallback Mode**: Works without AR as regular 3D experience

## Quick Start

1. **Clone/Download** this repository to your local machine

2. **Serve the files** using a local web server (required for WebXR):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js live-server
   npx live-server
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Access the app** at `http://localhost:8000` on your mobile device

4. **Enable AR** by tapping the "Enter AR" button

## File Structure

```
/
├── index.html              # Main HTML file
├── js/
│   ├── main.js            # Main application controller
│   ├── earth-model.js     # Modular Earth 3D model class
│   ├── gesture-controller.js # MediaPipe gesture recognition
│   └── ar-manager.js      # WebXR AR session management
├── assets/                # Earth texture files (see below)
├── models/                # 3D model files (GLTF/GLB)
└── README.md             # This file
```

## Earth Textures Setup

To get realistic Earth textures, download high-quality Earth texture maps and place them in the `assets/` folder:

### Required Textures:
- `earth_diffuse.jpg` - Color/albedo map (2K-4K resolution)
- `earth_normal.jpg` - Normal map for surface detail
- `earth_specular.jpg` - Specular map for water/ice reflection
- `earth_clouds.jpg` - Cloud layer (optional)

### Recommended Sources:
1. **NASA Visible Earth**: https://visibleearth.nasa.gov/
2. **Solar System Scope**: Free textures available
3. **OpenGameArt**: Creative Commons textures
4. **Texture Haven**: PBR Earth materials

### Example Download Commands:
```bash
# Create assets directory
mkdir assets

# Download sample Earth textures (replace with actual URLs)
curl -o assets/earth_diffuse.jpg "https://example.com/earth_8k.jpg"
curl -o assets/earth_normal.jpg "https://example.com/earth_normal_8k.jpg"
curl -o assets/earth_specular.jpg "https://example.com/earth_spec_8k.jpg"
curl -o assets/earth_clouds.jpg "https://example.com/earth_clouds_8k.jpg"
```

## Using GLTF/GLB Models

To use a 3D Earth model instead of procedural generation:

1. **Download/Create** a GLTF or GLB Earth model
2. **Place** the model file in the `models/` directory
3. **Update** the configuration in `main.js`:

```javascript
// In main.js, modify the EarthModel initialization
this.earthModel = new EarthModel(this.scene, {
    radius: 0.5,
    position: new THREE.Vector3(0, 0, -2),
    useGLTF: true,
    gltfPath: 'models/earth.glb'
});
```

## Supported Devices & Browsers

### Mobile AR (Primary Target):
- **Android**: Chrome 79+ with WebXR support
- **iOS**: Safari with WebXR (experimental)

### Desktop (Fallback Mode):
- Chrome 79+
- Firefox 70+
- Edge 79+
- Safari 13+

## Gesture Controls

| Gesture | Action | Description |
|---------|---------|-------------|
| 👆 Index Finger | Zoom In | Point with index finger |
| ✌️ Two Fingers | Zoom Out | Peace sign / Victory gesture |
| 👋 Swipe Left/Right | Rotate Earth | Move hand left or right |
| 🖐️ Open Palm | Reset | Open palm for 0.5+ seconds |

## Customization

### Replacing the Earth Model

The system is designed to be modular. To replace Earth with another object:

```javascript
// Replace Earth with Mars
await window.arEarthApp.replaceEarthModel({
    useGLTF: true,
    gltfPath: 'models/mars.glb',
    radius: 0.3
});

// Or use different textures
await window.arEarthApp.replaceEarthModel({
    useGLTF: false,
    radius: 0.4,
    texturePaths: {
        diffuse: 'assets/mars_diffuse.jpg',
        normal: 'assets/mars_normal.jpg'
    }
});
```

### Gesture Sensitivity

Adjust gesture sensitivity in the GestureController:

```javascript
// In main.js, after gesture controller initialization
this.gestureController.calibrate({
    swipeThreshold: 0.15,        // Higher = less sensitive
    gestureTimeThreshold: 300,   // Gesture hold time
    palmOpenThreshold: 0.12      // Palm detection sensitivity
});
```

### Camera Position

Modify the default Earth position in AR:

```javascript
// In main.js, EarthModel initialization
this.earthModel = new EarthModel(this.scene, {
    radius: 0.5,
    position: new THREE.Vector3(0, 0, -1.5), // Closer to user
});
```

## Troubleshooting

### AR Not Working
- Ensure you're using HTTPS or localhost
- Check if WebXR is enabled in browser flags
- Verify camera permissions are granted
- Try Chrome Canary for latest WebXR features

### Gestures Not Responding
- Ensure camera has clear view of hands
- Check lighting conditions (avoid backlighting)
- Verify MediaPipe scripts are loading correctly
- Try adjusting gesture sensitivity settings

### Performance Issues
- Reduce texture resolution (2K instead of 4K)
- Lower the Earth sphere geometry resolution
- Disable shadows in ARManager if needed

### Model Not Loading
- Check file paths are correct
- Ensure GLTF/GLB files are valid
- Check browser console for specific errors
- Try the fallback procedural Earth first

## API Reference

### EarthModel Class

```javascript
const earth = new EarthModel(scene, options);

// Methods
await earth.init()                    // Initialize model
earth.zoom(factor)                    // Zoom in/out
earth.rotate(deltaX, deltaY)          // Rotate model
earth.resetOrientation()              // Reset to original state
earth.setPosition(x, y, z)           // Set position
await earth.replaceModel(newConfig)   // Replace with new model
earth.dispose()                       // Cleanup
```

### GestureController Class

```javascript
const gestures = new GestureController(onGestureCallback);

// Methods
await gestures.init()                 // Initialize MediaPipe
gestures.calibrate(options)           // Adjust sensitivity
gestures.dispose()                    // Cleanup
```

### ARManager Class

```javascript
const arManager = new ARManager();

// Methods
await arManager.init(scene, camera, renderer)
await arManager.startARSession()      // Start AR
await arManager.endARSession()        // End AR
arManager.enableFallbackMode()        // Non-AR mode
```

## Development

### Adding New Gestures

1. **Extend** the `recognizeGesture()` method in `gesture-controller.js`
2. **Add** the new gesture case in `processGesture()`
3. **Handle** the gesture in the main app's `onGesture()` method

### Performance Monitoring

Enable debug mode by adding `?debug` to the URL:
```
http://localhost:8000/?debug
```

This will show FPS and other performance metrics in the console.

## License

This project is open source and available under the MIT License.

## Credits

- **Three.js**: 3D graphics library
- **MediaPipe**: Google's ML framework for hand tracking
- **WebXR**: W3C standard for AR/VR on the web
- **Earth Textures**: NASA and various open-source contributors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple devices
5. Submit a pull request

---

**Note**: This application requires a secure context (HTTPS) or localhost to access camera and WebXR features. For production deployment, ensure SSL certificates are properly configured.
