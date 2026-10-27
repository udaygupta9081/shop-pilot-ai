const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "campuseats",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});
pool.query("SELECT DATABASE() AS db, @@port AS port")
  .then(([rows]) => console.log("Database connection:", rows))
  .catch(err => console.error("Database check failed:", err.message));
module.exports = pool;