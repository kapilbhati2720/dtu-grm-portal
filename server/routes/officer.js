const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

module.exports = function(io, onlineUsers) {
  
  const isOfficer = async (req, res, next) => {
    try {
      // The user object is now fully decoded from the token by our auth middleware
      if (req.user.role !== 'nodal_officer') {
        return res.status(403).json({ msg: 'Access denied. Not an officer.' });
      }
      next();
    } catch (err) {
      res.status(500).send('Server Error');
    }
  };

  router.get('/grievances', [auth, isOfficer], async (req, res) => {
    try {
      const officer = await pool.query("SELECT department_id FROM users WHERE user_id = $1", [req.user.id]);
      const departmentId = officer.rows[0].department_id;
      const grievances = await pool.query(
        "SELECT g.*, u.full_name as student_name FROM grievances g JOIN users u ON g.submitted_by_id = u.user_id WHERE g.assigned_to_dept_id = $1 ORDER BY g.created_at DESC",
        [departmentId]
      );
      res.json(grievances.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  router.get('/grievances/:ticketId', [auth, isOfficer], async (req, res) => {
    try {
      const { ticketId } = req.params;
      const officer = await pool.query("SELECT department_id FROM users WHERE user_id = $1", [req.user.id]);
      const departmentId = officer.rows[0].department_id;
      const grievanceRes = await pool.query(`SELECT g.*, u.full_name as student_name FROM grievances g JOIN users u ON g.submitted_by_id = u.user_id WHERE g.ticket_id = $1`,[ticketId]);
      if (grievanceRes.rows.length === 0) return res.status(404).json({ msg: 'Grievance not found' });
      if (grievanceRes.rows[0].assigned_to_dept_id !== departmentId) return res.status(403).json({ msg: 'Not authorized' });

      const updatesRes = await pool.query(
          `SELECT u.comment, u.created_at, us.full_name as author_name, us.role FROM grievance_updates u JOIN users us ON u.updated_by_id = us.user_id WHERE u.grievance_id = $1 ORDER BY u.created_at ASC`,
          [grievanceRes.rows[0].grievance_id]
      );
      res.json({ grievance: grievanceRes.rows[0], updates: updatesRes.rows });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
  
  router.put('/grievances/:ticketId/status', [auth, isOfficer], async (req, res) => {
    const { ticketId } = req.params;
    const { status } = req.body;
    const officerId = req.user.id;

    try {
      const officer = await pool.query("SELECT department_id FROM users WHERE user_id = $1", [officerId]);
      const departmentId = officer.rows[0].department_id;
      const grievanceResult = await pool.query("SELECT assigned_to_dept_id, submitted_by_id FROM grievances WHERE ticket_id = $1", [ticketId]);
      if (grievanceResult.rows.length === 0) return res.status(404).json({ msg: 'Grievance not found' });
      if (grievanceResult.rows[0].assigned_to_dept_id !== departmentId) return res.status(403).json({ msg: 'Not authorized' });

      const updatedGrievance = await pool.query("UPDATE grievances SET status = $1, updated_at = NOW() WHERE ticket_id = $2 RETURNING *", [status, ticketId]);
      
      const updateComment = `Status changed to ${status}`;
      await pool.query(
          `INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, 'StatusChange', $3)`,
          [updatedGrievance.rows[0].grievance_id, officerId, updateComment]
      );

      const grievance = updatedGrievance.rows[0];
      const studentId = grievance.submitted_by_id;
      const notificationMessage = `Your grievance #${grievance.ticket_id} has been updated to "${status}".`;
      const notificationLink = `/grievance/${grievance.ticket_id}`;
      
      await pool.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [studentId, notificationMessage, notificationLink]);
      
      const studentSocketId = onlineUsers[studentId];
      if (studentSocketId) {
          io.to(studentSocketId).emit('new_notification');
      }
      
      res.json(grievance);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  return router;
};