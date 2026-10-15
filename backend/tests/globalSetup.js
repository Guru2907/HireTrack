// Starts one in-memory MongoDB for the whole test run (downloads the binary on first use).
// Test files connect to it via TEST_MONGO_URI, each using its own database.
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  globalThis.__MONGOD__ = mongod;
  process.env.TEST_MONGO_URI = mongod.getUri();
};
