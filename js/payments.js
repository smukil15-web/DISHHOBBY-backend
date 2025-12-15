// Payment Management
class PaymentManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mark as paid button
        const markPaidBtn = document.getElementById('markPaidBtn');
        if (markPaidBtn) {
            markPaidBtn.addEventListener('click', () => this.markPaymentAsPaid());
        }

        // Close modal
        const paymentModal = document.getElementById('paymentModal');
        if (paymentModal) {
            const closeBtn = paymentModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => closeModal('paymentModal'));
            }
        }
    }

    initiatePayment(customerId) {
        const customer = customerManager.getCustomer(customerId);
        if (!customer) {
            alert('Customer not found');
            return;
        }

        const packages = app.getData('packages') || [];
        const pkg = packages.find(p => p.id === customer.packageId);
        if (!pkg) {
            alert('Package not found');
            return;
        }

        const amount = pkg.price;
        const upiId = localStorage.getItem('upiId') || 'yourname@upi';
        
        // Generate UPI payment string
        const upiString = this.generateUPIString(upiId, amount, customer);
        
        // Display payment modal
        const modal = document.getElementById('paymentModal');
        const paymentDetails = document.getElementById('paymentDetails');
        const qrContainer = document.getElementById('qrCodeContainer');
        
        paymentDetails.innerHTML = `
            <div class="card">
                <h3>Payment Details</h3>
                <p><strong>Customer:</strong> ${customer.name}</p>
                <p><strong>Box Number:</strong> ${customer.boxNumber}</p>
                <p><strong>Package:</strong> ${pkg.name}</p>
                <p><strong>Amount:</strong> ₹${parseFloat(amount).toFixed(2)}</p>
            </div>
        `;

        // Clear previous QR code
        qrContainer.innerHTML = '';
        
        // Generate QR code
        if (typeof QRCode !== 'undefined') {
            // Clear container first
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
                text: upiString,
                width: 256,
                height: 256,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            qrContainer.innerHTML = '<p style="color: var(--text-secondary);">QR Code library not loaded. Please refresh the page.</p>';
        }

        // Store payment info for marking as paid
        modal.dataset.customerId = customerId;
        modal.dataset.amount = amount;
        
        modal.classList.add('active');
    }

    generateUPIString(upiId, amount, customer) {
        // UPI payment format: upi://pay?pa=UPI_ID&am=AMOUNT&cu=INR&tn=DESCRIPTION
        const description = `Cable Service - ${customer.name} - Box: ${customer.boxNumber}`;
        return `upi://pay?pa=${encodeURIComponent(upiId)}&am=${amount}&cu=INR&tn=${encodeURIComponent(description)}`;
    }

    markPaymentAsPaid() {
        const modal = document.getElementById('paymentModal');
        const customerId = modal.dataset.customerId;
        const amount = modal.dataset.amount;

        if (!customerId) {
            alert('Customer information not found');
            return;
        }

        const customers = app.getData('customers') || [];
        const customer = customers.find(c => c.id === customerId);
        
        if (!customer) {
            alert('Customer not found');
            return;
        }

        // Update customer payment status
        const customerIndex = customers.findIndex(c => c.id === customerId);
        if (customerIndex !== -1) {
            customers[customerIndex].paymentStatus = 'paid';
            customers[customerIndex].lastPaymentDate = new Date().toISOString();
            app.saveData('customers', customers);
        }

        // Create payment record
        const payments = app.getData('payments') || [];
        const payment = {
            id: app.generateId(),
            customerId: customerId,
            amount: parseFloat(amount),
            date: new Date().toISOString(),
            agentId: authManager.isAgent() ? authManager.getCurrentAgentId() : customer.agentId,
            status: 'completed',
            method: 'UPI'
        };
        payments.push(payment);
        app.saveData('payments', payments);

        alert('Payment recorded successfully!');
        closeModal('paymentModal');
        
        // Refresh views
        if (window.customerManager) {
            customerManager.loadCustomers();
        }
        if (app.currentRoute === 'dashboard') {
            app.loadDashboard();
        }
    }

    getPaymentsByDateRange(startDate, endDate) {
        const payments = app.getData('payments') || [];
        return payments.filter(payment => {
            const paymentDate = new Date(payment.date);
            return paymentDate >= startDate && paymentDate <= endDate && payment.status === 'completed';
        });
    }

    getPaymentsByAgent(agentId, date = null) {
        const payments = app.getData('payments') || [];
        let filtered = payments.filter(p => p.agentId === agentId && p.status === 'completed');
        
        if (date) {
            const targetDate = new Date(date).toISOString().split('T')[0];
            filtered = filtered.filter(p => {
                const paymentDate = new Date(p.date).toISOString().split('T')[0];
                return paymentDate === targetDate;
            });
        }
        
        return filtered;
    }
}

// Barcode Scanner for Agent Payment Collection
class BarcodeScanner {
    constructor() {
        this.scanner = null;
        this.isScanning = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Use event delegation or wait for DOM to be ready
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'startScannerBtn') {
                e.preventDefault();
                this.startScanner();
            }
            if (e.target && e.target.id === 'stopScannerBtn') {
                e.preventDefault();
                this.stopScanner();
            }
            if (e.target && e.target.id === 'searchCustomerBtn') {
                e.preventDefault();
                this.searchCustomerManually();
            }
        });
        
        // Setup input field listener
        document.addEventListener('keypress', (e) => {
            if (e.target && e.target.id === 'manualCustomerIdInput' && e.key === 'Enter') {
                e.preventDefault();
                this.searchCustomerManually();
            }
        });
    }

    init() {
        // Only initialize if user is agent
        if (!window.authManager || !window.authManager.isAgent()) {
            return;
        }
        // Scanner will be started when user clicks "Start Scanner"
    }

    async startScanner() {
        if (this.isScanning) {
            console.log('Scanner already running');
            return;
        }

        const scannerContainer = document.getElementById('scannerContainer');
        const startBtn = document.getElementById('startScannerBtn');
        const stopBtn = document.getElementById('stopScannerBtn');
        
        if (!scannerContainer) {
            console.error('Scanner container not found');
            alert('Scanner container not found. Please refresh the page.');
            return;
        }

        try {
            // Check if Html5Qrcode is available
            if (typeof Html5Qrcode === 'undefined') {
                console.error('Html5Qrcode library not loaded');
                alert('Barcode scanner library not loaded. Please refresh the page.');
                return;
            }
            
            console.log('Starting barcode scanner...');

            // Clear any existing content
            scannerContainer.innerHTML = '';
            scannerContainer.style.display = 'block';
            
            // Create scanner div
            const scannerDiv = document.createElement('div');
            scannerDiv.id = 'html5-qrcode-reader';
            scannerDiv.style.width = '100%';
            scannerDiv.style.maxWidth = '500px';
            scannerDiv.style.margin = '0 auto';
            scannerContainer.appendChild(scannerDiv);
            
            this.scanner = new Html5Qrcode("html5-qrcode-reader");
            
            // Start scanning with camera - supports QR codes and barcodes
            await this.scanner.start(
                { facingMode: "environment" }, // Use back camera
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText, decodedResult) => {
                    // Barcode/QR code scanned successfully
                    this.handleScannedCode(decodedText);
                },
                (errorMessage) => {
                    // Ignore scanning errors (they're frequent during scanning)
                }
            );

            this.isScanning = true;
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
            
            console.log('Barcode scanner started successfully');
            
        } catch (error) {
            console.error('Error starting scanner:', error);
            this.isScanning = false;
            alert('Error starting camera: ' + error.message + '\n\nPlease check camera permissions and try again.');
            if (scannerContainer) {
                scannerContainer.style.display = 'none';
                scannerContainer.innerHTML = '';
            }
            if (startBtn) startBtn.style.display = 'inline-block';
            if (stopBtn) stopBtn.style.display = 'none';
        }
    }

    async stopScanner() {
        if (!this.scanner || !this.isScanning) return;

        try {
            await this.scanner.stop();
            await this.scanner.clear();
            this.isScanning = false;
            
            const scannerContainer = document.getElementById('scannerContainer');
            const startBtn = document.getElementById('startScannerBtn');
            const stopBtn = document.getElementById('stopScannerBtn');
            
            if (scannerContainer) {
                scannerContainer.style.display = 'none';
                scannerContainer.innerHTML = ''; // Clear scanner content
            }
            if (startBtn) startBtn.style.display = 'inline-block';
            if (stopBtn) stopBtn.style.display = 'none';
        } catch (error) {
            console.error('Error stopping scanner:', error);
            // Force reset even if stop fails
            this.isScanning = false;
            const scannerContainer = document.getElementById('scannerContainer');
            if (scannerContainer) {
                scannerContainer.style.display = 'none';
                scannerContainer.innerHTML = '';
            }
        }
    }

    searchCustomerManually() {
        const manualInput = document.getElementById('manualCustomerIdInput');
        if (!manualInput) {
            console.error('Manual input field not found');
            alert('Search field not found. Please refresh the page.');
            return;
        }
        
        const searchValue = manualInput.value.trim();
        if (!searchValue) {
            alert('Please enter Phone Number, ID Number, or Box Number');
            manualInput.focus();
            return;
        }
        
        // Clear input after getting value
        const valueToSearch = searchValue;
        manualInput.value = '';
        
        // Use the same logic as barcode scanning (searches only assigned customers)
        this.handleScannedCode(valueToSearch);
    }

    async handleScannedCode(scannedCode) {
        console.log('Handling scanned code:', scannedCode);
        
        // Stop scanner after successful scan (if scanning)
        if (this.isScanning) {
            this.stopScanner();
        }
        
        if (!scannedCode || !scannedCode.trim()) {
            alert('Invalid search code. Please try again.');
            return;
        }
        
        const searchValue = scannedCode.trim();
        
        // Get agent ID for payment recording
        const agentId = window.authManager ? window.authManager.getCurrentAgentId() : null;
        if (!agentId) {
            alert('Agent ID not found. Please log in again.');
            return;
        }
        
        try {
            // Find customer by Phone Number, ID Number, or Box Number - search ALL customers
            const customers = await api.getCustomers();
            if (!customers || customers.length === 0) {
                alert('No customers found in the system.');
                return;
            }
            
            console.log(`Searching ${customers.length} customers for: ${searchValue}`);
            
            // Search through all customers by Phone Number, ID Number, or Box Number
            // Try exact match first, then case-insensitive
            let customer = customers.find(c => 
                (c.phone && c.phone.toString().trim() === searchValue) ||
                (c.idNumber && c.idNumber.toString().trim() === searchValue) ||
                (c.boxNumber && c.boxNumber.toString().trim() === searchValue) ||
                ((c._id || c.id) && (c._id || c.id).toString().trim() === searchValue)
            );
            
            // If not found, try case-insensitive search
            if (!customer) {
                const searchLower = searchValue.toLowerCase();
                customer = customers.find(c => 
                    (c.phone && c.phone.toString().toLowerCase() === searchLower) ||
                    (c.idNumber && c.idNumber.toString().toLowerCase() === searchLower) ||
                    (c.boxNumber && c.boxNumber.toString().toLowerCase() === searchLower) ||
                    ((c._id || c.id) && (c._id || c.id).toString().toLowerCase() === searchLower)
                );
            }
            
            // If still not found, try partial match for phone (remove spaces/dashes)
            if (!customer) {
                const normalizedSearch = searchValue.replace(/[\s\-]/g, '');
                customer = customers.find(c => {
                    const normalizedPhone = c.phone ? c.phone.toString().replace(/[\s\-]/g, '') : '';
                    return normalizedPhone.includes(normalizedSearch) || normalizedSearch.includes(normalizedPhone);
                });
            }

            if (!customer) {
                console.log('Customer not found');
                alert(`Customer not found with: ${searchValue}\n\nPlease ensure you entered the correct:\n- Phone Number\n- ID Number\n- Box Number`);
                return;
            }

            console.log('Customer found:', customer);
            
            // All agents can collect from all customers - no assignment restriction
            await this.showPaymentCollection(customer, true);
        } catch (error) {
            console.error('Error searching customer:', error);
            alert('Error searching customer: ' + (error.message || 'Unknown error'));
        }
    }

    async showPaymentCollection(customer, isAssigned = true) {
        try {
            const packages = await api.getPackages();
            const packageId = customer.packageId?._id || customer.packageId;
            const pkg = packages.find(p => {
                const pId = p._id || p.id;
                return pId && pId.toString() === packageId?.toString();
            });
            
            if (!pkg) {
                alert('Customer package not found');
                return;
            }

            const scannedCustomerInfo = document.getElementById('scannedCustomerInfo');
            const amount = pkg.price;
            
            // Get current date for defaults
            const today = new Date();
            const currentMonth = today.getMonth() + 1; // 1-12
            const currentYear = today.getFullYear();
            const todayStr = today.toISOString().split('T')[0];
            
            // Get existing payments for this customer with agent information
            const payments = await api.getPayments();
            const customerId = customer._id || customer.id;
            const customerPayments = payments.filter(p => {
                const pCustomerId = p.customerId?._id || p.customerId;
                return pCustomerId && pCustomerId.toString() === customerId.toString() && 
                       p.status === 'completed' &&
                       p.subscriptionMonth && 
                       p.subscriptionYear;
            });
        
        // Get assigned agent name
        const assignedAgent = customer.agentId ? agents.find(a => a.id === customer.agentId) : null;
        const assignedAgentName = assignedAgent ? assignedAgent.name : 'Not Assigned';
        
        // Generate month options - check against selected year dynamically
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        // For initial load, check against current year
        const monthOptions = months.map((month, index) => {
            const monthNum = index + 1;
            // Check if payment already exists for this month/year (will be re-checked on year change)
            const existingPayment = customerPayments.find(p => 
                p.subscriptionMonth === monthNum && 
                p.subscriptionYear === currentYear
            );
            const disabled = existingPayment ? 'disabled' : '';
            const selected = monthNum === currentMonth && !existingPayment ? 'selected' : '';
            const warning = existingPayment ? ` (Already collected on ${new Date(existingPayment.collectionDate || existingPayment.date).toLocaleDateString()})` : '';
            return `<option value="${monthNum}" ${selected} ${disabled}>${month}${warning}</option>`;
        }).join('');
        
        // Generate year options (current year and next 2 years)
        const yearOptions = Array.from({ length: 3 }, (_, i) => {
            const year = currentYear + i;
            return `<option value="${year}" ${i === 0 ? 'selected' : ''}>${year}</option>`;
        }).join('');
        
        // Show existing payments info with agent names
        let existingPaymentsHtml = '';
        if (customerPayments.length > 0) {
            existingPaymentsHtml = `
                <div style="margin-bottom: 15px; padding: 10px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <strong style="color: #856404;">Already Collected Payments:</strong>
                    <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #856404;">
                        ${customerPayments.map(p => {
                            const agentName = p.collectedBy || (p.agentId ? 'Agent' : 'Admin');
                            return `<li>${p.subscriptionMonthName || months[p.subscriptionMonth - 1]} ${p.subscriptionYear} - Collected on ${new Date(p.collectionDate || p.date).toLocaleDateString()} by <strong>${agentName}</strong></li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
        }
        
        scannedCustomerInfo.innerHTML = `
            <h3 style="margin-bottom: 15px;">Customer Found</h3>
            <div style="margin-bottom: 15px;">
                <p><strong>Name:</strong> ${customer.name || '-'}</p>
                <p><strong>Box Number:</strong> ${customer.boxNumber || '-'}</p>
                <p><strong>Phone:</strong> ${customer.phone || '-'}</p>
                <p><strong>Package:</strong> ${pkg.name}</p>
                <p><strong>Amount:</strong> ₹${amount.toFixed(2)}</p>
                <p><strong>Assigned Agent:</strong> ${assignedAgentName} ${assignedAgentName !== 'Not Assigned' ? '(Informational only)' : ''}</p>
                <p><strong>Payment Status:</strong> <span class="badge ${customer.paymentStatus === 'paid' ? 'badge-success' : 'badge-danger'}">${customer.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}</span></p>
            </div>
            ${existingPaymentsHtml}
            <div style="margin-bottom: 15px; padding: 15px; background-color: var(--card-bg); border-radius: 6px; border: 2px solid var(--primary-color);">
                <h4 style="margin-bottom: 15px; color: var(--primary-color);">Select Subscription Period & Collect Payment</h4>
                <div class="form-group" style="margin-bottom: 10px;">
                    <label for="subscriptionMonth"><strong>Subscription Month: *</strong></label>
                    <select id="subscriptionMonth" class="form-control" style="width: 100%; padding: 8px; margin-top: 5px; font-size: 1rem;" onchange="barcodeScanner.checkExistingPayment('${customer.id}')">
                        ${monthOptions}
                    </select>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">Select the month for which you are collecting subscription payment</p>
                </div>
                <div class="form-group" style="margin-bottom: 10px;">
                    <label for="subscriptionYear"><strong>Subscription Year: *</strong></label>
                    <select id="subscriptionYear" class="form-control" style="width: 100%; padding: 8px; margin-top: 5px; font-size: 1rem;" onchange="barcodeScanner.checkExistingPayment('${customer.id}')">
                        ${yearOptions}
                    </select>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">Select the year for which you are collecting subscription payment</p>
                </div>
                <div class="form-group" style="margin-bottom: 10px;">
                    <label for="collectionDate"><strong>Date of Collection: *</strong></label>
                    <input type="date" id="collectionDate" class="form-control" value="${todayStr}" style="width: 100%; padding: 8px; margin-top: 5px; font-size: 1rem;" required />
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">Enter the date when payment is being collected</p>
                </div>
                <div id="duplicatePaymentWarning" style="display: none; padding: 15px; background-color: #f8d7da; border: 2px solid #dc3545; border-radius: 6px; margin-top: 15px; color: #721c24; font-size: 0.95rem;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <strong style="font-size: 1.1rem;">⚠ PAYMENT ALREADY COLLECTED!</strong>
                    </div>
                    <div id="duplicatePaymentDetails" style="line-height: 1.6;"></div>
                </div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button id="collectPaymentBtn" class="btn btn-success" onclick="barcodeScanner.collectPayment('${customerId}', ${amount})" style="font-size: 1rem; padding: 12px 24px;">
                    <strong>Collect Payment for Selected Month</strong>
                </button>
                <button class="btn btn-secondary" onclick="document.getElementById('scannedCustomerInfo').style.display='none'">Close</button>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 10px; font-style: italic;">
                ⚠ Note: You can only collect payment once per subscription month/year. Already collected months are disabled.
            </p>
        `;
        
            scannedCustomerInfo.style.display = 'block';
            
            // Check for existing payment on initial load
            this.checkExistingPayment(customerId);
        } catch (error) {
            console.error('Error showing payment collection:', error);
            alert('Error loading payment form: ' + (error.message || 'Unknown error'));
        }
    }
    
    async checkExistingPayment(customerId) {
        const subscriptionMonthSelect = document.getElementById('subscriptionMonth');
        const subscriptionYear = parseInt(document.getElementById('subscriptionYear')?.value);
        const subscriptionMonth = parseInt(subscriptionMonthSelect?.value);
        const warningDiv = document.getElementById('duplicatePaymentWarning');
        const detailsSpan = document.getElementById('duplicatePaymentDetails');
        const collectBtn = document.getElementById('collectPaymentBtn');
        
        if (!subscriptionMonth || !subscriptionYear || !warningDiv) return;
        
        try {
            // Update month dropdown options based on selected year
            const allPayments = await api.getPayments();
            const customerPayments = allPayments.filter(p => {
                const pCustomerId = p.customerId?._id || p.customerId;
                return pCustomerId && pCustomerId.toString() === customerId.toString() && 
                       p.status === 'completed' &&
                       p.subscriptionMonth && 
                       p.subscriptionYear;
            });
        
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        // Update month options to reflect selected year
        if (subscriptionMonthSelect) {
            const currentSelectedMonth = subscriptionMonth;
            subscriptionMonthSelect.innerHTML = months.map((month, index) => {
                const monthNum = index + 1;
                const existingPayment = customerPayments.find(p => 
                    p.subscriptionMonth === monthNum && 
                    p.subscriptionYear === subscriptionYear
                );
                const disabled = existingPayment ? 'disabled' : '';
                const selected = monthNum === currentSelectedMonth ? 'selected' : '';
                const warning = existingPayment ? ` (Already collected on ${new Date(existingPayment.collectionDate || existingPayment.date).toLocaleDateString()})` : '';
                return `<option value="${monthNum}" ${selected} ${disabled}>${month}${warning}</option>`;
            }).join('');
            
            // If current selection is disabled, select first available month
            if (subscriptionMonthSelect.value && subscriptionMonthSelect.options[subscriptionMonthSelect.selectedIndex]?.disabled) {
                const firstEnabled = Array.from(subscriptionMonthSelect.options).find(opt => !opt.disabled);
                if (firstEnabled) {
                    subscriptionMonthSelect.value = firstEnabled.value;
                }
            }
        }
        
            // Check if current selection has existing payment
            const existingPayment = customerPayments.find(p => 
                p.subscriptionMonth === subscriptionMonth &&
                p.subscriptionYear === subscriptionYear
            );
            
            if (existingPayment) {
                const monthName = existingPayment.subscriptionMonthName || months[subscriptionMonth - 1];
                const collectionDate = new Date(existingPayment.collectionDate || existingPayment.date).toLocaleDateString();
                
                // Show prominent warning
                warningDiv.style.display = 'block';
                detailsSpan.innerHTML = `
                    <strong>⚠ WARNING: Payment Already Collected!</strong><br>
                    Subscription: <strong>${monthName} ${subscriptionYear}</strong><br>
                    Already collected on: <strong>${collectionDate}</strong><br>
                    <em>You cannot collect payment for the same subscription period twice.</em>
                `;
                
                // Completely disable the button
                if (collectBtn) {
                    collectBtn.disabled = true;
                    collectBtn.style.opacity = '0.5';
                    collectBtn.style.cursor = 'not-allowed';
                    collectBtn.textContent = 'Payment Already Collected';
                    collectBtn.classList.remove('btn-success');
                    collectBtn.classList.add('btn-secondary');
                }
            } else {
                warningDiv.style.display = 'none';
                if (collectBtn) {
                    collectBtn.disabled = false;
                    collectBtn.style.opacity = '1';
                    collectBtn.style.cursor = 'pointer';
                    collectBtn.textContent = 'Collect Payment';
                    collectBtn.classList.remove('btn-secondary');
                    collectBtn.classList.add('btn-success');
                }
            }
        } catch (error) {
            console.error('Error checking existing payment:', error);
        }
    }

    async collectPayment(customerId, amount) {
        try {
            // Get customer info
            const customer = await api.getCustomer(customerId);
            
            if (!customer) {
                alert('Customer not found');
                return;
            }
            
            // Get subscription details from form
            const subscriptionMonth = document.getElementById('subscriptionMonth')?.value;
            const subscriptionYear = document.getElementById('subscriptionYear')?.value;
            const collectionDate = document.getElementById('collectionDate')?.value;
            
            if (!subscriptionMonth || !subscriptionYear || !collectionDate) {
                alert('Please fill in all payment details (Subscription Month, Year, and Collection Date)');
                return;
            }

            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthName = months[parseInt(subscriptionMonth) - 1];
            const monthNum = parseInt(subscriptionMonth);
            const yearNum = parseInt(subscriptionYear);
            
            // CRITICAL: Check if payment already exists for this customer, month, and year
            const payments = await api.getPayments();
            const existingPayment = payments.find(p => {
                const pCustomerId = p.customerId?._id || p.customerId;
                return pCustomerId && pCustomerId.toString() === customerId.toString() &&
                       p.subscriptionMonth === monthNum &&
                       p.subscriptionYear === yearNum &&
                       p.status === 'completed';
            });
            
            if (existingPayment) {
                const existingDate = new Date(existingPayment.collectionDate || existingPayment.date).toLocaleDateString();
                const existingMonthName = existingPayment.subscriptionMonthName || months[existingPayment.subscriptionMonth - 1];
                
                alert(`⚠ PAYMENT ALREADY COLLECTED!\n\n` +
                      `Customer: ${customer.name}\n` +
                      `Subscription: ${existingMonthName} ${yearNum}\n` +
                      `Already collected on: ${existingDate}\n\n` +
                      `You CANNOT collect payment for the same subscription period twice.\n` +
                      `Please select a different month/year if you need to collect for another period.`);
                return;
            }
            
            // Additional safety check - prevent if button is disabled
            const collectBtn = document.getElementById('collectPaymentBtn');
            if (collectBtn && collectBtn.disabled) {
                alert('⚠ Payment collection is disabled because this subscription period has already been collected!');
                return;
            }
            
            if (!confirm(`Confirm payment collection:\n\nAmount: ₹${amount.toFixed(2)}\nSubscription: ${monthName} ${subscriptionYear}\nCollection Date: ${collectionDate}`)) {
                return;
            }

            // Get agent ID
            const currentAgentId = window.authManager.getCurrentAgentId();
            const agentId = currentAgentId || null;
            const collectedBy = window.authManager.isAgent() ? 'Agent' : 'Admin';

            // Create payment via API
            await api.createPayment({
                customerId: customerId,
                customerName: customer.name,
                amount: parseFloat(amount),
                subscriptionMonth: monthNum,
                subscriptionYear: yearNum,
                collectionDate: collectionDate,
                agentId: agentId,
                collectedBy: collectedBy
            });

            alert(`Payment of ₹${amount.toFixed(2)} collected successfully!\nSubscription: ${monthName} ${subscriptionYear}\nCollection Date: ${collectionDate}`);
            
            // Hide customer info
            document.getElementById('scannedCustomerInfo').style.display = 'none';
            
            // Refresh dashboard
            if (app.currentRoute === 'dashboard') {
                app.loadDashboard();
            }
        } catch (error) {
            console.error('Error collecting payment:', error);
            alert('Error collecting payment: ' + (error.message || 'Unknown error'));
        }
    }
}

// Initialize barcode scanner
let barcodeScanner;
document.addEventListener('DOMContentLoaded', () => {
    barcodeScanner = new BarcodeScanner();
    window.BarcodeScanner = barcodeScanner;
});

// Admin Payment Collection Manager
class AdminPaymentManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search button
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'adminSearchCustomerBtn') {
                e.preventDefault();
                this.searchCustomer();
            }
        });
        
        // Enter key in search input
        document.addEventListener('keypress', (e) => {
            if (e.target && e.target.id === 'adminCustomerSearchInput' && e.key === 'Enter') {
                e.preventDefault();
                this.searchCustomer();
            }
        });
    }

    async searchCustomer() {
        const searchInput = document.getElementById('adminCustomerSearchInput');
        if (!searchInput) {
            console.error('Search input not found');
            return;
        }
        
        const searchValue = searchInput.value.trim();
        if (!searchValue) {
            alert('Please enter Phone Number, ID Number, or Box Number');
            searchInput.focus();
            return;
        }
        
        // Clear input after getting value
        const valueToSearch = searchValue;
        searchInput.value = '';
        
        try {
            // Find customer
            const customers = await api.getCustomers();
            if (!customers || customers.length === 0) {
                alert('No customers found in the system.');
                return;
            }
            
            console.log(`Searching ${customers.length} customers for: ${valueToSearch}`);
            
            // Search through all customers by Phone Number, ID Number, or Box Number
            // Try exact match first, then case-insensitive
            let customer = customers.find(c => 
                (c.phone && c.phone.toString().trim() === valueToSearch) ||
                (c.idNumber && c.idNumber.toString().trim() === valueToSearch) ||
                (c.boxNumber && c.boxNumber.toString().trim() === valueToSearch) ||
                ((c._id || c.id) && (c._id || c.id).toString().trim() === valueToSearch)
            );
            
            // If not found, try case-insensitive search
            if (!customer) {
                const searchLower = valueToSearch.toLowerCase();
                customer = customers.find(c => 
                    (c.phone && c.phone.toString().toLowerCase() === searchLower) ||
                    (c.idNumber && c.idNumber.toString().toLowerCase() === searchLower) ||
                    (c.boxNumber && c.boxNumber.toString().toLowerCase() === searchLower) ||
                    ((c._id || c.id) && (c._id || c.id).toString().toLowerCase() === searchLower)
                );
            }
            
            // If still not found, try partial match for phone (remove spaces/dashes)
            if (!customer) {
                const normalizedSearch = valueToSearch.replace(/[\s\-]/g, '');
                customer = customers.find(c => {
                    const normalizedPhone = c.phone ? c.phone.toString().replace(/[\s\-]/g, '') : '';
                    return normalizedPhone.includes(normalizedSearch) || normalizedSearch.includes(normalizedPhone);
                });
            }

            if (!customer) {
                console.log('Customer not found');
                alert(`Customer not found with: ${valueToSearch}\n\nPlease ensure you entered the correct:\n- Phone Number\n- ID Number\n- Box Number`);
                return;
            }

            console.log('Customer found:', customer);
            await this.showPaymentCollection(customer);
        } catch (error) {
            console.error('Error searching customer:', error);
            alert('Error searching customer: ' + (error.message || 'Unknown error'));
        }
    }

    async showPaymentCollection(customer) {
        try {
            // Ensure parent container is visible
            const adminPaymentSection = document.getElementById('adminPaymentCollectionSection');
            if (adminPaymentSection) {
                adminPaymentSection.style.display = 'block';
            }
            
            const packages = window.app ? window.app.getData('packages') : [];
            const pkg = packages.find(p => p.id === customer.packageId);
            
            if (!pkg) {
                alert('Customer package not found');
                return;
            }

            const adminCustomerInfo = document.getElementById('adminCustomerInfo');
            if (!adminCustomerInfo) {
                console.error('adminCustomerInfo element not found');
                alert('Error: Customer info container not found. Please refresh the page.');
                return;
            }

            const amount = pkg.price;
            
            // Get current date for defaults
            const today = new Date();
            const currentMonth = today.getMonth() + 1; // 1-12
            const currentYear = today.getFullYear();
            const todayStr = today.toISOString().split('T')[0];
            
            // Get existing payments for this customer with agent information
            const payments = window.app ? window.app.getData('payments') : [];
            const agents = window.app ? window.app.getData('agents') : [];
            const customerPayments = payments.filter(p => 
                p.customerId === customer.id && 
                p.status === 'completed' &&
                p.subscriptionMonth && 
                p.subscriptionYear
            );
            
            // Get assigned agent name
            const assignedAgent = customer.agentId ? agents.find(a => a.id === customer.agentId) : null;
            const assignedAgentName = assignedAgent ? assignedAgent.name : 'Not Assigned';
            
            // Generate month options - check against selected year dynamically
            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            // For initial load, check against current year
            const monthOptions = months.map((month, index) => {
                const monthNum = index + 1;
                // Check if payment already exists for this month/year
                const existingPayment = customerPayments.find(p => 
                    p.subscriptionMonth === monthNum && 
                    p.subscriptionYear === currentYear
                );
                const disabled = existingPayment ? 'disabled' : '';
                const selected = monthNum === currentMonth && !existingPayment ? 'selected' : '';
                const warning = existingPayment ? ` (Already collected on ${new Date(existingPayment.collectionDate || existingPayment.date).toLocaleDateString()})` : '';
                return `<option value="${monthNum}" ${selected} ${disabled}>${month}${warning}</option>`;
            }).join('');
            
            // Generate year options (current year and next 2 years)
            const yearOptions = Array.from({ length: 3 }, (_, i) => {
                const year = currentYear + i;
                return `<option value="${year}" ${i === 0 ? 'selected' : ''}>${year}</option>`;
            }).join('');
            
            // Generate agent options for admin to select collecting agent
            const allAgents = window.app ? window.app.getData('agents') : [];
            const agentOptions = '<option value="">Admin (No Agent)</option>' + 
                allAgents.map(agent => `<option value="${agent.id}">${agent.name}</option>`).join('');
            
            // Show existing payments info with agent names
            let existingPaymentsHtml = '';
            if (customerPayments.length > 0) {
                existingPaymentsHtml = `
                    <div style="margin-bottom: 15px; padding: 10px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                        <strong style="color: #856404;">Already Collected Payments:</strong>
                        <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #856404;">
                            ${customerPayments.map(p => {
                                const paymentAgent = p.agentId ? agents.find(a => a.id === p.agentId) : null;
                                const agentName = paymentAgent ? paymentAgent.name : 'Admin';
                                return `<li>${p.subscriptionMonthName || months[p.subscriptionMonth - 1]} ${p.subscriptionYear} - Collected on ${new Date(p.collectionDate || p.date).toLocaleDateString()} by <strong>${agentName}</strong></li>`;
                            }).join('')}
                        </ul>
                    </div>
                `;
            }
            
            const customerId = customer._id || customer.id;
            
            adminCustomerInfo.innerHTML = `
                <h3 style="margin-bottom: 15px;">Customer Found</h3>
                <div style="margin-bottom: 15px;">
                    <p><strong>Name:</strong> ${customer.name || '-'}</p>
                    <p><strong>Box Number:</strong> ${customer.boxNumber || '-'}</p>
                    <p><strong>Phone:</strong> ${customer.phone || '-'}</p>
                    <p><strong>Package:</strong> ${pkg.name}</p>
                    <p><strong>Amount:</strong> ₹${amount.toFixed(2)}</p>
                    <p><strong>Assigned Agent:</strong> ${assignedAgentName}</p>
                    <p><strong>Payment Status:</strong> <span class="badge ${customer.paymentStatus === 'paid' ? 'badge-success' : 'badge-danger'}">${customer.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}</span></p>
                </div>
                ${existingPaymentsHtml}
                <div style="margin-bottom: 15px; padding: 15px; background-color: var(--card-bg); border-radius: 6px; border: 2px solid var(--primary-color);">
                    <h4 style="margin-bottom: 15px; color: var(--primary-color);">Select Subscription Period & Collect Payment</h4>
                    <div class="form-group" style="margin-bottom: 10px;">
                        <label for="adminSubscriptionMonth"><strong>Subscription Month: *</strong></label>
                        <select id="adminSubscriptionMonth" class="form-control" style="width: 100%; padding: 8px; margin-top: 5px; font-size: 1rem;" onchange="adminPaymentManager.checkExistingPayment('${customerId}')">
                            ${monthOptions}
                        </select>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">Select the month for which you are collecting subscription payment</p>
                    </div>
                    <div class="form-group" style="margin-bottom: 10px;">
                        <label for="adminSubscriptionYear"><strong>Subscription Year: *</strong></label>
                        <select id="adminSubscriptionYear" class="form-control" style="width: 100%; padding: 8px; margin-top: 5px; font-size: 1rem;" onchange="adminPaymentManager.checkExistingPayment('${customerId}')">
                            ${yearOptions}
                        </select>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">Select the year for which you are collecting subscription payment</p>
                    </div>
                    <div class="form-group" style="margin-bottom: 10px;">
                        <label for="adminCollectionDate"><strong>Date of Collection: *</strong></label>
                        <input type="date" id="adminCollectionDate" class="form-control" value="${todayStr}" style="width: 100%; padding: 8px; margin-top: 5px; font-size: 1rem;" required />
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">Enter the date when payment is being collected</p>
                    </div>
                    <div class="form-group" style="margin-bottom: 10px;">
                        <label for="adminCollectingAgent"><strong>Collecting Agent (Optional):</strong></label>
                        <select id="adminCollectingAgent" class="form-control" style="width: 100%; padding: 8px; margin-top: 5px; font-size: 1rem;">
                            ${agentOptions}
                        </select>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">Select the agent who collected this payment, or leave as "Admin"</p>
                    </div>
                    <div id="adminDuplicatePaymentWarning" style="display: none; padding: 15px; background-color: #f8d7da; border: 2px solid #dc3545; border-radius: 6px; margin-top: 15px; color: #721c24; font-size: 0.95rem;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <strong style="font-size: 1.1rem;">⚠ PAYMENT ALREADY COLLECTED!</strong>
                        </div>
                        <div id="adminDuplicatePaymentDetails" style="line-height: 1.6;"></div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button id="adminCollectPaymentBtn" class="btn btn-success" onclick="adminPaymentManager.collectPayment('${customerId}', ${amount})" style="font-size: 1rem; padding: 12px 24px;">
                        <strong>Collect Payment for Selected Month</strong>
                    </button>
                    <button class="btn btn-secondary" onclick="document.getElementById('adminCustomerInfo').style.display='none'">Close</button>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 10px; font-style: italic;">
                    ⚠ Note: You can only collect payment once per subscription month/year. Already collected months are disabled.
                </p>
            `;
            
            adminCustomerInfo.style.display = 'block';
            
            // Check for existing payment on initial load
            await this.checkExistingPayment(customerId);
        } catch (error) {
            console.error('Error showing payment collection:', error);
            alert('Error loading payment form: ' + (error.message || 'Unknown error'));
        }
    }

    checkExistingPayment(customerId) {
        const subscriptionMonthSelect = document.getElementById('adminSubscriptionMonth');
        const subscriptionYearSelect = document.getElementById('adminSubscriptionYear');
        const warningDiv = document.getElementById('adminDuplicatePaymentWarning');
        const detailsSpan = document.getElementById('adminDuplicatePaymentDetails');
        const collectBtn = document.getElementById('adminCollectPaymentBtn');
        
        if (!subscriptionMonthSelect || !subscriptionYearSelect) return;
        
        const subscriptionMonth = parseInt(subscriptionMonthSelect.value);
        const subscriptionYear = parseInt(subscriptionYearSelect.value);
        
        if (!subscriptionMonth || !subscriptionYear) return;
        
        const payments = app.getData('payments') || [];
        const customerPayments = payments.filter(p => 
            p.customerId === customerId && 
            p.status === 'completed' &&
            p.subscriptionMonth && 
            p.subscriptionYear
        );
        
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        // Update month options based on selected year
        if (subscriptionYearSelect) {
            const currentSelectedMonth = subscriptionMonth;
            const monthOptions = months.map((month, index) => {
                const monthNum = index + 1;
                const existingPayment = customerPayments.find(p => 
                    p.subscriptionMonth === monthNum && 
                    p.subscriptionYear === subscriptionYear
                );
                const disabled = existingPayment ? 'disabled' : '';
                const selected = monthNum === currentSelectedMonth ? 'selected' : '';
                const warning = existingPayment ? ` (Already collected on ${new Date(existingPayment.collectionDate || existingPayment.date).toLocaleDateString()})` : '';
                return `<option value="${monthNum}" ${selected} ${disabled}>${month}${warning}</option>`;
            }).join('');
            
            subscriptionMonthSelect.innerHTML = monthOptions;
            
            // If current selection is disabled, select first available month
            if (subscriptionMonthSelect.value && subscriptionMonthSelect.options[subscriptionMonthSelect.selectedIndex]?.disabled) {
                const firstEnabled = Array.from(subscriptionMonthSelect.options).find(opt => !opt.disabled);
                if (firstEnabled) {
                    subscriptionMonthSelect.value = firstEnabled.value;
                }
            }
        }
        
        // Check if current selection has existing payment
        const existingPayment = customerPayments.find(p => 
            p.subscriptionMonth === subscriptionMonth &&
            p.subscriptionYear === subscriptionYear
        );
        
        if (existingPayment) {
            const monthName = existingPayment.subscriptionMonthName || months[subscriptionMonth - 1];
            const collectionDate = new Date(existingPayment.collectionDate || existingPayment.date).toLocaleDateString();
            
            // Show prominent warning
            warningDiv.style.display = 'block';
            detailsSpan.innerHTML = `
                <strong>⚠ WARNING: Payment Already Collected!</strong><br>
                Subscription: <strong>${monthName} ${subscriptionYear}</strong><br>
                Already collected on: <strong>${collectionDate}</strong><br>
                <em>You cannot collect payment for the same subscription period twice.</em>
            `;
            
            // Completely disable the button
            if (collectBtn) {
                collectBtn.disabled = true;
                collectBtn.style.opacity = '0.5';
                collectBtn.style.cursor = 'not-allowed';
                collectBtn.textContent = 'Payment Already Collected';
                collectBtn.classList.remove('btn-success');
                collectBtn.classList.add('btn-secondary');
            }
        } else {
            warningDiv.style.display = 'none';
            if (collectBtn) {
                collectBtn.disabled = false;
                collectBtn.style.opacity = '1';
                collectBtn.style.cursor = 'pointer';
                collectBtn.textContent = 'Collect Payment for Selected Month';
                collectBtn.classList.remove('btn-secondary');
                collectBtn.classList.add('btn-success');
            }
        }
    }

    async collectPayment(customerId, amount) {
        try {
            // Get customer info
            const customer = await api.getCustomer(customerId);
            
            if (!customer) {
                alert('Customer not found');
                return;
            }
            
            // Get subscription details from form
            const subscriptionMonth = document.getElementById('adminSubscriptionMonth')?.value;
            const subscriptionYear = document.getElementById('adminSubscriptionYear')?.value;
            const collectionDate = document.getElementById('adminCollectionDate')?.value;
            const collectingAgentId = document.getElementById('adminCollectingAgent')?.value || null;
            
            if (!subscriptionMonth || !subscriptionYear || !collectionDate) {
                alert('Please fill in all payment details (Subscription Month, Year, and Collection Date)');
                return;
            }

            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthName = months[parseInt(subscriptionMonth) - 1];
            const monthNum = parseInt(subscriptionMonth);
            const yearNum = parseInt(subscriptionYear);
            
            // CRITICAL: Check if payment already exists for this customer, month, and year
            const payments = await api.getPayments();
            const existingPayment = payments.find(p => {
                const pCustomerId = p.customerId?._id || p.customerId;
                return pCustomerId && pCustomerId.toString() === customerId.toString() &&
                       p.subscriptionMonth === monthNum &&
                       p.subscriptionYear === yearNum &&
                       p.status === 'completed';
            });
            
            if (existingPayment) {
                const existingDate = new Date(existingPayment.collectionDate || existingPayment.date).toLocaleDateString();
                const existingMonthName = existingPayment.subscriptionMonthName || months[existingPayment.subscriptionMonth - 1];
                
                alert(`⚠ PAYMENT ALREADY COLLECTED!\n\n` +
                      `Customer: ${customer.name}\n` +
                      `Subscription: ${existingMonthName} ${yearNum}\n` +
                      `Already collected on: ${existingDate}\n\n` +
                      `You CANNOT collect payment for the same subscription period twice.\n` +
                      `Please select a different month/year.`);
                return;
            }
            
            // Get agent name if agent selected
            let agentName = 'Admin';
            if (collectingAgentId) {
                const agent = await api.getAgent(collectingAgentId);
                agentName = agent ? agent.name : 'Admin';
            }
            
            // Create payment via API
            await api.createPayment({
                customerId: customerId,
                customerName: customer.name,
                amount: amount,
                subscriptionMonth: monthNum,
                subscriptionYear: yearNum,
                collectionDate: collectionDate,
                agentId: collectingAgentId,
                collectedBy: agentName
            });
            
            alert(`Payment collected successfully!\n\nCustomer: ${customer.name}\nSubscription: ${monthName} ${yearNum}\nAmount: ₹${amount.toFixed(2)}\nCollected by: ${agentName}`);
            
            // Hide customer info and refresh dashboard
            const adminCustomerInfo = document.getElementById('adminCustomerInfo');
            if (adminCustomerInfo) {
                adminCustomerInfo.style.display = 'none';
            }
            
            // Refresh dashboard
            if (window.app && window.app.loadDashboard) {
                window.app.loadDashboard();
            }
        } catch (error) {
            console.error('Error collecting payment:', error);
            alert('Error collecting payment: ' + (error.message || 'Unknown error'));
        }
    }
}

// Initialize payment manager
let paymentManager;
document.addEventListener('DOMContentLoaded', () => {
    paymentManager = new PaymentManager();
    window.PaymentManager = paymentManager;
});

// Initialize admin payment manager
let adminPaymentManager;
document.addEventListener('DOMContentLoaded', () => {
    adminPaymentManager = new AdminPaymentManager();
    window.AdminPaymentManager = adminPaymentManager;
});

