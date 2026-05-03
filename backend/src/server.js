require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { initDb } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const apiRoutes = require("./routes/apiRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Re-Mmogo API is running",
    database: "SQLite",
    status: "Connected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Re-Mmogo backend running on port ${PORT}`);
      console.log("SQLite database connected successfully");
    });
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });