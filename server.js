const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const db = require("./config/db");
require("dotenv").config();



dotenv.config();

const userRoutes = require("./routes/user");
const jobRoutes = require("./routes/job");
const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/users", userRoutes);
app.use("/jobs", jobRoutes);
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Job Matcher Backend Running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

console.log("API KEY Loaded:", process.env.OPENAI_API_KEY ? "YES" : "NO");
