// Agent Collection Reports
class AgentReportManager {
    constructor() {
        this.agentId = null;
        this.setupEventListeners();
    }

    init() {
        if (window.authManager && window.authManager.isAgent()) {
            this.agentId = window.authManager.getCurrentAgentId();
        }
    }

    setupEventListeners() {
        const dailyBtn = document.getElementById('agentDailyReportBtn');
        const monthlyBtn = document.getElementById('agentMonthlyReportBtn');
        const historyBtn = document.getElementById('agentPaymentHistoryBtn');
        const customerBtn = document.getElementById('agentCustomerReportBtn');
        
        if (dailyBtn) {
            dailyBtn.addEventListener('click', () => this.showDailyReport());
        }
        if (monthlyBtn) {
            monthlyBtn.addEventListener('click', () => this.showMonthlyReport());
        }
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.showPaymentHistory());
        }
        if (customerBtn) {
            customerBtn.addEventListener('click', () => this.showCustomerStatusReport());
        }
    }

    showDailyReport() {
        const reportContent = document.getElementById('agentReportContent');
        if (!reportContent || !this.agentId) return;

        const today = new Date().toISOString().split('T')[0];
        const payments = app.getData('payments') || [];
        const customers = app.getData('customers') || [];
        const packages = app.getData('packages') || [];

        // Filter today's payments by this agent
        const dailyPayments = payments.filter(p => {
            const paymentDate = new Date(p.date).toISOString().split('T')[0];
            return paymentDate === today && 
                   p.agentId === this.agentId && 
                   p.status === 'completed';
        });

        const totalAmount = dailyPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        let paymentsTable = '';
        if (dailyPayments.length > 0) {
            paymentsTable = `
                <table class="data-table" style="width: 100%; margin-top: 15px;">
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Box Number</th>
                            <th>ID Number</th>
                            <th>Subscription</th>
                            <th>Amount</th>
                            <th>Collection By</th>
                            <th>Collection Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dailyPayments.map(payment => {
                            const customer = customers.find(c => c.id === payment.customerId);
                            const subscriptionInfo = payment.subscriptionMonthName && payment.subscriptionYear
                                ? `${payment.subscriptionMonthName} ${payment.subscriptionYear}`
                                : '-';
                            const collectionTime = new Date(payment.collectionDate || payment.date).toLocaleString();
                            const agents = app.getData('agents') || [];
                            const collectingAgent = payment.agentId ? agents.find(a => a.id === payment.agentId) : null;
                            const agentName = collectingAgent ? collectingAgent.name : 'Unknown Agent';
                            return `
                                <tr>
                                    <td>${customer ? customer.name : 'Unknown'}</td>
                                    <td>${customer ? customer.boxNumber || '-' : '-'}</td>
                                    <td>${customer ? customer.idNumber || '-' : '-'}</td>
                                    <td>${subscriptionInfo}</td>
                                    <td>₹${parseFloat(payment.amount).toFixed(2)}</td>
                                    <td><strong>${agentName}</strong></td>
                                    <td>${collectionTime}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }

        reportContent.innerHTML = `
            <div style="background-color: var(--card-bg); padding: 20px; border-radius: 6px;">
                <h3 style="margin-bottom: 15px;">Today's Collections - ${new Date().toLocaleDateString()}</h3>
                <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                    <div style="padding: 15px; background-color: var(--bg-color); border-radius: 6px; flex: 1;">
                        <strong style="color: var(--text-secondary);">Total Collections</strong>
                        <p style="font-size: 1.5rem; margin: 5px 0 0 0; color: var(--primary-color);">₹${totalAmount.toFixed(2)}</p>
                    </div>
                    <div style="padding: 15px; background-color: var(--bg-color); border-radius: 6px; flex: 1;">
                        <strong style="color: var(--text-secondary);">Total Payments</strong>
                        <p style="font-size: 1.5rem; margin: 5px 0 0 0; color: var(--primary-color);">${dailyPayments.length}</p>
                    </div>
                </div>
                ${paymentsTable || '<p style="color: var(--text-secondary);">No collections made today.</p>'}
            </div>
        `;
    }

    showMonthlyReport() {
        const reportContent = document.getElementById('agentReportContent');
        if (!reportContent || !this.agentId) return;

        const currentMonth = new Date().toISOString().slice(0, 7);
        const payments = app.getData('payments') || [];
        const customers = app.getData('customers') || [];
        const packages = app.getData('packages') || [];

        // Filter monthly payments collected by this agent (all customers)
        const monthlyPayments = payments.filter(p => {
            const paymentDate = new Date(p.date).toISOString().slice(0, 7);
            return paymentDate === currentMonth && 
                   p.agentId === this.agentId && 
                   p.status === 'completed';
        });

        const totalAmount = monthlyPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const agents = app.getData('agents') || [];

        let paymentsTable = '';
        if (monthlyPayments.length > 0) {
            paymentsTable = `
                <table class="data-table" style="width: 100%; margin-top: 15px;">
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Box Number</th>
                            <th>ID Number</th>
                            <th>Subscription</th>
                            <th>Amount</th>
                            <th>Collection By</th>
                            <th>Collection Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${monthlyPayments.map(payment => {
                            const customer = customers.find(c => c.id === payment.customerId);
                            const subscriptionInfo = payment.subscriptionMonthName && payment.subscriptionYear
                                ? `${payment.subscriptionMonthName} ${payment.subscriptionYear}`
                                : '-';
                            const collectionTime = new Date(payment.collectionDate || payment.date).toLocaleString();
                            const collectingAgent = payment.agentId ? agents.find(a => a.id === payment.agentId) : null;
                            const agentName = collectingAgent ? collectingAgent.name : 'Unknown Agent';
                            return `
                                <tr>
                                    <td>${customer ? customer.name : 'Unknown'}</td>
                                    <td>${customer ? customer.boxNumber || '-' : '-'}</td>
                                    <td>${customer ? customer.idNumber || '-' : '-'}</td>
                                    <td>${subscriptionInfo}</td>
                                    <td>₹${parseFloat(payment.amount).toFixed(2)}</td>
                                    <td><strong>${agentName}</strong></td>
                                    <td>${collectionTime}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }

        reportContent.innerHTML = `
            <div style="background-color: var(--card-bg); padding: 20px; border-radius: 6px;">
                <h3 style="margin-bottom: 15px;">Monthly Collections - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                    <div style="padding: 15px; background-color: var(--bg-color); border-radius: 6px; flex: 1;">
                        <strong style="color: var(--text-secondary);">Total Collections</strong>
                        <p style="font-size: 1.5rem; margin: 5px 0 0 0; color: var(--primary-color);">₹${totalAmount.toFixed(2)}</p>
                    </div>
                    <div style="padding: 15px; background-color: var(--bg-color); border-radius: 6px; flex: 1;">
                        <strong style="color: var(--text-secondary);">Total Payments</strong>
                        <p style="font-size: 1.5rem; margin: 5px 0 0 0; color: var(--primary-color);">${monthlyPayments.length}</p>
                    </div>
                </div>
                ${paymentsTable || '<p style="color: var(--text-secondary);">No collections made this month.</p>'}
            </div>
        `;
    }

    showPaymentHistory() {
        const reportContent = document.getElementById('agentReportContent');
        if (!reportContent || !this.agentId) return;

        const payments = app.getData('payments') || [];
        const customers = app.getData('customers') || [];
        const packages = app.getData('packages') || [];

        // Filter payments collected by this agent (all customers), sorted by date (newest first)
        const agentPayments = payments
            .filter(p => p.agentId === this.agentId && p.status === 'completed')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50); // Show last 50 payments

        const totalAmount = agentPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        let paymentsTable = '';
        if (agentPayments.length > 0) {
            paymentsTable = `
                <table class="data-table" style="width: 100%; margin-top: 15px;">
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Box Number</th>
                            <th>ID Number</th>
                            <th>Subscription</th>
                            <th>Amount</th>
                            <th>Collection By</th>
                            <th>Collection Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${agentPayments.map(payment => {
                            const customer = customers.find(c => c.id === payment.customerId);
                            const subscriptionInfo = payment.subscriptionMonthName && payment.subscriptionYear
                                ? `${payment.subscriptionMonthName} ${payment.subscriptionYear}`
                                : '-';
                            const collectionTime = new Date(payment.collectionDate || payment.date).toLocaleString();
                            const agents = app.getData('agents') || [];
                            const collectingAgent = payment.agentId ? agents.find(a => a.id === payment.agentId) : null;
                            const agentName = collectingAgent ? collectingAgent.name : 'Unknown Agent';
                            return `
                                <tr>
                                    <td>${customer ? customer.name : 'Unknown'}</td>
                                    <td>${customer ? customer.boxNumber || '-' : '-'}</td>
                                    <td>${customer ? customer.idNumber || '-' : '-'}</td>
                                    <td>${subscriptionInfo}</td>
                                    <td>₹${parseFloat(payment.amount).toFixed(2)}</td>
                                    <td><strong>${agentName}</strong></td>
                                    <td>${collectionTime}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: var(--bg-color); font-weight: bold;">
                            <td colspan="6" style="text-align: right;">Total:</td>
                            <td>₹${totalAmount.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            `;
        }

        reportContent.innerHTML = `
            <div style="background-color: var(--card-bg); padding: 20px; border-radius: 6px;">
                <h3 style="margin-bottom: 15px;">Payment History (Last 50 Payments)</h3>
                <div style="margin-bottom: 20px; padding: 15px; background-color: var(--bg-color); border-radius: 6px;">
                    <strong style="color: var(--text-secondary);">Total Amount Collected:</strong>
                    <span style="font-size: 1.2rem; color: var(--primary-color); margin-left: 10px;">₹${totalAmount.toFixed(2)}</span>
                </div>
                ${paymentsTable || '<p style="color: var(--text-secondary);">No payment history available.</p>'}
            </div>
        `;
    }

    showCustomerStatusReport() {
        const reportContent = document.getElementById('agentReportContent');
        if (!reportContent || !this.agentId) return;

        const customers = app.getData('customers') || [];
        const packages = app.getData('packages') || [];
        const payments = app.getData('payments') || [];

        // Show all customers (assignment no longer restricts access)
        const agentCustomers = customers;

        // Get payment status for each customer
        const customerStatus = agentCustomers.map(customer => {
            const pkg = packages.find(p => p.id === customer.packageId);
            const customerPayments = payments.filter(p => 
                p.customerId === customer.id && 
                p.status === 'completed'
            );
            
            // Get latest payment
            const latestPayment = customerPayments.length > 0
                ? customerPayments.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                : null;

            return {
                customer,
                package: pkg,
                paymentStatus: customer.paymentStatus,
                latestPayment,
                totalPayments: customerPayments.length
            };
        });

        const paidCount = customerStatus.filter(c => c.paymentStatus === 'paid').length;
        const unpaidCount = customerStatus.filter(c => c.paymentStatus === 'unpaid').length;

        let statusTable = '';
        if (customerStatus.length > 0) {
            statusTable = `
                <table class="data-table" style="width: 100%; margin-top: 15px;">
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Box Number</th>
                            <th>Phone</th>
                            <th>Package</th>
                            <th>Status</th>
                            <th>Last Payment</th>
                            <th>Total Payments</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customerStatus.map(item => {
                            const statusBadge = item.paymentStatus === 'paid' 
                                ? '<span class="badge badge-success">Paid</span>'
                                : '<span class="badge badge-danger">Unpaid</span>';
                            const lastPaymentDate = item.latestPayment
                                ? new Date(item.latestPayment.collectionDate || item.latestPayment.date).toLocaleDateString()
                                : 'Never';
                            return `
                                <tr>
                                    <td>${item.customer.name || '-'}</td>
                                    <td>${item.customer.boxNumber || '-'}</td>
                                    <td>${item.customer.phone || '-'}</td>
                                    <td>${item.package ? item.package.name : '-'}</td>
                                    <td>${statusBadge}</td>
                                    <td>${lastPaymentDate}</td>
                                    <td>${item.totalPayments}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }

        reportContent.innerHTML = `
            <div style="background-color: var(--card-bg); padding: 20px; border-radius: 6px;">
                <h3 style="margin-bottom: 15px;">Customer Status Report</h3>
                <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                    <div style="padding: 15px; background-color: var(--bg-color); border-radius: 6px; flex: 1;">
                        <strong style="color: var(--text-secondary);">All Customers</strong>
                        <p style="font-size: 1.5rem; margin: 5px 0 0 0; color: var(--primary-color);">${agentCustomers.length}</p>
                    </div>
                    <div style="padding: 15px; background-color: #d4edda; border-radius: 6px; flex: 1;">
                        <strong style="color: #155724;">Paid Customers</strong>
                        <p style="font-size: 1.5rem; margin: 5px 0 0 0; color: #155724;">${paidCount}</p>
                    </div>
                    <div style="padding: 15px; background-color: #f8d7da; border-radius: 6px; flex: 1;">
                        <strong style="color: #721c24;">Unpaid Customers</strong>
                        <p style="font-size: 1.5rem; margin: 5px 0 0 0; color: #721c24;">${unpaidCount}</p>
                    </div>
                </div>
                ${statusTable || '<p style="color: var(--text-secondary);">No customers assigned.</p>'}
            </div>
        `;
    }
}

// Initialize agent report manager
let agentReportManager;
document.addEventListener('DOMContentLoaded', () => {
    agentReportManager = new AgentReportManager();
    window.AgentReportManager = agentReportManager;
});
