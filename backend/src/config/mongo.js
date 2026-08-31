const mongoose = require('mongoose');
const env = require('./env');

async function connectMongo() {
  await mongoose.connect(env.mongodbUri, {
    dbName: undefined,
  });
  // eslint-disable-next-line no-console
  console.log('MongoDB connected');
}

module.exports = {
  connectMongo,
};
