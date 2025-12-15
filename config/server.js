const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/reminders', require('./routes/reminders'));

// Root route
app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'Cable Services Backend API is running' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Initialize default admin user if not exists
const initializeAdmin = async () => {
    try {
        const User = require('./models/User');
        const adminExists = await User.findOne({ username: 'dishhobby', role: 'admin' });
        
        if (!adminExists) {
            const admin = new User({
                username: 'dishhobby',
                password: '12345678',
                role: 'admin'
            });
            await admin.save();
            console.log('Default admin user created: dishhobby / 12345678');
        } else {
            console.log('Admin user already exists: dishhobby');
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
    }
};

// Connect to database and start server
const startServer = async () => {
    try {
        // Connect to database first
        await connectDB();
        
        // Initialize admin user after database connection
        await initializeAdmin();
        
        // Start server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the application
startServer();

module.exports = app;
