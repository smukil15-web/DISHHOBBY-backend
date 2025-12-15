// Report Management
class ReportManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Report buttons
        document.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportType = e.target.dataset.report;
                this.generateReport(reportType);
            });
        });
    }

    showReportMenu() {
        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = '<p style="color: var(--text-secondary);">Select a report from above to view.</p>';
    }

    generateReport(type) {
        switch(type) {
            case 'monthly':
                this.generateMonthlyReport();
                break;
            case 'daily':
                this.generateDailyReport();
                break;
            case 'total':
                this.generateTotalCustomersReport();
                break;
            case 'unpaid':
                this.generateUnpaidCustomersReport();
                break;
        }
    }

    generateMonthlyReport() {
        const reportContent = document.getElementById('reportContent');
        
        // Get current month or prompt for month selection
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        reportContent.innerHTML = `
            <div class="report-content">
                <div class="report-header">
                    <h2>Monthly Collection Report</h2>
                    <div class="report-filters">
                        <label>Select Month:</label>
                        <input type="month" id="monthSelector" value="${currentMonth}">
                        <button class="btn btn-primary" onclick="reportManager.generateMonthlyReport()">Generate</button>
                        <button class="btn btn-secondary" onclick="window.print()">Print</button>
                    </div>
                </div>
                <div id="monthlyReportData"></div>
            </div>
        `;

        // Load report data
        const monthSelector = document.getElementById('monthSelector');
        monthSelector.addEventListener('change', () => this.loadMonthlyReportData());
        this.loadMonthlyReportData();
    }

    loadMonthlyReportData() {
        const monthSelector = document.getElementById('monthSelector');
        const selectedMonth = monthSelector ? monthSelector.value : new Date().toISOString().slice(0, 7);
        
        const payments = app.getData('payments') || [];
        const customers = app.getData('customers') || [];
        const packages = app.getData('packages') || [];
        const agents = app.getData('agents') || [];

        // Filter payments for selected month
        const monthlyPayments = payments.filter(p => {
            const paymentDate = new Date(p.date).toISOString().slice(0, 7);
            return paymentDate === selectedMonth && p.status === 'completed';
        });

        const totalCollection = monthlyPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        // Breakdown by package
        const packageBreakdown = {};
        monthlyPayments.forEach(payment => {
            const customer = customers.find(c => c.id === payment.customerId);
            if (customer) {
                const pkg = packages.find(p => p.id === customer.packageId);
                if (pkg) {
                    packageBreakdown[pkg.name] = (packageBreakdown[pkg.name] || 0) + parseFloat(payment.amount);
                }
            }
        });

        // Breakdown by agent
        const agentBreakdown = {};
        monthlyPayments.forEach(payment => {
            if (payment.agentId) {
                const agent = agents.find(a => a.id === payment.agentId);
                if (agent) {
                    agentBreakdown[agent.name] = (agentBreakdown[agent.name] || 0) + parseFloat(payment.amount);
                }
            }
        });

        const reportData = document.getElementById('monthlyReportData');
        reportData.innerHTML = `
            <div class="stats-grid" style="margin-bottom: 2rem;">
                <div class="stat-card">
                    <h3>Total Collection</h3>
                    <p>₹${totalCollection.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h3>Total Payments</h3>
                    <p>${monthlyPayments.length}</p>
                </div>
            </div>

            <div style="margin-bottom: 2rem;">
                <h3>Breakdown by Package</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Package</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(packageBreakdown).map(([pkg, amount]) => `
                                <tr>
                                    <td>${pkg}</td>
                                    <td>₹${parseFloat(amount).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style="margin-bottom: 2rem;">
                <h3>Breakdown by Collection Agent</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Agent</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(agentBreakdown).map(([agent, amount]) => `
                                <tr>
                                    <td>${agent}</td>
                                    <td>₹${parseFloat(amount).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h3>All Payments</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Package</th>
                                <th>Subscription</th>
                                <th>Agent</th>
                                <th>Amount</th>
                                ${window.authManager && window.authManager.isAdmin() ? '<th>Actions</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${monthlyPayments.map(payment => {
                                const customer = customers.find(c => c.id === payment.customerId);
                                const pkg = customer ? packages.find(p => p.id === customer.packageId) : null;
                                const agent = payment.agentId ? agents.find(a => a.id === payment.agentId) : null;
                                const subscriptionInfo = payment.subscriptionMonthName && payment.subscriptionYear
                                    ? `${payment.subscriptionMonthName} ${payment.subscriptionYear}`
                                    : '-';
                                const isAdmin = window.authManager && window.authManager.isAdmin();
                                const actions = isAdmin ? `
                                    <td>
                                        <button class="btn btn-sm btn-primary" onclick="reportManager.editPayment('${payment.id}')" title="Edit Payment">Edit</button>
                                        <button class="btn btn-sm btn-danger" onclick="reportManager.deletePayment('${payment.id}')" title="Delete Payment">Delete</button>
                                    </td>
                                ` : '';
                                return `
                                    <tr>
                                        <td>${new Date(payment.collectionDate || payment.date).toLocaleDateString()}</td>
                                        <td>${customer ? customer.name : '-'}</td>
                                        <td>${pkg ? pkg.name : '-'}</td>
                                        <td>${subscriptionInfo}</td>
                                        <td>${agent ? agent.name : '-'}</td>
                                        <td>₹${parseFloat(payment.amount).toFixed(2)}</td>
                                        ${actions}
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    generateDailyReport() {
        const reportContent = document.getElementById('reportContent');
        const today = new Date().toISOString().split('T')[0];
        
        reportContent.innerHTML = `
            <div class="report-content">
                <div class="report-header">
                    <h2>Daily Collection Agent Report</h2>
                    <div class="report-filters">
                        <label>Select Date:</label>
                        <input type="date" id="dateSelector" value="${today}">
                        <button class="btn btn-primary" onclick="reportManager.generateDailyReport()">Generate</button>
                        <button class="btn btn-secondary" onclick="window.print()">Print</button>
                    </div>
                </div>
                <div id="dailyReportData"></div>
            </div>
        `;

        const dateSelector = document.getElementById('dateSelector');
        dateSelector.addEventListener('change', () => this.loadDailyReportData());
        this.loadDailyReportData();
    }

    loadDailyReportData() {
        const dateSelector = document.getElementById('dateSelector');
        const selectedDate = dateSelector ? dateSelector.value : new Date().toISOString().split('T')[0];
        
        const agents = app.getData('agents') || [];
        const customers = app.getData('customers') || [];
        const payments = app.getData('payments') || [];

        // Get payments for selected date
        const dailyPayments = payments.filter(p => {
            const paymentDate = new Date(p.date).toISOString().split('T')[0];
            return paymentDate === selectedDate && p.status === 'completed';
        });

        // Group by agent
        const agentData = {};
        agents.forEach(agent => {
            const agentPayments = dailyPayments.filter(p => p.agentId === agent.id);
            const total = agentPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            
            if (agentPayments.length > 0 || authManager.isAdmin()) {
                agentData[agent.id] = {
                    agent: agent,
                    payments: agentPayments,
                    total: total
                };
            }
        });

        const reportData = document.getElementById('dailyReportData');
        reportData.innerHTML = `
            <div class="stats-grid" style="margin-bottom: 2rem;">
                <div class="stat-card">
                    <h3>Total Collection</h3>
                    <p>₹${dailyPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h3>Total Payments</h3>
                    <p>${dailyPayments.length}</p>
                </div>
            </div>

            ${Object.values(agentData).map(data => `
                <div style="margin-bottom: 2rem;">
                    <h3>${data.agent.name} (${data.agent.agentId})</h3>
                    <p><strong>Total Collected:</strong> ₹${data.total.toFixed(2)} | <strong>Payments:</strong> ${data.payments.length}</p>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Box Number</th>
                                    <th>Subscription</th>
                                    <th>Amount</th>
                                    <th>Time</th>
                                    ${window.authManager && window.authManager.isAdmin() ? '<th>Actions</th>' : ''}
                                </tr>
                            </thead>
                            <tbody>
                                ${data.payments.map(payment => {
                                    const customer = customers.find(c => c.id === payment.customerId);
                                    const subscriptionInfo = payment.subscriptionMonthName && payment.subscriptionYear
                                        ? `${payment.subscriptionMonthName} ${payment.subscriptionYear}`
                                        : '-';
                                    const isAdmin = window.authManager && window.authManager.isAdmin();
                                    const actions = isAdmin ? `
                                        <td>
                                            <button class="btn btn-sm btn-primary" onclick="reportManager.editPayment('${payment.id}')" title="Edit Payment">Edit</button>
                                            <button class="btn btn-sm btn-danger" onclick="reportManager.deletePayment('${payment.id}')" title="Delete Payment">Delete</button>
                                        </td>
                                    ` : '';
                                    return `
                                        <tr>
                                            <td>${customer ? customer.name : '-'}</td>
                                            <td>${customer ? customer.boxNumber : '-'}</td>
                                            <td>${subscriptionInfo}</td>
                                            <td>₹${parseFloat(payment.amount).toFixed(2)}</td>
                                            <td>${new Date(payment.collectionDate || payment.date).toLocaleTimeString()}</td>
                                            ${actions}
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).join('')}
        `;
    }

    generateTotalCustomersReport() {
        const reportContent = document.getElementById('reportContent');
        const customers = app.getData('customers') || [];
        const packages = app.getData('packages') || [];
        const agents = app.getData('agents') || [];

        const total = customers.length;
        const paid = customers.filter(c => c.paymentStatus === 'paid').length;
        const unpaid = customers.filter(c => c.paymentStatus === 'unpaid').length;

        // Breakdown by package
        const packageCount = {};
        customers.forEach(customer => {
            const pkg = packages.find(p => p.id === customer.packageId);
            if (pkg) {
                packageCount[pkg.name] = (packageCount[pkg.name] || 0) + 1;
            }
        });

        // Breakdown by agent
        const agentCount = {};
        customers.forEach(customer => {
            const agent = agents.find(a => a.id === customer.agentId);
            if (agent) {
                agentCount[agent.name] = (agentCount[agent.name] || 0) + 1;
            }
        });

        reportContent.innerHTML = `
            <div class="report-content">
                <div class="report-header">
                    <h2>Total Customers Report</h2>
                    <button class="btn btn-secondary" onclick="window.print()">Print</button>
                </div>
                <div class="stats-grid" style="margin-bottom: 2rem;">
                    <div class="stat-card">
                        <h3>Total Customers</h3>
                        <p>${total}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Paid Customers</h3>
                        <p style="color: var(--success-color);">${paid}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Unpaid Customers</h3>
                        <p style="color: var(--danger-color);">${unpaid}</p>
                    </div>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h3>Breakdown by Package</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Package</th>
                                    <th>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(packageCount).map(([pkg, count]) => `
                                    <tr>
                                        <td>${pkg}</td>
                                        <td>${count}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h3>Breakdown by Collection Agent</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Agent</th>
                                    <th>Customer Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(agentCount).map(([agent, count]) => `
                                    <tr>
                                        <td>${agent}</td>
                                        <td>${count}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    generateUnpaidCustomersReport() {
        const reportContent = document.getElementById('reportContent');
        let customers = app.getData('customers') || [];
        const packages = app.getData('packages') || [];
        const agents = app.getData('agents') || [];

        // Filter unpaid customers
        customers = customers.filter(c => c.paymentStatus === 'unpaid');

        // Apply role-based filtering
        if (authManager.isAgent()) {
            const agentId = authManager.getCurrentAgentId();
            customers = customers.filter(c => c.agentId === agentId);
        }

        // Calculate days overdue (assuming monthly payment)
        const today = new Date();
        customers.forEach(customer => {
            if (customer.lastPaymentDate) {
                const lastPayment = new Date(customer.lastPaymentDate);
                const daysDiff = Math.floor((today - lastPayment) / (1000 * 60 * 60 * 24));
                customer.daysOverdue = daysDiff;
            } else {
                customer.daysOverdue = null;
            }
        });

        const totalDue = customers.reduce((sum, c) => {
            const pkg = packages.find(p => p.id === c.packageId);
            return sum + (pkg ? parseFloat(pkg.price) : 0);
        }, 0);

        reportContent.innerHTML = `
            <div class="report-content">
                <div class="report-header">
                    <h2>Unpaid Customers Report</h2>
                    <button class="btn btn-secondary" onclick="window.print()">Print</button>
                </div>
                <div class="stats-grid" style="margin-bottom: 2rem;">
                    <div class="stat-card">
                        <h3>Total Unpaid Customers</h3>
                        <p style="color: var(--danger-color);">${customers.length}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Total Amount Due</h3>
                        <p style="color: var(--danger-color);">₹${totalDue.toFixed(2)}</p>
                    </div>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Box Number</th>
                                <th>Package</th>
                                <th>Amount Due</th>
                                <th>Agent</th>
                                <th>Days Overdue</th>
                                <th>Last Payment</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customers.map(customer => {
                                const pkg = packages.find(p => p.id === customer.packageId);
                                const agent = agents.find(a => a.id === customer.agentId);
                                const daysOverdue = customer.daysOverdue !== null ? customer.daysOverdue : 'N/A';
                                const lastPayment = customer.lastPaymentDate 
                                    ? new Date(customer.lastPaymentDate).toLocaleDateString() 
                                    : 'Never';
                                
                                return `
                                    <tr>
                                        <td><strong>${customer.name}</strong></td>
                                        <td>${customer.phone}</td>
                                        <td>${customer.boxNumber}</td>
                                        <td>${pkg ? pkg.name : '-'}</td>
                                        <td>₹${pkg ? parseFloat(pkg.price).toFixed(2) : '0.00'}</td>
                                        <td>${agent ? agent.name : '-'}</td>
                                        <td>${daysOverdue}</td>
                                        <td>${lastPayment}</td>
                                        <td>
                                            <button class="btn btn-sm btn-success" onclick="paymentManager.initiatePayment('${customer.id}')">Pay Now</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    editPayment(paymentId) {
        // Check if user is admin
        if (!window.authManager || !window.authManager.isAdmin()) {
            alert('Only administrators can edit payments.');
            return;
        }

        const payments = app.getData('payments') || [];
        const payment = payments.find(p => p.id === paymentId);
        
        if (!payment) {
            alert('Payment not found.');
            return;
        }

        const customers = app.getData('customers') || [];
        const customer = customers.find(c => c.id === payment.customerId);
        const agents = app.getData('agents') || [];

        // Populate form
        document.getElementById('editPaymentId').value = payment.id;
        document.getElementById('editPaymentCustomer').value = customer ? customer.name : 'Unknown';
        document.getElementById('editPaymentSubscriptionMonth').value = payment.subscriptionMonth || new Date().getMonth() + 1;
        document.getElementById('editPaymentSubscriptionYear').value = payment.subscriptionYear || new Date().getFullYear();
        document.getElementById('editPaymentCollectionDate').value = payment.collectionDate || payment.date.split('T')[0];
        document.getElementById('editPaymentAmount').value = payment.amount;

        // Populate agent dropdown
        const agentSelect = document.getElementById('editPaymentAgent');
        agentSelect.innerHTML = '<option value="">Select Agent</option>';
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = agent.name;
            option.selected = payment.agentId === agent.id;
            agentSelect.appendChild(option);
        });

        // Show modal
        document.getElementById('editPaymentModal').classList.add('active');
    }

    savePaymentEdit() {
        // Check if user is admin
        if (!window.authManager || !window.authManager.isAdmin()) {
            alert('Only administrators can edit payments.');
            return;
        }

        const paymentId = document.getElementById('editPaymentId').value;
        const subscriptionMonth = parseInt(document.getElementById('editPaymentSubscriptionMonth').value);
        const subscriptionYear = parseInt(document.getElementById('editPaymentSubscriptionYear').value);
        const collectionDate = document.getElementById('editPaymentCollectionDate').value;
        const amount = parseFloat(document.getElementById('editPaymentAmount').value);
        const agentId = document.getElementById('editPaymentAgent').value;

        if (!paymentId || !subscriptionMonth || !subscriptionYear || !collectionDate || !amount || !agentId) {
            alert('Please fill in all fields.');
            return;
        }

        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = months[subscriptionMonth - 1];

        const payments = app.getData('payments') || [];
        const paymentIndex = payments.findIndex(p => p.id === paymentId);

        if (paymentIndex === -1) {
            alert('Payment not found.');
            return;
        }

        // Update payment
        payments[paymentIndex].subscriptionMonth = subscriptionMonth;
        payments[paymentIndex].subscriptionYear = subscriptionYear;
        payments[paymentIndex].subscriptionMonthName = monthName;
        payments[paymentIndex].collectionDate = collectionDate;
        payments[paymentIndex].date = collectionDate; // Update main date field
        payments[paymentIndex].amount = amount;
        payments[paymentIndex].agentId = agentId;

        app.saveData('payments', payments);

        alert('Payment updated successfully!');
        closeModal('editPaymentModal');
        
        // Refresh the current report
        if (document.getElementById('monthlyReportData')) {
            this.loadMonthlyReportData();
        }
        if (document.getElementById('dailyReportData')) {
            this.loadDailyReportData();
        }
    }

    deletePayment(paymentId) {
        // Check if user is admin
        if (!window.authManager || !window.authManager.isAdmin()) {
            alert('Only administrators can delete payments.');
            return;
        }

        if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
            return;
        }

        const payments = app.getData('payments') || [];
        const payment = payments.find(p => p.id === paymentId);

        if (!payment) {
            alert('Payment not found.');
            return;
        }

        // Remove payment
        const updatedPayments = payments.filter(p => p.id !== paymentId);
        app.saveData('payments', updatedPayments);

        alert('Payment deleted successfully!');
        
        // Refresh the current report
        if (document.getElementById('monthlyReportData')) {
            this.loadMonthlyReportData();
        }
        if (document.getElementById('dailyReportData')) {
            this.loadDailyReportData();
        }
    }
}

// Initialize report manager
let reportManager;
document.addEventListener('DOMContentLoaded', () => {
    reportManager = new ReportManager();
    window.ReportManager = reportManager;
});
