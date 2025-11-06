const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const checkGrievanceAccess = require('../middleware/grievanceAuth'); // The only auth check we'll need
const upload = require('../middleware/upload');
const sendEmail = require('../utils/sendemail');

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
    router.post('/', [auth, upload], async (req, res) => {
        const { title, description, category } = req.body;
        const client = await pool.connect();
        try {
            // DYNAMIC DEPARTMENT ASSIGNMENT
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
            // Insert file info into the attachments table
            const files = req.files;
            if (files && files.length > 0) {
                for (const file of files) {
                    await client.query(
                        `INSERT INTO attachments (grievance_id, file_url, file_name, file_type) VALUES ($1, $2, $3, $4)`,
                        [newGrievanceId, file.path, file.originalname, file.mimetype]
                    );
                }
            }
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
            // Get updates
            const updatesRes = await pool.query(
                `SELECT u.comment, u.update_type, u.created_at, us.full_name AS author_name, COALESCE(r.role_name, 'student') AS role
                FROM grievance_updates u 
                JOIN users us ON u.updated_by_id = us.user_id
                LEFT JOIN user_department_roles udr ON us.user_id = udr.user_id
                LEFT JOIN roles r ON udr.role_id = r.role_id
                WHERE u.grievance_id = $1 ORDER BY u.created_at ASC`,
                [req.grievance.grievance_id]
            );

            // Get all attachments for this grievance
            const attachmentsRes = await pool.query(
                "SELECT * FROM attachments WHERE grievance_id = $1",
                [req.grievance.grievance_id]
            );

            // Send all three data sets in the response
            res.json({ 
                grievance: req.grievance, 
                updates: updatesRes.rows, 
                attachments: attachmentsRes.rows 
            });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   POST /api/grievances/:ticketId/comments
    // @desc    Add a comment to a grievance (with implementation)
    router.post('/:ticketId/comments', [auth, checkGrievanceAccess, upload], async (req, res) => {
      const { comment } = req.body;
      const user = req.user;
      const grievance = req.grievance; // Get grievance from middleware
      const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Add the new comment
        const newComment = await client.query(
            `INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, 'Comment', $3) RETURNING *`,
            [grievance.grievance_id, user.id, comment]
        );

        // Insert file info into the attachments table
        const files = req.files;
        if (files && files.length > 0) {
            for (const file of files) {
                await client.query(
                    `INSERT INTO attachments (grievance_id, file_url, file_name, file_type) VALUES ($1, $2, $3, $4)`,
                    [grievance.grievance_id, file.path, file.originalname, file.mimetype]
                );
            }
        }

        const isStudent = !user.roles.some(r => r.role_name === 'nodal_officer' || r.role_name === 'department_head' || r.role_name === 'super_admin');

        // Auto-update status if a student replies to a request
        if (isStudent && grievance.status === 'Awaiting Clarification') {
            await client.query(
                "UPDATE grievances SET status = 'Submitted', updated_at = NOW() WHERE grievance_id = $1",
                [grievance.grievance_id]
            );
            
            // Log this automatic status change in the history
            await client.query(
                `INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, 'StatusChange', 'Status updated to Submitted')`,
                [grievance.grievance_id, user.id] // Attributed to the student who triggered it
            );
        }

        // Notification Logic (sends notification to the officer)
        if (isStudent) {
            const officersRes = await client.query(
                `SELECT user_id FROM user_department_roles WHERE department_id = $1 AND role_id IN (SELECT role_id FROM roles WHERE role_name = 'nodal_officer' OR role_name = 'department_head')`,
                [grievance.department_id]
            );
            for (const officer of officersRes.rows) {
                const message = `Student replied on grievance #${grievance.ticket_id}.`;
                const link = `/grievance/${grievance.ticket_id}`;
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

            // Prevent redundant status updates
            if (grievance.status === status) {
                return res.status(400).json({ msg: `Grievance is already marked as "${status}".` });
            }
            
            // If status is 'Rejected', a reason is now mandatory
            if (status === 'Rejected' && !reason) {
                return res.status(400).json({ msg: 'A reason is required when rejecting a grievance.' });
            }

            // If status is 'Awaiting Clarification', a comment (reason) is mandatory
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
                        // Notify the student who submitted the grievance
                        const message = `Your grievance #${grievance.ticket_id} has been ${status.toLowerCase()}.`;
                        const link = `/grievance/${grievance.ticket_id}`;

                        // Save to database notifications
                        await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [grievance.submitted_by_id, message, link]);

                        // Send real-time socket notification
                        const studentSocketId = onlineUsers[grievance.submitted_by_id];
                        if (studentSocketId) io.to(studentSocketId).emit('new_notification');

                        // Send an email notification
                        try {
                        const studentRes = await client.query("SELECT email, full_name FROM users WHERE user_id = $1", [grievance.submitted_by_id]);
                        if (studentRes.rows.length > 0) {
                            const student = studentRes.rows[0];
                            const emailSubject = `Update on Your Grievance: #${grievance.ticket_id}`;
                            const emailMessage = `
                                <p>Hello ${student.full_name},</p>
                                <p>The status of your grievance ("${grievance.title}") has been updated to: <strong>${status}</strong>.</p>
                                ${reason ? `<p><strong>Officer's Comment:</strong> ${reason}</p>` : ''}
                                <p>You can view the full details and history by clicking the link below:</p>
                                <a href="${process.env.CLIENT_URL}${link}" style="...">View Grievance</a>
                            `;
                            
                            await sendEmail({
                                to: student.email,
                                subject: emailSubject,
                                html: emailMessage
                            });
                        }
                        } catch (emailErr) {
                        console.error("Failed to send status update email:", emailErr.message);
                        // We don't stop the whole process, but we log the error
                        }
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