// server/middleware/grievanceAuth.js
const pool = require('../db');

const checkGrievanceAccess = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        const user = req.user;

        console.log(`[Middleware] Checking access for ticketId: ${ticketId}`);

        const grievanceRes = await pool.query(
            `SELECT g.*, d.name as department_name, ga.department_id 
             FROM grievances g
             JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
             JOIN departments d ON ga.department_id = d.department_id
             WHERE g.ticket_id = $1`,
            [ticketId]
        );

        console.log(`[Middleware] Database query returned ${grievanceRes.rows.length} rows.`);

        if (grievanceRes.rows.length === 0) {
            return res.status(404).json({ msg: 'Grievance not found' });
        }

        const grievance = grievanceRes.rows[0];

        const isOwner = grievance.submitted_by_id === user.id;
        const isSuperAdmin = user.roles.some(r => r.role_name === 'super_admin');
        const isAssignedOfficer = user.roles.some(r => 
            r.role_name === 'nodal_officer' && r.department_id === grievance.department_id
        );

        if (!isOwner && !isSuperAdmin && !isAssignedOfficer) {
            return res.status(403).json({ msg: 'User not authorized for this grievance' });
        }

        // Attach the grievance to the request object to use in the next function
        req.grievance = grievance;
        next();

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = checkGrievanceAccess;