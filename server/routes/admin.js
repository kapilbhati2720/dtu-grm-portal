const express = require('express');
const router = express.Router();
const { generateGrievance, triageGrievance } = require('../services/aiService');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST /api/admin/generate-grievance
// @desc    Generates a synthetic grievance using AI
// @access  Private (will be admin-only later)
router.post('/generate-grievance', auth, async (req, res) => {
  const { scenario } = req.body;

  if (!scenario) {
    return res.status(400).json({ msg: 'Scenario is required' });
  }

  try {
    const grievanceText = await generateGrievance(scenario);
    res.json({ generatedText: grievanceText });
  } catch (err) {
    console.error("AI generation error:", err);
    res.status(500).send('Error generating grievance');
  }
});

// @route   POST /api/admin/triage-grievance
// @desc    Analyzes a grievance using AI
// @access  Private
router.post('/triage-grievance', auth, async (req, res) => {
  const { grievanceText } = req.body;

  if (!grievanceText) {
    return res.status(400).json({ msg: 'grievanceText is required' });
  }

  try {
    const analysis = await triageGrievance(grievanceText);
    res.json(analysis);
  } catch (err) {
    console.error("AI triage error:", err);
    res.status(500).send('Error analyzing grievance');
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Super Admin only)
router.get('/users', [auth, admin], async (req, res) => {
  try {
    const users = await pool.query("SELECT user_id, full_name, email, role, created_at FROM users ORDER BY created_at DESC");
    res.json(users.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;