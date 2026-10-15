// server.js — entry point. Keep this file short: load config, connect DB, start listening.
// dotenv must load before app.js is required (controllers read env vars at module load).

require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
