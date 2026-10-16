// server.js — entry point. Keep this file short: load config, connect DB, start listening.
// dotenv must load before app.js is required (controllers read env vars at module load).

require('dotenv').config();
const mongoose = require('mongoose');
const { validateEnv } = require('./config/env');

const { errors, warnings } = validateEnv();
warnings.forEach((warning) => console.warn(`[config] ${warning}`));
if (errors.length > 0) {
  console.error(`[config] Cannot start:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}

const app = require('./app');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    // Log the error type and message only; exit so the host restarts or reports the failure
    // instead of leaving a running process that serves nothing.
    console.error(`MongoDB connection error: ${err.name}: ${err.message}`);
    process.exit(1);
  });
