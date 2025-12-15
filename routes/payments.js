const express = require('express');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all payments
router.get('/', authenticate, async (req, res) => {
    try {
        let query = { status: 'completed' };
        
        // Agents only see their own payments
        if (req.user.role === 'agent' && req.user.agentId) {
            query.agentId = req.user.agentId;
        }

        const payments = await Payment.find(query)
            .populate('customerId', 'name boxNumber phone')
            .populate('agentId', 'name')
            .sort({ date: -1 });
        
        res.json(payments);
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get payments by agent
router.get('/agent/:agentId', authenticate, async (req, res) => {
    try {
        const payments = await Payment.find({ 
            agentId: req.params.agentId,
            status: 'completed'
        })
        .populate('customerId', 'name boxNumber')
        .sort({ date: -1 });
        
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create payment
router.post('/', authenticate, async (req, res) => {
    try {
        const { customerId, amount, subscriptionMonth, subscriptionYear, collectionDate, agentId } = req.body;

        // Check for duplicate payment
        const existingPayment = await Payment.findOne({
            customerId,
            subscriptionMonth,
            subscriptionYear,
            status: 'completed'
        });

        if (existingPayment) {
            return res.status(400).json({ 
                error: 'Payment already exists for this subscription period' 
            });
        }

        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Get agent name if agentId provided
        let collectedBy = 'Admin';
        if (agentId) {
            const Agent = require('../models/Agent');
            const agent = await Agent.findById(agentId);
            collectedBy = agent ? agent.name : 'Admin';
        }

        const payment = new Payment({
            customerId,
            customerName: customer.name,
            amount,
            collectionDate: new Date(collectionDate),
            subscriptionMonth,
            subscriptionYear,
            subscriptionMonthName: months[subscriptionMonth - 1],
            agentId: agentId || req.user.agentId || null,
            collectedBy,
            status: 'completed'
        });

        await payment.save();

        // Update customer payment status
        customer.paymentStatus = 'paid';
        customer.lastPaymentDate = new Date(collectionDate);
        await customer.save();

        const populatedPayment = await Payment.findById(payment._id)
            .populate('customerId', 'name boxNumber')
            .populate('agentId', 'name');

        res.status(201).json(populatedPayment);
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update payment
router.put('/:id', authenticate, async (req, res) => {
    try {
        const payment = await Payment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('customerId', 'name boxNumber').populate('agentId', 'name');

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete payment
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const payment = await Payment.findByIdAndDelete(req.params.id);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Update customer payment status if needed
        const customer = await Customer.findById(payment.customerId);
        if (customer) {
            const remainingPayments = await Payment.countDocuments({
                customerId: customer._id,
                status: 'completed'
            });
            if (remainingPayments === 0) {
                customer.paymentStatus = 'unpaid';
                customer.lastPaymentDate = null;
                await customer.save();
            }
        }

        res.json({ message: 'Payment deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
