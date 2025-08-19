const pool = require('../db');

module.exports = async function (req, res, next) {
  try {
    const user = await pool.query("SELECT role FROM users WHERE user_id = $1", [req.user.id]);
    if (user.rows[0].role !== 'super_admin') {
      return res.status(403).json({ msg: 'Access denied. Admin resource.' });
    }
    next();
  } catch (err) {
    res.status(500).send('Server Error');
  }
};