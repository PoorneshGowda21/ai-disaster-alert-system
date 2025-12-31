const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  password: "pass123",
  database: "postgres",
  port: 5432,
});

module.exports = pool;
