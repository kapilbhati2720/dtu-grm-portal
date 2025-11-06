// server/routes/officer.js

const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Middleware to check if the user has ANY officer-level role
const isOfficer = (req, res, next) => {
    const isOfficerRole = req.user.roles.some(r => 
        r.role_name === 'nodal_officer' || 
        r.role_name === 'department_head' || 
        r.role_name === 'super_admin'
    );
    if (isOfficerRole) {
        next();
    } else {
        return res.status(403).json({ msg: 'Access denied. Officer role required.' });
    }
};

// server/routes/officer.js

// server/routes/officer.js

// @route   GET /api/officer/grievances
// @desc    Get all grievances for the officer's department(s) AND analytics
// @access  Private (Officers: Nodal, HOD, Admin)
router.get('/grievances', [auth, isOfficer], async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            let departmentIds = req.user.roles
                .filter(r => r.role_name === 'nodal_officer' || r.role_name === 'department_head')
                .map(r => r.department_id);

            let grievanceQuery, analyticsQuery;
            let queryParams = [];

            if (req.user.roles.some(r => r.role_name === 'super_admin')) {
                // Queries for SUPER ADMIN (no department filter)
                grievanceQuery = `
                    SELECT g.grievance_id, g.ticket_id, g.title, g.category, g.status, g.created_at 
                    FROM grievances g 
                    ORDER BY g.updated_at DESC
                `;
                analyticsQuery = `
                    SELECT 
                        COUNT(*) FILTER (WHERE status = 'Submitted') AS "newlySubmitted",
                        COUNT(*) FILTER (WHERE status = 'Awaiting Clarification') AS "awaitingClarification",
                        COUNT(*) FILTER (WHERE status = 'Submitted' OR status = 'Awaiting Clarification') AS "totalPending",
                        COUNT(*) FILTER (WHERE status = 'Resolved') AS "resolved",
                        COUNT(*) FILTER (WHERE status = 'Rejected') AS "rejected",
                        COUNT(*) FILTER (WHERE status = 'Escalated') AS "escalated"
                    FROM grievances
                `;
            } else if (departmentIds.length > 0) {
                // Queries for OFFICERS (filters by their department IDs)
                grievanceQuery = `
                    SELECT g.grievance_id, g.ticket_id, g.title, g.category, g.status, g.created_at
                    FROM grievances g
                    JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
                    WHERE ga.department_id = ANY($1::int[])
                    ORDER BY g.updated_at DESC
                `;
                analyticsQuery = `
                    SELECT 
                        COUNT(*) FILTER (WHERE g.status = 'Submitted') AS "newlySubmitted",
                        COUNT(*) FILTER (WHERE g.status = 'Awaiting Clarification') AS "awaitingClarification",
                        COUNT(*) FILTER (WHERE (g.status = 'Submitted' OR g.status = 'Awaiting Clarification')) AS "totalPending",
                        COUNT(*) FILTER (WHERE g.status = 'Resolved') AS "resolved",
                        COUNT(*) FILTER (WHERE g.status = 'Rejected') AS "rejected",
                        COUNT(*) FILTER (WHERE g.status = 'Escalated') AS "escalated"
                    FROM grievances g
                    JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
                    WHERE ga.department_id = ANY($1::int[])
                `;
                queryParams = [departmentIds];
            } else {
                // Officer with no assigned departments
                return res.json({ analytics: { newlySubmitted: 0, awaitingClarification: 0, totalPending: 0, resolved: 0, rejected: 0, escalated: 0 }, grievances: [] });
            }

            // Run both queries in parallel for efficiency
            const [grievanceRes, analyticsRes] = await Promise.all([
                client.query(grievanceQuery, queryParams),
                client.query(analyticsQuery, queryParams)
            ]);
            
            // Send the combined response
            res.json({
                analytics: analyticsRes.rows[0],
                grievances: grievanceRes.rows
            });

        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// We REMOVE the /grievances/:ticketId/status and /grievances/:ticketId/comments routes
// because their logic is already perfectly handled by the more secure and robust
// routes in the main `grievances.js` file. This avoids code duplication.

module.exports = function(io, onlineUsers) {
    return router;
};