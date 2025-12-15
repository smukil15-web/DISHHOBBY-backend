const express = require('express');
const Reminder = require('../models/Reminder');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Package = require('../models/Package');
const { authenticate, isAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all reminders
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const reminders = await Reminder.find()
            .populate('customerId', 'name boxNumber phone')
            .sort({ date: -1 })
            .limit(100);
        res.json(reminders);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get unpaid customers for current month
router.get('/unpaid', authenticate, isAdmin, async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const currentMonthNum = new Date().getMonth() + 1;

        // Get customers who have paid for current subscription month
        const paidPayments = await Payment.find({
            status: 'completed',
            subscriptionMonth: currentMonthNum,
            subscriptionYear: currentYear
        });
        const paidCustomerIds = new Set(paidPayments.map(p => p.customerId.toString()));

        // Get all customers with phone numbers
        const allCustomers = await Customer.find({ phone: { $exists: true, $ne: '' } })
            .populate('packageId', 'name price');

        // Filter unpaid customers
        const unpaidCustomers = allCustomers
            .filter(c => !paidCustomerIds.has(c._id.toString()))
            .map(customer => ({
                id: customer._id,
                name: customer.name,
                boxNumber: customer.boxNumber,
                phone: customer.phone,
                amount: customer.packageId ? customer.packageId.price : 0
            }));

        res.json(unpaidCustomers);
    } catch (error) {
        console.error('Get unpaid customers error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create reminder
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const reminder = new Reminder(req.body);
        await reminder.save();
        res.status(201).json(reminder);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
