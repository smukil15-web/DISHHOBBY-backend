const express = require('express');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Dashboard data
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        
        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        let paymentQuery = { status: 'completed' };
        if (req.user.role === 'agent' && req.user.agentId) {
            paymentQuery.agentId = req.user.agentId;
        }

        // Total customers
        let customerQuery = {};
        if (req.user.role === 'agent' && req.user.agentId) {
            customerQuery.agentId = req.user.agentId;
        }
        const totalCustomers = await Customer.countDocuments(customerQuery);

        // Unpaid customers
        const unpaidCustomers = await Customer.countDocuments({ 
            ...customerQuery, 
            paymentStatus: 'unpaid' 
        });

        // Today's payments
        const todayPayments = await Payment.find({
            ...paymentQuery,
            collectionDate: { $gte: today, $lte: todayEnd }
        });
        const todayTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0);
        const todayPaidCount = new Set(todayPayments.map(p => p.customerId.toString())).size;

        // Monthly payments
        const monthlyPayments = await Payment.find({
            ...paymentQuery,
            collectionDate: { $gte: currentMonth, $lt: nextMonth }
        });
        const monthlyTotal = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

        // Current month paid customers (by subscription)
        const currentYear = today.getFullYear();
        const currentMonthNum = today.getMonth() + 1;
        const currentMonthPaidPayments = await Payment.find({
            ...paymentQuery,
            subscriptionMonth: currentMonthNum,
            subscriptionYear: currentYear
        });
        const currentMonthPaidCount = new Set(
            currentMonthPaidPayments.map(p => p.customerId.toString())
        ).size;

        res.json({
            totalCustomers,
            unpaidCustomers,
            todayTotal,
            todayPaidCount,
            monthlyTotal,
            currentMonthPaidCount,
            currentMonthUnpaidCount: totalCustomers - currentMonthPaidCount
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Monthly report
router.get('/monthly', authenticate, async (req, res) => {
    try {
        const { month, year } = req.query;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        let query = {
            status: 'completed',
            collectionDate: { $gte: startDate, $lte: endDate }
        };

        if (req.user.role === 'agent' && req.user.agentId) {
            query.agentId = req.user.agentId;
        }

        const payments = await Payment.find(query)
            .populate('customerId', 'name boxNumber')
            .populate('agentId', 'name')
            .sort({ collectionDate: -1 });

        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Daily report
router.get('/daily', authenticate, async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const targetDateEnd = new Date(targetDate);
        targetDateEnd.setHours(23, 59, 59, 999);

        let query = {
            status: 'completed',
            collectionDate: { $gte: targetDate, $lte: targetDateEnd }
        };

        if (req.user.role === 'agent' && req.user.agentId) {
            query.agentId = req.user.agentId;
        }

        const payments = await Payment.find(query)
            .populate('customerId', 'name boxNumber')
            .populate('agentId', 'name')
            .sort({ collectionDate: -1 });

        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
