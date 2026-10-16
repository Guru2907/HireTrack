// Connects a test file to the shared in-memory MongoDB started in tests/globalSetup.js.
// Call these from beforeAll / afterEach / afterAll.
const mongoose = require('mongoose');
const User = require('../../models/User');
const Application = require('../../models/Application');

exports.connect = async () => {
  const uri = process.env.TEST_MONGO_URI;
  // Guard: tests must only ever talk to the local in-memory server.
  if (!uri || !uri.startsWith('mongodb://127.0.0.1')) {
    throw new Error('TEST_MONGO_URI is missing or not local; refusing to run API tests.');
  }
  // A separate database per test file, so parallel workers never share data.
  const dbName = `test_${process.env.JEST_WORKER_ID}_${Date.now()}`;
  await mongoose.connect(uri, { dbName });
  // Build the schema indexes (e.g. the unique email index) before any test relies on them.
  await Promise.all([User.init(), Application.init()]);
};

exports.clear = async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((c) => c.deleteMany({})));
};

exports.close = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};
