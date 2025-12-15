// Collection Agent Management
class AgentManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add agent button
        const addBtn = document.getElementById('addAgentBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAgentModal());
        }

        // Agent form submit
        const agentForm = document.getElementById('agentForm');
        if (agentForm) {
            agentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAgent();
            });
        }

        // Close modal
        const agentModal = document.getElementById('agentModal');
        if (agentModal) {
            const closeBtn = agentModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => closeModal('agentModal'));
            }
        }

        // Assign customers modal
        const assignCustomersModal = document.getElementById('assignCustomersModal');
        if (assignCustomersModal) {
            const closeBtn = assignCustomersModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => closeModal('assignCustomersModal'));
            }
        }

        // Save assignments button
        const saveAssignmentsBtn = document.getElementById('saveAssignmentsBtn');
        if (saveAssignmentsBtn) {
            saveAssignmentsBtn.addEventListener('click', () => this.saveCustomerAssignments());
        }

        // Customer search in assign modal
        const customerSearchAssign = document.getElementById('customerSearchAssign');
        if (customerSearchAssign) {
            customerSearchAssign.addEventListener('input', () => this.filterCustomersForAssign());
        }
    }

    async loadAgents() {
        try {
            const agents = await api.getAgents();
            const agentsList = document.getElementById('agentsList');
            
            if (!agents || agents.length === 0) {
                agentsList.innerHTML = '<p style="color: var(--text-secondary);">No collection agents found. Add your first agent!</p>';
                return;
            }

            // Get customer counts
            const customers = await api.getCustomers();
        
            // Get users for username lookup
            const users = await api.getUsers ? await api.getUsers() : [];
            
            agentsList.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Agent Name</th>
                            <th>Agent ID</th>
                            <th>Username</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Assigned Customers</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${agents.map(agent => {
                            const agentId = agent._id || agent.id;
                            const user = users.find(u => {
                                const uAgentId = u.agentId?._id || u.agentId;
                                return uAgentId && uAgentId.toString() === agentId.toString() && u.role === 'agent';
                            });
                            const username = user ? user.username : '-';
                            const assignedCustomers = customers.filter(c => {
                                const cAgentId = c.agentId?._id || c.agentId;
                                return cAgentId && cAgentId.toString() === agentId.toString();
                            });
                            const customerCount = assignedCustomers.length;
                            return `
                            <tr>
                                <td><strong>${agent.name}</strong></td>
                                <td>${agent.agentId}</td>
                                <td>${username}</td>
                                <td>${agent.phone}</td>
                                <td>${agent.email || '-'}</td>
                                <td>${customerCount} customer(s)</td>
                                <td>
                                    <!-- Assign Customers button removed - all agents can collect from all customers -->
                                    <button class="btn btn-sm btn-primary" onclick="agentManager.editAgent('${agentId}')">Edit</button>
                                    <button class="btn btn-sm btn-danger" onclick="agentManager.deleteAgent('${agentId}')">Delete</button>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        } catch (error) {
            console.error('Error loading agents:', error);
            const agentsList = document.getElementById('agentsList');
            if (agentsList) {
                agentsList.innerHTML = '<p style="color: var(--danger-color);">Error loading agents. Please refresh the page.</p>';
            }
        }
    }

    async openAgentModal(agentId = null) {
        const modal = document.getElementById('agentModal');
        const title = document.getElementById('agentModalTitle');
        const form = document.getElementById('agentForm');
        const passwordInput = document.getElementById('agentPassword');
        const passwordRequired = document.getElementById('agentPasswordRequired');
        const passwordHint = document.getElementById('agentPasswordHint');
        
        if (agentId) {
            title.textContent = 'Edit Collection Agent';
            try {
                const agent = await api.getAgent(agentId);
                if (agent) {
                    document.getElementById('agentId').value = agent._id || agent.id;
                    document.getElementById('agentName').value = agent.name;
                    document.getElementById('agentAgentId').value = agent.agentId;
                    document.getElementById('agentPhone').value = agent.phone;
                    document.getElementById('agentEmail').value = agent.email || '';
                    
                    // Load username (from API response if available)
                    document.getElementById('agentUsername').value = agent.username || '';
                    
                    // Password is optional when editing
                    passwordInput.value = '';
                    passwordInput.removeAttribute('required');
                    if (passwordRequired) passwordRequired.textContent = '';
                    if (passwordHint) passwordHint.style.display = 'block';
                }
            } catch (error) {
                console.error('Error loading agent:', error);
                alert('Error loading agent details');
            }
        } else {
            title.textContent = 'Add Collection Agent';
            form.reset();
            document.getElementById('agentId').value = '';
            
            // Password is required when creating
            passwordInput.setAttribute('required', 'required');
            if (passwordRequired) passwordRequired.textContent = '*';
            if (passwordHint) passwordHint.style.display = 'none';
        }
        
        modal.classList.add('active');
    }

    async saveAgent() {
        const id = document.getElementById('agentId').value;
        const name = document.getElementById('agentName').value.trim();
        const agentId = document.getElementById('agentAgentId').value.trim();
        const phone = document.getElementById('agentPhone').value.trim();
        const email = document.getElementById('agentEmail').value.trim();
        const username = document.getElementById('agentUsername').value.trim();
        const password = document.getElementById('agentPassword').value;

        // Validate required fields
        if (!name || !agentId || !phone || !username) {
            alert('Please fill in all required fields');
            return;
        }

        // Password required for new agents
        if (!id && !password) {
            alert('Password is required for new agents');
            return;
        }

        try {
            const agentData = {
                name,
                agentId,
                phone,
                email,
                username,
                password: id ? (password || undefined) : password // Only send password if provided or if new
            };

            if (id) {
                // Update existing agent
                await api.updateAgent(id, agentData);
            } else {
                // Create new agent
                await api.createAgent(agentData);
            }

            await this.loadAgents();
            closeModal('agentModal');
            
            // Refresh customer form if it exists
            if (window.CustomerManager) {
                window.CustomerManager.populateAgentDropdown();
            }
        } catch (error) {
            console.error('Error saving agent:', error);
            alert('Error saving agent: ' + (error.message || 'Unknown error'));
        }
    }

    editAgent(id) {
        this.openAgentModal(id);
    }

    async deleteAgent(id) {
        if (!confirm('Are you sure you want to delete this agent?')) {
            return;
        }

        try {
            await api.deleteAgent(id);
            await this.loadAgents();
        } catch (error) {
            console.error('Error deleting agent:', error);
            alert('Error deleting agent: ' + (error.message || 'Unknown error'));
        }
    }

    getAgent(id) {
        const agents = app.getData('agents') || [];
        return agents.find(a => a.id === id);
    }

    getAllAgents() {
        return app.getData('agents') || [];
    }

    assignCustomers(agentId) {
        this.currentAssigningAgentId = agentId;
        const agents = app.getData('agents') || [];
        const agent = agents.find(a => a.id === agentId);
        
        if (!agent) return;

        const modal = document.getElementById('assignCustomersModal');
        const title = document.getElementById('assignCustomersModalTitle');
        title.textContent = `Assign Customers to ${agent.name}`;

        this.loadCustomersForAssign();
        modal.classList.add('active');
    }

    loadCustomersForAssign() {
        const customers = app.getData('customers') || [];
        const agentId = this.currentAssigningAgentId;
        const searchTerm = document.getElementById('customerSearchAssign')?.value.toLowerCase() || '';
        
        // Filter customers based on search - search by office, name, and phone number
        let filteredCustomers = customers;
        if (searchTerm) {
            filteredCustomers = customers.filter(c => {
                const nameMatch = c.name && c.name.toLowerCase().includes(searchTerm);
                const officeMatch = c.office && c.office.toLowerCase().includes(searchTerm);
                const phoneMatch = c.phone && c.phone.includes(searchTerm);
                const boxNumberMatch = c.boxNumber && c.boxNumber.toLowerCase().includes(searchTerm);
                
                return nameMatch || officeMatch || phoneMatch || boxNumberMatch;
            });
        }

        const customersList = document.getElementById('customersAssignList');
        const selectedCountEl = document.getElementById('selectedCount');

        if (filteredCustomers.length === 0) {
            customersList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No customers found.</p>';
            return;
        }

        // Check which customers are currently assigned to this agent
        const currentlyAssigned = filteredCustomers.filter(c => c.agentId === agentId);
        
        let html = '<div style="display: grid; gap: 8px;">';
        filteredCustomers.forEach(customer => {
            const isAssigned = customer.agentId === agentId;
            html += `
                <div style="display: flex; align-items: center; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background-color: ${isAssigned ? 'var(--bg-color)' : 'white'};">
                    <input type="checkbox" 
                           id="customer_${customer.id}" 
                           data-customer-id="${customer.id}"
                           ${isAssigned ? 'checked' : ''}
                           onchange="agentManager.updateSelectedCount()"
                           style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                    <label for="customer_${customer.id}" style="flex: 1; cursor: pointer; margin: 0;">
                        <div style="font-weight: 500;">${customer.name || 'Unnamed'} ${customer.boxNumber ? `(Box: ${customer.boxNumber})` : ''}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">
                            ${customer.phone ? `Phone: ${customer.phone} | ` : ''}
                            ${customer.area ? `Area: ${customer.area}` : ''}
                            ${isAssigned ? ' <span style="color: var(--success-color);">(Currently Assigned)</span>' : ''}
                        </div>
                    </label>
                </div>
            `;
        });
        html += '</div>';

        customersList.innerHTML = html;
        this.updateSelectedCount();
    }

    filterCustomersForAssign() {
        this.loadCustomersForAssign();
    }

    updateSelectedCount() {
        const checkboxes = document.querySelectorAll('#customersAssignList input[type="checkbox"]');
        const checked = document.querySelectorAll('#customersAssignList input[type="checkbox"]:checked');
        const selectedCountEl = document.getElementById('selectedCount');
        if (selectedCountEl) {
            selectedCountEl.textContent = `${checked.length} of ${checkboxes.length} selected`;
        }
    }

    selectAllCustomers() {
        const checkboxes = document.querySelectorAll('#customersAssignList input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
        this.updateSelectedCount();
    }

    deselectAllCustomers() {
        const checkboxes = document.querySelectorAll('#customersAssignList input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        this.updateSelectedCount();
    }

    saveCustomerAssignments() {
        const agentId = this.currentAssigningAgentId;
        if (!agentId) return;

        const checkboxes = document.querySelectorAll('#customersAssignList input[type="checkbox"]:checked');
        const selectedCustomerIds = Array.from(checkboxes).map(cb => cb.dataset.customerId);

        const customers = app.getData('customers') || [];
        
        // Update all customers - assign selected ones to this agent, unassign others that were previously assigned
        customers.forEach(customer => {
            if (customer.agentId === agentId) {
                // Previously assigned - unassign if not in selected list
                if (!selectedCustomerIds.includes(customer.id)) {
                    customer.agentId = null;
                }
            } else if (selectedCustomerIds.includes(customer.id)) {
                // Newly selected - assign to this agent
                customer.agentId = agentId;
            }
        });

        app.saveData('customers', customers);
        closeModal('assignCustomersModal');
        this.loadAgents();
        
        // Refresh customers list if open
        if (window.CustomerManager) {
            window.CustomerManager.loadCustomers();
        }
        
        alert(`Successfully assigned ${selectedCustomerIds.length} customer(s) to agent.`);
    }
}

// Initialize agent manager
let agentManager;
document.addEventListener('DOMContentLoaded', () => {
    agentManager = new AgentManager();
    window.AgentManager = agentManager;
});

