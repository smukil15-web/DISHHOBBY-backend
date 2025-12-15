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

    async openPackageModal(packageId = null) {
        const modal = document.getElementById('packageModal');
        const title = document.getElementById('packageModalTitle');
        const form = document.getElementById('packageForm');
        
        if (packageId) {
            title.textContent = 'Edit Package';
            try {
                const pkg = await api.getPackage(packageId);
                if (pkg) {
                    document.getElementById('packageId').value = pkg._id || pkg.id;
                    document.getElementById('packageName').value = pkg.name;
                    document.getElementById('packagePrice').value = pkg.price;
                    document.getElementById('packageDescription').value = pkg.description || '';
                }
            } catch (error) {
                console.error('Error loading package:', error);
                alert('Error loading package details');
            }
        } else {
            title.textContent = 'Add Package';
            form.reset();
            document.getElementById('packageId').value = '';
        }
        
        modal.classList.add('active');
    }

    async savePackage() {
        const id = document.getElementById('packageId').value;
        const name = document.getElementById('packageName').value.trim();
        const price = parseFloat(document.getElementById('packagePrice').value);
        const description = document.getElementById('packageDescription').value.trim();

        if (!name || !price || price <= 0) {
            alert('Please fill in all required fields with valid values');
            return;
        }

        try {
            const packageData = { name, price, description };
            
            if (id) {
                // Update existing
                await api.updatePackage(id, packageData);
            } else {
                // Add new
                await api.createPackage(packageData);
            }

            await this.loadPackages();
            closeModal('packageModal');
            
            // Refresh customer form if it exists
            if (window.CustomerManager) {
                window.CustomerManager.populatePackageDropdown();
            }
        } catch (error) {
            console.error('Error saving package:', error);
            alert('Error saving package. Please try again.');
        }
    }

    async editPackage(id) {
        await this.openPackageModal(id);
    }

    async deletePackage(id) {
        if (!confirm('Are you sure you want to delete this package?')) {
            return;
        }

        try {
            // Check if any customers are using this package
            const customers = await api.getCustomers();
            const customersUsingPackage = customers.filter(c => (c.packageId === id || c.package?._id === id || c.package?.id === id));
            
            if (customersUsingPackage.length > 0) {
                alert(`Cannot delete package. ${customersUsingPackage.length} customer(s) are using this package.`);
                return;
            }

            await api.deletePackage(id);
            await this.loadPackages();
        } catch (error) {
            console.error('Error deleting package:', error);
            alert('Error deleting package. Please try again.');
        }
    }

    async getPackage(id) {
        try {
            return await api.getPackage(id);
        } catch (error) {
            console.error('Error getting package:', error);
            return null;
        }
    }

    async getAllPackages() {
        try {
            return await api.getPackages();
        } catch (error) {
            console.error('Error getting packages:', error);
            return [];
        }
    }
}

// Initialize package manager
let packageManager;
document.addEventListener('DOMContentLoaded', () => {
    packageManager = new PackageManager();
    window.PackageManager = packageManager;
});


