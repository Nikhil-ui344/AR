// Simple development server for testing the AR Earth experience
// Run with: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json'
};

const server = http.createServer((req, res) => {
    // Parse URL
    const parsedUrl = url.parse(req.url);
    let pathname = `.${parsedUrl.pathname}`;
    
    // If root, serve index.html
    if (pathname === './') {
        pathname = './index.html';
    }
    
    // Get file extension
    const ext = path.parse(pathname).ext;
    
    // Check if file exists
    fs.access(pathname, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html');
            res.end(`
                <html>
                <head><title>404 - Not Found</title></head>
                <body>
                    <h1>404 - File Not Found</h1>
                    <p>The requested file <code>${pathname}</code> was not found.</p>
                    <p><a href="/">Go back to home</a></p>
                </body>
                </html>
            `);
            return;
        }
        
        // Read file
        fs.readFile(pathname, (err, data) => {
            if (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');
                res.end('Internal Server Error');
                return;
            }
            
            // Set content type
            const mimeType = mimeTypes[ext] || 'application/octet-stream';
            res.setHeader('Content-Type', mimeType);
            
            // Enable CORS for development
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            
            // Serve file
            res.statusCode = 200;
            res.end(data);
        });
    });
});

server.listen(PORT, () => {
    console.log(`WebXR AR Earth Experience server running at:`);
    console.log(`  Local:   http://localhost:${PORT}/`);
    console.log(`  Network: http://YOUR_IP:${PORT}/`);
    console.log('');
    console.log('To test on mobile:');
    console.log('1. Connect your mobile device to the same WiFi network');
    console.log('2. Find your computer\'s IP address');
    console.log('3. Open http://YOUR_IP:8000/ on your mobile browser');
    console.log('4. Make sure to use HTTPS for WebXR (or use Chrome with --unsafely-treat-insecure-origin-as-secure flag)');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});
