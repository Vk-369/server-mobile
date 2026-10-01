
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

if (!process.env.DB) {
  throw new Error("DB must contain the PostgreSQL connection URL.");
}

const sql = postgres(process.env.DB, {
  max: Number(process.env.DB_POOL_MAX) || 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

const initialize = async () => {
  const schemaPath = path.join(__dirname, "../migrations/001_initial_postgres_schema.sql");
  const statements = fs.readFileSync(schemaPath, "utf8").split(";");

  for (const statement of statements) {
    if (statement.trim()) await sql.unsafe(statement);
  }

  await sql.unsafe("SELECT 1");
  console.log("PostgreSQL connection established");
};

module.exports = { sql, initialize };
 