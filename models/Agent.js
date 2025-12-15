const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    agentId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Agent', agentSchema);
