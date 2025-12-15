const express = require('express');
const Package = require('../models/Package');
const { authenticate, isAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all packages
router.get('/', authenticate, async (req, res) => {
    try {
        const packages = await Package.find().sort({ name: 1 });
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single package
router.get('/:id', authenticate, async (req, res) => {
    try {
        const package = await Package.findById(req.params.id);
        if (!package) {
            return res.status(404).json({ error: 'Package not found' });
        }
        res.json(package);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create package
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const package = new Package(req.body);
        await package.save();
        res.status(201).json(package);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update package
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const package = await Package.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!package) {
            return res.status(404).json({ error: 'Package not found' });
        }
        
        res.json(package);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete package
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const Customer = require('../models/Customer');
        const customerCount = await Customer.countDocuments({ packageId: req.params.id });
        if (customerCount > 0) {
            return res.status(400).json({ 
                error: `Cannot delete package. ${customerCount} customer(s) are using it.` 
            });
        }

        await Package.findByIdAndDelete(req.params.id);
        res.json({ message: 'Package deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
