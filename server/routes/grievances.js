const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const checkGrievanceAccess = require('../middleware/grievanceAuth'); // The only auth check we'll need

module.exports = function(io, onlineUsers) {
    
    // Helper function to generate a ticket ID
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
        const client = await pool.connect();
        try {
            // DYNAMIC DEPARTMENT ASSIGNMENT: No more hardcoded switch case
            const deptRes = await client.query("SELECT department_id FROM departments WHERE name ILIKE $1", [category]);
            if (deptRes.rows.length === 0) {
                return res.status(400).json({ msg: 'Invalid grievance category provided.' });
            }
            const assigned_to_dept_id = deptRes.rows[0].department_id;

            await client.query('BEGIN');
            const newGrievanceRes = await client.query(
                `INSERT INTO grievances (ticket_id, title, description, category, submitted_by_id) VALUES ($1, $2, $3, $4, $5) RETURNING grievance_id`,
                [generateTicketId(), title, description, category, req.user.id]
            );
            const newGrievanceId = newGrievanceRes.rows[0].grievance_id;
            
            await client.query(
                `INSERT INTO grievance_assignments (grievance_id, department_id) VALUES ($1, $2)`,
                [newGrievanceId, assigned_to_dept_id]
            );
            await client.query('COMMIT');
            res.status(201).json({ grievance_id: newGrievanceId, msg: "Grievance submitted successfully." });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err.message);
            res.status(500).send('Server Error');
        } finally {
            client.release();
        }
    });

    // @route   GET /api/grievances/my-grievances
    // @desc    Get all grievances for the logged-in user
    router.get('/my-grievances', auth, async (req, res) => {
        try {
            const userGrievances = await pool.query("SELECT * FROM grievances WHERE submitted_by_id = $1 ORDER BY updated_at DESC", [req.user.id]);
            res.json(userGrievances.rows);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   GET /api/grievances/:ticketId
    router.get('/:ticketId', [auth, checkGrievanceAccess], async (req, res) => {
        try {
            const updatesRes = await pool.query(
                `SELECT u.comment, u.update_type, u.created_at, us.full_name AS author_name, COALESCE(r.role_name, 'student') AS role
                FROM grievance_updates u 
                JOIN users us ON u.updated_by_id = us.user_id
                LEFT JOIN user_department_roles udr ON us.user_id = udr.user_id
                LEFT JOIN roles r ON udr.role_id = r.role_id
                WHERE u.grievance_id = $1 ORDER BY u.created_at ASC`,
                [req.grievance.grievance_id] // ✅ FIX: Use ID from middleware's grievance object
            );
            res.json({ grievance: req.grievance, updates: updatesRes.rows });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   POST /api/grievances/:ticketId/comments
    // @desc    Add a comment to a grievance (with implementation)
    router.post('/:ticketId/comments', [auth, checkGrievanceAccess], async (req, res) => {
      const { comment } = req.body;
      const user = req.user;
      const grievance = req.grievance; // Get grievance from middleware
      const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const newComment = await client.query(
                `INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, 'Comment', $3) RETURNING *`,
                [grievance.grievance_id, user.id, comment]
            );
            const isStudent = !user.roles.some(r => r.role_name === 'nodal_officer' || r.role_name === 'super_admin');
        if (isStudent) {
            // If a student comments, notify all officers in the assigned department
            const officersRes = await client.query(
                `SELECT user_id FROM user_department_roles WHERE department_id = $1 AND role_id = (SELECT role_id FROM roles WHERE role_name = 'nodal_officer')`,
                [grievance.department_id]
            );
            for (const officer of officersRes.rows) {
                const message = `A student commented on grievance #${grievance.ticket_id}.`;
                const link = `/grievance/${grievance.ticket_id}`; // Use ticket_id for user-facing links
                await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [officer.user_id, message, link]);
                const officerSocketId = onlineUsers[officer.user_id];
                if (officerSocketId) io.to(officerSocketId).emit('new_notification');
            }
        } else {
            // If an officer comments, notify the student
            const message = `An officer commented on your grievance #${grievance.ticket_id}.`;
            const link = `/grievance/${grievance.ticket_id}`;
            await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [grievance.submitted_by_id, message, link]);
            const studentSocketId = onlineUsers[grievance.submitted_by_id];
            if (studentSocketId) io.to(studentSocketId).emit('new_notification');
        }
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

    
    // @route   PUT /api/grievances/:ticketId/status
    // @desc    Update the status of a grievance (NOW using the middleware)
    router.put('/:ticketId/status', [auth, checkGrievanceAccess], async (req, res) => {
        const { status, reason } = req.body; // Expecting status and an optional reason
        const user = req.user;
        const grievance = req.grievance; // Get grievance from the middleware
        const client = await pool.connect();

        try {
            // Further check: only officers/admins can change status
            const isSuperAdmin = user.roles.some(r => r.role_name === 'super_admin');
            const isAssignedOfficer = user.roles.some(r => r.role_name === 'nodal_officer' && r.department_id === grievance.department_id);

            if (!isSuperAdmin && !isAssignedOfficer) {
                return res.status(403).json({ msg: 'Not authorized to change status.' });
            }
            
            // If status is 'Rejected', a reason is now mandatory
            if (status === 'Rejected' && !reason) {
                return res.status(400).json({ msg: 'A reason is required when rejecting a grievance.' });
            }

            // NEW: If status is 'Awaiting Clarification', a comment (reason) is mandatory
            if (status === 'Awaiting Clarification' && !reason) {
                return res.status(400).json({ msg: 'A comment is required when requesting more information.' });
            }

            await client.query('BEGIN');

            // Update the grievance status in the main table
            await client.query("UPDATE grievances SET status = $1, updated_at = NOW() WHERE grievance_id = $2", [status, grievance.grievance_id]);
            
            // Create the appropriate comment for the history log
            let updateComment;
            let updateType = 'StatusChange';

            if (status === 'Rejected') {
                updateComment = `Status changed to Rejected. Reason: ${reason}`;
            } else if (status === 'Awaiting Clarification') {
                updateComment = `Request for Information: ${reason}`;
                updateType = 'Comment'; // Log this as a comment for clarity
            } else {
                updateComment = `Status changed to ${status}`;
            }

            // Log this action in the grievance history
            await client.query(`INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, $3, $4)`, [grievance.grievance_id, user.id, updateType, updateComment]);
                    // --- Notification Logic ---
                    if (status === 'Escalated') {
                        const adminsRes = await client.query(`SELECT user_id FROM user_department_roles WHERE role_id = (SELECT role_id FROM roles WHERE role_name = 'super_admin')`);
                        for (const admin of adminsRes.rows) {
                            const message = `Grievance #${grievance.ticket_id} has been escalated.`;
                            const link = `/grievance/${grievance.ticket_id}`;
                            await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [admin.user_id, message, link]);
                            const adminSocketId = onlineUsers[admin.user_id];
                            if (adminSocketId) io.to(adminSocketId).emit('new_notification');
                        }
                    } else {
                        const message = `Your grievance #${grievance.ticket_id} has been ${status.toLowerCase()}.`;
                        const link = `/grievance/${grievance.ticket_id}`;
                        await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [grievance.submitted_by_id, message, link]);
                        const studentSocketId = onlineUsers[grievance.submitted_by_id];
                        if (studentSocketId) io.to(studentSocketId).emit('new_notification');
                    }
                    // --- End Notification Logic ---

                    await client.query('COMMIT');
                    res.json({ msg: `Grievance status updated to ${status}` });
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