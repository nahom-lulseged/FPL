const { existsSync, unlinkSync } = require('fs');
const path = require('path');
module.exports = async function globalTeardown() {
  const file = path.join(__dirname, '.test-env.json');
  if (existsSync(file)) unlinkSync(file);
};
