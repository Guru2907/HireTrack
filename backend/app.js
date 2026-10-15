// app.js — builds the Express app. No DB connection or listen() here, so tests can import it.

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/match', require('./routes/match'));
app.use('/api/resumes', require('./routes/resumes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
