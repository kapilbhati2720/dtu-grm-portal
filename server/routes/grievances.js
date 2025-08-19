const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// This entire file is now wrapped in a function to receive 'io' and 'onlineUsers'
module.exports = function(io, onlineUsers) {

  const generateTicketId = () => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      return `GRM${year}${month}${day}${randomNum}`;
  };

  // @route   POST /api/grievances
  // @desc    Submit a new grievance
  router.post('/', auth, async (req, res) => {
      const { title, description, category } = req.body;
      const submitted_by_id = req.user.id;
      try {
          if (!title || !description || !category) {
              return res.status(400).json({ msg: 'Please enter all fields' });
          }
          let assigned_to_dept_id;
          switch (category.toLowerCase()) {
              case 'academic': assigned_to_dept_id = 1; break;
              case 'hostel': assigned_to_dept_id = 2; break;
              case 'administration': assigned_to_dept_id = 3; break;
              case 'library': assigned_to_dept_id = 4; break;
              case 'accounts': assigned_to_dept_id = 5; break;
              default: assigned_to_dept_id = 3;
          }
          const ticket_id = generateTicketId();
          const newGrievance = await pool.query(
              `INSERT INTO grievances (ticket_id, title, description, category, submitted_by_id, assigned_to_dept_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
              [ticket_id, title, description, category, submitted_by_id, assigned_to_dept_id]
          );
          res.status(201).json(newGrievance.rows[0]);
      } catch (err) {
          console.error(err.message);
          res.status(500).send('Server Error');
      }
  });

  // @route   GET /api/grievances/my-grievances
  // @desc    Get all grievances for the logged-in user
  router.get('/my-grievances', auth, async (req, res) => {
    try {
      const userGrievances = await pool.query("SELECT * FROM grievances WHERE submitted_by_id = $1 ORDER BY created_at DESC", [req.user.id]);
      res.json(userGrievances.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   GET /api/grievances/:ticketId
  // @desc    Get a single grievance and its updates (for students)
  router.get('/:ticketId', auth, async (req, res) => {
    try {
      const { ticketId } = req.params;
      const grievanceRes = await pool.query("SELECT * FROM grievances WHERE ticket_id = $1", [ticketId]);
      if (grievanceRes.rows.length === 0) return res.status(404).json({ msg: 'Grievance not found' });
      if (grievanceRes.rows[0].submitted_by_id !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });

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

  // @route   POST /api/grievances/:grievanceId/comments
  // @desc    Add a comment to a grievance (by student or officer)
  router.post('/:grievanceId/comments', auth, async (req, res) => {
    const { grievanceId } = req.params;
    const { comment } = req.body;
    const user = req.user;

    try {
      const grievanceRes = await pool.query("SELECT * FROM grievances WHERE grievance_id = $1", [grievanceId]);
      if (grievanceRes.rows.length === 0) return res.status(404).json({ msg: 'Grievance not found' });
      
      const grievance = grievanceRes.rows[0];
      let isAuthorized = false;
      if (grievance.submitted_by_id === user.id) isAuthorized = true;
      if (!isAuthorized && user.role === 'nodal_officer') {
        const officerRes = await pool.query("SELECT department_id FROM users WHERE user_id = $1", [user.id]);
        if (officerRes.rows[0].department_id === grievance.assigned_to_dept_id) isAuthorized = true;
      }
      if (!isAuthorized) return res.status(403).json({ msg: 'You are not authorized to comment.' });

      const newComment = await pool.query(
        `INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, 'Comment', $3) RETURNING *`,
        [grievanceId, user.id, comment]
      );
      
      // Notification Logic
      if (user.role === 'nodal_officer') {
        const studentId = grievance.submitted_by_id;
        const notificationMessage = `An officer commented on your grievance #${grievance.ticket_id}.`;
        const notificationLink = `/grievance/${grievance.ticket_id}`;
        await pool.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [studentId, notificationMessage, notificationLink]);
        const studentSocketId = onlineUsers[studentId];
        if (studentSocketId) io.to(studentSocketId).emit('new_notification');
      }
      
      res.status(201).json(newComment.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  return router;
};