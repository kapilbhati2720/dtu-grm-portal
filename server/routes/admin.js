const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { generateGrievance, triageGrievance } = require('../services/aiService');

// Middleware to check if user is a super_admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.roles.some(r => r.role_name === 'super_admin')) {
    next();
  } else {
    return res.status(403).json({ msg: 'Admin access required.' });
  }
};

// @route   GET /api/admin/users
// @desc    Get all users with their roles and status
// @access  Private (Super Admin only)
router.get('/users', [auth, isAdmin], async (req, res) => {
  try {
    // MODIFIED QUERY: Fetches is_active and joins to get all roles for each user
    const users = await pool.query(`
      SELECT 
          u.user_id, 
          u.full_name, 
          u.email, 
          u.is_active,
          COALESCE(
              json_agg(DISTINCT jsonb_build_object('role_name', r.role_name)) 
              FILTER (WHERE r.role_id IS NOT NULL), 
              '[]'
          ) as roles
      FROM users u
      LEFT JOIN user_department_roles udr ON u.user_id = udr.user_id
      LEFT JOIN roles r ON udr.role_id = r.role_id
      GROUP BY u.user_id
      ORDER BY u.created_at DESC;
    `);
    res.json(users.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/admin/users/:userId/deactivate
// @desc    Deactivate a user (soft delete)
// @access  Private (Super Admin only)
router.put('/users/:userId/deactivate', [auth, isAdmin], async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) {
      return res.status(400).json({ msg: 'You cannot deactivate your own account.' });
    }

    const result = await pool.query(
      "UPDATE users SET is_active = false WHERE user_id = $1 RETURNING user_id, is_active",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'User not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// --- Your AI routes are great, no changes needed ---

// @route   POST /api/admin/generate-grievance
router.post('/generate-grievance', [auth, isAdmin], async (req, res) => {
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
router.post('/triage-grievance', [auth, isAdmin], async (req, res) => {
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

  // @route   PUT /api/admin/users/:userId/reactivate
  // @desc    Re-activate a user (undo soft delete)
  // @access  Private (Super Admin only)
  router.put('/users/:userId/reactivate', [auth, isAdmin], async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        "UPDATE users SET is_active = true WHERE user_id = $1 RETURNING user_id, is_active",
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ msg: 'User not found.' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

module.exports = router;