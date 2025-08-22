/**
 * Generate procedural Earth texture as a fallback
 * This creates a simple canvas-based Earth texture when real satellite imagery isn't available
 */
function generateProceduralEarthTexture(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Create base gradient (blue ocean)
    const oceanGradient = ctx.createRadialGradient(
        size/2, size/2, 0,
        size/2, size/2, size/2
    );
    oceanGradient.addColorStop(0, '#4a90e2');
    oceanGradient.addColorStop(1, '#2c5aa0');
    
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, size, size);
    
    // Add continents (simple shapes)
    ctx.fillStyle = '#8fbc8f';
    
    // North America
    ctx.beginPath();
    ctx.ellipse(size * 0.2, size * 0.3, size * 0.08, size * 0.12, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // South America
    ctx.beginPath();
    ctx.ellipse(size * 0.25, size * 0.6, size * 0.04, size * 0.15, 0.3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Africa
    ctx.beginPath();
    ctx.ellipse(size * 0.52, size * 0.5, size * 0.06, size * 0.2, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Europe/Asia
    ctx.beginPath();
    ctx.ellipse(size * 0.65, size * 0.25, size * 0.15, size * 0.08, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Australia
    ctx.beginPath();
    ctx.ellipse(size * 0.8, size * 0.7, size * 0.04, size * 0.03, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add some noise for texture
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // Red
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // Green
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return canvas;
}

// Create a simple cloud texture
function generateCloudTexture(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Transparent background
    ctx.clearRect(0, 0, size, size);
    
    // Generate cloud noise
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % size;
        const y = Math.floor((i / 4) / size);
        
        // Create cloud patterns using noise
        const noise1 = Math.sin(x * 0.01) * Math.sin(y * 0.01);
        const noise2 = Math.sin(x * 0.02) * Math.sin(y * 0.02);
        const noise3 = Math.sin(x * 0.005) * Math.sin(y * 0.005);
        
        const cloudValue = (noise1 + noise2 * 0.5 + noise3 * 2) / 3.5;
        const alpha = Math.max(0, Math.min(1, cloudValue + 0.3)) * 100;
        
        data[i] = 255;     // Red (white clouds)
        data[i + 1] = 255; // Green
        data[i + 2] = 255; // Blue
        data[i + 3] = alpha; // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return canvas;
}

// Export functions for use in the main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateProceduralEarthTexture,
        generateCloudTexture
    };
}
