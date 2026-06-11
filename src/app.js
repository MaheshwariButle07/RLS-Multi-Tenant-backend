const express = require('express');
const cors = require('cors');
require('dotenv').config();

const performanceLogger = require('./middleware/performance-logger');
const authRouter = require('./routes/auth');
const rlsDemoRouter = require('./routes/rls-demo');
const performanceRouter = require('./routes/performance');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend integration
app.use(cors({
  origin: '*', // For local development sandbox simplicity
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-profile', 'x-policy-org-isolation', 'x-policy-dept-scope', 'x-policy-permission-ceiling', 'x-policy-compliance-filter']
}));

app.use(express.json());
app.use(performanceLogger);

// REST API mounting
app.use('/api/auth', authRouter);
app.use('/api/rls-demo', rlsDemoRouter);
app.use('/api/performance', performanceRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'RLS Security Simulation Engine'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(` RLS Simulator Backend listening on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================================`);
});
