// Payment Reminder Manager
class ReminderManager {
    constructor() {
        this.setupEventListeners();
        this.checkAutoReminders();
    }

    setupEventListeners() {
        // Bulk SMS reminder button
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'sendBulkSMSBtn') {
                e.preventDefault();
                this.sendBulkReminders('sms');
            }
            if (e.target && e.target.id === 'sendBulkWhatsAppBtn') {
                e.preventDefault();
                this.sendBulkReminders('whatsapp');
            }
            if (e.target && e.target.classList.contains('sendSMSBtn')) {
                e.preventDefault();
                const customerId = e.target.dataset.customerId;
                this.sendReminder(customerId, 'sms');
            }
            if (e.target && e.target.classList.contains('sendWhatsAppBtn')) {
                e.preventDefault();
                const customerId = e.target.dataset.customerId;
                this.sendReminder(customerId, 'whatsapp');
            }
            if (e.target && e.target.id === 'searchCustomerReminderBtn') {
                e.preventDefault();
                this.searchAndSendReminder();
            }
            if (e.target && e.target.classList.contains('viewDateRemindersBtn')) {
                e.preventDefault();
                const date = e.target.dataset.date;
                this.viewDateReminders(date);
            }
            if (e.target && e.target.id === 'backToHistoryBtn') {
                e.preventDefault();
                this.loadReminderHistory();
            }
        });
        
        // Enter key in search input
        document.addEventListener('keypress', (e) => {
            if (e.target && e.target.id === 'searchCustomerReminderInput' && e.key === 'Enter') {
                e.preventDefault();
                this.searchAndSendReminder();
            }
        });
    }

    init() {
        // Only load if reminders page is active
        if (window.app && window.app.currentRoute === 'reminders') {
            this.loadRemindersPage();
        }
    }

    async getUnpaidCustomersForCurrentMonth() {
        try {
            const unpaidCustomers = await api.getUnpaidCustomers();
            return unpaidCustomers.map(customer => ({
                id: customer.id || customer._id,
                name: customer.name,
                boxNumber: customer.boxNumber,
                phone: customer.phone,
                amount: customer.amount || 0
            }));
        } catch (error) {
            console.error('Error getting unpaid customers:', error);
            return [];
        }
    }

    generateMessage(customer, amount, monthYear) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const currentMonth = months[new Date().getMonth()];
        const currentYear = new Date().getFullYear();
        const monthYearText = monthYear || `${currentMonth} ${currentYear}`;
        
        // Get UPI ID from settings
        const upiId = localStorage.getItem('upiId') || '';
        
        // Generate UPI payment link
        let upiLink = '';
        if (upiId) {
            const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Cable Subscription - ${customer.name || 'Customer'} - Box: ${customer.boxNumber || 'N/A'}`)}`;
            upiLink = `\n\nPayment Link: ${upiString}`;
        }
        
        const customerName = customer.name || 'Customer';
        const boxNumber = customer.boxNumber || 'N/A';
        
        return `Dear ${customerName},

This is a reminder to pay your cable subscription.

Customer Details:
Name: ${customerName}
Box Number: ${boxNumber}
Subscription Month: ${monthYearText}
Amount: ₹${amount.toFixed(2)}

Please make the payment at your earliest convenience.${upiLink}

Thank you!`;
    }

    generateSMSLink(phone, message) {
        // Remove any non-digit characters except +
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        // Ensure phone starts with country code (add +91 for India if not present)
        let formattedPhone = cleanPhone;
        if (!formattedPhone.startsWith('+')) {
            if (formattedPhone.startsWith('91') && formattedPhone.length > 10) {
                formattedPhone = '+' + formattedPhone;
            } else if (formattedPhone.length === 10) {
                formattedPhone = '+91' + formattedPhone;
            } else {
                formattedPhone = '+91' + formattedPhone.replace(/^91/, '');
            }
        }
        return `sms:${formattedPhone}?body=${encodeURIComponent(message)}`;
    }

    generateWhatsAppLink(phone, message) {
        // Remove any non-digit characters except +
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        // Ensure phone starts with country code (add 91 for India if not present)
        let formattedPhone = cleanPhone;
        if (!formattedPhone.startsWith('+')) {
            if (formattedPhone.startsWith('91') && formattedPhone.length > 10) {
                formattedPhone = formattedPhone;
            } else if (formattedPhone.length === 10) {
                formattedPhone = '91' + formattedPhone;
            } else {
                formattedPhone = '91' + formattedPhone.replace(/^91/, '');
            }
        } else {
            formattedPhone = formattedPhone.replace('+', '');
        }
        return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    }

    async sendReminder(customerId, method) {
        try {
            const customer = await api.getCustomer(customerId);
            
            if (!customer) {
                alert('Customer not found');
                return;
            }
            
            if (!customer.phone) {
                alert('Customer does not have a phone number');
                return;
            }
            
            const packages = await api.getPackages();
            const customerPackageId = customer.packageId?._id || customer.packageId;
            const pkg = packages.find(p => (p._id || p.id) === customerPackageId);
            const amount = pkg ? pkg.price : 0;
            
            const currentYear = new Date().getFullYear();
            const currentMonthNum = new Date().getMonth() + 1;
            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthYear = `${months[currentMonthNum - 1]} ${currentYear}`;
            
            const message = this.generateMessage(customer, amount, monthYear);
            
            let link;
            if (method === 'sms') {
                link = this.generateSMSLink(customer.phone, message);
            } else if (method === 'whatsapp') {
                link = this.generateWhatsAppLink(customer.phone, message);
            } else {
                alert('Invalid reminder method');
                return;
            }
            
            // Open the link
            window.open(link, '_blank');
            
            // Save reminder to history via API
            await this.saveReminder(customerId, customer.name, customer.phone, method, monthYear, customer.boxNumber);
            
            // Show confirmation
            const methodName = method === 'sms' ? 'SMS' : 'WhatsApp';
            alert(`${methodName} reminder sent to ${customer.name}`);
        } catch (error) {
            console.error('Error sending reminder:', error);
            alert('Error sending reminder: ' + (error.message || 'Unknown error'));
        }
    }

    async sendBulkReminders(method) {
        const unpaidCustomers = await this.getUnpaidCustomersForCurrentMonth();
        
        if (unpaidCustomers.length === 0) {
            alert('No unpaid customers found for the current month');
            return;
        }
        
        if (!confirm(`Send ${method.toUpperCase()} reminders to ${unpaidCustomers.length} unpaid customers?`)) {
            return;
        }
        
        let sentCount = 0;
        let failedCount = 0;
        
        for (let index = 0; index < unpaidCustomers.length; index++) {
            const customer = unpaidCustomers[index];
            await new Promise(resolve => setTimeout(resolve, index * 500));
            
            try {
                const message = this.generateMessage(customer, customer.amount);
                let link;
                
                if (method === 'sms') {
                    link = this.generateSMSLink(customer.phone, message);
                } else {
                    link = this.generateWhatsAppLink(customer.phone, message);
                }
                
                // Open link in new window
                window.open(link, '_blank');
                
                // Save reminder via API
                await this.saveReminder(customer.id, customer.name, customer.phone, method, null, customer.boxNumber);
                sentCount++;
                
                // If last customer, show summary
                if (index === unpaidCustomers.length - 1) {
                    setTimeout(() => {
                        alert(`Reminders sent!\n\nSuccessfully sent: ${sentCount}\nFailed: ${failedCount}`);
                        this.loadUnpaidCustomers();
                    }, 500);
                }
            } catch (error) {
                console.error(`Error sending reminder to ${customer.name}:`, error);
                failedCount++;
            }
        }
    }

    async saveReminder(customerId, customerName, phone, method, monthYear = null, boxNumber = null) {
        try {
            const currentYear = new Date().getFullYear();
            const currentMonthNum = new Date().getMonth() + 1;
            
            const reminderData = {
                customerId: customerId,
                customerName: customerName,
                phone: phone,
                boxNumber: boxNumber,
                method: method,
                status: 'sent',
                subscriptionMonth: currentMonthNum,
                subscriptionYear: currentYear,
                monthYear: monthYear || `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
            };
            
            await api.createReminder(reminderData);
        } catch (error) {
            console.error('Error saving reminder:', error);
        }
    }

    loadRemindersPage() {
        const remindersContent = document.getElementById('remindersContent');
        if (!remindersContent) return;
        
        // Clear content first
        remindersContent.innerHTML = '';
        
        this.loadSearchSection();
        this.loadUnpaidCustomers();
        this.loadReminderHistory();
    }

    loadSearchSection() {
        const remindersContent = document.getElementById('remindersContent');
        if (!remindersContent) return;
        
        const searchSection = `
            <div class="card" style="padding: 20px; margin-bottom: 30px;">
                <h2>Search Customer & Send Reminder</h2>
                <p style="color: var(--text-secondary); margin-bottom: 15px;">
                    Search for any customer by Phone Number, ID Number, or Box Number to send payment reminder
                </p>
                <div style="display: flex; gap: 10px; align-items: flex-end;">
                    <div style="flex: 1;">
                        <label for="searchCustomerReminderInput">Search Customer:</label>
                        <input 
                            type="text" 
                            id="searchCustomerReminderInput" 
                            placeholder="Enter Phone Number, ID Number, or Box Number"
                            class="form-control"
                            style="width: 100%; padding: 10px; margin-top: 5px;"
                        />
                    </div>
                    <button id="searchCustomerReminderBtn" class="btn btn-primary" style="height: fit-content;">Search</button>
                </div>
                <div id="searchedCustomerReminder" style="display: none; margin-top: 20px;"></div>
            </div>
        `;
        
        // Insert at the beginning
        const existingContent = remindersContent.innerHTML;
        remindersContent.innerHTML = searchSection + existingContent;
    }

    async searchAndSendReminder() {
        try {
            const searchInput = document.getElementById('searchCustomerReminderInput');
            if (!searchInput) return;
            
            const searchValue = searchInput.value.trim();
            if (!searchValue) {
                alert('Please enter Phone Number, ID Number, or Box Number');
                return;
            }
            
            const customers = window.app ? window.app.getData('customers') : [];
            const packages = window.app ? window.app.getData('packages') : [];
            
            // Search for customer
            let customer = customers.find(c => 
                (c.phone && c.phone.toString().trim() === searchValue) ||
                (c.idNumber && c.idNumber.toString().trim() === searchValue) ||
                (c.boxNumber && c.boxNumber.toString().trim() === searchValue) ||
                (c.id && c.id.toString().trim() === searchValue)
            );
            
            // If not found, try case-insensitive search
            if (!customer) {
                const searchLower = searchValue.toLowerCase();
                customer = customers.find(c => 
                    (c.phone && c.phone.toString().toLowerCase() === searchLower) ||
                    (c.idNumber && c.idNumber.toString().toLowerCase() === searchLower) ||
                    (c.boxNumber && c.boxNumber.toString().toLowerCase() === searchLower) ||
                    (c.id && c.id.toString().toLowerCase() === searchLower)
                );
            }
            
            // If still not found, try partial match for phone
            if (!customer) {
                const normalizedSearch = searchValue.replace(/[\s\-]/g, '');
                customer = customers.find(c => {
                    const normalizedPhone = c.phone ? c.phone.toString().replace(/[\s\-]/g, '') : '';
                    return normalizedPhone.includes(normalizedSearch) || normalizedSearch.includes(normalizedPhone);
                });
            }
            
            const searchedCustomerDiv = document.getElementById('searchedCustomerReminder');
            if (!searchedCustomerDiv) return;
            
            if (!customer) {
                searchedCustomerDiv.innerHTML = `
                    <div style="padding: 15px; background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px; color: #721c24;">
                        Customer not found with: ${searchValue}
                    </div>
                `;
                searchedCustomerDiv.style.display = 'block';
                return;
            }
            
            if (!customer.phone) {
                searchedCustomerDiv.innerHTML = `
                    <div style="padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; color: #856404;">
                        Customer found but does not have a phone number. Cannot send reminder.
                    </div>
                `;
                searchedCustomerDiv.style.display = 'block';
                return;
            }
            
            const customerPackageId = customer.packageId?._id || customer.packageId;
            const pkg = packages.find(p => (p._id || p.id) === customerPackageId);
            const amount = pkg ? pkg.price : 0;
            const currentYear = new Date().getFullYear();
            const currentMonthNum = new Date().getMonth() + 1;
            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthYear = `${months[currentMonthNum - 1]} ${currentYear}`;
            const customerId = customer._id || customer.id;
            
            searchedCustomerDiv.innerHTML = `
                <div style="padding: 15px; background-color: var(--card-bg); border: 2px solid var(--primary-color); border-radius: 6px;">
                    <h3 style="margin-bottom: 15px;">Customer Found</h3>
                    <div style="margin-bottom: 15px;">
                        <p><strong>Name:</strong> ${customer.name || '-'}</p>
                        <p><strong>Box Number:</strong> ${customer.boxNumber || '-'}</p>
                        <p><strong>Phone:</strong> ${customer.phone || '-'}</p>
                        <p><strong>Subscription Month:</strong> ${monthYear}</p>
                        <p><strong>Amount:</strong> ₹${amount.toFixed(2)}</p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary sendSMSBtn" data-customer-id="${customerId}">📱 Send SMS</button>
                        <button class="btn btn-success sendWhatsAppBtn" data-customer-id="${customerId}">💬 Send WhatsApp</button>
                    </div>
                </div>
            `;
            searchedCustomerDiv.style.display = 'block';
            searchInput.value = '';
        } catch (error) {
            console.error('Error searching customer:', error);
            alert('Error searching customer: ' + (error.message || 'Unknown error'));
        }
    }

    async loadUnpaidCustomers() {
        const remindersContent = document.getElementById('remindersContent');
        if (!remindersContent) return;
        
        const unpaidCustomers = await this.getUnpaidCustomersForCurrentMonth();
        const totalAmount = unpaidCustomers.reduce((sum, c) => sum + (c.amount || 0), 0);
        
        let unpaidSection = '';
        if (unpaidCustomers.length === 0) {
            unpaidSection = `
                <div class="card" style="padding: 20px; margin-bottom: 30px;">
                    <h2>Unpaid Customers - Current Month</h2>
                    <p style="color: var(--text-secondary);">All customers have paid for the current month. No reminders needed.</p>
                </div>
            `;
        } else {
            let customersList = unpaidCustomers.map(customer => {
                return `
                    <tr>
                        <td>${customer.name || 'Unknown'}</td>
                        <td>${customer.boxNumber || '-'}</td>
                        <td>${customer.phone || '-'}</td>
                        <td>₹${(customer.amount || 0).toFixed(2)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary sendSMSBtn" data-customer-id="${customer.id}" title="Send SMS">
                                📱 SMS
                            </button>
                            <button class="btn btn-sm btn-success sendWhatsAppBtn" data-customer-id="${customer.id}" title="Send WhatsApp" style="margin-left: 5px;">
                                💬 WhatsApp
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            unpaidSection = `
                <div class="card" style="padding: 20px; margin-bottom: 30px;">
                    <h2>Unpaid Customers - Current Month</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 15px;">
                        Unpaid customers for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                        <button id="sendBulkSMSBtn" class="btn btn-primary">📱 Send SMS to All (${unpaidCustomers.length})</button>
                        <button id="sendBulkWhatsAppBtn" class="btn btn-success">💬 Send WhatsApp to All (${unpaidCustomers.length})</button>
                    </div>
                    
                    <div style="margin-bottom: 15px; padding: 10px; background-color: var(--bg-color); border-radius: 6px;">
                        <strong>Summary:</strong> ${unpaidCustomers.length} unpaid customer(s) | Total Amount: ₹${totalAmount.toFixed(2)}
                    </div>
                    
                    <div class="table-container" style="margin-top: 15px;">
                        <table class="data-table" style="width: 100%;">
                            <thead>
                                <tr>
                                    <th>Customer Name</th>
                                    <th>Box Number</th>
                                    <th>Phone</th>
                                    <th>Amount</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${customersList}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        // Update unpaid section while preserving search and history sections
        const existingContent = remindersContent.innerHTML;
        const searchSection = existingContent.includes('Search Customer & Send Reminder') 
            ? existingContent.split('Search Customer & Send Reminder')[0] + 'Search Customer & Send Reminder' + existingContent.split('Search Customer & Send Reminder')[1].split('Unpaid Customers')[0] + 'Unpaid Customers'
            : '';
        const historySection = existingContent.includes('Reminder History') 
            ? existingContent.split('Reminder History')[1] 
            : '';
        
        if (searchSection) {
            remindersContent.innerHTML = searchSection.replace('Unpaid Customers', unpaidSection) + (historySection ? '<div class="card" style="padding: 20px; margin-top: 30px;"><h2>Reminder History & Reports</h2>' + historySection : '');
        } else {
            remindersContent.innerHTML = unpaidSection + (historySection ? '<div class="card" style="padding: 20px; margin-top: 30px;"><h2>Reminder History & Reports</h2>' + historySection : '');
        }
    }

    async loadReminderHistory() {
        const remindersContent = document.getElementById('remindersContent');
        if (!remindersContent) return;
        
        try {
            // Get reminders from API
            const reminders = await api.getReminders();
            
            // Sort by date (newest first)
            const sortedReminders = reminders.sort((a, b) => new Date(b.date) - new Date(a.date));
        
            if (sortedReminders.length === 0) {
                // Only add history section if there are no reminders and it doesn't exist
                if (!remindersContent.innerHTML.includes('Reminder History')) {
                    remindersContent.innerHTML += `
                        <div class="card" style="padding: 20px;">
                            <h2>Reminder History & Reports</h2>
                            <p style="color: var(--text-secondary);">No reminders sent yet.</p>
                        </div>
                    `;
                }
                return;
            }
        
            // Group reminders by date
            const remindersByDate = {};
            sortedReminders.forEach(reminder => {
                const dateStr = new Date(reminder.date).toLocaleDateString();
                if (!remindersByDate[dateStr]) {
                    remindersByDate[dateStr] = [];
                }
                remindersByDate[dateStr].push(reminder);
            });
        
        // Generate report by date
        let reportByDate = Object.entries(remindersByDate)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .map(([date, dateReminders]) => {
                const smsCount = dateReminders.filter(r => r.method === 'sms').length;
                const whatsappCount = dateReminders.filter(r => r.method === 'whatsapp').length;
                return `
                    <tr>
                        <td><strong>${date}</strong></td>
                        <td>${dateReminders.length}</td>
                        <td>${smsCount}</td>
                        <td>${whatsappCount}</td>
                    </tr>
                `;
            }).join('');
        
        // Generate detailed list
        let historyList = sortedReminders.slice(0, 100).map(reminder => {
            const date = new Date(reminder.date).toLocaleString();
            const methodIcon = reminder.method === 'sms' ? '📱' : '💬';
            const methodName = reminder.method === 'sms' ? 'SMS' : 'WhatsApp';
            
            return `
                <tr>
                    <td>${reminder.customerName || 'Unknown'}</td>
                    <td>${reminder.phone || '-'}</td>
                    <td>${methodIcon} ${methodName}</td>
                    <td>${reminder.monthYear || '-'}</td>
                    <td>${date}</td>
                    <td><span class="badge badge-success">${reminder.status || 'sent'}</span></td>
                </tr>
            `;
        }).join('');
        
        // Check if history section already exists, if not add it
        if (!remindersContent.innerHTML.includes('Reminder History')) {
            remindersContent.innerHTML += `
                <div class="card" style="padding: 20px; margin-top: 30px;">
                    <h2>Reminder History & Reports</h2>
                    
                    <div id="reminderHistorySummary">
                        <h3 style="margin-bottom: 15px;">Reminders by Date (Click to View Details)</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
                            ${Object.entries(remindersByDate)
                                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                                .map(([date, dateReminders]) => {
                                    const smsCount = dateReminders.filter(r => r.method === 'sms').length;
                                    const whatsappCount = dateReminders.filter(r => r.method === 'whatsapp').length;
                                    return `
                                        <div class="card" style="padding: 15px; cursor: pointer; border: 2px solid var(--border-color); transition: all 0.3s;" 
                                             onclick="reminderManager.viewDateReminders('${date}')"
                                             onmouseover="this.style.borderColor='var(--primary-color)'; this.style.transform='scale(1.02)'"
                                             onmouseout="this.style.borderColor='var(--border-color)'; this.style.transform='scale(1)'">
                                            <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 10px;">${date}</div>
                                            <div style="color: var(--text-secondary);">
                                                <div>Total: <strong>${dateReminders.length}</strong></div>
                                                <div>📱 SMS: <strong>${smsCount}</strong></div>
                                                <div>💬 WhatsApp: <strong>${whatsappCount}</strong></div>
                                            </div>
                                            <div style="margin-top: 10px; font-size: 0.85rem; color: var(--primary-color);">
                                                Click to view details →
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                        </div>
                    </div>
                    
                    <div id="reminderHistoryDetails" style="display: none;">
                        <button id="backToHistoryBtn" class="btn btn-secondary" style="margin-bottom: 15px;">← Back to History</button>
                        <div id="reminderHistoryDetailsContent"></div>
                    </div>
                </div>
            `;
        } else {
            // Update existing history section
            const summaryDiv = document.getElementById('reminderHistorySummary');
            if (summaryDiv) {
                summaryDiv.innerHTML = `
                    <h3 style="margin-bottom: 15px;">Reminders by Date (Click to View Details)</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
                        ${Object.entries(remindersByDate)
                            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                            .map(([date, dateReminders]) => {
                                const smsCount = dateReminders.filter(r => r.method === 'sms').length;
                                const whatsappCount = dateReminders.filter(r => r.method === 'whatsapp').length;
                                return `
                                    <div class="card" style="padding: 15px; cursor: pointer; border: 2px solid var(--border-color); transition: all 0.3s;" 
                                         onclick="reminderManager.viewDateReminders('${date}')"
                                         onmouseover="this.style.borderColor='var(--primary-color)'; this.style.transform='scale(1.02)'"
                                         onmouseout="this.style.borderColor='var(--border-color)'; this.style.transform='scale(1)'">
                                        <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 10px;">${date}</div>
                                        <div style="color: var(--text-secondary);">
                                            <div>Total: <strong>${dateReminders.length}</strong></div>
                                            <div>📱 SMS: <strong>${smsCount}</strong></div>
                                            <div>💬 WhatsApp: <strong>${whatsappCount}</strong></div>
                                        </div>
                                        <div style="margin-top: 10px; font-size: 0.85rem; color: var(--primary-color);">
                                            Click to view details →
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                    </div>
                `;
            }
        }
        } catch (error) {
            console.error('Error loading reminder history:', error);
            const remindersContent = document.getElementById('remindersContent');
            if (remindersContent) {
                remindersContent.innerHTML += '<p style="color: var(--danger-color);">Error loading reminder history.</p>';
            }
        }
    }

    async viewDateReminders(date) {
        try {
            const reminders = await api.getReminders();
            const dateReminders = reminders.filter(r => {
                const reminderDate = new Date(r.date).toLocaleDateString();
                return reminderDate === date;
            }).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const summaryDiv = document.getElementById('reminderHistorySummary');
        const detailsDiv = document.getElementById('reminderHistoryDetails');
        const detailsContent = document.getElementById('reminderHistoryDetailsContent');
        
        if (!summaryDiv || !detailsDiv || !detailsContent) return;
        
        const smsCount = dateReminders.filter(r => r.method === 'sms').length;
        const whatsappCount = dateReminders.filter(r => r.method === 'whatsapp').length;
        
        let detailsList = dateReminders.map(reminder => {
            const dateTime = new Date(reminder.date).toLocaleString();
            const methodIcon = reminder.method === 'sms' ? '📱' : '💬';
            const methodName = reminder.method === 'sms' ? 'SMS' : 'WhatsApp';
            
            return `
                <tr>
                    <td>${reminder.customerName || 'Unknown'}</td>
                    <td>${reminder.boxNumber || '-'}</td>
                    <td>${reminder.phone || '-'}</td>
                    <td>${methodIcon} ${methodName}</td>
                    <td>${reminder.monthYear || '-'}</td>
                    <td>${dateTime}</td>
                    <td><span class="badge badge-success">${reminder.status || 'sent'}</span></td>
                </tr>
            `;
        }).join('');
        
        detailsContent.innerHTML = `
            <h3 style="margin-bottom: 15px;">Reminders Sent on ${date}</h3>
            <div style="margin-bottom: 20px; padding: 15px; background-color: var(--bg-color); border-radius: 6px;">
                <strong>Summary:</strong> Total: ${dateReminders.length} | 📱 SMS: ${smsCount} | 💬 WhatsApp: ${whatsappCount}
            </div>
            <div class="table-container">
                <table class="data-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Box Number</th>
                            <th>Phone</th>
                            <th>Method</th>
                            <th>Month/Year</th>
                            <th>Date & Time Sent</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${detailsList}
                    </tbody>
                </table>
            </div>
        `;
        
        summaryDiv.style.display = 'none';
        detailsDiv.style.display = 'block';
        } catch (error) {
            console.error('Error viewing date reminders:', error);
            alert('Error loading reminder details: ' + (error.message || 'Unknown error'));
        }
    }

    async checkAutoReminders() {
        // Check if it's the 1st of the month
        const today = new Date();
        const dayOfMonth = today.getDate();
        
        if (dayOfMonth === 1) {
            try {
                // Check if reminders were already sent today
                const reminders = await api.getReminders();
                const todayStr = today.toISOString().split('T')[0];
                const todayReminders = reminders.filter(r => {
                    const reminderDate = new Date(r.date).toISOString().split('T')[0];
                    return reminderDate === todayStr;
                });
                
                if (todayReminders.length === 0) {
                    // Show notification that reminders can be sent
                    const unpaidCustomers = await this.getUnpaidCustomersForCurrentMonth();
                    const unpaidCount = unpaidCustomers.length;
                    if (unpaidCount > 0 && window.authManager && window.authManager.isAdmin()) {
                        console.log(`Auto-reminder: ${unpaidCount} unpaid customers found for today. Use the reminder section to send reminders.`);
                    }
                }
            } catch (error) {
                console.error('Error checking auto reminders:', error);
            }
        }
    }
}

// Initialize reminder manager
let reminderManager;
document.addEventListener('DOMContentLoaded', () => {
    reminderManager = new ReminderManager();
    window.ReminderManager = reminderManager;
});
