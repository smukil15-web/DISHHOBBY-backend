// Main Application Logic
class App {
    constructor() {
        this.currentUser = null;
        this.currentRoute = 'dashboard';
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupRouting();
        this.setupEventListeners();
        this.initializeData();
    }

    async checkAuth() {
        try {
            const user = localStorage.getItem('currentUser');
            if (user) {
                this.currentUser = JSON.parse(user);
                // Verify token is still valid if API is available
                if (window.api) {
                    try {
                        const authCheck = await window.api.checkAuth();
                        if (authCheck && authCheck.user) {
                            this.currentUser = {
                                id: authCheck.user.id,
                                username: authCheck.user.username,
                                role: authCheck.user.role,
                                agentId: authCheck.user.agentId || null
                            };
                            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                            this.showApp();
                            return;
                        }
                    } catch (error) {
                        console.error('Auth check error:', error);
                        // If API check fails, still try to show app with cached user
                    }
                }
                // If no API or API check failed, use cached user
                this.showApp();
    } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            this.showLogin();
        }
    }

    showLogin() {
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('appPage').classList.remove('active');
}

    showApp() {
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('appPage').classList.add('active');
        this.updateUI();
        this.navigate(this.currentRoute);
}

    updateUI() {
        const userInfo = document.getElementById('userInfo');
        if (this.currentUser) {
            userInfo.textContent = `${this.currentUser.role.toUpperCase()}: ${this.currentUser.username}`;
            
            // Show/hide admin-only features
            const isAdmin = this.currentUser.role === 'admin';
            const isAgent = this.currentUser.role === 'agent';
            
            // Navigation visibility
            document.getElementById('packagesNav').style.display = isAdmin ? 'block' : 'none';
            document.getElementById('agentsNav').style.display = isAdmin ? 'block' : 'none';
            document.getElementById('customersNav').style.display = isAdmin ? 'block' : 'none';
            document.getElementById('reportsNav').style.display = isAdmin ? 'block' : 'none';
            document.getElementById('remindersNav').style.display = isAdmin ? 'block' : 'none';
            document.getElementById('settingsNav').style.display = isAdmin ? 'block' : 'none';
            
            // Button visibility
            document.getElementById('addCustomerBtn').style.display = isAdmin ? 'block' : 'none';
            const importExcelBtn = document.getElementById('importExcelBtn');
            if (importExcelBtn) {
                importExcelBtn.style.display = isAdmin ? 'block' : 'none';
            }
            const exportExcelBtn = document.getElementById('exportExcelBtn');
            if (exportExcelBtn) {
                exportExcelBtn.style.display = isAdmin ? 'block' : 'none';
            }
            
            // Force dashboard route for agents
            if (isAgent) {
                this.currentRoute = 'dashboard';
                window.location.hash = 'dashboard';
            }
        }
    }

    setupRouting() {
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1) || 'dashboard';
            this.navigate(hash);
        });

        // Handle initial hash
        const hash = window.location.hash.slice(1) || 'dashboard';
        this.navigate(hash);
    }

    navigate(route) {
        // Restrict agents to dashboard only
        if (this.currentUser && this.currentUser.role === 'agent' && route !== 'dashboard') {
            route = 'dashboard';
            window.location.hash = 'dashboard';
        }
        
        this.currentRoute = route;
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${route}`) {
                link.classList.add('active');
    }
        });

        // Show/hide sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(route);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Load section-specific data
        this.loadSectionData(route);
    }

    loadSectionData(route) {
        switch(route) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'customers':
                if (window.CustomerManager) {
                    window.CustomerManager.loadCustomers();
    }
                break;
            case 'packages':
                if (window.PackageManager) {
                    window.PackageManager.loadPackages();
                }
                break;
            case 'agents':
                if (window.AgentManager) {
                    window.AgentManager.loadAgents();
    }
                break;
            case 'reports':
                if (window.ReportManager) {
                    window.ReportManager.showReportMenu();
                }
                break;
            case 'reminders':
                if (window.ReminderManager) {
                    window.ReminderManager.loadRemindersPage();
                }
                break;
        }
    }

    async loadDashboard() {
        try {
            // Check if API is available
            if (!window.api) {
                console.error('API service not loaded');
                return;
            }
            // Load dashboard data from API
            const dashboardData = await window.api.getDashboardData();
            const customers = await window.api.getCustomers();
            const payments = await window.api.getPayments();
            
            const today = new Date().toISOString().split('T')[0];
            const currentMonth = new Date().toISOString().slice(0, 7);
            const isAgent = window.authManager && window.authManager.isAgent();

            // Filter data based on user role - agents see all customers and their own collections
            if (isAgent) {
                const agentId = window.authManager.getCurrentAgentId();
                if (agentId) {
                    // For dashboard stats, show all customers (no assignment filter)
                    // But filter payments to show only payments collected by this agent
                    payments = payments.filter(p => {
                        const paymentAgentId = p.agentId?._id || p.agentId;
                        return paymentAgentId && paymentAgentId.toString() === agentId.toString();
                    });
                } else {
                    // Agent has no ID, show empty data
                    customers = [];
                    payments = [];
                }
            }

        // Update dashboard layout for agents vs admins
        if (isAgent) {
            // Show monthly chart section for agents
            const agentMonthlyChartSection = document.getElementById('agentMonthlyChartSection');
            if (agentMonthlyChartSection) agentMonthlyChartSection.style.display = 'block';
            
            // Show reports section for agents
            const agentReportsSection = document.getElementById('agentReportsSection');
            if (agentReportsSection) agentReportsSection.style.display = 'block';
            
            // Show barcode scanner section for agents
            const barcodeScannerSection = document.getElementById('barcodeScannerSection');
            if (barcodeScannerSection) barcodeScannerSection.style.display = 'block';
            
            // Hide recent payments section for agents
            const recentPaymentsSection = document.getElementById('recentPaymentsSection');
            if (recentPaymentsSection) recentPaymentsSection.style.display = 'none';
            
            // Load agent reports
            if (window.AgentReportManager) {
                window.AgentReportManager.init();
            }
            
            // Load monthly collection chart
            this.loadAgentMonthlyChart();
            
            // Update stat titles and show/hide cards for agents
            document.getElementById('stat1Title').textContent = 'Today Paid Customers';
            document.getElementById('stat2Title').textContent = 'Today Collection Amount';
            document.getElementById('stat3Title').textContent = 'Total Month Paid Customers';
            document.getElementById('stat4Title').textContent = 'Unpaid Customers';
            
            // Hide 5th card for agents
            const stat5Card = document.getElementById('stat5Card');
            if (stat5Card) stat5Card.style.display = 'none';
        } else {
            // Hide agent-only sections for admin
            const barcodeScannerSection = document.getElementById('barcodeScannerSection');
            if (barcodeScannerSection) barcodeScannerSection.style.display = 'none';
            
            const agentMonthlyChartSection = document.getElementById('agentMonthlyChartSection');
            if (agentMonthlyChartSection) agentMonthlyChartSection.style.display = 'none';
            
            const agentReportsSection = document.getElementById('agentReportsSection');
            if (agentReportsSection) agentReportsSection.style.display = 'none';
            
            // Show admin monthly chart section
            const adminMonthlyChartSection = document.getElementById('adminMonthlyChartSection');
            if (adminMonthlyChartSection) adminMonthlyChartSection.style.display = 'block';
            
            // Show admin payment collection section
            const adminPaymentSection = document.getElementById('adminPaymentCollectionSection');
            if (adminPaymentSection) adminPaymentSection.style.display = 'block';
            
            // Load reminder section
            if (window.ReminderManager) {
                window.ReminderManager.init();
                const reminderSection = document.getElementById('reminderSection');
                if (reminderSection) reminderSection.style.display = 'block';
            }
            
            // Load admin monthly chart (with error handling and delay to ensure DOM is ready)
            setTimeout(() => {
                try {
                    this.loadAdminMonthlyChart();
                } catch (error) {
                    console.error('Error loading admin monthly chart:', error);
                }
            }, 100);
            
            // Show all stats for admin
            const stat4Card = document.getElementById('stat4Card');
            if (stat4Card) stat4Card.style.display = 'block';
            const stat5Card = document.getElementById('stat5Card');
            if (stat5Card) stat5Card.style.display = 'block';
            const stat6Card = document.getElementById('stat6Card');
            if (stat6Card) stat6Card.style.display = 'block';
            const recentPaymentsSection = document.getElementById('recentPaymentsSection');
            if (recentPaymentsSection) recentPaymentsSection.style.display = 'block';
            
            // Reset stat titles for admin
            document.getElementById('stat1Title').textContent = 'Total Customers';
            document.getElementById('stat2Title').textContent = 'Paid Customers (Current Month)';
            document.getElementById('stat3Title').textContent = 'Unpaid Current Month Customers';
            document.getElementById('stat4Title').textContent = 'Today Collection Amount';
            document.getElementById('stat5Title').textContent = 'Today Paid Customers';
            document.getElementById('stat6Title').textContent = 'Total Month Collection';
        }

            // Use dashboard data from API
            const totalCustomers = dashboardData.totalCustomers || customers.length;
            const currentMonthPaidCount = dashboardData.unpaidCurrentMonth !== undefined 
                ? totalCustomers - dashboardData.unpaidCurrentMonth 
                : 0;
            const currentMonthUnpaidCount = dashboardData.unpaidCurrentMonth || 0;
            const todayPaidCount = dashboardData.todayPaidCount || 0;
            const dailyTotal = dashboardData.todayCollection || 0;
            const totalMonthCollection = dashboardData.totalMonthCollection || 0;
            
            // Calculate monthly and daily collections from payments array
            const monthlyPayments = payments.filter(p => {
                const paymentDate = new Date(p.collectionDate || p.date).toISOString().slice(0, 7);
                return paymentDate === currentMonth && p.status === 'completed';
            });
            
            const dailyPayments = payments.filter(p => {
                const paymentDate = new Date(p.collectionDate || p.date).toISOString().split('T')[0];
                return paymentDate === today && p.status === 'completed';
            });
            
            // Calculate paid customers for current month (by subscription month)
            const currentYear = new Date().getFullYear();
            const currentMonthNum = new Date().getMonth() + 1; // 1-12
            const currentMonthPaidPayments = payments.filter(p => 
                p.status === 'completed' &&
                p.subscriptionMonth === currentMonthNum &&
                p.subscriptionYear === currentYear
            );
            const currentMonthPaidCustomerIds = new Set(
                currentMonthPaidPayments.map(p => {
                    const customerId = p.customerId?._id || p.customerId;
                    return customerId ? customerId.toString() : null;
                }).filter(Boolean)
            );
            const calculatedCurrentMonthPaidCount = currentMonthPaidCustomerIds.size;
        
        if (isAgent) {
            // For agents: Today Paid Customers (count of unique customers who paid today - collected by this agent)
            const todayPaidCustomerIds = new Set(dailyPayments.map(p => p.customerId));
            const todayPaidCount = todayPaidCustomerIds.size;
            document.getElementById('totalCustomers').textContent = todayPaidCount;
            
            // For agents: Today Collection Amount (collected by this agent)
            document.getElementById('unpaidCustomers').textContent = `₹${dailyTotal.toFixed(2)}`;
            
            // For agents: Total Month Paid Customers (count of unique customers who paid this month - collected by this agent)
            const monthPaidCustomerIds = new Set(monthlyPayments.map(p => p.customerId));
            const monthPaidCount = monthPaidCustomerIds.size;
            document.getElementById('monthlyCollection').textContent = monthPaidCount;
            
            // For agents: Unpaid Customers (all customers, not just assigned)
            const unpaidCount = customers.filter(c => c.paymentStatus === 'unpaid').length;
            document.getElementById('dailyCollection').textContent = unpaidCount;
        } else {
            // For admin: Total customers
            document.getElementById('totalCustomers').textContent = customers.length;
            
            // For admin: Paid customers current month (by subscription month)
            document.getElementById('unpaidCustomers').textContent = currentMonthPaidCount;
            
            // For admin: Unpaid current month customers (customers who haven't paid for current subscription month)
            document.getElementById('monthlyCollection').textContent = currentMonthUnpaidCount;
            
            // For admin: Today collection amount
            document.getElementById('dailyCollection').textContent = `₹${dailyTotal.toFixed(2)}`;
            
            // For admin: Today paid customers
            document.getElementById('todayPaidCustomers').textContent = todayPaidCount;
            
            // For admin: Total month collection
            document.getElementById('totalMonthCollection').textContent = `₹${totalMonthCollection.toFixed(2)}`;
        }

            // Recent payments (only for admin)
            if (!isAgent) {
                const recentPayments = payments
                    .filter(p => p.status === 'completed')
                    .sort((a, b) => new Date(b.collectionDate || b.date) - new Date(a.collectionDate || a.date))
                    .slice(0, 5);

                const recentPaymentsHtml = recentPayments.length > 0
                    ? recentPayments.map(payment => {
                        const customerId = payment.customerId?._id || payment.customerId;
                        const customer = customers.find(c => {
                            const cId = c._id || c.id;
                            return cId && cId.toString() === customerId?.toString();
                        });
                        const agentId = payment.agentId?._id || payment.agentId;
                        const agent = payment.agentId && typeof payment.agentId === 'object' 
                            ? payment.agentId 
                            : null;
                        const agentName = agent ? agent.name : payment.collectedBy || 'Unknown Agent';
                        
                        // Get subscription info if available
                        const subscriptionInfo = payment.subscriptionMonthName && payment.subscriptionYear 
                            ? `Subscription: ${payment.subscriptionMonthName} ${payment.subscriptionYear}` 
                            : '';
                        const collectionDate = payment.collectionDate 
                            ? new Date(payment.collectionDate).toLocaleDateString() 
                            : new Date(payment.date).toLocaleDateString();
                        
                        return `
                            <div class="card">
                                <div class="card-header">
                                    <span><strong>${customer ? customer.name : payment.customerName || 'Unknown'}</strong></span>
                                    <span class="badge badge-success">₹${parseFloat(payment.amount).toFixed(2)}</span>
                                </div>
                                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 5px;">
                                    <strong>Collection Date:</strong> ${collectionDate}
                                </p>
                                ${subscriptionInfo ? `<p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 5px;"><strong>${subscriptionInfo}</strong></p>` : ''}
                                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 5px;">
                                    Collected by: ${agentName}
                                </p>
                            </div>
                        `;
                    }).join('')
                    : '<p style="color: var(--text-secondary);">No recent payments</p>';

                document.getElementById('recentPayments').innerHTML = recentPaymentsHtml;
            }
        
        // Initialize barcode scanner for agents (already initialized on DOMContentLoaded)
        } catch (error) {
            console.error('Error loading dashboard:', error);
            // Show error message to user
            const recentPayments = document.getElementById('recentPayments');
            if (recentPayments) {
                recentPayments.innerHTML = '<p style="color: var(--danger-color);">Error loading dashboard data. Please refresh the page.</p>';
            }
        }
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (window.api) {
                window.api.logout();
            }
            localStorage.removeItem('currentUser');
            this.currentUser = null;
            this.showLogin();
            window.location.hash = '';
        });

        // Settings - Save UPI ID
        document.getElementById('saveUpiBtn').addEventListener('click', () => {
            const upiId = document.getElementById('upiId').value.trim();
            if (upiId) {
                localStorage.setItem('upiId', upiId);
                alert('UPI ID saved successfully!');
            } else {
                alert('Please enter a valid UPI ID');
            }
    });
    
        // Load UPI ID in settings
        const savedUpiId = localStorage.getItem('upiId');
        if (savedUpiId) {
            document.getElementById('upiId').value = savedUpiId;
        }
    }

    initializeData() {
        // Initialize default data if not exists
        if (!this.getData('packages') || this.getData('packages').length === 0) {
            const defaultPackages = [
                { id: '1', name: 'Prime', price: 500, description: 'Prime package with all channels' },
                { id: '2', name: 'Power', price: 400, description: 'Power package' },
                { id: '3', name: 'Free Box', price: 300, description: 'Free box package' },
                { id: '4', name: 'Sony TV', price: 600, description: 'Sony TV package' },
                { id: '5', name: 'Add-on Channel', price: 200, description: 'Additional channels' }
            ];
            this.saveData('packages', defaultPackages);
}

        if (!this.getData('users') || this.getData('users').length === 0) {
            const defaultUsers = [
                { username: 'dishhobby', password: '12345678', role: 'admin' },
                { username: 'agent1', password: 'agent1', role: 'agent', agentId: '1' }
            ];
            this.saveData('users', defaultUsers);
        }

        if (!this.getData('agents') || this.getData('agents').length === 0) {
            const defaultAgents = [
                { id: '1', name: 'John Doe', agentId: 'AGT001', phone: '9876543210', email: 'john@example.com' },
                { id: '2', name: 'Jane Smith', agentId: 'AGT002', phone: '9876543211', email: 'jane@example.com' }
            ];
            this.saveData('agents', defaultAgents);
        }
}

    // Data management helpers - DEPRECATED: Use API service instead
    // Kept for backward compatibility during migration
    getData(key) {
        console.warn(`getData('${key}') is deprecated. Use API service instead.`);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    saveData(key, data) {
        console.warn(`saveData('${key}') is deprecated. Use API service instead.`);
        localStorage.setItem(key, JSON.stringify(data));
    }

    generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

    async loadAgentMonthlyChart() {
        const agentId = window.authManager ? window.authManager.getCurrentAgentId() : null;
        if (!agentId) return;

        const canvas = document.getElementById('agentMonthlyChart');
        if (!canvas) return;

        // Destroy existing chart if it exists
        if (this.agentChart) {
            this.agentChart.destroy();
        }

        try {
            if (!window.api) return;
            const allPayments = await window.api.getPayments();
            const currentYear = new Date().getFullYear();
            
            // Filter payments by agent, completed status, and subscription month/year
            const agentPayments = allPayments.filter(p => {
                const pAgentId = p.agentId?._id || p.agentId;
                return pAgentId === agentId && 
                       p.status === 'completed' &&
                       p.subscriptionMonth &&
                       p.subscriptionYear &&
                       p.subscriptionYear === currentYear;
            });

        // Initialize monthly customer counts (using Set to count unique customers per month)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyCustomerCounts = new Array(12).fill(0);
        const monthlyCustomerSets = Array.from({ length: 12 }, () => new Set());

        // Count unique customers for each subscription month
        agentPayments.forEach(payment => {
            if (payment.subscriptionMonth && payment.subscriptionYear === currentYear) {
                const monthIndex = payment.subscriptionMonth - 1; // subscriptionMonth is 1-12, array index is 0-11
                if (monthIndex >= 0 && monthIndex < 12) {
                    // Add customer ID to the set for this month (Set automatically handles duplicates)
                    monthlyCustomerSets[monthIndex].add(payment.customerId);
                }
            }
        });

        // Convert sets to counts
        monthlyCustomerSets.forEach((customerSet, index) => {
            monthlyCustomerCounts[index] = customerSet.size;
        });

        // Create chart
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library not loaded');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        this.agentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Paid Customers',
                    data: monthlyCustomerCounts,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' customer(s)';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                return value;
                            }
                        },
                        title: {
                            display: true,
                            text: 'Number of Customers'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Subscription Month'
                        }
                    }
                }
        }
    });
        } catch (error) {
            console.error('Error loading agent monthly chart:', error);
        }
    }

    loadAdminMonthlyChart() {
        try {
            const canvas = document.getElementById('adminMonthlyChart');
            if (!canvas) {
                console.warn('Admin monthly chart canvas not found');
                return;
            }

            // Destroy existing chart if it exists
            if (this.adminChart) {
                try {
                    this.adminChart.destroy();
                } catch (e) {
                    console.warn('Error destroying existing chart:', e);
                }
            }

            const payments = app.getData('payments') || [];
            const currentYear = new Date().getFullYear();
            
            // Filter all completed payments with subscription month/year for current year
            const allPayments = payments.filter(p => 
                p.status === 'completed' &&
                p.subscriptionMonth &&
                p.subscriptionYear &&
                p.subscriptionYear === currentYear
            );

            // Initialize monthly customer counts (using Set to count unique customers per month)
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthlyCustomerCounts = new Array(12).fill(0);
            const monthlyCustomerSets = Array.from({ length: 12 }, () => new Set());

            // Count unique customers for each subscription month
            allPayments.forEach(payment => {
                if (payment.subscriptionMonth && payment.subscriptionYear === currentYear) {
                    const monthIndex = payment.subscriptionMonth - 1; // subscriptionMonth is 1-12, array index is 0-11
                    if (monthIndex >= 0 && monthIndex < 12) {
                        // Add customer ID to the set for this month (Set automatically handles duplicates)
                        monthlyCustomerSets[monthIndex].add(payment.customerId);
                    }
                }
            });

            // Convert sets to counts
            monthlyCustomerSets.forEach((customerSet, index) => {
                monthlyCustomerCounts[index] = customerSet.size;
            });

            // Create chart
            if (typeof Chart === 'undefined') {
                console.error('Chart.js library not loaded');
                return;
            }
            
            const ctx = canvas.getContext('2d');
            this.adminChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Paid Customers',
                    data: monthlyCustomerCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' customer(s)';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                return value;
                            }
                        },
                        title: {
                            display: true,
                            text: 'Number of Customers'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Subscription Month'
                        }
                    }
                }
            }
        });
        } catch (error) {
            console.error('Error in loadAdminMonthlyChart:', error);
        }
    }
}

// Global functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
    window.app = app;
});
