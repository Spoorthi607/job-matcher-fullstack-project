const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Add new user
const { body, validationResult } = require('express-validator');

router.post('/',
  // Validation rules
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('skills').notEmpty().withMessage('Skills are required'),
  body('experience').isInt({ min: 0 }).withMessage('Experience must be a non-negative integer'),
  body('location').notEmpty().withMessage('Location is required'),

  // Request handler
  (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, skills, experience, location } = req.body;
    const sql = "INSERT INTO users (name, email, skills, experience, location) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [name, email, skills, experience, location], (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ id: result.insertId });
    });
  }
);


// Get all users
router.get("/", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

module.exports = router;

router.post('/', async (req, res) => {
  try {
    // Your validation logic here (or in middleware)

    const { name, email, skills, experience, location } = req.body;
    const sql = 'INSERT INTO users (name, email, skills, experience, location) VALUES (?, ?, ?, ?, ?)';
    
    db.query(sql, [name, email, skills, experience, location], (err, result) => {
      if (err) {
        console.error('Database insert error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.json({ id: result.insertId });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  try {
    // Your validation logic here (or in middleware)

    const { name, email, skills, experience, location } = req.body;
    const sql = 'INSERT INTO users (name, email, skills, experience, location) VALUES (?, ?, ?, ?, ?)';
    
    db.query(sql, [name, email, skills, experience, location], (err, result) => {
      if (err) {
        console.error('Database insert error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.json({ id: result.insertId });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
