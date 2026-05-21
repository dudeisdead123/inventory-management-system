const { pool } = require("./db");
(async () => {
  try {
    await pool.query("DELETE FROM users WHERE role = $1", ["admin"]);
    console.log("All admin rows deleted");
  } catch (e) {
    console.error("Clean‑up error:", e);
  } finally {
    process.exit();
  }
})();
