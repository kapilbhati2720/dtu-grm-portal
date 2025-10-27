const auth = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Built-in Node.js module
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parseUserDataFromEmail } = require('../utils/helpers');
const sendEmail = require('../utils/sendemail');

// @route   POST /api/auth/register
// @desc    Register a new user and send verification email
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check for valid DTU/DCE domain
    if (!email.endsWith('@dtu.ac.in') && !email.endsWith('@dce.ac.in')) {
        return res.status(400).json({ msg: 'Please use a valid DTU email address.' });
    }
    
    // 2. Check if user already exists
    let user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // 3. Parse user data, hash password, create verification token
    const { fullName, rollNumber, admissionYear, branchCode } = parseUserDataFromEmail(email);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // 4. Save user with the verification token
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, roll_number, admission_year, branch_code, verification_token) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [fullName, email, passwordHash, rollNumber, admissionYear, branchCode, verificationToken]
    );

    // 5. Send verification email
    const verificationURL = `http://localhost:5000/api/auth/verify-email?token=${verificationToken}`;
    const message = `<p>Thank you for registering. Please click the link below to verify your email address:</p><p><a href="${verificationURL}">Verify My Email</a></p>`;

    await sendEmail({
      email: email,
      subject: 'GRM Portal - Email Verification',
      html: message,
    });

    res.status(201).json({ msg: 'Registration successful. Please check your email to verify your account.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auth/verify-email
// @desc    Verify user's email
router.get('/verify-email', async (req, res) => {
    try {
        const token = req.query.token;
        const user = await pool.query("SELECT * FROM users WHERE verification_token = $1", [token]);

        if (user.rows.length === 0) {
            return res.status(400).send('<h1>Error</h1><p>Invalid or expired verification token. Please try registering again.</p>');
        }

        await pool.query(
            "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1",
            [token]
        );

        res.send('<h1>Email Verified Successfully!</h1><p>You can now close this tab and log in to the portal.</p>');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // 1. Find the user by email
    let userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userRes.rows.length === 0) return res.status(400).json({ msg: 'Invalid Credentials' });

    const user = userRes.rows[0];

    // 2. THE FIX: Check if the account is active BEFORE checking the password 🛑
    if (!user.is_active) {
      return res.status(403).json({ msg: 'Your account has been deactivated. Please contact an administrator.' });
    }

    // 3. If active, proceed with the normal password check
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // NEW LOGIC: Fetch roles from the new table
    const rolesRes = await pool.query(`
      SELECT r.role_name, d.name as department_name, udr.department_id
      FROM user_department_roles udr
      JOIN roles r ON udr.role_id = r.role_id
      JOIN departments d ON udr.department_id = d.department_id
      WHERE udr.user_id = $1`, [user.user_id]
    );

    const userPayload = {
      id: user.user_id,
      name: user.full_name,
      email: user.email,
      roles: rolesRes.rows, // This will be an array of roles/departments
    };

    const payload = { user: userPayload };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth
// @desc    Get logged in user data (for page reloads)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // 1. Fetch basic user details from the 'users' table
        const userRes = await pool.query(
            "SELECT user_id, full_name, email, roll_number, branch_code, admission_year FROM users WHERE user_id = $1", 
            [req.user.id]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }
        let user = userRes.rows[0];

        // 2. Fetch all roles and departments for that user
        const rolesRes = await pool.query(
            `SELECT r.role_name, d.department_id, d.name as department_name 
             FROM user_department_roles udr
             JOIN roles r ON udr.role_id = r.role_id
             JOIN departments d ON udr.department_id = d.department_id
             WHERE udr.user_id = $1`, 
            [req.user.id]
        );

        // 3. Attach the fetched roles to the user object
        user.roles = rolesRes.rows;

        res.json(user);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/auth/set-password
// @desc    Set a user's password using a token
// @access  Public
router.post('/set-password', async (req, res) => {
    const { token, password } = req.body;

    try {
        // 1. Find the user with the matching token that has not expired
        const userRes = await pool.query(
            "SELECT * FROM users WHERE verification_token = $1 AND verification_token_expires > NOW()",
            [token]
        );

        if (userRes.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid or expired token. Please request a new invite.' });
        }

        // 2. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Update the user's account
        await pool.query(
            `UPDATE users 
             SET password_hash = $1, is_verified = true, verification_token = NULL, verification_token_expires = NULL 
             WHERE user_id = $2`,
            [passwordHash, userRes.rows[0].user_id]
        );

        res.json({ msg: 'Password set successfully! You can now log in.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;