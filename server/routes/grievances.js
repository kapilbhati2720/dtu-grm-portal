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
    
    // Use a client for transactions
    const client = await pool.connect();

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
      
      // Start transaction
      await client.query('BEGIN');

      // 1. Insert the main grievance data into the 'grievances' table
      const newGrievanceRes = await client.query(
        `INSERT INTO grievances (ticket_id, title, description, category, submitted_by_id) VALUES ($1, $2, $3, $4, $5) RETURNING grievance_id, ticket_id, title, created_at`,
        [ticket_id, title, description, category, submitted_by_id]
      );
      const newGrievance = newGrievanceRes.rows[0];
      
      // 2. Insert the assignment into the 'grievance_assignments' table
      await client.query(
        `INSERT INTO grievance_assignments (grievance_id, department_id) VALUES ($1, $2)`,
        [newGrievance.grievance_id, assigned_to_dept_id]
      );

      // Commit the transaction
      await client.query('COMMIT');

      res.status(201).json(newGrievance);

    } catch (err) {
      // If anything fails, roll back the transaction
      await client.query('ROLLBACK');
      console.error(err.message);
      res.status(500).send('Server Error');
    } finally {
      // Release the client back to the pool
      client.release();
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
  // @desc    Get a single grievance and its updates (handles all user roles)
  router.get('/:ticketId', auth, async (req, res) => {
    try {
      const { ticketId } = req.params;
      
      // THIS IS WHERE THE NEW QUERY GOES
      const grievanceRes = await pool.query(`
        SELECT
            g.*,
            ga.department_id
        FROM
            grievances AS g
        JOIN
            grievance_assignments AS ga ON g.grievance_id = ga.grievance_id
        WHERE
            g.ticket_id = $1
      `, [ticketId]);

      if (grievanceRes.rows.length === 0) {
        return res.status(404).json({ msg: 'Grievance not found' });
      }

      const grievance = grievanceRes.rows[0];
      const user = req.user;

      // Consolidated Authorization Check
      const isOwner = grievance.submitted_by_id === user.id;
      const isAdmin = user.roles.some(r => r.role_name === 'super_admin');
      const isCorrectOfficer = user.roles.some(r => 
        r.role_name === 'nodal_officer' && r.department_id === grievance.department_id
      );

      if (!isOwner && !isAdmin && !isCorrectOfficer) {
        return res.status(401).json({ msg: 'User not authorized to view this grievance' });
      }

      // Fetch updates if authorized
      const updatesRes = await pool.query(
        `SELECT u.comment, u.update_type, u.created_at, us.full_name as author_name 
        FROM grievance_updates u 
        JOIN users us ON u.updated_by_id = us.user_id 
        WHERE u.grievance_id = $1 ORDER BY u.created_at ASC`,
        [grievance.grievance_id]
      );

      res.json({ grievance, updates: updatesRes.rows });
      
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   POST /api/grievances/:grievanceId/comments
// @desc    Add a comment to a grievance (by student or officer)
router.post('/:grievanceId/comments', auth, async (req, res) => {
  const { grievanceId } = req.params; // Using grievance_id here is more robust
  const { comment } = req.body;
  const user = req.user; // User who is commenting

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch grievance and its assigned department
    const grievanceRes = await client.query(
      `SELECT g.*, ga.department_id 
       FROM grievances g 
       JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
       WHERE g.grievance_id = $1`, 
      [grievanceId]
    );

    if (grievanceRes.rows.length === 0) {
      return res.status(404).json({ msg: 'Grievance not found' });
    }
    const grievance = grievanceRes.rows[0];

    // ... (Authorization logic can be added here if needed) ...

    const newComment = await client.query(
      `INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, 'Comment', $3) RETURNING *`,
      [grievanceId, user.id, comment]
    );
    
    // --- NEW NOTIFICATION LOGIC ---
    const isStudent = !user.roles.some(r => r.role_name === 'nodal_officer' || r.role_name === 'super_admin');

    if (isStudent) {
      // If a student comments, notify all officers in the assigned department
      const assignedDeptId = grievance.department_id;
      const officersRes = await client.query(
        `SELECT user_id FROM user_department_roles WHERE department_id = $1 AND role_id = (SELECT role_id FROM roles WHERE role_name = 'nodal_officer')`,
        [assignedDeptId]
      );

      for (const officer of officersRes.rows) {
        const notificationMessage = `A student commented on grievance #${grievance.ticket_id}.`;
        const notificationLink = `/grievance/${grievance.ticket_id}`;
        await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [officer.user_id, notificationMessage, notificationLink]);
        
        const officerSocketId = onlineUsers[officer.user_id];
        if (officerSocketId) {
          io.to(officerSocketId).emit('new_notification');
        }
      }
    } else {
      // If an officer comments, notify the student
      const studentId = grievance.submitted_by_id;
      const notificationMessage = `An officer commented on your grievance #${grievance.ticket_id}.`;
      const notificationLink = `/grievance/${grievance.ticket_id}`;
      await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [studentId, notificationMessage, notificationLink]);
      
      const studentSocketId = onlineUsers[studentId];
      if (studentSocketId) {
        io.to(studentSocketId).emit('new_notification');
      }
    }
    // --- END OF NEW LOGIC ---
    
    await client.query('COMMIT');
    res.status(201).json(newComment.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

  return router;
};