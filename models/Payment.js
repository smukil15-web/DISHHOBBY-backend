const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        default: Date.now
    },
    collectionDate: {
        type: Date,
        required: true
    },
    subscriptionMonth: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    subscriptionYear: {
        type: Number,
        required: true
    },
    subscriptionMonthName: {
        type: String,
        required: true
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        default: null
    },
    collectedBy: {
        type: String,
        default: 'Admin'
    },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'completed'
    },
    method: {
        type: String,
        default: 'Cash'
    }
}, {
    timestamps: true
});

// Index for faster queries
paymentSchema.index({ customerId: 1, subscriptionMonth: 1, subscriptionYear: 1 });
paymentSchema.index({ agentId: 1, date: 1 });
paymentSchema.index({ collectionDate: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
