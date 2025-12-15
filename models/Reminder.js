const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    boxNumber: {
        type: String,
        default: null
    },
    date: {
        type: Date,
        default: Date.now
    },
    method: {
        type: String,
        enum: ['sms', 'whatsapp'],
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'failed'],
        default: 'sent'
    },
    subscriptionMonth: {
        type: Number,
        required: true
    },
    subscriptionYear: {
        type: Number,
        required: true
    },
    monthYear: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Reminder', reminderSchema);
