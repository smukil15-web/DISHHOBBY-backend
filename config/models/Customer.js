const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    office: {
        type: String,
        default: ''
    },
    serialNo: {
        type: String,
        default: ''
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    area: {
        type: String,
        default: ''
    },
    idNumber: {
        type: String,
        default: ''
    },
    boxNumber: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
        default: null
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        default: null
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'unpaid'],
        default: 'unpaid'
    },
    lastPaymentDate: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);
