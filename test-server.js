// Test server setup that mocks external services
require('dotenv').config({ path: '.env.test' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Mock the services before requiring routes
jest.mock('../services/permit');
jest.mock('../services/algolia');
jest.mock('../services/secureSearch');

const authRoutes = require('../routes/auth');
const searchRoutes = require('../routes/search');
const adminRoutes = require('../routes/admin');

const app = express();

// Basic middleware for testing
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error'
    }
  });
});

module.exports = app;