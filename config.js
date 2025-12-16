// Configuration file for API URL
// IMPORTANT: Update this with your deployed backend URL

// ============================================
// DEPLOYMENT CONFIGURATION
// ============================================
// Choose ONE of the following options:

// Option 1: Local Development
// Uncomment this if running backend locally
// window.API_BASE_URL = 'http://localhost:3000/api';

// Option 2: Railway.app Backend
// Replace with your Railway backend URL
// Example: https://cable-backend.up.railway.app/api
window.API_BASE_URL = 'https://YOUR_RAILWAY_BACKEND_URL.railway.app/api';

// Option 3: Render.com Backend
// Replace with your Render backend URL
// Example: https://cable-services-backend.onrender.com/api
// window.API_BASE_URL = 'https://YOUR_RENDER_BACKEND_URL.onrender.com/api';

// Option 4: Netlify Functions (if using Netlify for backend)
// window.API_BASE_URL = window.location.origin + '/api';

// ============================================
// AUTO-DETECTION (Fallback)
// ============================================
// Auto-detect environment (optional - will use above if set)
if (!window.API_BASE_URL || window.API_BASE_URL.includes('YOUR_')) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isNetlify = window.location.hostname.includes('netlify.app') || window.location.hostname.includes('netlify.com');
    
    if (isLocal) {
        // Local development
        window.API_BASE_URL = 'http://localhost:3000/api';
    } else if (isNetlify) {
        // Running on Netlify - use same domain (if using Netlify Functions)
        window.API_BASE_URL = window.location.origin + '/api';
    } else {
        // Default fallback - MUST be updated for production
        window.API_BASE_URL = 'https://YOUR_BACKEND_URL/api';
    }
}

