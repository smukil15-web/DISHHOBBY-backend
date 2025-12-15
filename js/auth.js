// Authentication Management
class AuthManager {
    constructor() {
        this.setupLoginForm();
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        if (!username || !password || !role) {
            alert('Please fill in all fields');
            return;
        }

        try {
            if (!window.api) {
                alert('API service not loaded. Please refresh the page.');
                return;
            }
            const response = await window.api.login(username, password, role);
            
            // Store current user
            const currentUser = {
                id: response.user.id,
                username: response.user.username,
                role: response.user.role,
                agentId: response.user.agentId || null
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            if (window.app) {
                window.app.currentUser = currentUser;
                window.app.showApp();
            } else {
                // Fallback: reload page to initialize app
                location.reload();
            }
            
            // Clear form
            document.getElementById('loginForm').reset();
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.message || 'Invalid credentials. Please check:\n1. Backend server is running\n2. Username: dishhobby\n3. Password: 12345678\n4. Role: admin';
            alert(errorMessage);
        }
    }

    isAdmin() {
        return app.currentUser && app.currentUser.role === 'admin';
    }

    isAgent() {
        return app.currentUser && app.currentUser.role === 'agent';
    }

    getCurrentAgentId() {
        return app.currentUser ? app.currentUser.agentId : null;
    }
}

// Initialize auth manager
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
    window.authManager = authManager;
});


