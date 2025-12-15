// API Service for Backend Communication
class ApiService {
    constructor() {
        // API URL Configuration
        // For local development: 'http://localhost:3000/api'
        // For ngrok: 'https://YOUR_NGROK_URL.ngrok-free.app/api'
        // For cloud deployment: 'https://YOUR_BACKEND_URL/api'
        // You can also set it via environment or config
        this.baseURL = window.API_BASE_URL || 'http://localhost:3000/api';
        this.token = localStorage.getItem('authToken') || null;
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    getToken() {
        return this.token || localStorage.getItem('authToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            
            // Check if response is JSON
            let data;
            try {
                data = await response.json();
            } catch (e) {
                // If not JSON, might be a connection error
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }
                throw new Error('Invalid response from server');
            }

            if (!response.ok) {
                throw new Error(data.error || `Request failed: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request error:', error);
            // Check if it's a network error
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Cannot connect to server. Make sure the backend is running on http://localhost:3000');
            }
            throw error;
        }
    }

    // Authentication
    async login(username, password, role) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });
        this.setToken(response.token);
        return response;
    }

    async checkAuth() {
        try {
            return await this.request('/auth/check');
        } catch (error) {
            return null;
        }
    }

    logout() {
        this.setToken(null);
    }

    // Customers
    async getCustomers() {
        return await this.request('/customers');
    }

    async getCustomer(id) {
        return await this.request(`/customers/${id}`);
    }

    async createCustomer(customerData) {
        return await this.request('/customers', {
            method: 'POST',
            body: JSON.stringify(customerData)
        });
    }

    async updateCustomer(id, customerData) {
        return await this.request(`/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(customerData)
        });
    }

    async deleteCustomer(id) {
        return await this.request(`/customers/${id}`, {
            method: 'DELETE'
        });
    }

    async importCustomers(customers) {
        return await this.request('/customers/import', {
            method: 'POST',
            body: JSON.stringify({ customers })
        });
    }

    // Payments
    async getPayments() {
        return await this.request('/payments');
    }

    async getPaymentsByAgent(agentId) {
        return await this.request(`/payments/agent/${agentId}`);
    }

    async createPayment(paymentData) {
        return await this.request('/payments', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    async updatePayment(id, paymentData) {
        return await this.request(`/payments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(paymentData)
        });
    }

    async deletePayment(id) {
        return await this.request(`/payments/${id}`, {
            method: 'DELETE'
        });
    }

    // Agents
    async getAgents() {
        return await this.request('/agents');
    }

    async getAgent(id) {
        return await this.request(`/agents/${id}`);
    }

    async createAgent(agentData) {
        return await this.request('/agents', {
            method: 'POST',
            body: JSON.stringify(agentData)
        });
    }

    async updateAgent(id, agentData) {
        return await this.request(`/agents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(agentData)
        });
    }

    async deleteAgent(id) {
        return await this.request(`/agents/${id}`, {
            method: 'DELETE'
        });
    }

    // Packages
    async getPackages() {
        return await this.request('/packages');
    }

    async getPackage(id) {
        return await this.request(`/packages/${id}`);
    }

    async createPackage(packageData) {
        return await this.request('/packages', {
            method: 'POST',
            body: JSON.stringify(packageData)
        });
    }

    async updatePackage(id, packageData) {
        return await this.request(`/packages/${id}`, {
            method: 'PUT',
            body: JSON.stringify(packageData)
        });
    }

    async deletePackage(id) {
        return await this.request(`/packages/${id}`, {
            method: 'DELETE'
        });
    }

    // Reports
    async getDashboardData() {
        return await this.request('/reports/dashboard');
    }

    async getMonthlyReport(month, year) {
        return await this.request(`/reports/monthly?month=${month}&year=${year}`);
    }

    async getDailyReport(date) {
        return await this.request(`/reports/daily?date=${date}`);
    }

    // Reminders
    async getReminders() {
        return await this.request('/reminders');
    }

    async getUnpaidCustomers() {
        return await this.request('/reminders/unpaid');
    }

    async createReminder(reminderData) {
        return await this.request('/reminders', {
            method: 'POST',
            body: JSON.stringify(reminderData)
        });
    }
}

// Initialize API service
const api = new ApiService();

// Make it available globally
if (typeof window !== 'undefined') {
    window.api = api;
}

// Also make it available as a global variable (for direct api. calls)
if (typeof globalThis !== 'undefined') {
    globalThis.api = api;
}

// For browser environment, also set it directly (works in most cases)
try {
    if (typeof window !== 'undefined' && !window.api) {
        window.api = api;
    }
} catch (e) {
    // Ignore if can't set
}
