const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here"; // Move to .env ideally

// -------------------- REGISTER --------------------
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: "All fields required" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    db.query(sql, [name, email, hashedPassword], (err, result) => {
      if (err) {
  console.error("❌ MySQL Insert Error:", err);
  return res.status(500).json({ error: "Database error", details: err });
}


      res.json({ id: result.insertId, message: "User registered successfully" });
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------- LOGIN --------------------
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = results[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  });
});

// -------------------- JOB MATCHING --------------------
router.post("/match", (req, res) => {
  let { skills, experience, location } = req.body;
  if (!skills || !experience || !location)
    return res.status(400).json({ error: "All fields required" });

  skills = skills.split(",").map(s => s.trim().toLowerCase());
  const skillConditions = skills.map(() => `LOWER(required_skills) LIKE ?`).join(" OR ");
  const skillValues = skills.map(skill => `%${skill}%`);

  const sql = `
    SELECT * FROM jobs
    WHERE (${skillConditions})
      AND experience_required <= ?
      AND LOWER(location) = ?
  `;

  db.query(sql, [...skillValues, experience, location.toLowerCase()], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// -------------------- PROFILE (Protected) --------------------
router.get("/profile", authMiddleware, (req, res) => {
  const userId = req.user.userId;

  const sql = "SELECT id, name, email FROM users WHERE id = ?";
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(404).json({ error: "User not found" });

    res.json(results[0]);
  });
});

module.exports = router;

// -------------------- UPDATE PROFILE (Protected) --------------------
router.put("/profile", authMiddleware, (req, res) => {
  const userId = req.user.userId;
  const { name, skills, experience, location } = req.body;

  // Check if there's something to update
  if (!name && !skills && !experience && !location) {
    return res.status(400).json({ error: "At least one field must be provided to update" });
  }

  // Build dynamic SQL query
  const updates = [];
  const values = [];

  if (name) { updates.push("name = ?"); values.push(name); }
  if (skills) { updates.push("skills = ?"); values.push(skills); }
  if (experience) { updates.push("experience = ?"); values.push(experience); }
  if (location) { updates.push("location = ?"); values.push(location); }

  const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
  values.push(userId);

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Profile updated successfully" });
  });
});
