const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// ---------------- ADD NEW JOB (Protected) ----------------
router.post("/", authMiddleware, (req, res) => {
  const { title, company, required_skills, experience_required, location } = req.body;

  if (!title || !company || !required_skills || !location)
    return res.status(400).json({ error: "All fields are required" });

  const sql = `
    INSERT INTO jobs (title, company, required_skills, experience_required, location)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql,
    [title, company, required_skills, experience_required, location],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Database error", details: err });
      res.json({ id: result.insertId, message: "Job added successfully" });
    }
  );
});

// ---------------- GET ALL JOBS (Public) ----------------
router.get("/", (req, res) => {
  db.query("SELECT * FROM jobs", (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// ---------------- MATCH JOBS BASED ON USER INPUT ----------------
router.post("/match", authMiddleware, (req, res) => {
  const { skills, experience, location } = req.body;

  if (!skills || !experience || !location)
    return res.status(400).json({ error: "All fields are required" });

  const skillList = skills.split(",").map(s => s.trim().toLowerCase());

  const skillConditions = skillList
    .map(() => `LOWER(required_skills) LIKE ?`)
    .join(" OR ");
  const skillValues = skillList.map(skill => `%${skill}%`);

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

// ---------------- RULE-BASED AI JOB RECOMMENDATION (Offline AI) ----------------
router.post("/recommend", authMiddleware, async (req, res) => {
  const { skills, experience, location } = req.body;

  if (!skills || !experience || !location) {
    return res.status(400).json({ error: "Skills, experience, and location are required" });
  }

  const userSkills = skills.toLowerCase().split(",").map(s => s.trim());

  db.query("SELECT * FROM jobs", (err, jobs) => {
    if (err) return res.status(500).json({ error: "Database error" });

    const recommendations = jobs.map(job => {
      const jobSkills = job.required_skills.toLowerCase().split(",").map(s => s.trim());

      // -------- 1. Skill Match Score (0–60) --------
      const matchedSkills = userSkills.filter(s => jobSkills.includes(s));
      const skillMatchPercent = matchedSkills.length / jobSkills.length;
      const skillScore = skillMatchPercent * 60;

      // -------- 2. Experience Score (0–30) --------
      let expScore = 0;
      if (experience >= job.experience_required) {
        expScore = 30;
      } else {
        expScore = (experience / job.experience_required) * 30;
      }

      // -------- 3. Location Score (0–10) --------
      const locationScore =
        job.location.toLowerCase() === location.toLowerCase() ? 10 : 0;

      // -------- Final Score --------
      const matchScore = Math.round(skillScore + expScore + locationScore);

      // -------- Human-like Explanation --------
      let reason = "";

      if (matchedSkills.length > 0) {
        reason += `Your skills (${matchedSkills.join(", ")}) match this job. `;
      } else {
        reason += `Some of your skills may partially match this job. `;
      }

      if (experience >= job.experience_required) {
        reason += `You meet the experience requirement. `;
      } else {
        reason += `You are slightly below the experience requirement. `;
      }

      if (locationScore === 10) {
        reason += `Location is a perfect match.`;
      } else {
        reason += `Location is different but still eligible.`;
      }

      return {
        job_id: job.id,
        title: job.title,
        company: job.company,
        match_score: matchScore,
        reason,
      };
    });

    // Sort by match score (best first)
    recommendations.sort((a, b) => b.match_score - a.match_score);

    // Return top 5
    res.json({ recommendations: recommendations.slice(0, 5) });
  });
});




module.exports = router;
