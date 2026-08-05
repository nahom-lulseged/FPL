const { writeFileSync } = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvFile(fileName) {
  dotenv.config({ path: path.join(__dirname, '..', fileName), override: false });
}

module.exports = async function globalSetup() {
  loadEnvFile('.env.deploy.local');
  loadEnvFile('.env');

  const databaseUrl = process.env.TEST_DATABASE_URL;
  const redisUrl = process.env.TEST_REDIS_URL;
  if (!databaseUrl || !redisUrl) throw new Error('Remote TEST_DATABASE_URL and TEST_REDIS_URL are required');
  const mongo = new URL(databaseUrl);
  if (!mongo.hostname.includes('mongodb.net') || !/^\/fpl_(ci|test)[\w-]*$/.test(mongo.pathname)) throw new Error('Refusing tests outside an allowlisted Atlas CI database');
  const redis = new URL(redisUrl);
  if (['localhost', '127.0.0.1'].includes(redis.hostname)) throw new Error('Local Redis is forbidden for integration tests');
  writeFileSync(path.join(__dirname, '.test-env.json'), JSON.stringify({ databaseUrl, redisUrl }));
};
