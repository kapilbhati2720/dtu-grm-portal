const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

module.exports = function(io, onlineUsers) {
  
  // This middleware correctly checks the user's role from the token. It's good.
  const isOfficer = (req, res, next) => {
    if (req.user && req.user.roles.some(role => role.role_name === 'nodal_officer')) {
      next();
    } else {
      return res.status(403).json({ msg: 'Access denied. Officer resource.' });
    }
  };

  // @route   GET /api/officer/grievances
  // @desc    Get all grievances for the officer's department
  router.get('/grievances', [auth, isOfficer], async (req, res) => {
    try {
      const officerRole = req.user.roles.find(role => role.role_name === 'nodal_officer');
      if (!officerRole) {
        return res.status(403).json({ msg: 'Officer role details not found in token.' });
      }
      const departmentId = officerRole.department_id;

      // FIXED QUERY: Joins through grievance_assignments to find grievances for the department.
      const grievances = await pool.query(
        `SELECT g.*, u.full_name as student_name 
         FROM grievance_assignments ga
         JOIN grievances g ON ga.grievance_id = g.grievance_id
         JOIN users u ON g.submitted_by_id = u.user_id
         WHERE ga.department_id = $1
         ORDER BY g.created_at DESC`,
        [departmentId]
      );
      
      res.json(grievances.rows);

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
  
  // @route   PUT /api/officer/grievances/:ticketId/status
  // @desc    Update the status of a grievance
  router.put('/grievances/:ticketId/status', [auth, isOfficer], async (req, res) => {
    const { ticketId } = req.params;
    const { status } = req.body;
    const officerId = req.user.id;

    try {
      // Get officer's department ID from their token
      const officerRole = req.user.roles.find(role => role.role_name === 'nodal_officer');
      if (!officerRole) {
        return res.status(403).json({ msg: 'Officer role details not found in token.' });
      }
      const officerDepartmentId = officerRole.department_id;

      // FIXED AUTHORIZATION: Check the grievance_assignments table to ensure the officer is authorized.
      const grievanceResult = await pool.query(
        `SELECT g.grievance_id, g.submitted_by_id, ga.department_id 
         FROM grievances g
         JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
         WHERE g.ticket_id = $1`,
        [ticketId]
      );
      
      if (grievanceResult.rows.length === 0) {
        return res.status(404).json({ msg: 'Grievance not found' });
      }
      if (grievanceResult.rows[0].department_id !== officerDepartmentId) {
        return res.status(403).json({ msg: 'Grievance not assigned to your department' });
      }

      // If authorized, proceed with the update
      const grievanceData = grievanceResult.rows[0];
      const updatedGrievance = await pool.query("UPDATE grievances SET status = $1, updated_at = NOW() WHERE ticket_id = $2 RETURNING *", [status, ticketId]);
      
      const updateComment = `Status changed to ${status}`;
      await pool.query(
          `INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, 'StatusChange', $3)`,
          [grievanceData.grievance_id, officerId, updateComment]
      );

      // Send notification to the student
      const studentId = grievanceData.submitted_by_id;
      const notificationMessage = `Your grievance #${ticketId} has been updated to "${status}".`;
      const notificationLink = `/grievance/${ticketId}`;
      await pool.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [studentId, notificationMessage, notificationLink]);
      
      const studentSocketId = onlineUsers[studentId];
      if (studentSocketId) {
          io.to(studentSocketId).emit('new_notification');
      }
      
      res.json(updatedGrievance.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   POST /api/officer/grievances/:ticketId/comments
  // @desc    Add a comment to a grievance
  router.post('/grievances/:ticketId/comments', [auth, isOfficer], async (req, res) => {
      const { ticketId } = req.params;
      const { comment } = req.body;
      const officerId = req.user.id;

      try {
          // Get officer's department ID from their token for authorization
          const officerRole = req.user.roles.find(role => role.role_name === 'nodal_officer');
          if (!officerRole) {
              return res.status(403).json({ msg: 'Officer role details not found in token.' });
          }
          const officerDepartmentId = officerRole.department_id;

          // Authorize: Check if the grievance is assigned to the officer's department
          const grievanceResult = await pool.query(
              `SELECT g.grievance_id, g.submitted_by_id, ga.department_id 
              FROM grievances g
              JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
              WHERE g.ticket_id = $1`,
              [ticketId]
          );

          if (grievanceResult.rows.length === 0) {
              return res.status(404).json({ msg: 'Grievance not found' });
          }
          if (grievanceResult.rows[0].department_id !== officerDepartmentId) {
              return res.status(403).json({ msg: 'Grievance not assigned to your department' });
          }

          // If authorized, add the comment to the grievance_updates table
          const grievanceData = grievanceResult.rows[0];
          const newComment = await pool.query(
              `INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, 'Comment', $3) RETURNING *`,
              [grievanceData.grievance_id, officerId, comment]
          );

          // Send notification to the student
          const studentId = grievanceData.submitted_by_id;
          const notificationMessage = `An officer commented on your grievance #${ticketId}.`;
          const notificationLink = `/grievance/${ticketId}`;
          await pool.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [studentId, notificationMessage, notificationLink]);
          
          const studentSocketId = onlineUsers[studentId];
          if (studentSocketId) {
              io.to(studentSocketId).emit('new_notification');
          }
          
          res.status(201).json(newComment.rows[0]);

      } catch (err) {
          console.error(err.message);
          res.status(500).send('Server Error');
      }
  });

  return router;
};