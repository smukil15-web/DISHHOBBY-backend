// Customer Management
class CustomerManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add customer button
        const addBtn = document.getElementById('addCustomerBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openCustomerModal());
        }

        // Excel import button
        const importBtn = document.getElementById('importExcelBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.openExcelImportModal());
        }

        // Excel export button
        const exportBtn = document.getElementById('exportExcelBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCustomersToExcel());
        }

        // Excel file input
        const excelFileInput = document.getElementById('excelFileInput');
        if (excelFileInput) {
            excelFileInput.addEventListener('change', (e) => this.handleExcelUpload(e));
        }

        // Process Excel import button
        const processExcelBtn = document.getElementById('processExcelBtn');
        if (processExcelBtn) {
            processExcelBtn.addEventListener('click', () => this.importCustomersFromExcel());
        }

        // Customer form submit
        const customerForm = document.getElementById('customerForm');
        if (customerForm) {
            customerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCustomer();
            });
        }

        // Search and filters
        const searchInput = document.getElementById('customerSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.loadCustomers());
        }

        const filterAgent = document.getElementById('customerFilterAgent');
        if (filterAgent) {
            filterAgent.addEventListener('change', () => this.loadCustomers());
        }

        const filterStatus = document.getElementById('customerFilterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', () => this.loadCustomers());
        }

        // Close modal
        const customerModal = document.getElementById('customerModal');
        if (customerModal) {
            const closeBtn = customerModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => closeModal('customerModal'));
            }
        }

        // Close Excel import modal
        const excelImportModal = document.getElementById('excelImportModal');
        if (excelImportModal) {
            const closeBtn = excelImportModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => closeModal('excelImportModal'));
            }
        }
    }

    async loadCustomers() {
        try {
            let customers = await api.getCustomers();
            const packages = await api.getPackages();
            const agents = await api.getAgents();

        // Apply role-based filtering
        // Note: Currently all agents can see all customers
        // if (authManager.isAgent()) {
        //     const agentId = authManager.getCurrentAgentId();
        //     customers = customers.filter(c => {
        //         const cAgentId = c.agentId?._id || c.agentId;
        //         return cAgentId && cAgentId.toString() === agentId;
        //     });
        // }

        // Apply search filter
        const searchTerm = document.getElementById('customerSearch').value.toLowerCase();
        if (searchTerm) {
            customers = customers.filter(c => 
                (c.name && c.name.toLowerCase().includes(searchTerm)) ||
                (c.phone && c.phone.includes(searchTerm)) ||
                (c.idNumber && c.idNumber.toLowerCase().includes(searchTerm)) ||
                (c.boxNumber && c.boxNumber.toLowerCase().includes(searchTerm)) ||
                (c.office && c.office.toLowerCase().includes(searchTerm)) ||
                (c.area && c.area.toLowerCase().includes(searchTerm)) ||
                (c.serialNo && c.serialNo.toString().toLowerCase().includes(searchTerm))
            );
        }

        // Apply agent filter
        const agentFilter = document.getElementById('customerFilterAgent').value;
        if (agentFilter) {
            customers = customers.filter(c => {
                const cAgentId = c.agentId?._id || c.agentId;
                return cAgentId && cAgentId.toString() === agentFilter;
            });
        }

        // Apply status filter
        const statusFilter = document.getElementById('customerFilterStatus').value;
        if (statusFilter) {
            customers = customers.filter(c => c.paymentStatus === statusFilter);
        }

        const customersList = document.getElementById('customersList');
        
        if (customers.length === 0) {
            customersList.innerHTML = '<p style="color: var(--text-secondary);">No customers found.</p>';
        return;
    }
    
        customersList.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Office</th>
                            <th>Serial No</th>
                            <th>Customer Name</th>
                            <th>Phone</th>
                            <th>Area</th>
                            <th>Package</th>
                            <th>Box Number</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.map(customer => {
        const pkg = packages.find(p => p.id === customer.packageId);
                            const statusBadge = customer.paymentStatus === 'paid' 
                                ? '<span class="badge badge-success">Paid</span>'
                                : '<span class="badge badge-danger">Unpaid</span>';
                            
                            return `
                                <tr>
                                    <td>${customer.office || '-'}</td>
                                    <td>${customer.serialNo || '-'}</td>
                                    <td><strong>${customer.name || '-'}</strong></td>
                                    <td>${customer.phone || '-'}</td>
                                    <td>${customer.area || '-'}</td>
                                    <td>${pkg ? pkg.name : '-'}</td>
                                    <td>${customer.boxNumber || '-'}</td>
                                    <td>${statusBadge}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" onclick="customerManager.viewCustomer('${customer.id}')">View</button>
                                        ${authManager.isAdmin() ? `
                                            <button class="btn btn-sm btn-primary" onclick="customerManager.editCustomer('${customer.id}')">Edit</button>
                                            <button class="btn btn-sm btn-danger" onclick="customerManager.deleteCustomer('${customer.id}')">Delete</button>
                ` : ''}
            </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        } catch (error) {
            console.error('Error loading customers:', error);
            const customersList = document.getElementById('customersList');
            if (customersList) {
                customersList.innerHTML = '<p style="color: var(--danger-color);">Error loading customers. Please refresh the page.</p>';
            }
        }
    }

    async populatePackageDropdown() {
        try {
            const packages = await api.getPackages();
            const select = document.getElementById('customerPackage');
            select.innerHTML = '<option value="">Select Package</option>' +
                packages.map(pkg => {
                    const pkgId = pkg._id || pkg.id;
                    return `<option value="${pkgId}">${pkg.name} - ₹${pkg.price}</option>`;
                }).join('');
        } catch (error) {
            console.error('Error loading packages:', error);
        }
    }

    async populateAgentDropdown() {
        try {
            const agents = await api.getAgents();
            const filterSelect = document.getElementById('customerFilterAgent');
            
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="">All Agents</option>' +
                    agents.map(agent => {
                        const agentId = agent._id || agent.id;
                        return `<option value="${agentId}">${agent.name}</option>`;
                    }).join('');
            }
        } catch (error) {
            console.error('Error loading agents:', error);
        }
    }

    async openCustomerModal(customerId = null) {
        const modal = document.getElementById('customerModal');
        const title = document.getElementById('customerModalTitle');
        const form = document.getElementById('customerForm');
        
        await this.populatePackageDropdown();
        
        if (customerId) {
            title.textContent = 'Edit Customer';
            try {
                const customer = await api.getCustomer(customerId);
                if (customer) {
                    document.getElementById('customerId').value = customer._id || customer.id;
                    document.getElementById('customerOffice').value = customer.office || '';
                    document.getElementById('customerSerialNo').value = customer.serialNo || '';
                    document.getElementById('customerName').value = customer.name || '';
                    document.getElementById('customerPhone').value = customer.phone || '';
                    document.getElementById('customerArea').value = customer.area || '';
                    document.getElementById('customerIdNumber').value = customer.idNumber || '';
                    document.getElementById('customerBoxNumber').value = customer.boxNumber || '';
                    document.getElementById('customerPackage').value = customer.packageId || '';
                }
            } catch (error) {
                console.error('Error loading customer:', error);
                alert('Error loading customer data. Please try again.');
            }
        } else {
            title.textContent = 'Add Customer';
            form.reset();
            document.getElementById('customerId').value = '';
        }
        
        modal.classList.add('active');
    }

    async saveCustomer() {
        const id = document.getElementById('customerId').value;
        const office = document.getElementById('customerOffice').value.trim();
        const serialNo = document.getElementById('customerSerialNo').value.trim();
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const area = document.getElementById('customerArea').value.trim();
        const packageId = document.getElementById('customerPackage').value;
        const idNumber = document.getElementById('customerIdNumber').value.trim();
        const boxNumber = document.getElementById('customerBoxNumber').value.trim();

        // Allow saving with some missing fields (useful for editing imported customers)
        // But require at least name or box number to identify the customer
        if (!name && !boxNumber) {
            alert('Please provide at least Customer Name or Box Number');
        return;
    }
    
        try {
            const customerData = {
                office: office || '',
                serialNo: serialNo || '',
                name: name || '', 
                area: area || '', 
                phone: phone || '', 
                idNumber: idNumber || '', 
                boxNumber: boxNumber || '', 
                packageId: packageId || null,
                agentId: null,
                paymentStatus: 'unpaid',
                lastPaymentDate: null
            };

            if (id) {
                // Update existing
                await api.updateCustomer(id, customerData);
            } else {
                // Add new
                await api.createCustomer(customerData);
            }

            await this.loadCustomers();
            closeModal('customerModal');
            
            // Refresh dashboard
            if (app.currentRoute === 'dashboard') {
                app.loadDashboard();
            }
        } catch (error) {
            console.error('Error saving customer:', error);
            alert('Error saving customer: ' + (error.message || 'Unknown error'));
        }
    }

    async viewCustomer(id) {
        try {
            const customer = await api.getCustomer(id);
            if (!customer) {
                alert('Customer not found');
                return;
            }

            const packages = await api.getPackages();
            const pkg = packages.find(p => (p._id || p.id) === (customer.packageId?._id || customer.packageId));
        
        // Store original form HTML if not already stored
        const form = document.getElementById('customerForm');
        if (!form.dataset.originalHtml) {
            form.dataset.originalHtml = form.innerHTML;
        }
        
        const modal = document.getElementById('customerModal');
        document.getElementById('customerModalTitle').textContent = 'Customer Details';
        
        form.innerHTML = `
            <div class="form-group">
                <label><strong>Office:</strong></label>
                <p>${customer.office || '-'}</p>
            </div>
            <div class="form-group">
                <label><strong>Serial No:</strong></label>
                <p>${customer.serialNo || '-'}</p>
            </div>
            <div class="form-group">
                <label><strong>Customer Name:</strong></label>
                <p>${customer.name || '-'}</p>
            </div>
            <div class="form-group">
                <label><strong>Phone:</strong></label>
                <p>${customer.phone || '-'}</p>
            </div>
            <div class="form-group">
                <label><strong>Area:</strong></label>
                <p>${customer.area || '-'}</p>
            </div>
            <div class="form-group">
                <label><strong>ID:</strong></label>
                <p>${customer.idNumber || '-'}</p>
            </div>
            <div class="form-group">
                <label><strong>Box Number:</strong></label>
                <p>${customer.boxNumber || '-'}</p>
            </div>
            <div class="form-group">
                <label><strong>Package:</strong></label>
                <p>${pkg ? `${pkg.name} - ₹${pkg.price}` : '-'}</p>
            </div>
            <div class="form-group">
                <label><strong>Payment Status:</strong></label>
                <p>${customer.paymentStatus === 'paid' ? '<span class="badge badge-success">Paid</span>' : '<span class="badge badge-danger">Unpaid</span>'}</p>
            </div>
            <div class="form-group">
                <label><strong>Last Payment Date:</strong></label>
                <p>${customer.lastPaymentDate ? new Date(customer.lastPaymentDate).toLocaleDateString() : 'Never'}</p>
            </div>
            <div class="form-actions">
                ${customer.paymentStatus === 'unpaid' ? `
                    <button class="btn btn-success" onclick="paymentManager.initiatePayment('${customer._id || customer.id}'); closeModal('customerModal');">Pay Now</button>
                ` : ''}
                <button type="button" class="btn btn-secondary" onclick="customerManager.closeCustomerView()">Close</button>
            </div>
        `;
        
        modal.classList.add('active');
        } catch (error) {
            console.error('Error viewing customer:', error);
            alert('Error loading customer details: ' + (error.message || 'Unknown error'));
        }
    }

    closeCustomerView() {
        const form = document.getElementById('customerForm');
        if (form.dataset.originalHtml) {
            form.innerHTML = form.dataset.originalHtml;
            // Re-attach form submit listener
            form.addEventListener('submit', (e) => {
        e.preventDefault();
                this.saveCustomer();
            });
        }
        closeModal('customerModal');
        this.loadCustomers();
    }

    editCustomer(id) {
        this.openCustomerModal(id);
    }

    async deleteCustomer(id) {
        if (!confirm('Are you sure you want to delete this customer?')) {
        return;
    }
    
        try {
            await api.deleteCustomer(id);
            await this.loadCustomers();
            
            // Refresh dashboard
            if (app.currentRoute === 'dashboard') {
                app.loadDashboard();
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Error deleting customer: ' + (error.message || 'Unknown error'));
        }
    }

    async getCustomer(id) {
        try {
            return await api.getCustomer(id);
        } catch (error) {
            console.error('Error getting customer:', error);
            return null;
        }
    }

    openExcelImportModal() {
        const modal = document.getElementById('excelImportModal');
        document.getElementById('excelFileInput').value = '';
        document.getElementById('excelPreview').style.display = 'none';
        document.getElementById('processExcelBtn').style.display = 'none';
        document.getElementById('excelPreviewTable').innerHTML = '';
        document.getElementById('excelImportSummary').innerHTML = '';
        this.excelImportData = null;
        modal.classList.add('active');
    }

    handleExcelUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                if (jsonData.length === 0) {
                    alert('Excel file is empty');
        return;
    }
    
                // Parse and map data
                const parsedData = this.parseExcelData(jsonData);
                this.excelImportData = parsedData;
                this.previewExcelData(parsedData);
            } catch (error) {
                alert('Error reading Excel file: ' + error.message);
                console.error(error);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    parseExcelData(jsonData) {
        // Find header row (first row with text)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
            if (jsonData[i] && jsonData[i].length > 0 && typeof jsonData[i][0] === 'string') {
                headerRowIndex = i;
                break;
            }
        }

        const headers = jsonData[headerRowIndex].map(h => h ? h.toString().trim() : '');
        
        // Map column names to field names (case-insensitive, flexible matching)
        const columnMap = {};
        const expectedColumns = ['office', 'serial no', 'customer name', 'phone', 'area', 'package', 'id', 'box number'];
        
        headers.forEach((header, index) => {
            const headerLower = header.toLowerCase();
            expectedColumns.forEach(expected => {
                if (headerLower.includes(expected) || expected.includes(headerLower)) {
                    columnMap[expected] = index;
                }
            });
        });

        // Parse data rows
        const parsedRows = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const rowData = {
                office: this.getCellValue(row, columnMap['office']),
                serialNo: this.getCellValue(row, columnMap['serial no']),
                name: this.getCellValue(row, columnMap['customer name']),
                phone: this.getCellValue(row, columnMap['phone']),
                area: this.getCellValue(row, columnMap['area']),
                packageName: this.getCellValue(row, columnMap['package']),
                idNumber: this.getCellValue(row, columnMap['id']),
                boxNumber: this.getCellValue(row, columnMap['box number']),
                rowNumber: i + 1,
                errors: []
            };

            parsedRows.push(rowData);
        }

        return parsedRows;
    }

    getCellValue(row, columnIndex) {
        if (columnIndex === undefined || columnIndex === null || !row[columnIndex]) {
            return '';
        }
        const value = row[columnIndex];
        return value ? value.toString().trim() : '';
    }

    previewExcelData(parsedData) {
        const previewDiv = document.getElementById('excelPreview');
        const previewTable = document.getElementById('excelPreviewTable');
        const summaryDiv = document.getElementById('excelImportSummary');
        
        // Validate data - will be loaded async
        this.validateExcelData(parsedData);
        
        let warningCount = 0;
        let errorCount = 0;
        let readyCount = 0;

        parsedData.forEach(row => {
            row.warnings = [];
            row.errors = [];
            row.canImport = true;

            // Missing fields are warnings, not errors (can be edited later)
            if (!row.office) row.warnings.push('Office missing');
            if (!row.serialNo) row.warnings.push('Serial No missing');
            if (!row.name) row.warnings.push('Customer Name missing');
            if (!row.phone) row.warnings.push('Phone missing');
            if (!row.area) row.warnings.push('Area missing');
            if (!row.idNumber) row.warnings.push('ID missing');
            if (!row.boxNumber) row.warnings.push('Box Number missing');

            // Package validation - if package name is provided, it must exist
            if (row.packageName) {
                const pkg = packages.find(p => p.name.toLowerCase() === row.packageName.toLowerCase());
                if (!pkg) {
                    row.warnings.push(`Package "${row.packageName}" not found (can be set later)`);
                } else {
                    row.packageId = pkg.id;
                }
            } else {
                row.warnings.push('Package missing');
            }

            // Critical errors that prevent import
            // Check for duplicate box numbers (only if box number is provided)
            if (row.boxNumber && existingBoxNumbers.has(row.boxNumber.toString())) {
                row.errors.push('Box Number already exists');
                row.canImport = false;
            }

            // Count status
            if (row.errors.length > 0) {
                errorCount++;
            } else if (row.warnings.length > 0) {
                warningCount++;
                readyCount++; // Can import with warnings
            } else {
                readyCount++;
            }
        });

        // Display preview table (first 10 rows)
        const previewRows = parsedData.slice(0, 10);
        let tableHtml = `
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                    <tr style="background-color: var(--bg-color);">
                        <th style="padding: 8px; border: 1px solid var(--border-color);">Row</th>
                        <th style="padding: 8px; border: 1px solid var(--border-color);">Office</th>
                        <th style="padding: 8px; border: 1px solid var(--border-color);">Serial No</th>
                        <th style="padding: 8px; border: 1px solid var(--border-color);">Name</th>
                        <th style="padding: 8px; border: 1px solid var(--border-color);">Phone</th>
                        <th style="padding: 8px; border: 1px solid var(--border-color);">Area</th>
                        <th style="padding: 8px; border: 1px solid var(--border-color);">Package</th>
                        <th style="padding: 8px; border: 1px solid var(--border-color);">Box No</th>
                        <th style="padding: 8px; border: 1px solid var(--border-color);">Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        previewRows.forEach(row => {
            let statusCell = '';
            if (row.errors.length > 0) {
                statusCell = `<span style="color: var(--danger-color); font-size: 0.8rem;"><strong>Errors:</strong> ${row.errors.join(', ')}</span>`;
            } else if (row.warnings && row.warnings.length > 0) {
                statusCell = `<span style="color: var(--warning-color, #f59e0b); font-size: 0.8rem;"><strong>Warnings:</strong> ${row.warnings.join(', ')}<br/><small style="color: var(--text-secondary);">(Can import and edit later)</small></span>`;
            } else {
                statusCell = '<span style="color: var(--success-color);">✓ Ready to import</span>';
            }
            
            tableHtml += `
                <tr>
                    <td style="padding: 6px; border: 1px solid var(--border-color);">${row.rowNumber}</td>
                    <td style="padding: 6px; border: 1px solid var(--border-color);">${row.office || '-'}</td>
                    <td style="padding: 6px; border: 1px solid var(--border-color);">${row.serialNo || '-'}</td>
                    <td style="padding: 6px; border: 1px solid var(--border-color);">${row.name || '-'}</td>
                    <td style="padding: 6px; border: 1px solid var(--border-color);">${row.phone || '-'}</td>
                    <td style="padding: 6px; border: 1px solid var(--border-color);">${row.area || '-'}</td>
                    <td style="padding: 6px; border: 1px solid var(--border-color);">${row.packageName || '-'}</td>
                    <td style="padding: 6px; border: 1px solid var(--border-color);">${row.boxNumber || '-'}</td>
                    <td style="padding: 6px; border: 1px solid var(--border-color);">${statusCell}</td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';

        if (parsedData.length > 10) {
            tableHtml += `<p style="margin-top: 10px; font-size: 0.9rem; color: var(--text-secondary);">Showing first 10 rows of ${parsedData.length} total rows</p>`;
        }

        previewTable.innerHTML = tableHtml;

        // Display summary
        summaryDiv.innerHTML = `
            <div style="padding: 15px; background-color: var(--bg-color); border-radius: 6px;">
                <h4>Import Summary</h4>
                <p><strong>Total rows:</strong> ${parsedData.length}</p>
                <p style="color: var(--success-color);"><strong>Ready to import:</strong> ${readyCount}</p>
                ${warningCount > 0 ? `<p style="color: var(--warning-color, #f59e0b);"><strong>Rows with missing fields (warnings):</strong> ${warningCount} - Can be edited after import</p>` : ''}
                ${errorCount > 0 ? `<p style="color: var(--danger-color);"><strong>Rows with errors (skipped):</strong> ${errorCount}</p>` : ''}
                <p style="margin-top: 10px; font-size: 0.9rem; color: var(--text-secondary);">
                    <strong>Note:</strong> Rows with missing fields can still be imported and edited later. Only rows with duplicate box numbers will be skipped.
                </p>
        </div>
    `;
    
        previewDiv.style.display = 'block';
        
        if (readyCount > 0) {
            document.getElementById('processExcelBtn').style.display = 'inline-block';
        } else {
            document.getElementById('processExcelBtn').style.display = 'none';
            summaryDiv.innerHTML += '<p style="color: var(--danger-color); margin-top: 10px;">No rows can be imported. All rows have critical errors (duplicate box numbers).</p>';
        }
    }

    async importCustomersFromExcel() {
        if (!this.excelImportData || this.excelImportData.length === 0) {
            alert('No data to import');
            return;
        }

        try {
            const packages = await api.getPackages();
            const customers = await api.getCustomers();
            const existingBoxNumbers = new Set(customers.map(c => c.boxNumber && c.boxNumber.toString()));
            
            let importedCount = 0;
            let skippedCount = 0;
            let warningCount = 0;
            const customersToImport = [];

            this.excelImportData.forEach(row => {
                // Skip rows with critical errors (duplicate box numbers)
                if (row.errors && row.errors.length > 0) {
                    skippedCount++;
                    return;
                }

                // Double-check for duplicate box numbers (in case of duplicates within import)
                if (row.boxNumber && existingBoxNumbers.has(row.boxNumber.toString())) {
                    skippedCount++;
        return;
    }
    
                // Count warnings (missing fields)
                if (row.warnings && row.warnings.length > 0) {
                    warningCount++;
                }

                // Find package ID if package name is provided
                let packageId = null;
                if (row.packageName) {
                    const pkg = packages.find(p => {
                        const pName = p.name ? p.name.toLowerCase() : '';
                        return pName === row.packageName.toLowerCase();
                    });
                    if (pkg) {
                        packageId = pkg._id || pkg.id;
                    }
                }

                // Create customer with available data (missing fields can be empty/null and edited later)
                const newCustomer = {
                    office: row.office || '',
                    serialNo: row.serialNo || '',
                    name: row.name || '',
                    phone: row.phone || '',
                    area: row.area || '',
                    idNumber: row.idNumber || '',
                    boxNumber: row.boxNumber || '',
                    packageId: packageId || null,
                    agentId: null,
                    paymentStatus: 'unpaid',
                    lastPaymentDate: null
                };

                customersToImport.push(newCustomer);
                if (row.boxNumber) {
                    existingBoxNumbers.add(row.boxNumber.toString());
                }
                importedCount++;
            });

            // Import via API
            if (customersToImport.length > 0) {
                await api.importCustomers(customersToImport);
            }

            await this.loadCustomers();
            closeModal('excelImportModal');
            
            let message = `Import completed!\n\nImported: ${importedCount} customers`;
            if (warningCount > 0) {
                message += `\n${warningCount} customers have missing fields (can be edited now)`;
            }
            if (skippedCount > 0) {
                message += `\nSkipped: ${skippedCount} rows (duplicate box numbers)`;
            }
            
            alert(message);
            
            // Refresh dashboard
            if (app.currentRoute === 'dashboard') {
                app.loadDashboard();
            }
        } catch (error) {
            console.error('Error importing customers:', error);
            alert('Error importing customers: ' + (error.message || 'Unknown error'));
        }
    }

    async validateExcelData(parsedData) {
        try {
            const packages = await api.getPackages();
            const existingCustomers = await api.getCustomers();
            const existingBoxNumbers = new Set(existingCustomers.map(c => c.boxNumber && c.boxNumber.toString()));
            
            let warningCount = 0;
            let errorCount = 0;
            let readyCount = 0;

            parsedData.forEach(row => {
                row.warnings = [];
                row.errors = [];
                row.canImport = true;

                // Missing fields are warnings, not errors (can be edited later)
                if (!row.office) row.warnings.push('Office missing');
                if (!row.serialNo) row.warnings.push('Serial No missing');
                if (!row.name) row.warnings.push('Customer Name missing');
                if (!row.phone) row.warnings.push('Phone missing');
                if (!row.area) row.warnings.push('Area missing');
                if (!row.idNumber) row.warnings.push('ID missing');
                if (!row.boxNumber) row.warnings.push('Box Number missing');

                // Package validation - if package name is provided, it must exist
                if (row.packageName) {
                    const pkg = packages.find(p => {
                        const pName = p.name ? p.name.toLowerCase() : '';
                        return pName === row.packageName.toLowerCase();
                    });
                    if (!pkg) {
                        row.warnings.push(`Package "${row.packageName}" not found`);
                    }
                }

                // Critical error: Duplicate box number (only if box number is provided)
                if (row.boxNumber && existingBoxNumbers.has(row.boxNumber.toString())) {
                    row.errors.push(`Box number "${row.boxNumber}" already exists`);
                    row.canImport = false;
                    errorCount++;
                } else if (row.warnings.length > 0) {
                    warningCount++;
                    readyCount++;
                } else {
                    readyCount++;
                }
            });

            // Update preview with validation results
            this.previewExcelData(parsedData, warningCount, errorCount, readyCount);
        } catch (error) {
            console.error('Error validating Excel data:', error);
        }
    }

    async exportCustomersToExcel() {
        try {
            const customers = await api.getCustomers();
            const packages = await api.getPackages();
            
            if (customers.length === 0) {
                alert('No customers to export');
                return;
            }

            // Prepare data for Excel export
            const exportData = [];
            
            // Add header row
            exportData.push([
                'Office',
                'Serial No',
                'Customer Name',
                'Phone',
                'Area',
                'Package',
                'ID',
                'Box Number',
                'Payment Status',
                'Last Payment Date'
            ]);

            // Add customer rows
            customers.forEach(customer => {
                const packageId = customer.packageId?._id || customer.packageId;
                const pkg = packages.find(p => {
                    const pId = p._id || p.id;
                    return pId && pId.toString() === packageId?.toString();
                });
                const packageName = pkg ? pkg.name : (customer.packageName || '');
                
                exportData.push([
                    customer.office || '',
                    customer.serialNo || '',
                    customer.name || '',
                    customer.phone || '',
                    customer.area || '',
                    packageName,
                    customer.idNumber || '',
                    customer.boxNumber || '',
                    customer.paymentStatus || 'unpaid',
                    customer.lastPaymentDate ? new Date(customer.lastPaymentDate).toLocaleDateString() : ''
                ]);
            });

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(exportData);

        // Set column widths for better readability
        const columnWidths = [
            { wch: 15 }, // Office
            { wch: 12 }, // Serial No
            { wch: 25 }, // Customer Name
            { wch: 15 }, // Phone
            { wch: 20 }, // Area
            { wch: 15 }, // Package
            { wch: 15 }, // ID
            { wch: 15 }, // Box Number
            { wch: 15 }, // Payment Status
            { wch: 20 }  // Last Payment Date
        ];
        worksheet['!cols'] = columnWidths;

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

        // Generate filename with current date
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const filename = `Customers_Export_${dateStr}.xlsx`;

        // Export to file
        XLSX.writeFile(workbook, filename);
        
        alert(`Exported ${customers.length} customer(s) to ${filename}`);
    }
}

// Initialize customer manager
let customerManager;
document.addEventListener('DOMContentLoaded', () => {
    customerManager = new CustomerManager();
    window.CustomerManager = customerManager;
    
    // Populate agent filter dropdown
    if (document.getElementById('customerFilterAgent')) {
        customerManager.populateAgentDropdown();
    }
});

