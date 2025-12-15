// Package Management
class PackageManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add package button
        const addBtn = document.getElementById('addPackageBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openPackageModal());
        }

        // Package form submit
        const packageForm = document.getElementById('packageForm');
        if (packageForm) {
            packageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePackage();
            });
        }

        // Close modal
        const packageModal = document.getElementById('packageModal');
        if (packageModal) {
            const closeBtn = packageModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => closeModal('packageModal'));
            }
        }
    }

    async loadPackages() {
        try {
            const packages = await api.getPackages();
            const packagesList = document.getElementById('packagesList');
            
            if (!packages || packages.length === 0) {
                packagesList.innerHTML = '<p style="color: var(--text-secondary);">No packages found. Add your first package!</p>';
                return;
            }

            packagesList.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Package Name</th>
                                <th>Price</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${packages.map(pkg => {
                                const pkgId = pkg._id || pkg.id;
                                return `
                                <tr>
                                    <td><strong>${pkg.name}</strong></td>
                                    <td>₹${parseFloat(pkg.price).toFixed(2)}</td>
                                    <td>${pkg.description || '-'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" onclick="packageManager.editPackage('${pkgId}')">Edit</button>
                                        <button class="btn btn-sm btn-danger" onclick="packageManager.deletePackage('${pkgId}')">Delete</button>
                                    </td>
                                </tr>
                            `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error loading packages:', error);
            const packagesList = document.getElementById('packagesList');
            if (packagesList) {
                packagesList.innerHTML = '<p style="color: var(--text-secondary);">Error loading packages.</p>';
            }
        }
    }

    openPackageModal(packageId = null) {
        const modal = document.getElementById('packageModal');
        const title = document.getElementById('packageModalTitle');
        const form = document.getElementById('packageForm');
        
        if (packageId) {
            title.textContent = 'Edit Package';
            const packages = app.getData('packages') || [];
            const pkg = packages.find(p => p.id === packageId);
            if (pkg) {
                document.getElementById('packageId').value = pkg.id;
                document.getElementById('packageName').value = pkg.name;
                document.getElementById('packagePrice').value = pkg.price;
                document.getElementById('packageDescription').value = pkg.description || '';
            }
        } else {
            title.textContent = 'Add Package';
            form.reset();
            document.getElementById('packageId').value = '';
        }
        
        modal.classList.add('active');
    }

    savePackage() {
        const id = document.getElementById('packageId').value;
        const name = document.getElementById('packageName').value.trim();
        const price = parseFloat(document.getElementById('packagePrice').value);
        const description = document.getElementById('packageDescription').value.trim();

        if (!name || !price || price <= 0) {
            alert('Please fill in all required fields with valid values');
            return;
        }

        const packages = app.getData('packages') || [];
        
        if (id) {
            // Update existing
            const index = packages.findIndex(p => p.id === id);
            if (index !== -1) {
                packages[index] = { ...packages[index], name, price, description };
            }
        } else {
            // Add new
            const newPackage = {
                id: app.generateId(),
                name,
                price,
                description
            };
            packages.push(newPackage);
        }

        app.saveData('packages', packages);
        this.loadPackages();
        closeModal('packageModal');
        
        // Refresh customer form if it exists
        if (window.CustomerManager) {
            window.CustomerManager.populatePackageDropdown();
        }
    }

    editPackage(id) {
        this.openPackageModal(id);
    }

    deletePackage(id) {
        if (!confirm('Are you sure you want to delete this package?')) {
            return;
        }

        // Check if any customers are using this package
        const customers = app.getData('customers') || [];
        const customersUsingPackage = customers.filter(c => c.packageId === id);
        
        if (customersUsingPackage.length > 0) {
            alert(`Cannot delete package. ${customersUsingPackage.length} customer(s) are using this package.`);
            return;
        }

        const packages = app.getData('packages') || [];
        const filtered = packages.filter(p => p.id !== id);
        app.saveData('packages', filtered);
        this.loadPackages();
    }

    getPackage(id) {
        const packages = app.getData('packages') || [];
        return packages.find(p => p.id === id);
    }

    getAllPackages() {
        return app.getData('packages') || [];
    }
}

// Initialize package manager
let packageManager;
document.addEventListener('DOMContentLoaded', () => {
    packageManager = new PackageManager();
    window.PackageManager = packageManager;
});


