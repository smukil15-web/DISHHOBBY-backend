const express = require('express');
const Agent = require('../models/Agent');
const User = require('../models/User');
const Customer = require('../models/Customer');
const { authenticate, isAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all agents
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const agents = await Agent.find().sort({ name: 1 });
        const agentsWithUsers = await Promise.all(agents.map(async (agent) => {
            const user = await User.findOne({ agentId: agent._id.toString(), role: 'agent' });
            const customerCount = await Customer.countDocuments({ agentId: agent._id });
            return {
                ...agent.toObject(),
                username: user ? user.username : null,
                customerCount
            };
        }));
        res.json(agentsWithUsers);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single agent
router.get('/:id', authenticate, async (req, res) => {
    try {
        const agent = await Agent.findById(req.params.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        res.json(agent);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create agent
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { name, agentId, phone, email, username, password } = req.body;

        // Check for duplicate agentId
        const existingAgent = await Agent.findOne({ agentId });
        if (existingAgent) {
            return res.status(400).json({ error: 'Agent ID already exists' });
        }

        // Check for duplicate username
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const agent = new Agent({ name, agentId, phone, email });
        await agent.save();

        // Create user account
        const user = new User({
            username,
            password,
            role: 'agent',
            agentId: agent._id.toString()
        });
        await user.save();

        res.status(201).json(agent);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update agent
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { name, agentId, phone, email, username, password } = req.body;
        
        const agent = await Agent.findById(req.params.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Check for duplicate agentId if changed
        if (agentId && agentId !== agent.agentId) {
            const existingAgent = await Agent.findOne({ agentId, _id: { $ne: req.params.id } });
            if (existingAgent) {
                return res.status(400).json({ error: 'Agent ID already exists' });
            }
        }

        // Update agent
        agent.name = name || agent.name;
        agent.agentId = agentId || agent.agentId;
        agent.phone = phone || agent.phone;
        agent.email = email || agent.email;
        await agent.save();

        // Update user account if username provided
        if (username) {
            const user = await User.findOne({ agentId: req.params.id, role: 'agent' });
            if (user) {
                // Check username conflict
                const existingUser = await User.findOne({ username, _id: { $ne: user._id } });
                if (existingUser) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                user.username = username;
                if (password) {
                    user.password = password;
                }
                await user.save();
            }
        }

        res.json(agent);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete agent
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        // Check if agent has customers
        const customerCount = await Customer.countDocuments({ agentId: req.params.id });
        if (customerCount > 0) {
            return res.status(400).json({ 
                error: `Cannot delete agent. ${customerCount} customer(s) are assigned.` 
            });
        }

        await Agent.findByIdAndDelete(req.params.id);
        
        // Delete associated user account
        await User.findOneAndDelete({ agentId: req.params.id, role: 'agent' });

        res.json({ message: 'Agent deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
