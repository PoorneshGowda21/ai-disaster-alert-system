const app = require('../backend/index.js');

module.exports = (req, res) => {
  // Pass req and res to express app
  return app(req, res);
};
