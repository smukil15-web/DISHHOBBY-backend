const express = require('express');
const Customer = require('../models/Customer');
const { authenticate, isAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all customers
router.get('/', authenticate, async (req, res) => {
    try {
        let query = {};
        
        // Agents only see their assigned customers (if needed)
        if (req.user.role === 'agent' && req.user.agentId) {
            query.agentId = req.user.agentId;
        }

        const customers = await Customer.find(query).populate('packageId', 'name price').populate('agentId', 'name');
        res.json(customers);
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single customer
router.get('/:id', authenticate, async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id)
            .populate('packageId', 'name price')
            .populate('agentId', 'name');
        
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create customer
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const customer = new Customer(req.body);
        await customer.save();
        res.status(201).json(customer);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Box number already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Update customer
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        res.json(customer);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Box number already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete customer
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json({ message: 'Customer deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Bulk import customers
router.post('/import', authenticate, isAdmin, async (req, res) => {
    try {
        const { customers } = req.body;
        const results = { success: [], errors: [] };

        for (const customerData of customers) {
            try {
                const customer = new Customer(customerData);
                await customer.save();
                results.success.push(customer);
            } catch (error) {
                results.errors.push({ data: customerData, error: error.message });
            }
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
