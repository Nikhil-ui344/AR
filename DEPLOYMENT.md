# Deployment Guide for WebXR AR Earth Experience

## Local Development

### Quick Start
```bash
# Option 1: Using Node.js
node server.js

# Option 2: Using Python
python -m http.server 8000

# Option 3: Using PHP
php -S localhost:8000

# Option 4: Using npx (no installation needed)
npx live-server --port=8000
```

Then open `http://localhost:8000` in your browser.

## Mobile Testing

1. **Connect** your mobile device to the same WiFi network as your development machine
2. **Find your computer's IP address**:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` (look for inet address)
3. **Open** `http://YOUR_IP:8000` on your mobile browser
4. **Grant** camera permissions when prompted

## Production Deployment

### Prerequisites
- **HTTPS Required**: WebXR and MediaPipe require secure contexts
- **Modern Browser**: Chrome 79+, Safari 13+, Firefox 70+
- **Camera Access**: Users must grant camera permissions

### Static Hosting Options

#### 1. GitHub Pages
```bash
# 1. Create GitHub repository
# 2. Upload all files to repository
# 3. Enable GitHub Pages in repository settings
# 4. Your site will be available at: https://username.github.io/repository-name
```

#### 2. Netlify
```bash
# 1. Create account at netlify.com
# 2. Drag and drop the project folder to Netlify dashboard
# 3. Site will be automatically deployed with HTTPS
```

#### 3. Vercel
```bash
# 1. Install Vercel CLI: npm i -g vercel
# 2. In project directory: vercel
# 3. Follow prompts for deployment
```

#### 4. Firebase Hosting
```bash
# 1. Install Firebase CLI: npm i -g firebase-tools
# 2. Initialize: firebase init hosting
# 3. Deploy: firebase deploy
```

### Server-Based Hosting

#### Apache/Nginx Configuration

**Apache (.htaccess):**
```apache
# Enable HTTPS redirect
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Set proper MIME types
AddType model/gltf+json .gltf
AddType model/gltf-binary .glb
AddType application/wasm .wasm

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
    AddOutputFilterByType DEFLATE model/gltf+json
    AddOutputFilterByType DEFLATE model/gltf-binary
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType model/gltf+json "access plus 1 month"
    ExpiresByType model/gltf-binary "access plus 1 month"
</IfModule>
```

**Nginx:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    root /path/to/webxr-ar-earth;
    index index.html;
    
    # MIME types
    location ~ \.(gltf)$ {
        add_header Content-Type model/gltf+json;
    }
    
    location ~ \.(glb)$ {
        add_header Content-Type model/gltf-binary;
    }
    
    # Enable gzip
    gzip on;
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        application/xml+rss
        text/javascript
        model/gltf+json
        model/gltf-binary;
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|gltf|glb)$ {
        expires 1M;
        add_header Cache-Control "public, immutable";
    }
}
```

## SSL/HTTPS Setup

### Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# For Apache
sudo certbot --apache -d yourdomain.com

# For Nginx
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare (Free SSL)
1. Sign up for Cloudflare account
2. Add your domain
3. Update nameservers
4. Enable SSL in Cloudflare dashboard
5. Set SSL mode to "Full" or "Full (Strict)"

## Performance Optimization

### Image Optimization
```bash
# Install imagemin-cli
npm install -g imagemin-cli imagemin-mozjpeg imagemin-pngquant

# Optimize textures
imagemin assets/*.jpg --out-dir=assets/optimized --plugin=mozjpeg
imagemin assets/*.png --out-dir=assets/optimized --plugin=pngquant
```

### 3D Model Optimization
```bash
# Install gltf-pipeline
npm install -g gltf-pipeline

# Optimize GLTF models
gltf-pipeline -i model.gltf -o model-optimized.glb --draco.compressionLevel 10
```

### Bundle Size Reduction
- Use CDN links for Three.js and MediaPipe (already implemented)
- Compress textures to appropriate sizes (1K-2K for mobile)
- Use WebP format for textures when supported
- Implement progressive loading for large assets

## Browser Compatibility

### WebXR Support Check
```javascript
// Add to main.js for better browser detection
function checkWebXRSupport() {
    if (!navigator.xr) {
        return {
            supported: false,
            reason: 'WebXR not available'
        };
    }
    
    return navigator.xr.isSessionSupported('immersive-ar').then(supported => ({
        supported,
        reason: supported ? 'WebXR AR supported' : 'WebXR AR not supported'
    }));
}
```

### Fallback for Unsupported Browsers
The application automatically falls back to:
1. Regular 3D view without AR
2. Touch controls for mobile
3. Keyboard controls for desktop
4. Mouse controls for desktop

## Security Considerations

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    media-src 'self' blob:;
    connect-src 'self' blob:;
">
```

### Privacy
- Camera access is only used for hand tracking
- No data is sent to external servers
- All processing happens client-side
- Users can revoke camera permissions at any time

## Monitoring & Analytics

### Basic Analytics
```javascript
// Add to main.js for usage tracking
function trackEvent(category, action, label) {
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            event_category: category,
            event_label: label
        });
    }
}

// Usage examples
trackEvent('AR', 'session_start', 'user_entered_ar');
trackEvent('Gestures', 'zoom', 'user_zoomed_earth');
```

### Performance Monitoring
```javascript
// Add performance metrics
const perfObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
            console.log(`${entry.name}: ${entry.duration}ms`);
        }
    }
});
perfObserver.observe({ entryTypes: ['measure'] });

// Measure initialization time
performance.mark('init-start');
// ... initialization code ...
performance.mark('init-end');
performance.measure('initialization', 'init-start', 'init-end');
```

## Troubleshooting Common Issues

### AR Not Starting
1. **Check HTTPS**: Ensure site is served over HTTPS
2. **Browser Support**: Test on Chrome for Android 79+
3. **Permissions**: Verify camera permissions are granted
4. **Device Support**: Check if device supports ARCore (Android) or ARKit (iOS)

### Poor Performance
1. **Reduce Texture Size**: Use 1K textures instead of 4K
2. **Lower Geometry**: Reduce sphere segments in EarthModel
3. **Disable Shadows**: Comment out shadow settings in ARManager
4. **Check Memory**: Monitor browser DevTools for memory leaks

### Gesture Recognition Issues
1. **Lighting**: Ensure good lighting conditions
2. **Camera Position**: Hold device steady, hands visible
3. **Calibration**: Adjust gesture sensitivity settings
4. **Background**: Avoid cluttered backgrounds

## Support & Updates

### Browser Updates
- Keep track of WebXR specification changes
- Test with Chrome Canary for upcoming features
- Monitor MediaPipe updates for performance improvements

### Device Testing
- Test on various Android devices with ARCore
- Check iOS support as WebXR becomes available
- Verify performance on different hardware configurations
